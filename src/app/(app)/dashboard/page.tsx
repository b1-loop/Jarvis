'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type MemoryItem = { id: string; text: string; savedAt: string };
type CalEvent = { id: string; title: string; startDate: string; endDate: string; location?: string };

export default function DashboardPage() {
  const [userName, setUserName] = useState('');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [homeAddress, setHomeAddress] = useState('');
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState('');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'God morgon';
    if (h < 18) return 'God eftermiddag';
    return 'God kväll';
  };

  useEffect(() => {
    const profileRaw = localStorage.getItem('jarvis_profile');
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      setUserName(p.name || '');
      setHomeAddress(p.homeAddress || '');
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setUserName(data.user.email.split('@')[0]);
      });
      const addr = localStorage.getItem('jarvis_home_address');
      if (addr) setHomeAddress(addr);
    }

    const raw = localStorage.getItem('jarvis_memory');
    if (raw) setMemories(JSON.parse(raw).slice(0, 3));

    const icalUrl = localStorage.getItem('jarvis_ical_url');
    if (icalUrl) fetchCalendar(icalUrl);
  }, []);

  const fetchCalendar = async (url: string) => {
    setCalLoading(true);
    setCalError('');
    try {
      const res = await fetch(`/api/calendar?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEvents(data.events);
    } catch (e: any) {
      setCalError('Kunde inte hämta kalender.');
    } finally {
      setCalLoading(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  const Widget = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-5 border" style={{ background: '#141414', borderColor: '#222' }}>
      <p className="text-sm font-semibold mb-4 text-white">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <p className="text-sm mb-1" style={{ color: '#555', letterSpacing: '0.05em' }}>{greeting()}</p>
      <h1 className="text-3xl font-black text-white mb-8 capitalize">{userName || 'Jarvis är redo.'}</h1>

      <div className="flex flex-col gap-4">

        <Widget title="📅  Dagens schema">
          {calLoading && <p className="text-sm" style={{ color: '#555' }}>Hämtar kalender...</p>}
          {calError && <p className="text-sm text-red-400">{calError}</p>}
          {!calLoading && !calError && events.length === 0 && !localStorage.getItem('jarvis_ical_url') && (
            <p className="text-sm" style={{ color: '#444' }}>
              Lägg till din iCal-URL under{' '}
              <a href="/settings" className="text-white underline">Inställningar</a> för att se ditt schema.
            </p>
          )}
          {!calLoading && !calError && events.length === 0 && localStorage.getItem('jarvis_ical_url') && (
            <p className="text-sm" style={{ color: '#444' }}>Inga möten de närmaste 24 timmarna.</p>
          )}
          {events.map(e => (
            <div key={e.id} className="flex gap-4 mb-3 last:mb-0">
              <span className="text-sm shrink-0 w-12" style={{ color: '#555' }}>{fmt(e.startDate)}</span>
              <div>
                <p className="text-sm text-white">{e.title}</p>
                {e.location && <p className="text-xs mt-0.5" style={{ color: '#444' }}>{e.location}</p>}
              </div>
            </div>
          ))}
        </Widget>

        <Widget title="🧠  Minne">
          {memories.length === 0
            ? <p className="text-sm" style={{ color: '#444' }}>Inget sparat ännu. Skriv "Kom ihåg att..." i chatten.</p>
            : memories.map(m => <p key={m.id} className="text-sm mb-2" style={{ color: '#aaa' }}>· {m.text}</p>)
          }
        </Widget>

        <Widget title="🗺️  Resa">
          {homeAddress
            ? <p className="text-sm" style={{ color: '#aaa' }}>Hemadress: {homeAddress}</p>
            : <p className="text-sm" style={{ color: '#444' }}>Lägg till din hemadress under <a href="/settings" className="text-white underline">Inställningar</a>.</p>
          }
        </Widget>

      </div>
    </div>
  );
}
