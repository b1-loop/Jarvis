'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PROFILE_KEY = 'jarvis_profile';
const ONBOARDING_KEY = 'jarvis_onboarded';

type Step = 'name' | 'calendar' | 'address' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [calConnected, setCalConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Om Google Calendar callback
    if (params.get('cal') === 'success') {
      setCalConnected(true);
      setStep('address');
    }
    // Hämta befintlig profil
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.name) setName(p.name);
      if (p.homeAddress) setHomeAddress(p.homeAddress);
    }
    // Kolla om kalender redan är kopplad
    fetch('/api/calendar').then(r => r.json()).then(d => {
      if (d.connected) setCalConnected(true);
    });
  }, []);

  const saveProfile = (extra: object = {}) => {
    const raw = localStorage.getItem(PROFILE_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...existing, name, homeAddress, ...extra }));
    localStorage.setItem('jarvis_home_address', homeAddress);
  };

  const finish = () => {
    saveProfile();
    localStorage.setItem(ONBOARDING_KEY, 'true');
    router.push('/dashboard');
  };

  const connectGoogle = () => {
    saveProfile();
    window.location.href = `/api/auth/google?redirect=/onboarding`;
  };

  const steps: Step[] = ['name', 'calendar', 'address'];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <h1 className="text-3xl font-black tracking-[0.3em] text-center text-white mb-12">JARVIS</h1>

        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {steps.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i <= stepIndex ? '#fff' : '#222' }}
            />
          ))}
        </div>

        {/* Steg 1 — Namn */}
        {step === 'name' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Vad heter du?</h2>
              <p className="text-sm" style={{ color: '#555' }}>Jarvis använder ditt namn för att hälsa dig på ett personligt sätt.</p>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Ditt namn"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep('calendar'); }}
              className="w-full px-4 py-4 rounded-xl text-white text-base outline-none"
              style={{ background: '#141414', border: '1px solid #222' }}
            />
            <button
              onClick={() => setStep('calendar')}
              disabled={!name.trim()}
              className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-30 transition-opacity"
              style={{ background: '#fff', color: '#000' }}
            >
              Fortsätt
            </button>
          </div>
        )}

        {/* Steg 2 — Kalender */}
        {step === 'calendar' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Koppla Google</h2>
              <p className="text-sm mb-4" style={{ color: '#555' }}>
                Ett klick — godkänn så är Jarvis redo att hjälpa dig.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: '📅', text: 'Kalender — Jarvis ser dina möten automatiskt' },
                  { icon: '✉️', text: 'Gmail — Jarvis sparar utkast direkt i din inkorg' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#141414', border: '1px solid #222' }}>
                    <span>{item.icon}</span>
                    <span className="text-sm" style={{ color: '#aaa' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {calConnected ? (
              <div className="rounded-2xl p-5 border flex items-center gap-4" style={{ background: '#0f1f0f', borderColor: '#1a3a1a' }}>
                <div className="w-3 h-3 rounded-full bg-green-400 shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">Google ansluten</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4ade80' }}>Kalender + Gmail är aktiverade</p>
                </div>
              </div>
            ) : (
              <button
                onClick={connectGoogle}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
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
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('address')}
                className="flex-1 py-4 rounded-xl font-bold text-base transition-opacity"
                style={{ background: calConnected ? '#fff' : '#141414', color: calConnected ? '#000' : '#555', border: calConnected ? 'none' : '1px solid #222' }}
              >
                {calConnected ? 'Fortsätt' : 'Hoppa över'}
              </button>
            </div>
          </div>
        )}

        {/* Steg 3 — Hemadress */}
        {step === 'address' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Din hemadress</h2>
              <p className="text-sm" style={{ color: '#555' }}>
                Används för att planera resor och beräkna restid automatiskt.
              </p>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="T.ex. Drottninggatan 1, Stockholm"
              value={homeAddress}
              onChange={e => setHomeAddress(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') finish(); }}
              className="w-full px-4 py-4 rounded-xl text-white text-base outline-none"
              style={{ background: '#141414', border: '1px solid #222' }}
            />
            <div className="flex gap-3">
              <button
                onClick={finish}
                disabled={loading}
                className="flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-30"
                style={{ background: '#fff', color: '#000' }}
              >
                {homeAddress.trim() ? 'Kom igång' : 'Hoppa över'}
              </button>
            </div>
          </div>
        )}

        {/* Hoppa över hela */}
        {step !== 'address' && (
          <button
            onClick={finish}
            className="w-full mt-4 py-2 text-sm transition-colors hover:text-white"
            style={{ color: '#333' }}
          >
            Hoppa över allt
          </button>
        )}
      </div>
    </div>
  );
}
