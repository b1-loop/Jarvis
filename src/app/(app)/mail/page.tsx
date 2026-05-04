'use client';
import { useState, useEffect, useCallback } from 'react';

type Stage = 'inbox' | 'reading' | 'confirm' | 'sent';

interface InboxMsg {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

interface FullMsg extends InboxMsg {
  to: string;
  replyTo: string;
  body: string;
}

interface CalEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

function parseSenderName(from: string): string {
  const m = from.match(/^(.+?)\s*<[^>]+>$/);
  return m ? m[1].trim().replace(/^"|"$/g, '') : from.split('@')[0];
}

function parseSenderEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m ? m[1] : from;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'just nu';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffH < 24) return `${diffH} h`;
  if (diffD === 1) return 'igår';
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function useNotifications() {
  const request = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };
  const send = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };
  return { request, send };
}

export default function MailPage() {
  const [stage, setStage] = useState<Stage>('inbox');
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [selected, setSelected] = useState<FullMsg | null>(null);
  const [summary, setSummary] = useState('');
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [gmailConnected, setGmailConnected] = useState(false);
  const { request: requestNotif, send: sendNotif } = useNotifications();

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/inbox');
      const data = await res.json();
      if (data.connected === false) {
        setGmailConnected(false);
        return;
      }
      if (data.error) throw new Error(data.error);
      setGmailConnected(true);
      setMessages(data.messages ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    requestNotif();
    loadInbox();
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => { if (d.connected) setCalEvents(d.events ?? []); });
  }, [loadInbox]);

  const openMessage = async (msg: InboxMsg) => {
    setLoadingMsg(true);
    setError('');
    setSelected(null);
    setSummary('');
    setDraft('');
    setStage('reading');

    try {
      const fullRes = await fetch(`/api/gmail/message/${msg.id}`);
      const full: FullMsg = await fullRes.json();
      if ((full as any).error) throw new Error((full as any).error);
      setSelected(full);

      const replyEmail = parseSenderEmail(full.replyTo || full.from);
      setTo(replyEmail);
      setSubject(full.subject.startsWith('Re:') ? full.subject : `Re: ${full.subject}`);

      const calendarContext = calEvents.length
        ? calEvents.map(e => `- ${formatEventTime(e.startDate)}: ${e.title}`).join('\n')
        : '';

      const aiRes = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: full.body || full.snippet, calendarContext }),
      });
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);
      setSummary(aiData.summary ?? '');
      setDraft(aiData.content ?? '');
      sendNotif('Jarvis — Utkast klart', `Svar på "${full.subject}" är redo.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMsg(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body: draft }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStage('sent');
      sendNotif('Jarvis — Mail skickat!', `Mail till ${to} har skickats.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStage('inbox');
    setSelected(null);
    setSummary('');
    setTo('');
    setSubject('');
    setDraft('');
    setError('');
    loadInbox();
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-1">Mail</h1>
      <p className="text-sm mb-8" style={{ color: '#555' }}>
        Jarvis läser, sammanfattar och skriver svar — du bekräftar innan det skickas.
      </p>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: '#2a0a0a', border: '1px solid #5a1a1a' }}>
          {error}
        </div>
      )}

      {/* INBOX */}
      {stage === 'inbox' && (
        <div className="flex flex-col gap-3">
          {!gmailConnected && !loadingInbox && (
            <div className="rounded-2xl p-6 border flex flex-col gap-3 text-center" style={{ background: '#141414', borderColor: '#222' }}>
              <p className="text-sm" style={{ color: '#555' }}>Gmail är inte kopplat.</p>
              <a href="/settings" className="text-sm text-white underline">Koppla Gmail i Inställningar →</a>
            </div>
          )}

          {loadingInbox && (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-2xl p-4 border" style={{ background: '#141414', borderColor: '#222' }}>
                  <div className="h-3 w-32 rounded mb-2" style={{ background: '#222' }} />
                  <div className="h-2 w-48 rounded" style={{ background: '#1a1a1a' }} />
                </div>
              ))}
            </div>
          )}

          {!loadingInbox && gmailConnected && messages.length === 0 && (
            <div className="rounded-2xl p-8 border text-center" style={{ background: '#141414', borderColor: '#222' }}>
              <p className="text-sm" style={{ color: '#555' }}>Ingen e-post i inkorgen.</p>
            </div>
          )}

          {!loadingInbox && messages.map(msg => (
            <button
              key={msg.id}
              onClick={() => openMessage(msg)}
              className="w-full rounded-2xl p-4 border text-left transition-colors"
              style={{ background: '#141414', borderColor: msg.isUnread ? '#333' : '#1a1a1a' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {msg.isUnread && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#fff' }} />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-sm truncate"
                        style={{ color: msg.isUnread ? '#fff' : '#888', fontWeight: msg.isUnread ? 600 : 400 }}
                      >
                        {parseSenderName(msg.from)}
                      </span>
                    </div>
                    <p
                      className="text-sm truncate"
                      style={{ color: msg.isUnread ? '#ccc' : '#555', fontWeight: msg.isUnread ? 500 : 400 }}
                    >
                      {msg.subject || '(inget ämne)'}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#444' }}>{msg.snippet}</p>
                  </div>
                </div>
                <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#444' }}>
                  {formatDate(msg.date)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* READING */}
      {stage === 'reading' && (
        <div className="flex flex-col gap-5">
          <button
            onClick={handleReset}
            className="text-sm self-start"
            style={{ color: '#555' }}
          >
            ← Tillbaka
          </button>

          {loadingMsg ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-5 border" style={{ background: '#141414', borderColor: '#222' }}>
                <div className="h-3 w-40 rounded mb-3" style={{ background: '#222' }} />
                <div className="h-2 w-full rounded mb-2" style={{ background: '#1a1a1a' }} />
                <div className="h-2 w-3/4 rounded" style={{ background: '#1a1a1a' }} />
              </div>
              <div className="rounded-2xl p-5 border" style={{ background: '#141414', borderColor: '#222' }}>
                <p className="text-sm" style={{ color: '#555' }}>Jarvis läser och skriver svar...</p>
              </div>
            </div>
          ) : selected && (
            <>
              {/* Original email */}
              <details className="rounded-2xl border overflow-hidden" style={{ background: '#141414', borderColor: '#222' }}>
                <summary className="px-5 py-4 cursor-pointer flex flex-col gap-0.5" style={{ listStyle: 'none' }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{parseSenderName(selected.from)}</span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#444' }}>{formatDate(selected.date)}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#555' }}>{selected.subject}</span>
                  <span className="text-xs mt-1" style={{ color: '#333' }}>Klicka för att läsa originalet ↓</span>
                </summary>
                <div className="px-5 pb-5 border-t" style={{ borderColor: '#222' }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap mt-4" style={{ color: '#888' }}>
                    {selected.body || selected.snippet}
                  </p>
                </div>
              </details>

              {/* AI summary */}
              {summary && (
                <div className="rounded-2xl px-4 py-3 flex gap-3" style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}>
                  <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }}>Jarvis</span>
                  <p className="text-sm leading-relaxed" style={{ color: '#86efac' }}>{summary}</p>
                </div>
              )}

              {/* Calendar context */}
              {calEvents.length > 0 && (
                <div className="rounded-2xl px-4 py-3" style={{ background: '#0a0f1a', border: '1px solid #1a2a3a' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#555' }}>Din kalender</p>
                  <div className="flex flex-col gap-1">
                    {calEvents.slice(0, 3).map(e => (
                      <p key={e.id} className="text-xs" style={{ color: '#4a7aa8' }}>
                        {formatEventTime(e.startDate)} — {e.title}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* To / Subject */}
              <div className="rounded-2xl p-4 border flex flex-col gap-3" style={{ background: '#141414', borderColor: '#222' }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Till</label>
                  <input
                    type="email"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{ background: '#0a0a0a', border: '1px solid #222' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Ämne</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{ background: '#0a0a0a', border: '1px solid #222' }}
                  />
                </div>
              </div>

              {/* Draft */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>
                  Svar — redigera fritt
                </label>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-4 rounded-xl text-sm leading-relaxed outline-none resize-none"
                  style={{ background: '#141414', border: '1px solid #2a2a2a', color: '#fff' }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStage('confirm')}
                  disabled={!draft.trim() || !to}
                  className="flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-30"
                  style={{ background: '#fff', color: '#000' }}
                >
                  Granska & Skicka →
                </button>
                <button
                  onClick={() => setStage('confirm')}
                  disabled={!draft.trim() || !to}
                  className="px-5 py-4 rounded-xl text-sm font-semibold disabled:opacity-30"
                  style={{ background: '#141414', color: '#ccc', border: '1px solid #222' }}
                >
                  Skicka direkt
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* CONFIRM */}
      {stage === 'confirm' && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141414', borderColor: '#222' }}>
            <h2 className="text-lg font-bold text-white">Bekräfta och skicka</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex gap-3">
                <span style={{ color: '#555', minWidth: '48px' }}>Till:</span>
                <span className="text-white">{to || '(ingen)'}</span>
              </div>
              <div className="flex gap-3">
                <span style={{ color: '#555', minWidth: '48px' }}>Ämne:</span>
                <span className="text-white">{subject || '(inget)'}</span>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#aaa' }}>{draft}</p>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: '#2a0a0a', border: '1px solid #5a1a1a' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStage('reading')}
              className="px-5 py-4 rounded-xl text-sm font-semibold"
              style={{ background: '#141414', color: '#555', border: '1px solid #222' }}
            >
              ← Redigera
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to}
              className="flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-30 flex items-center justify-center gap-2"
              style={{ background: '#fff', color: '#000' }}
            >
              {sending ? 'Skickar...' : '✉ Skicka'}
            </button>
          </div>
        </div>
      )}

      {/* SENT */}
      {stage === 'sent' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ background: '#0f1f0f', border: '1px solid #1a3a1a' }}
          >
            ✓
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Skickat!</h2>
            <p className="text-sm" style={{ color: '#555' }}>
              Ditt mail till <span className="text-white">{to}</span> har skickats.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-xl font-semibold text-sm"
            style={{ background: '#141414', color: '#fff', border: '1px solid #222' }}
          >
            Tillbaka till inkorgen
          </button>
        </div>
      )}
    </div>
  );
}
