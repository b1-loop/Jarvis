import { CalendarEvent, CreateEventParams } from '@/types';
import { GOOGLE_URLS } from '@/config/google.config';

async function fetchEvents(accessToken: string, timeMin: Date, timeMax: Date, maxResults = 10): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });

  const res = await fetch(`${GOOGLE_URLS.CALENDAR_EVENTS}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Google API-fel');
  }

  const data = await res.json();
  return (data.items || []).map((e: any) => ({
    id: e.id,
    title: e.summary || 'Namnlöst möte',
    startDate: e.start?.dateTime || e.start?.date,
    endDate: e.end?.dateTime || e.end?.date,
    location: e.location || null,
  }));
}

export async function fetchCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return fetchEvents(accessToken, now, in24h, 10);
}

export async function fetchCalendarEventsInRange(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  return fetchEvents(accessToken, timeMin, timeMax, 100);
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`${GOOGLE_URLS.CALENDAR_EVENTS}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Google API-fel');
  }
}

export async function createCalendarEvent(
  accessToken: string,
  params: CreateEventParams
): Promise<CalendarEvent> {
  const body = {
    summary: params.title,
    location: params.location || undefined,
    description: params.description || undefined,
    start: params.allDay ? { date: params.startDate } : { dateTime: params.startDate },
    end: params.allDay ? { date: params.endDate } : { dateTime: params.endDate },
  };

  const res = await fetch(GOOGLE_URLS.CALENDAR_EVENTS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Google API-fel');
  }

  const e = await res.json();
  return {
    id: e.id,
    title: e.summary || 'Namnlöst möte',
    startDate: e.start?.dateTime || e.start?.date,
    endDate: e.end?.dateTime || e.end?.date,
    location: e.location || null,
  };
}
