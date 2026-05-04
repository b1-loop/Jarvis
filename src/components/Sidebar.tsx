'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const nav = [
  { href: '/dashboard', label: 'Hem',         icon: '◈' },
  { href: '/chat',      label: 'Chatt',        icon: '◉' },
  { href: '/calendar',  label: 'Kalender',     icon: '▦' },
  { href: '/travel',    label: 'Resa',         icon: '◎' },
  { href: '/mail',      label: 'Mail',         icon: '✉' },
  { href: '/reminders', label: 'Påminnelser',   icon: '⊙' },
  { href: '/memory',    label: 'Minne',        icon: '▣' },
  { href: '/settings',  label: 'Inställningar',icon: '⚙' },
];

const openWizard = () => window.dispatchEvent(new Event('open-wizard'));

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="flex flex-col w-56 shrink-0 h-full border-r" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
      <div className="px-6 py-8">
        <span className="text-white font-black tracking-[0.25em] text-sm">JARVIS</span>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
        {nav.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? '#1a1a1a' : 'transparent',
                color: active ? '#fff' : '#555',
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6 flex flex-col gap-1">
        <button
          onClick={openWizard}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:text-white"
          style={{ color: '#555' }}
        >
          <span className="text-base">◌</span> Guide
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:text-white"
          style={{ color: '#333' }}
        >
          <span>→</span> Logga ut
        </button>
      </div>
    </aside>
  );
}
