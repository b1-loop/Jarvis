'use client';
import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent, CreateEventParams } from '@/types';

type View = 'week' | 'month';

// --- Date helpers ---

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isAllDay(event: CalendarEvent): boolean {
  return !event.startDate.includes('T');
}

function fmtTime(iso: string): string {
  if (!iso.includes('T')) return 'Heldag';
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function fmtWeekHeader(monday: Date): string {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${monday.getDate()}–${sunday.getDate()} ${sunday.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}`;
  }
  return `${monday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function fmtMonthHeader(month: Date): string {
  return month.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
}

function monthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

const DAYS_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// --- Main component ---

function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [monday, setMonday] = useState<Date>(() => startOfWeek(new Date()));
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const fetchRange = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.connected === false
          ? 'Inte ansluten till Google. Gå till Inställningar och koppla ditt Google-konto.'
          : data.error || 'Kunde inte hämta kalender.');
        setEvents([]);
        return;
      }
      setEvents(data.events || []);
    } catch {
      setError('Något gick fel. Försök igen.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (view === 'week') {
      fetchRange(monday, addDays(monday, 7));
    } else {
      const grid = monthGrid(month);
      fetchRange(grid[0], addDays(grid[grid.length - 1], 1));
    }
  }, [view, monday, month, fetchRange]);

  useEffect(() => { refresh(); }, [refresh]);

  const today = new Date();

  const goToToday = () => {
    setMonday(startOfWeek(today));
    setMonth(startOfMonth(today));
  };

  const openModal = (date?: Date) => {
    setModalDate(date ?? today);
    setModalOpen(true);
  };

  const eventsForDay = (day: Date) =>
    events
      .filter(e => isSameDay(new Date(e.startDate), day))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const headerTitle = view === 'week'
    ? fmtWeekHeader(monday)
    : fmtMonthHeader(month).replace(/^\w/, c => c.toUpperCase());

  const onPrev = () => view === 'week' ? setMonday(m => addDays(m, -7)) : setMonth(m => addMonths(m, -1));
  const onNext = () => view === 'week' ? setMonday(m => addDays(m, 7)) : setMonth(m => addMonths(m, 1));

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#444', letterSpacing: '0.1em' }}>KALENDER</p>
          <h1 className="text-xl font-black text-white">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#2a2a2a' }}>
            {(['week', 'month'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: view === v ? '#ffffff' : '#1a1a1a', color: view === v ? '#000' : '#555' }}
              >
                {v === 'week' ? 'Vecka' : 'Månad'}
              </button>
            ))}
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#1a1a1a', color: '#aaa', border: '1px solid #2a2a2a' }}
          >
            Idag
          </button>
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:text-white"
            style={{ background: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }}
          >←</button>
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:text-white"
            style={{ background: '#1a1a1a', color: '#555', border: '1px solid #2a2a2a' }}
          >→</button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
            style={{ background: '#fff', color: '#000' }}
          >
            + Ny aktivitet
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-6 px-4 py-3 rounded-xl text-sm" style={{ background: '#1a0a0a', color: '#f87171', border: '1px solid #3a1a1a' }}>
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {view === 'week' ? (
          <WeekView
            days={Array.from({ length: 7 }, (_, i) => addDays(monday, i))}
            today={today}
            loading={loading}
            eventsForDay={eventsForDay}
            onDayClick={openModal}
            onEventClick={setSelectedEvent}
          />
        ) : (
          <MonthView
            grid={monthGrid(month)}
            month={month}
            today={today}
            loading={loading}
            eventsForDay={eventsForDay}
            onDayClick={openModal}
            onEventClick={setSelectedEvent}
          />
        )}
      </div>

      {modalOpen && (
        <CreateEventModal
          initialDate={modalDate ?? today}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); refresh(); }}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDeleted={() => { setSelectedEvent(null); refresh(); }}
        />
      )}
    </div>
  );
}

// --- Week view ---

