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

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });
  }

  try {
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const err = await listRes.json();
      throw new Error(err.error?.message || 'Gmail API-fel');
    }

    const listData = await listRes.json();
    const messageIds: { id: string }[] = listData.messages || [];

    const details = await Promise.all(
      messageIds.slice(0, 20).map(async ({ id }) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata` +
            `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const headers: { name: string; value: string }[] = data.payload?.headers || [];
        const h = (name: string) => headers.find(x => x.name === name)?.value ?? '';
        return {
          id: data.id as string,
          threadId: data.threadId as string,
          snippet: (data.snippet as string) ?? '',
          from: h('From'),
          subject: h('Subject'),
          date: h('Date'),
          isUnread: ((data.labelIds as string[]) ?? []).includes('UNREAD'),
        };
      })
    );

    return NextResponse.json({ messages: details.filter(Boolean), connected: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
