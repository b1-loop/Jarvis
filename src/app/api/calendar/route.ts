import { NextRequest, NextResponse } from 'next/server';

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  return data.access_token || null;
}

export async function GET(req: NextRequest) {
  let accessToken = req.cookies.get('gcal_access_token')?.value;
  const refreshToken = req.cookies.get('gcal_refresh_token')?.value;

  if (!accessToken && refreshToken) {
    accessToken = (await refreshAccessToken(refreshToken)) || undefined;
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Google Calendar', connected: false }, { status: 401 });
  }

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: in24h.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '10',
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || 'Google API-fel' }, { status: 500 });
    }

    const data = await res.json();

    const events = (data.items || []).map((e: any) => ({
      id: e.id,
      title: e.summary || 'Namnlöst möte',
      startDate: e.start?.dateTime || e.start?.date,
      endDate: e.end?.dateTime || e.end?.date,
      location: e.location || null,
    }));

    const response = NextResponse.json({ events, connected: true });

    if (accessToken && !req.cookies.get('gcal_access_token')?.value) {
      response.cookies.set('gcal_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600,
        path: '/',
      });
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('gcal_access_token');
  response.cookies.delete('gcal_refresh_token');
  return response;
}
