import { NextRequest } from 'next/server';
import { GOOGLE_COOKIES, GOOGLE_URLS } from '@/config/google.config';

export async function getValidToken(req: NextRequest): Promise<string | null> {
  const accessToken = req.cookies.get(GOOGLE_COOKIES.ACCESS_TOKEN)?.value;
  const refreshToken = req.cookies.get(GOOGLE_COOKIES.REFRESH_TOKEN)?.value;

  if (accessToken) return accessToken;
  if (refreshToken) return refreshAccessToken(refreshToken);
  return null;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_URLS.TOKEN, {
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
  return data.access_token ?? null;
}