function WeekView({ days, today, loading, eventsForDay, onDayClick, onEventClick }: {
  days: Date[];
  today: Date;
  loading: boolean;
  eventsForDay: (day: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-3" style={{ minHeight: '500px' }}>
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const dayEvents = eventsForDay(day);
        return (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="flex flex-col items-center pb-3 border-b cursor-pointer group"
              style={{ borderColor: '#1a1a1a' }}
              onClick={() => onDayClick(day)}
              title="Klicka för att lägga till aktivitet"
            >
              <span className="text-xs font-semibold mb-1" style={{ color: '#444' }}>{DAYS_SV[i]}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black group-hover:ring-1 ring-white/20 transition-all"
                style={isToday ? { background: '#fff', color: '#000' } : { color: '#666' }}
              >
                {day.getDate()}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {loading && <div className="rounded-lg animate-pulse" style={{ background: '#141414', height: '48px' }} />}
              {!loading && dayEvents.length === 0 && (
                <p className="text-center text-xs mt-4" style={{ color: '#2a2a2a' }}>·</p>
              )}
              {!loading && dayEvents.map(event => (
                <EventCard key={event.id} event={event} highlight={isToday} onClick={() => onEventClick(event)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Month view ---

function MonthView({ grid, month, today, loading, eventsForDay, onDayClick, onEventClick }: {
  grid: Date[];
  month: Date;
  today: Date;
  loading: boolean;
  eventsForDay: (day: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SV.map(d => (
          <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: '#444' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const dayEvents = eventsForDay(day);
          return (
            <div
              key={i}
              className="rounded-lg p-1.5 flex flex-col gap-1 cursor-pointer hover:border-white/10 transition-colors"
              style={{
                minHeight: '90px',
                background: isToday ? '#141408' : '#111',
                border: `1px solid ${isToday ? '#2a2a10' : '#181818'}`,
                opacity: isCurrentMonth ? 1 : 0.35,
              }}
              onClick={() => onDayClick(day)}
              title="Klicka för att lägga till aktivitet"
            >
              <div className="flex justify-end">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={isToday ? { background: '#fff', color: '#000' } : { color: '#555' }}
                >
                  {day.getDate()}
                </span>
              </div>
              {loading && isCurrentMonth && i < 7 && (
                <div className="rounded animate-pulse" style={{ background: '#1e1e1e', height: '16px' }} />
              )}
              {!loading && dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  className="rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: '#1e1e1e', border: '1px solid #252525' }}
                  title={`${event.title}${isAllDay(event) ? '' : ` · ${fmtTime(event.startDate)}`}`}
                  onClick={e => { e.stopPropagation(); onEventClick(event); }}
                >
                  <span className="text-xs text-white leading-none">{event.title}</span>
                </div>
              ))}
              {!loading && dayEvents.length > 3 && (
                <span className="text-xs px-1" style={{ color: '#444' }}>+{dayEvents.length - 3} till</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Shared event card (week view) ---

function EventCard({ event, highlight, onClick }: { event: CalendarEvent; highlight: boolean; onClick: () => void }) {
  return (
    <div
      className="rounded-lg px-2 py-2 flex flex-col gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        background: highlight ? '#1a1a0a' : '#141414',
        border: `1px solid ${highlight ? '#2a2a1a' : '#1e1e1e'}`,
      }}
      onClick={onClick}
    >
      <span className="text-xs font-bold text-white leading-tight line-clamp-2">{event.title}</span>
      <span className="text-xs" style={{ color: '#555' }}>
        {isAllDay(event) ? 'Heldag' : `${fmtTime(event.startDate)}–${fmtTime(event.endDate)}`}
      </span>
      {event.location && (
        <span className="text-xs truncate" style={{ color: '#444' }}>{event.location}</span>
      )}
    </div>
  );
}

// --- Event detail modal ---

function EventDetailModal({ event, onClose, onDeleted }: {
  event: CalendarEvent;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/calendar/${event.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte ta bort aktiviteten.');
      onDeleted();
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
      setConfirming(false);
    }
  };

  const fmtFull = (iso: string) => {
    if (!iso.includes('T')) {
      return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return new Date(iso).toLocaleString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '380px',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: '#1e1e1e' }}>
          <h2 className="text-base font-black text-white pr-4 leading-snug">{event.title}</h2>
          <button onClick={onClose} className="text-xl leading-none shrink-0 mt-0.5" style={{ color: '#444' }}>×</button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex gap-3">
            <span style={{ color: '#444' }}>◷</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-white">{fmtFull(event.startDate)}</span>
              {!isAllDay(event) && (
                <span className="text-xs" style={{ color: '#555' }}>till {fmtTime(event.endDate)}</span>
              )}
            </div>
          </div>
          {event.location && (
            <div className="flex gap-3">
              <span style={{ color: '#444' }}>◎</span>
              <span className="text-sm" style={{ color: '#aaa' }}>{event.location}</span>
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-6 pb-6">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#1a0808', color: '#f87171', border: '1px solid #3a1010' }}
            >
              Ta bort aktivitet
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-center mb-1" style={{ color: '#666' }}>Är du säker? Detta går inte att ångra.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#0a0a0a', color: '#555', border: '1px solid #2a2a2a' }}
                >
                  Avbryt
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity"
                  style={{ background: '#f87171', color: '#000', opacity: deleting ? 0.5 : 1 }}
                >
                  {deleting ? 'Tar bort...' : 'Ja, ta bort'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- Create event modal ---

function CreateEventModal({ initialDate, onClose, onSaved }: {
  initialDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(toLocalDateString(initialDate));
  const [startTime, setStartTime] = useState(toLocalTimeString(initialDate));
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(initialDate);
    d.setHours(d.getHours() + 1);
    return toLocalTimeString(d);
  });
  const [endDate, setEndDate] = useState(toLocalDateString(initialDate));
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');

    const params: CreateEventParams = allDay
      ? {
          title: title.trim(),
          startDate: date,
          endDate: endDate,
          allDay: true,
          location: location.trim() || undefined,
        }
      : {
          title: title.trim(),
          startDate: `${date}T${startTime}:00`,
          endDate: `${date}T${endTime}:00`,
          allDay: false,
          location: location.trim() || undefined,
        };

    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte spara aktivitet.');
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { color: '#555', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' };
  const inputStyle = {
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#fff',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: '#1e1e1e' }}>
          <h2 className="text-base font-black text-white">Ny aktivitet</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: '#444' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>TITEL</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Vad ska hända?"
              style={inputStyle}
              required
            />
          </div>

          {/* All-day toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAllDay(v => !v)}
              className="w-9 h-5 rounded-full transition-colors relative"
              style={{ background: allDay ? '#fff' : '#2a2a2a' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  background: allDay ? '#000' : '#555',
                  left: allDay ? '18px' : '2px',
                }}
              />
            </button>
            <span style={{ color: '#666', fontSize: '13px' }}>Heldagshändelse</span>
          </div>

          {/* Date(s) */}
          {allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={labelStyle}>STARTDATUM</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={labelStyle}>SLUTDATUM</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={labelStyle}>DATUM</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label style={labelStyle}>STARTTID</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={labelStyle}>SLUTTID</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} required />
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>PLATS (VALFRITT)</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Lägg till plats..."
              style={inputStyle}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#0a0a0a', color: '#555', border: '1px solid #2a2a2a' }}
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity"
              style={{ background: '#fff', color: '#000', opacity: saving || !title.trim() ? 0.4 : 1 }}
            >
              {saving ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
