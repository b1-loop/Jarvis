import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase-server';
import { getValidToken } from '@/repositories/google-token.repository';
import { fetchMessage } from '@/services/gmail.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Ej inloggad' }, { status: 401 });

  const { id } = await params;
  const accessToken = await getValidToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Inte ansluten till Gmail', connected: false }, { status: 401 });
  }

  try {
    const message = await fetchMessage(accessToken, id);
    return NextResponse.json(message);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
