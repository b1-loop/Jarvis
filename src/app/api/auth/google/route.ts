import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_SCOPES, GOOGLE_URLS } from '@/config/google.config';

export async function GET(req: NextRequest) {
  const redirectAfter = req.nextUrl.searchParams.get('redirect') || '/settings';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: redirectAfter,
  });

  return NextResponse.redirect(`${GOOGLE_URLS.AUTH}?${params.toString()}`);
}
