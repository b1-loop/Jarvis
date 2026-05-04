'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Profile = {
  name: string;
  homeAddress: string;
  workAddress: string;
  phone: string;
  city: string;
};

const PROFILE_KEY = 'jarvis_profile';
const defaultProfile: Profile = { name: '', homeAddress: '', workAddress: '', phone: '', city: '' };

export default function SettingsPage() {
  const params = useSearchParams();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [calConnected, setCalConnected] = useState(false);
  const [calStatus, setCalStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) setProfile(JSON.parse(raw));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
    checkCalendar();

    if (params.get('cal') === 'success') setCalStatus('ok');
    if (params.get('cal') === 'error') setCalStatus('error');
  }, []);

  const checkCalendar = async () => {
    const res = await fetch('/api/calendar');
    const data = await res.json();
    setCalConnected(data.connected === true);
  };

  const connectGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const disconnectGoogle = async () => {
    await fetch('/api/calendar', { method: 'DELETE' });
    setCalConnected(false);
    setCalStatus('idle');
  };

  const handleSave = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(prev => ({ ...prev, [key]: e.target.value }));

  const Field = ({ label, value, onChange, placeholder, readOnly, hint }: {
    label: string; value: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string; readOnly?: boolean; hint?: string;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>{label}</label>
      <input
        value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
        style={{ background: readOnly ? '#0f0f0f' : '#141414', border: '1px solid #222', color: readOnly ? '#444' : '#fff', cursor: readOnly ? 'default' : 'text' }}
      />
      {hint && <p className="text-xs" style={{ color: '#444' }}>{hint}</p>}
    </div>
  );

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-3xl font-black text-white mb-1">Inställningar</h1>
      <p className="text-sm mb-10" style={{ color: '#555' }}>Dina uppgifter används av Jarvis för att ge bättre svar.</p>

      <div className="flex flex-col gap-8">

        {/* Konto */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#333' }}>Konto</h2>
          <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141414', borderColor: '#222' }}>
            <Field label="E-post" value={email} readOnly hint="Ändras via Supabase-kontot." />
          </div>
        </section>

        {/* Personligt */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#333' }}>Personligt</h2>
          <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141414', borderColor: '#222' }}>
            <Field label="Namn" value={profile.name} onChange={set('name')} placeholder="T.ex. Erik Andersson" />
            <Field label="Telefon" value={profile.phone} onChange={set('phone')} placeholder="T.ex. 070-123 45 67" />
            <Field label="Stad" value={profile.city} onChange={set('city')} placeholder="T.ex. Stockholm" />
          </div>
        </section>

        {/* Adresser */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#333' }}>Adresser</h2>
          <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141414', borderColor: '#222' }}>
            <Field label="Hemadress" value={profile.homeAddress} onChange={set('homeAddress')}
              placeholder="T.ex. Drottninggatan 1, Stockholm" hint="Används för resplanering och Jarvis Loop." />
            <Field label="Jobbadress" value={profile.workAddress} onChange={set('workAddress')}
              placeholder="T.ex. Kungsgatan 10, Stockholm" hint="Används när du frågar om vägen till jobbet." />
          </div>
        </section>

        {/* Google */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#333' }}>Google</h2>
          <div className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141414', borderColor: '#222' }}>
            {calConnected ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <div>
                      <p className="text-sm text-white font-semibold">Google ansluten</p>
                      <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Kalender + Gmail är aktiva</p>
                    </div>
                  </div>
                  <button onClick={disconnectGoogle} className="text-sm hover:text-white transition-colors" style={{ color: '#555' }}>
                    Koppla bort
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {['📅  Kalender — Jarvis ser dina möten', '✉️  Gmail — Jarvis sparar utkast direkt i inkorgen'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-xs" style={{ color: '#555' }}>
                      <span style={{ color: '#4ade80' }}>✓</span> {t}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: '#555' }}>
                  Ett klick ger Jarvis tillgång till din kalender och Gmail — du behöver bara godkänna.
                </p>
                <div className="flex flex-col gap-2">
                  {['📅  Kalender — Jarvis ser dina möten automatiskt', '✉️  Gmail — Jarvis sparar utkast direkt i din inkorg'].map(t => (
                    <div key={t} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
                      <span className="text-sm" style={{ color: '#aaa' }}>{t}</span>
                    </div>
                  ))}
                </div>
                {calStatus === 'error' && (
                  <p className="text-sm text-red-400">Anslutningen misslyckades. Försök igen.</p>
                )}
                <button
                  onClick={connectGoogle}
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                  style={{ background: '#fff', color: '#000' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Koppla Google — Kalender + Gmail
                </button>
              </>
            )}
          </div>
        </section>

        {/* Spara */}
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-xl font-bold text-base transition-all"
          style={{ background: saved ? '#1a3a1a' : '#fff', color: saved ? '#cfffcf' : '#000', border: saved ? '1px solid #2a5a2a' : 'none' }}
        >
          {saved ? '✓ Sparat!' : 'Spara uppgifter'}
        </button>
      </div>
    </div>
  );
}
