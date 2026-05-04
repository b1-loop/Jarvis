'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Reminder } from '@/types';

const REMINDERS_KEY = 'jarvis_reminders';
const RADIUS_KM = 5;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function load(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]'); } catch { return []; }
}
function save(r: Reminder[]) { localStorage.setItem(REMINDERS_KEY, JSON.stringify(r)); }

type TriggerAt = 'home' | 'work' | 'both';

const TRIGGER_OPTIONS: { value: TriggerAt; label: string; icon: string }[] = [
  { value: 'home', label: 'Hem',    icon: '🏠' },
  { value: 'work', label: 'Jobb',   icon: '🏢' },
  { value: 'both', label: 'Båda',   icon: '📍' },
];

function triggerLabel(t: TriggerAt) {
  return TRIGGER_OPTIONS.find(o => o.value === t)!;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [input, setInput] = useState('');
  const [triggerAt, setTriggerAt] = useState<TriggerAt>('home');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [distances, setDistances] = useState<{ home: number | null; work: number | null }>({ home: null, work: null });

  useEffect(() => {
    setReminders(load());
    setPermission(Notification.permission);
    const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
    setHomeAddress(localStorage.getItem('jarvis_home_address') || profile.homeAddress || '');
    setWorkAddress(profile.workAddress || '');
  }, []);

  const checkDistances = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      const user = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      const getCoords = (cacheKey: string, addr: string) => {
        const c = localStorage.getItem(cacheKey);
        if (!c) return null;
        const p = JSON.parse(c);
        return p.address === addr ? { lat: p.lat, lng: p.lng } : null;
      };

      const homeCoords = getCoords('jarvis_home_coords_cache', homeAddress);
      const workCoords = getCoords('jarvis_work_coords_cache', workAddress);

      setDistances({
        home: homeCoords ? Math.round(haversineKm(user, homeCoords) * 10) / 10 : null,
        work: workCoords ? Math.round(haversineKm(user, workCoords) * 10) / 10 : null,
      });
    });
  }, [homeAddress, workAddress]);

  useEffect(() => {
    if (homeAddress || workAddress) checkDistances();
  }, [homeAddress, workAddress, checkDistances]);

  const requestPermission = async () => {
    const r = await Notification.requestPermission();
    setPermission(r);
  };

  const addReminder = () => {
    if (!input.trim()) return;
    const r: Reminder = {
      id: crypto.randomUUID(),
      text: input.trim(),
      active: true,
      triggerAt,
      createdAt: new Date().toISOString(),
    };
    const updated = [r, ...reminders];
    setReminders(updated);
    save(updated);
    setInput('');
  };

  const toggle = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setReminders(updated);
    save(updated);
  };

  const remove = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    save(updated);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const noAddresses = !homeAddress && !workAddress;

  return (
    <div className="p-8 max-w-xl">
      <p className="text-xs font-semibold mb-1" style={{ color: '#444', letterSpacing: '0.1em' }}>PÅMINNELSER</p>
      <h1 className="text-3xl font-black text-white mb-1">Påminn mig</h1>
      <p className="text-sm mb-8" style={{ color: '#555' }}>
        Du får en notis när du är inom {RADIUS_KM} km från vald plats.
      </p>

      {/* Notisbehörighet */}
      {permission !== 'granted' && (
        <div className="rounded-xl p-4 mb-6 flex items-center justify-between gap-4"
          style={{ background: '#1a1208', border: '1px solid #3a2a10' }}>
          <div>
            <p className="text-sm font-semibold text-white">Notiser inte aktiverade</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              {permission === 'denied'
                ? 'Tillåt notiser i webbläsarens inställningar.'
                : 'Tillåt notiser för att ta emot påminnelser.'}
            </p>
          </div>
          {permission !== 'denied' && (
            <button onClick={requestPermission}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: '#fff', color: '#000' }}>
              Tillåt
            </button>
          )}
        </div>
      )}

      {/* Adresser + avstånd */}
      {noAddresses ? (
        <div className="rounded-xl p-4 mb-6" style={{ background: '#141414', border: '1px solid #222' }}>
          <p className="text-sm" style={{ color: '#555' }}>
            Lägg till hem- eller jobbadress under{' '}
            <a href="/settings" className="text-white underline">Inställningar</a>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Hem', icon: '🏠', addr: homeAddress, dist: distances.home },
            { label: 'Jobb', icon: '🏢', addr: workAddress, dist: distances.work },
          ].map(({ label, icon, addr, dist }) => addr ? (
            <div key={label} className="rounded-xl p-3 flex flex-col gap-1"
              style={{ background: '#141414', border: `1px solid ${dist !== null && dist <= RADIUS_KM ? '#2a3a2a' : '#222'}` }}>
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-xs font-semibold text-white">{label}</span>
                {dist !== null && dist <= RADIUS_KM && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1a3a1a', color: '#4ade80' }}>i zonen</span>
                )}
              </div>
              <p className="text-xs truncate" style={{ color: '#555' }}>{addr}</p>
              {dist !== null && (
                <p className="text-xs font-semibold" style={{ color: '#888' }}>{dist} km bort</p>
              )}
            </div>
          ) : null)}
        </div>
      )}

      {/* Formulär */}
      <div className="flex flex-col gap-3 mb-8">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addReminder()}
          placeholder="T.ex. köp mjölk, hämta paket..."
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
          style={{ background: '#141414', border: '1px solid #222' }}
        />

        {/* Platsvälj */}
        <div className="flex gap-2">
          {TRIGGER_OPTIONS.map(opt => {
            const available = (opt.value === 'home' || opt.value === 'both') ? !!homeAddress : !!workAddress;
            if (opt.value === 'both' && (!homeAddress || !workAddress)) return null;
            return (
              <button
                key={opt.value}
                onClick={() => setTriggerAt(opt.value)}
                disabled={!available}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30"
                style={{
                  background: triggerAt === opt.value ? '#fff' : '#141414',
                  color: triggerAt === opt.value ? '#000' : '#666',
                  border: `1px solid ${triggerAt === opt.value ? '#fff' : '#2a2a2a'}`,
                }}
              >
                {opt.icon} {opt.label}
              </button>
            );
          })}
          <button
            onClick={addReminder}
            disabled={!input.trim()}
            className="px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-30"
            style={{ background: '#fff', color: '#000' }}
          >
            + Lägg till
          </button>
        </div>
      </div>

      {/* Lista */}
      {reminders.length === 0 ? (
        <p className="text-sm text-center mt-12" style={{ color: '#333' }}>Inga påminnelser ännu.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map(r => {
            const trig = triggerLabel(r.triggerAt);
            return (
              <div
                key={r.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: '#141414',
                  border: `1px solid ${r.active ? '#2a2a2a' : '#1a1a1a'}`,
                  opacity: r.active ? 1 : 0.5,
                }}
              >
                {/* Toggle */}
                <button
                  onClick={() => toggle(r.id)}
                  className="mt-0.5 w-9 h-5 rounded-full transition-colors relative shrink-0"
                  style={{ background: r.active ? '#fff' : '#2a2a2a' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{ background: r.active ? '#000' : '#555', left: r.active ? '18px' : '2px' }}
                  />
                </button>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{r.text}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#1e1e1e', color: '#666' }}
                    >
                      {trig.icon} {trig.label}
                    </span>
                    <span className="text-xs" style={{ color: '#444' }}>
                      {fmtDate(r.createdAt)}
                      {r.lastTriggered && ` · Notifierad ${fmtDate(r.lastTriggered)}`}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => remove(r.id)}
                  className="shrink-0 text-lg leading-none hover:text-white transition-colors"
                  style={{ color: '#333' }}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
