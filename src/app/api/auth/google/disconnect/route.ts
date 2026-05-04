import { NextResponse } from 'next/server';
import { GOOGLE_COOKIES } from '@/config/google.config';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GOOGLE_COOKIES.ACCESS_TOKEN);
  response.cookies.delete(GOOGLE_COOKIES.REFRESH_TOKEN);
  return response;
}
