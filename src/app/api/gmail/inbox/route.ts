import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getValidToken } from '@/repositories/google-token.repository';
import { fetchInbox } from '@/services/gmail.service';

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });
  }

  try {
    const messages = await fetchInbox(accessToken);
    return NextResponse.json({ messages, connected: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
