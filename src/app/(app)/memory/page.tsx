'use client';
import { useState, useEffect } from 'react';

type MemoryItem = { id: string; text: string; savedAt: string };

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('jarvis_memory');
    if (raw) setMemories(JSON.parse(raw));
  }, []);

  const deleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    localStorage.setItem('jarvis_memory', JSON.stringify(updated));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-black text-white mb-1">Minne</h1>
      <p className="text-sm mb-8" style={{ color: '#555' }}>
        {memories.length === 0 ? 'Inget sparat ännu' : `${memories.length} sak${memories.length !== 1 ? 'er' : ''} sparade`}
      </p>

      {memories.length === 0 ? (
        <div className="rounded-2xl p-8 text-center border" style={{ background: '#141414', borderColor: '#222' }}>
          <p className="text-4xl mb-4">🧠</p>
          <p className="text-white font-semibold mb-2">Inget sparat ännu.</p>
          <p className="text-sm" style={{ color: '#444' }}>Skriv i chatten: "Kom ihåg att..." så sparar Jarvis det här.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {memories.map(m => (
            <div key={m.id} className="rounded-2xl p-5 border flex justify-between items-start gap-4" style={{ background: '#141414', borderColor: '#222' }}>
              <div>
                <p className="text-white text-sm leading-relaxed mb-2">{m.text}</p>
                <p className="text-xs" style={{ color: '#444' }}>{formatDate(m.savedAt)}</p>
              </div>
              <button
                onClick={() => deleteMemory(m.id)}
                className="text-xs shrink-0 hover:text-red-400 transition-colors"
                style={{ color: '#333' }}
              >
                Ta bort
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
