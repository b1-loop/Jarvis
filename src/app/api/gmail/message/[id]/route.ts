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

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractTextBody(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback: try nested parts (e.g. multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      const nested = extractTextBody(part);
      if (nested) return nested;
    }
  }
  return payload.body?.data ? decodeBase64Url(payload.body.data) : '';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const { id } = await params;
  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Gmail API-fel');
    }

    const data = await res.json();
    const headers: { name: string; value: string }[] = data.payload?.headers || [];
    const h = (name: string) => headers.find(x => x.name === name)?.value ?? '';

    return NextResponse.json({
      id: data.id,
      threadId: data.threadId,
      from: h('From'),
      to: h('To'),
      subject: h('Subject'),
      date: h('Date'),
      replyTo: h('Reply-To') || h('From'),
      body: extractTextBody(data.payload),
      snippet: data.snippet ?? '',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
