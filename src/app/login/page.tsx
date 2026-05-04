'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const onboarded = localStorage.getItem('jarvis_onboarded');
    router.push(onboarded ? '/dashboard' : '/onboarding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-black tracking-[0.3em] text-center text-white mb-2">JARVIS</h1>
        <p className="text-center text-sm mb-10" style={{ color: '#555', letterSpacing: '0.05em' }}>Din personliga AI-assistent</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
            placeholder="Lösenord"
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
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: '#555' }}>
          Inget konto?{' '}
          <Link href="/register" className="text-white hover:underline">Skapa ett här</Link>
        </p>
      </div>
    </div>
  );
}
