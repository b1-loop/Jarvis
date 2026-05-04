'use client';
import { useEffect, useRef } from 'react';
import type { Reminder } from '@/types';

const RADIUS_KM = 5;
const DEBOUNCE_MS = 30 * 60 * 1000;
const REMINDERS_KEY = 'jarvis_reminders';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function geocodeCached(cacheKey: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.address === address) return { lat: parsed.lat, lng: parsed.lng };
  }
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
  );
  const data = await res.json();
  if (!data.results?.[0]) return null;
  const { lat, lng } = data.results[0].geometry.location;
  localStorage.setItem(cacheKey, JSON.stringify({ address, lat, lng }));
  return { lat, lng };
}

function checkAndNotify(
  userPos: { lat: number; lng: number },
  homeCoords: { lat: number; lng: number } | null,
  workCoords: { lat: number; lng: number } | null
) {
  const raw = localStorage.getItem(REMINDERS_KEY);
  if (!raw) return;

  const reminders: Reminder[] = JSON.parse(raw);
  const now = Date.now();
  let changed = false;

  const nearHome = homeCoords ? haversineKm(userPos, homeCoords) <= RADIUS_KM : false;
  const nearWork = workCoords ? haversineKm(userPos, workCoords) <= RADIUS_KM : false;

  const updated = reminders.map(r => {
    if (!r.active) return r;
    const last = r.lastTriggered ? new Date(r.lastTriggered).getTime() : 0;
    if (now - last < DEBOUNCE_MS) return r;

    const shouldTrigger =
      (r.triggerAt === 'home' && nearHome) ||
      (r.triggerAt === 'work' && nearWork) ||
      (r.triggerAt === 'both' && (nearHome || nearWork));

    if (!shouldTrigger) return r;

    const location = nearHome && r.triggerAt !== 'work' ? 'hem' : 'jobbet';

    if (Notification.permission === 'granted') {
      new Notification(`Jarvis påminner — nära ${location} 📍`, {
        body: r.text,
        icon: '/favicon.ico',
        tag: r.id,
      });
    }
    changed = true;
    return { ...r, lastTriggered: new Date().toISOString() };
  });

  if (changed) localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
}

export default function LocationReminder() {
  const watchIdRef = useRef<number | null>(null);
  const homeRef = useRef<{ lat: number; lng: number } | null>(null);
  const workRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
      const homeAddr = localStorage.getItem('jarvis_home_address') || profile.homeAddress || '';
      const workAddr = profile.workAddress || '';

      const [homeCoords, workCoords] = await Promise.all([
        homeAddr ? geocodeCached('jarvis_home_coords_cache', homeAddr) : null,
        workAddr ? geocodeCached('jarvis_work_coords_cache', workAddr) : null,
      ]);

      if (!active) return;
      homeRef.current = homeCoords;
      workRef.current = workCoords;

      if (!homeCoords && !workCoords) return;

      watchIdRef.current = navigator.geolocation.watchPosition(
        pos => checkAndNotify(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          homeRef.current,
          workRef.current
        ),
        null,
        { enableHighAccuracy: false, maximumAge: 60000 }
      );
    };

    init();
    return () => {
      active = false;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return null;
}
