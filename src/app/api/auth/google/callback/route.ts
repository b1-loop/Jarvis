import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_URLS, GOOGLE_COOKIES, COOKIE_OPTIONS } from '@/config/google.config';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') || '/settings';
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL(`${state}?cal=error`, req.url));
  }

  try {
    const tokenRes = await fetch(GOOGLE_URLS.TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('Ingen access token');

    const response = NextResponse.redirect(new URL(`${state}?cal=success`, req.url));

    response.cookies.set(GOOGLE_COOKIES.ACCESS_TOKEN, tokens.access_token, {
      ...COOKIE_OPTIONS.ACCESS_TOKEN,
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      response.cookies.set(GOOGLE_COOKIES.REFRESH_TOKEN, tokens.refresh_token, COOKIE_OPTIONS.REFRESH_TOKEN);
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL(`${state}?cal=error`, req.url));
  }
}
