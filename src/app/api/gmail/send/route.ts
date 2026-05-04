import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getValidToken } from '@/repositories/google-token.repository';
import { sendEmail } from '@/services/gmail.service';

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });
  }

  const { to, subject, body } = await req.json();
  if (!to || !body) return NextResponse.json({ error: 'Mottagare och meddelande krävs' }, { status: 400 });

  try {
    const messageId = await sendEmail(accessToken, { to, subject: subject || 'Svar från Jarvis', body });
    return NextResponse.json({ messageId, ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
