import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';

async function getValidToken(req: NextRequest): Promise<string | null> {
  let accessToken = req.cookies.get('gcal_access_token')?.value;
  const refreshToken = req.cookies.get('gcal_refresh_token')?.value;

  if (!accessToken && refreshToken) {
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
    accessToken = data.access_token || null;
  }
  return accessToken || null;
}

function buildRawEmail(to: string, subject: string, body: string, from?: string): string {
  const lines = [
    from ? `From: ${from}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].filter(Boolean);

  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const accessToken = await getValidToken(req);
  if (!accessToken) return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });

  const { to, subject, body } = await req.json();

  if (!to || !body) return NextResponse.json({ error: 'Mottagare och meddelande krävs' }, { status: 400 });

  try {
    const raw = buildRawEmail(to, subject || 'Svar från Jarvis', body);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Gmail API-fel');
    }

    const data = await res.json();
    return NextResponse.json({ messageId: data.id, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
