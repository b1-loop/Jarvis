import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getValidToken } from '@/repositories/google-token.repository';
import { fetchCalendarEvents, fetchCalendarEventsInRange, createCalendarEvent } from '@/services/google-calendar.service';
import { GOOGLE_COOKIES, COOKIE_OPTIONS } from '@/config/google.config';

export async function GET(req: NextRequest) {
  const hadToken = !!req.cookies.get(GOOGLE_COOKIES.ACCESS_TOKEN)?.value;
  const accessToken = await getValidToken(req);

  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Google Calendar', connected: false }, { status: 401 });
  }

  try {
    const startParam = req.nextUrl.searchParams.get('start');
    const endParam = req.nextUrl.searchParams.get('end');

    const events = startParam && endParam
      ? await fetchCalendarEventsInRange(accessToken, new Date(startParam), new Date(endParam))
      : await fetchCalendarEvents(accessToken);

    const response = NextResponse.json({ events, connected: true });

    if (!hadToken) {
      response.cookies.set(GOOGLE_COOKIES.ACCESS_TOKEN, accessToken, COOKIE_OPTIONS.ACCESS_TOKEN);
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Google Calendar', connected: false }, { status: 401 });
  }

  try {
    const params = await req.json();
    const event = await createCalendarEvent(accessToken, params);
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GOOGLE_COOKIES.ACCESS_TOKEN);
  response.cookies.delete(GOOGLE_COOKIES.REFRESH_TOKEN);
  return response;
}
