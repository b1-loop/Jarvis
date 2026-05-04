'use client';
import { useState, useRef, useEffect } from 'react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

function extractMemory(text: string): { clean: string; memory: string | null } {
  const match = text.match(/\[SPARA:\s*(.+?)\]/s);
  if (!match) return { clean: text, memory: null };
  return { clean: text.replace(match[0], '').trim(), memory: match[1].trim() };
}

function isContextTrigger(text: string) {
  return /hej|god morgon|god kväll|kalender|möte|schema|dag|resa|hem|plats|var är/i.test(text);
}

function buildContext(location: GeolocationCoordinates | null): string {
  const lines = [`Aktuell tid: ${new Date().toLocaleString('sv-SE', { weekday: 'long', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'long' })}`];
  if (location) lines.push(`Nuvarande plats: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
  const homeAddress = localStorage.getItem('jarvis_home_address');
  if (homeAddress) lines.push(`Hemadress: ${homeAddress}`);
  return lines.join('\n');
}

export default function ChatPage() {
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

    let context: string | undefined;
    if (isContextTrigger(text)) {
      const coords = await getLocation();
      context = buildContext(coords);
    }

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

      const { clean, memory } = extractMemory(data.content);
      if (memory) {
        const raw = localStorage.getItem('jarvis_memory');
        const existing = raw ? JSON.parse(raw) : [];
        localStorage.setItem('jarvis_memory', JSON.stringify([
          { id: Date.now().toString(), text: memory, savedAt: new Date().toISOString() },
          ...existing,
        ]));
      }

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: clean }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `Fel: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center" style={{ borderColor: '#1a1a1a' }}>
        <span className="text-sm font-black tracking-[0.25em] text-white">CHATT</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user'
                ? { background: '#fff', color: '#000' }
                : { background: '#141414', color: '#fff', border: '1px solid #222' }
              }
            >
              {m.content}
            </div>
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

      {/* Input */}
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
