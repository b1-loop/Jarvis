'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Lösenordet måste vara minst 6 tecken.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else setDone(true); // Onboarding startar efter e-postbekräftelse → login → redirect
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-[0.3em] text-white mb-6">JARVIS</h1>
        <p className="text-white text-lg font-semibold mb-2">Konto skapat!</p>
        <p className="mb-6" style={{ color: '#555' }}>Bekräfta din e-post och logga sedan in.</p>
        <Link href="/login" className="text-white underline">Gå till inloggning</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-black tracking-[0.3em] text-center text-white mb-2">JARVIS</h1>
        <p className="text-center text-sm mb-10" style={{ color: '#555' }}>Skapa ditt konto</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-4 rounded-xl text-white text-base outline-none"
            style={{ background: '#141414', border: '1px solid #222' }}
          />
          <input
            type="password"
            placeholder="Lösenord (minst 6 tecken)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-4 rounded-xl text-white text-base outline-none"
            style={{ background: '#141414', border: '1px solid #222' }}
          />
          {error && <p className="text-sm text-red-400 px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-base mt-2 transition-opacity disabled:opacity-50"
            style={{ background: '#fff', color: '#000' }}
          >
            {loading ? 'Skapar konto...' : 'Skapa konto'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#555' }}>
          Har du redan ett konto?{' '}
          <Link href="/login" className="text-white hover:underline">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
