'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const WIZARD_KEY = 'jarvis_wizard_done';

const steps = [
  {
    icon: '✦',
    title: 'Välkommen till Jarvis',
    description: 'Din personliga AI-assistent som hjälper dig med planering, mail, resor och mycket mer. Låt oss visa dig runt.',
    action: null,
  },
  {
    icon: '◉',
    title: 'Chatten — din direktlinje',
    description: 'Skriv vad som helst. Fråga om ditt schema, be om hjälp med ett mail, eller säg "Kom ihåg att..." så sparar Jarvis det åt dig.',
    examples: ['"Hur ser min dag ut?"', '"Kom ihåg att mötet är flyttat"', '"Hjälp mig svara på detta mail"'],
    action: { label: 'Gå till Chatten', href: '/chat' },
  },
  {
    icon: '◎',
    title: 'Resa — planera din väg',
    description: 'Jarvis hämtar din GPS och visar snabbaste vägen hem eller till valfri destination — med karta och restid för alla färdmedel.',
    examples: ['"Planera väg hem"', 'Sök vilken adress som helst', 'Välj bil, cykel, gång eller buss'],
    action: { label: 'Testa Resa', href: '/travel' },
  },
  {
    icon: '✉',
    title: 'Mail — skriv svar på sekunder',
    description: 'Klistra in ett mail du fått. Jarvis läser det, kollar din kalender och skriver ett färdigt svar. Du godkänner och sparar direkt till Gmail.',
    examples: ['"Hjälp mig svara på detta"', 'Redigera förslaget direkt', '"Spara utkast i Gmail"'],
    action: { label: 'Testa Mail', href: '/mail' },
  },
  {
    icon: '▣',
    title: 'Minne — kom ihåg allt',
    description: 'Allt du ber Jarvis komma ihåg sparas automatiskt och visas här. Inget manuellt skrivande — bara prata med Jarvis i chatten.',
    examples: ['"Kom ihåg att jag gillar kaffe"', '"Min mammas födelsedag är 15 maj"', '"Spara idén om..."'],
    action: { label: 'Se Minne', href: '/memory' },
  },
  {
    icon: '⚙',
    title: 'Inställningar — koppla dina tjänster',
    description: 'Koppla Google för att ge Jarvis tillgång till din kalender och Gmail. Fyll i ditt namn och hemadress för ännu smartare svar.',
    examples: ['Koppla Google Kalender + Gmail', 'Lägg till hemadress', 'Fyll i ditt namn'],
    action: { label: 'Gå till Inställningar', href: '/settings' },
  },
];

export default function WizardGuide() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(WIZARD_KEY);
    if (!done) setTimeout(() => setOpen(true), 800);

    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener('open-wizard', handler);
    return () => window.removeEventListener('open-wizard', handler);
  }, []);

  const close = () => {
    localStorage.setItem(WIZARD_KEY, 'true');
    setOpen(false);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else close();
  };

  const prev = () => setStep(s => s - 1);

  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  if (!open) return null;

  const current = steps[step];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={close}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col"
        style={{
          bottom: '2rem',
          right: '2rem',
          width: '360px',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0">
          {steps.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-0.5 rounded-full transition-all duration-300 cursor-pointer"
              style={{ background: i <= step ? '#fff' : '#2a2a2a' }}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <span className="text-2xl">{current.icon}</span>
            <button onClick={close} className="text-xl leading-none" style={{ color: '#333' }}>×</button>
          </div>

          <div>
            <h2 className="text-xl font-black text-white mb-2">{current.title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#888' }}>{current.description}</p>
          </div>

          {current.examples && (
            <div className="flex flex-col gap-1.5">
              {current.examples.map(ex => (
                <div
                  key={ex}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{ background: '#0a0a0a', color: '#555', border: '1px solid #1a1a1a' }}
                >
                  {ex}
                </div>
              ))}
            </div>
          )}

          {/* Knappar */}
          <div className="flex gap-2 mt-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#0a0a0a', color: '#555', border: '1px solid #1a1a1a' }}
              >
                ←
              </button>
            )}

            {current.action && (
              <button
                onClick={() => goTo(current.action!.href)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a' }}
              >
                {current.action.label}
              </button>
            )}

            <button
              onClick={next}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: '#fff', color: '#000' }}
            >
              {step === steps.length - 1 ? 'Kom igång' : 'Nästa'}
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: '#333' }}>
            {step + 1} / {steps.length}
          </p>
        </div>
      </div>
    </>
  );
}
