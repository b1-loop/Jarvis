'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  routeDest?: string;
};

function extractTags(text: string): {
  clean: string;
  memory: string | null;
  reminder: { text: string; triggerAt: 'home' | 'work' | 'both' } | null;
  routeDest: string | null;
} {
  let clean = text;
  let memory: string | null = null;
  let reminder: { text: string; triggerAt: 'home' | 'work' | 'both' } | null = null;
  let routeDest: string | null = null;

  const memMatch = clean.match(/\[SPARA:\s*(.+?)\]/s);
  if (memMatch) {
    memory = memMatch[1].trim();
    clean = clean.replace(memMatch[0], '').trim();
  }

  const remMatch = clean.match(/\[PÅMINN:\s*(.+?)\s*@\s*(hem|jobb|båda)\s*\]/si);
  if (remMatch) {
    const loc = remMatch[2].toLowerCase();
    const triggerAt = loc === 'hem' ? 'home' : loc === 'jobb' ? 'work' : 'both';
    reminder = { text: remMatch[1].trim(), triggerAt: triggerAt as 'home' | 'work' | 'both' };
    clean = clean.replace(remMatch[0], '').trim();
  }

  const resaMatch = clean.match(/\[RESA:\s*(.+?)\]/si);
  if (resaMatch) {
    routeDest = resaMatch[1].trim();
    clean = clean.replace(resaMatch[0], '').trim();
  }

  return { clean, memory, reminder, routeDest };
}

function isCalendarTrigger(text: string) {
  return /kalender|möte|schema|agenda|händelse/i.test(text);
}

function isLocationTrigger(text: string) {
  return /hej|god morgon|god kväll|dag|resa|hem|plats|var är|åka|rutt|navigera|härifrån|vägen|dit|karta|minuter|kilometer/i.test(text);
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!MAPS_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}&language=sv`
    );
    const data = await res.json();
    return data.results?.[0]?.formatted_address ?? null;
  } catch {
    return null;
  }
}

async function buildContext(
  location: GeolocationCoordinates | null,
  includeCalendar: boolean
): Promise<string> {
  const lines = [
    `Aktuell tid: ${new Date().toLocaleString('sv-SE', { weekday: 'long', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })}`,
  ];

  const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
  const homeAddress = profile.homeAddress || localStorage.getItem('jarvis_home_address') || '';

  if (profile.name) lines.push(`Användarens namn: ${profile.name}`);
  if (profile.city) lines.push(`Stad: ${profile.city}`);
  if (homeAddress) lines.push(`Hemadress: ${homeAddress}`);
  if (profile.workAddress) lines.push(`Jobbadress: ${profile.workAddress}`);

  if (location) {
    lines.push(`Nuvarande plats (GPS): ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
    const addr = await reverseGeocode(location.latitude, location.longitude);
    if (addr) lines.push(`Nuvarande adress: ${addr}`);
  }

  if (includeCalendar) {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (data.events?.length) {
        const fmt = (iso: string) =>
          new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const eventLines = (data.events as any[]).map(
          e => `- ${fmt(e.startDate)} ${e.title}${e.location ? ` (${e.location})` : ''}`
        );
        lines.push(`\nKommande möten (närmaste 24h):\n${eventLines.join('\n')}`);
      }
    } catch {}
  }

  return lines.join('\n');
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hej! Jag är Jarvis. Hur kan jag hjälpa dig idag?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getLocation = (): Promise<GeolocationCoordinates | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(p => resolve(p.coords), () => resolve(null), { timeout: 5000 });
    });

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const needsLocation = isLocationTrigger(text);
    const needsCalendar = isCalendarTrigger(text);

    let coords: GeolocationCoordinates | null = null;
    if (needsLocation) coords = await getLocation();

    const context = await buildContext(coords, needsCalendar);

    const homeMatch = text.match(/min hemadress är (.+)/i);
    if (homeMatch) localStorage.setItem('jarvis_home_address', homeMatch[1].trim());

    try {
      const history = messages
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const { clean, memory, reminder, routeDest } = extractTags(data.content);

      if (memory) {
        const raw = localStorage.getItem('jarvis_memory');
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem('jarvis_memory', JSON.stringify([
          { id: Date.now().toString(), text: memory, savedAt: new Date().toISOString() },
          ...existing,
        ]));
      }

      if (reminder) {
        const raw = localStorage.getItem('jarvis_reminders');
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem('jarvis_reminders', JSON.stringify([
          {
            id: crypto.randomUUID(),
            text: reminder.text,
            active: true,
            triggerAt: reminder.triggerAt,
            createdAt: new Date().toISOString(),
          },
          ...existing,
        ]));
      }

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: clean, routeDest: routeDest ?? undefined },
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: `Fel: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex items-center" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-sm font-black tracking-[0.25em] text-white">CHATT</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user'
                ? { background: '#fff', color: '#000' }
                : { background: '#141414', color: '#fff', border: '1px solid #222' }
              }
            >
              {m.content}
            </div>
            {m.routeDest && (
              <button
                onClick={() => router.push(`/travel?to=${encodeURIComponent(m.routeDest!)}`)}
                className="mt-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#141414', color: '#fff', border: '1px solid #2a2a2a' }}
              >
                🗺 Planera rutt till {m.routeDest} →
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: '#141414', color: '#555', border: '1px solid #222' }}>
              Jarvis tänker...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t flex gap-3 items-end" style={{ borderColor: '#1a1a1a' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Skriv ett meddelande... (Enter för att skicka)"
          rows={1}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
          style={{ background: '#141414', border: '1px solid #222', maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
          style={{ background: '#fff', color: '#000' }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
