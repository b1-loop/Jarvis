'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

type Coords = { lat: number; lng: number };
type RouteResult = {
  mode: string;
  emoji: string;
  label: string;
  duration: string;
  distance: string;
  travelMode: google.maps.TravelMode;
};

function DirectionsRenderer({ origin, destination, travelMode }: {
  origin: Coords;
  destination: Coords;
  travelMode: google.maps.TravelMode;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !origin || !destination) return;

    const service = new google.maps.DirectionsService();
    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#ffffff', strokeWeight: 4, strokeOpacity: 0.9 },
    });
    renderer.setMap(map);

    service.route({
      origin,
      destination,
      travelMode,
    }, (result, status) => {
      if (status === 'OK' && result) renderer.setDirections(result);
    });

    return () => renderer.setMap(null);
  }, [map, origin, destination, travelMode]);

  return null;
}

export default function TravelPage() {
  const [homeAddress, setHomeAddress] = useState('');
  const [homeInput, setHomeInput] = useState('');
  const [editingHome, setEditingHome] = useState(false);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<Coords | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const addr = localStorage.getItem('jarvis_home_address');
    if (addr) setHomeAddress(addr);

    navigator.geolocation?.getCurrentPosition(p => {
      setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
    });
  }, []);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || autocompleteRef.current) return;
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address'],
    });
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace();
      if (place.geometry?.location) {
        const loc = place.geometry.location;
        setDestCoords({ lat: loc.lat(), lng: loc.lng() });
        setDestination(place.formatted_address || '');
      }
    });
  }, []);

  const saveHome = () => {
    localStorage.setItem('jarvis_home_address', homeInput.trim());
    setHomeAddress(homeInput.trim());
    setEditingHome(false);
  };

  const geocode = (address: string): Promise<Coords | null> =>
    new Promise(resolve => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else resolve(null);
      });
    });

  const getDirections = (origin: Coords, dest: Coords, mode: google.maps.TravelMode): Promise<{ duration: string; distance: string } | null> =>
    new Promise(resolve => {
      const service = new google.maps.DirectionsService();
      service.route({ origin, destination: dest, travelMode: mode }, (result, status) => {
        if (status === 'OK' && result) {
          const leg = result.routes[0].legs[0];
          resolve({ duration: leg.duration?.text || '', distance: leg.distance?.text || '' });
        } else resolve(null);
      });
    });

  const planRoute = async (dest: string, coords?: Coords) => {
    setLoading(true);
    setRoutes([]);
    setActiveRoute(null);
    setError('');

    try {
      const origin = userCoords || await new Promise<Coords | null>(resolve =>
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null)
        )
      );
      if (!origin) { setError('Kunde inte hämta din position.'); return; }
      setUserCoords(origin);

      const to = coords || await geocode(dest);
      if (!to) { setError(`Hittade inte "${dest}".`); return; }
      setDestCoords(to);

      const modes = [
        { mode: 'WALKING', emoji: '🚶', label: 'Gå', travelMode: google.maps.TravelMode.WALKING },
        { mode: 'BICYCLING', emoji: '🚴', label: 'Cykla', travelMode: google.maps.TravelMode.BICYCLING },
        { mode: 'DRIVING', emoji: '🚗', label: 'Bil', travelMode: google.maps.TravelMode.DRIVING },
        { mode: 'TRANSIT', emoji: '🚌', label: 'Kollektivt', travelMode: google.maps.TravelMode.TRANSIT },
      ];

      const results = await Promise.all(modes.map(async m => {
        const r = await getDirections(origin, to, m.travelMode);
        if (!r) return null;
        return { ...m, ...r };
      }));

      const valid = results.filter(Boolean) as RouteResult[];
      setRoutes(valid);
      if (valid.length) setActiveRoute(valid[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = (route: RouteResult) => {
    const modeMap: Record<string, string> = {
      WALKING: 'walking', BICYCLING: 'bicycling', DRIVING: 'driving', TRANSIT: 'transit',
    };
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destCoords?.lat},${destCoords?.lng}&travelmode=${modeMap[route.mode]}`;
    window.open(url, '_blank');
  };

  const mapCenter = userCoords || { lat: 59.33, lng: 18.07 };

  return (
    <APIProvider apiKey={MAPS_KEY} onLoad={initAutocomplete} libraries={['places']}>
      <div className="flex" style={{ height: '100dvh' }}>

        {/* Sidopanel */}
        <div className="w-80 shrink-0 flex flex-col overflow-y-auto border-r" style={{ borderColor: '#1a1a1a' }}>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Resa</h1>
              <p className="text-xs" style={{ color: '#555' }}>Jarvis planerar din väg</p>
            </div>

            {/* Hemadress */}
            <div className="rounded-xl p-4 border" style={{ background: '#141414', borderColor: '#222' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#555' }}>🏠 Hem</p>
              {editingHome ? (
                <div className="flex flex-col gap-2">
                  <input autoFocus value={homeInput} onChange={e => setHomeInput(e.target.value)}
                    placeholder="Din hemadress..." onKeyDown={e => e.key === 'Enter' && saveHome()}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm outline-none"
                    style={{ background: '#0a0a0a', border: '1px solid #333' }} />
                  <div className="flex gap-2">
                    <button onClick={saveHome} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: '#fff', color: '#000' }}>Spara</button>
                    <button onClick={() => setEditingHome(false)} className="px-3 py-2 text-xs" style={{ color: '#555' }}>Avbryt</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm truncate" style={{ color: homeAddress ? '#aaa' : '#444' }}>
                    {homeAddress || 'Ingen hemadress sparad'}
                  </p>
                  <button onClick={() => { setHomeInput(homeAddress); setEditingHome(true); }}
                    className="text-xs shrink-0" style={{ color: '#555' }}>Ändra</button>
                </div>
              )}
            </div>

            {/* Snabbknapp hem */}
            <button
              onClick={() => homeAddress && planRoute(homeAddress)}
              disabled={!homeAddress || loading}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30"
              style={{ background: '#fff', color: '#000' }}
            >
              🏠 Planera väg hem
            </button>

            {/* Sök destination */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>📍 Destination</p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && planRoute(destination)}
                  placeholder="Sök adress eller plats..."
                  className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
                  style={{ background: '#141414', border: '1px solid #222' }}
                />
                <button onClick={() => planRoute(destination)} disabled={!destination.trim() || loading}
                  className="px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-30"
                  style={{ background: '#fff', color: '#000' }}>
                  →
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {loading && <p className="text-xs" style={{ color: '#555' }}>Beräknar rutter...</p>}

            {/* Rutter */}
            {routes.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Alternativ</p>
                {routes.map(r => (
                  <button
                    key={r.mode}
                    onClick={() => { setActiveRoute(r); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: activeRoute?.mode === r.mode ? '#fff' : '#141414',
                      border: `1px solid ${activeRoute?.mode === r.mode ? '#fff' : '#222'}`,
                    }}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: activeRoute?.mode === r.mode ? '#000' : '#fff' }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: activeRoute?.mode === r.mode ? '#444' : '#555' }}>{r.duration} · {r.distance}</p>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => activeRoute && openInMaps(activeRoute)}
                  className="w-full py-3 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
                  style={{ background: '#141414', color: '#fff', border: '1px solid #222' }}
                >
                  ↗ Öppna i Google Maps
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Karta */}
        <div className="flex-1">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={13}
            mapId="jarvis-map"
            colorScheme="DARK"
            disableDefaultUI={false}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            {userCoords && (
              <Marker position={userCoords} title="Din position"
                icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#fff', fillOpacity: 1, strokeColor: '#000', strokeWeight: 2 }} />
            )}
            {destCoords && (
              <Marker position={destCoords} title="Destination" />
            )}
            {userCoords && destCoords && activeRoute && (
              <DirectionsRenderer origin={userCoords} destination={destCoords} travelMode={activeRoute.travelMode} />
            )}
          </Map>
        </div>
      </div>
    </APIProvider>
  );
}
