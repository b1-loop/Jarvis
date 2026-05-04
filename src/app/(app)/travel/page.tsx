'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, Marker, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

type Coords = { lat: number; lng: number };

type JourneyStep =
  | { type: 'WALKING'; duration: string; distance: string }
  | {
      type: 'TRANSIT';
      vehicleType: string;
      line: string;
      headsign: string;
      departureStop: string;
      departureTime: string;
      arrivalStop: string;
      arrivalTime: string;
      stops: number;
    };

type RouteResult = {
  mode: string;
  emoji: string;
  label: string;
  duration: string;
  distance: string;
  travelMode: google.maps.TravelMode;
  departureTime?: string;
  arrivalTime?: string;
  journeySteps?: JourneyStep[];
};

function TransitItinerary({ steps, destination }: { steps: JourneyStep[]; destination: string }) {
  const dot = (color = '#333') => (
    <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ background: color, border: '2px solid #0a0a0a', zIndex: 1 }} />
  );
  const line = (
    <div className="w-px self-stretch ml-[4px]" style={{ background: '#2a2a2a' }} />
  );

  const rows: React.ReactNode[] = [];

  // Start dot
  rows.push(
    <div key="start" className="flex items-start gap-2.5">
      {dot('#fff')}
      <p className="text-xs font-semibold text-white pb-1">Din position</p>
    </div>
  );

  steps.forEach((step, i) => {
    if (step.type === 'WALKING') {
      rows.push(
        <div key={`w-${i}`} className="flex items-stretch gap-2.5">
          <div className="flex flex-col items-center w-2.5 shrink-0">
            {line}
          </div>
          <div className="flex items-center gap-1.5 py-1.5">
            <span className="text-xs">🚶</span>
            <p className="text-xs" style={{ color: '#555' }}>
              Gå {step.duration}{step.distance ? ` · ${step.distance}` : ''}
            </p>
          </div>
        </div>
      );
    } else {
      const s = step as Extract<JourneyStep, { type: 'TRANSIT' }>;
      rows.push(
        <div key={`t-${i}`} className="flex items-stretch gap-2.5">
          <div className="flex flex-col items-center w-2.5 shrink-0 gap-0">
            {dot('#aaa')}
            {line}
          </div>
          <div className="flex flex-col gap-1 pb-3 min-w-0">
            {/* Departure */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm">{vehicleEmoji(s.vehicleType)}</span>
              <span className="text-xs font-bold text-white">{s.line}</span>
              {s.headsign && <span className="text-xs" style={{ color: '#666' }}>mot {s.headsign}</span>}
              {s.departureTime && <span className="text-xs font-semibold" style={{ color: '#888' }}>{s.departureTime}</span>}
            </div>
            <p className="text-xs" style={{ color: '#555' }}>
              Från: <span style={{ color: '#aaa' }}>{s.departureStop}</span>
            </p>
            {/* Stops count */}
            <div className="flex items-center gap-1.5 pl-1 my-0.5">
              <div className="flex flex-col gap-0.5">
                {[...Array(Math.min(s.stops, 3))].map((_, j) => (
                  <div key={j} className="w-0.5 h-1 rounded-full" style={{ background: '#2a2a2a' }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: '#444' }}>
                {s.stops} {s.stops === 1 ? 'hållplats' : 'hållplatser'}
              </p>
            </div>
            {/* Arrival */}
            <p className="text-xs" style={{ color: '#555' }}>
              Till: <span style={{ color: '#aaa' }}>{s.arrivalStop}</span>
              {s.arrivalTime && <span className="font-semibold" style={{ color: '#888' }}> · {s.arrivalTime}</span>}
            </p>
          </div>
        </div>
      );
    }
  });

  // End dot
  rows.push(
    <div key="end" className="flex items-start gap-2.5">
      {dot('#fff')}
      <p className="text-xs font-semibold text-white truncate">{destination || 'Destination'}</p>
    </div>
  );

  return (
    <div
      className="rounded-xl p-4 flex flex-col"
      style={{ background: '#0f0f0f', border: '1px solid #1e1e1e' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#444' }}>Resplan</p>
      <div className="flex flex-col">
        {rows}
      </div>
    </div>
  );
}

function vehicleEmoji(type: string): string {
  switch (type.toUpperCase()) {
    case 'BUS': return '🚌';
    case 'SUBWAY': return '🚇';
    case 'TRAM': return '🚊';
    case 'RAIL':
    case 'COMMUTER_TRAIN':
    case 'HEAVY_RAIL': return '🚆';
    case 'FERRY': return '⛴';
    default: return '🚌';
  }
}

function MapController({ userCoords, mapRef }: {
  userCoords: Coords | null;
  mapRef: React.MutableRefObject<google.maps.Map | null>;
}) {
  const map = useMap();
  const centered = useRef(false);

  useEffect(() => {
    if (!map) return;
    mapRef.current = map;
    if (userCoords && !centered.current) {
      map.panTo(userCoords);
      map.setZoom(15);
      centered.current = true;
    }
  }, [map, userCoords, mapRef]);

  return null;
}

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

    service.route({ origin, destination, travelMode }, (result, status) => {
      if (status === 'OK' && result) renderer.setDirections(result);
    });

    return () => renderer.setMap(null);
  }, [map, origin, destination, travelMode]);

  return null;
}

export default function TravelPage() {
  const [homeAddress, setHomeAddress] = useState('');
  const [workAddress, setWorkAddress] = useState('');
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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const autoPlanRef = useRef('');
  const planRouteRef = useRef<((dest: string) => void) | null>(null);

  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
    const addr = profile.homeAddress || localStorage.getItem('jarvis_home_address') || '';
    if (addr) setHomeAddress(addr);
    if (profile.workAddress) setWorkAddress(profile.workAddress);

    const toDest = new URLSearchParams(window.location.search).get('to');
    if (toDest) {
      setDestination(toDest);
      autoPlanRef.current = toDest;
    }

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

    if (autoPlanRef.current && planRouteRef.current) {
      const dest = autoPlanRef.current;
      autoPlanRef.current = '';
      planRouteRef.current(dest);
    }
  }, []);

  const saveHome = () => {
    const trimmed = homeInput.trim();
    const profile = JSON.parse(localStorage.getItem('jarvis_profile') || '{}');
    localStorage.setItem('jarvis_profile', JSON.stringify({ ...profile, homeAddress: trimmed }));
    localStorage.setItem('jarvis_home_address', trimmed);
    setHomeAddress(trimmed);
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

  const getDirections = (origin: Coords, dest: Coords, mode: google.maps.TravelMode): Promise<Partial<RouteResult> | null> =>
    new Promise(resolve => {
      const service = new google.maps.DirectionsService();
      const request: google.maps.DirectionsRequest = {
        origin,
        destination: dest,
        travelMode: mode,
        ...(mode === google.maps.TravelMode.TRANSIT && {
          transitOptions: { departureTime: new Date() },
        }),
      };
      service.route(request, (result, status) => {
        if (status === 'OK' && result) {
          const leg = result.routes[0].legs[0];
          const base = {
            duration: leg.duration?.text || '',
            distance: leg.distance?.text || '',
          };
          if (mode === google.maps.TravelMode.TRANSIT) {
            const journeySteps: JourneyStep[] = leg.steps.map((s: any) => {
              if (s.travel_mode === 'WALKING') {
                return {
                  type: 'WALKING' as const,
                  duration: s.duration?.text || '',
                  distance: s.distance?.text || '',
                };
              }
              return {
                type: 'TRANSIT' as const,
                vehicleType: s.transit?.line?.vehicle?.type || 'TRANSIT',
                line: s.transit?.line?.short_name || s.transit?.line?.name || '',
                headsign: s.transit?.headsign || '',
                departureStop: s.transit?.departure_stop?.name || '',
                departureTime: s.transit?.departure_time?.text || '',
                arrivalStop: s.transit?.arrival_stop?.name || '',
                arrivalTime: s.transit?.arrival_time?.text || '',
                stops: s.transit?.num_stops || 0,
              };
            });
            resolve({
              ...base,
              departureTime: (leg as any).departure_time?.text || '',
              arrivalTime: (leg as any).arrival_time?.text || '',
              journeySteps,
            });
          } else {
            resolve(base);
          }
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
  planRouteRef.current = planRoute;

  const goToMyLocation = () => {
    if (mapInstanceRef.current && userCoords) {
      mapInstanceRef.current.panTo(userCoords);
      mapInstanceRef.current.setZoom(15);
      return;
    }
    navigator.geolocation?.getCurrentPosition(p => {
      const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
      setUserCoords(coords);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(coords);
        mapInstanceRef.current.setZoom(15);
      }
    });
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

            {/* Snabbknappar */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => homeAddress && planRoute(homeAddress)}
                disabled={!homeAddress || loading}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30"
                style={{ background: '#fff', color: '#000' }}
              >
                🏠 Planera väg hem
              </button>
              {workAddress && (
                <button
                  onClick={() => planRoute(workAddress)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-30"
                  style={{ background: '#141414', color: '#fff', border: '1px solid #2a2a2a' }}
                >
                  🏢 Planera till jobbet
                </button>
              )}
            </div>

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
                {routes.map(r => {
                  const active = activeRoute?.mode === r.mode;
                  const textMain = active ? '#000' : '#fff';
                  const textSub = active ? '#555' : '#666';
                  return (
                    <button
                      key={r.mode}
                      onClick={() => setActiveRoute(r)}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all w-full"
                      style={{
                        background: active ? '#fff' : '#141414',
                        border: `1px solid ${active ? '#fff' : '#222'}`,
                      }}
                    >
                      <span className="text-xl mt-0.5">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: textMain }}>{r.label}</p>
                        {r.mode === 'TRANSIT' ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs" style={{ color: textSub }}>
                              {r.duration}
                              {r.departureTime && r.arrivalTime && (
                                <span> · {r.departureTime}–{r.arrivalTime}</span>
                              )}
                            </p>
                            {r.journeySteps && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {r.journeySteps.filter(s => s.type === 'TRANSIT').map((step, i) => {
                                  const s = step as Extract<JourneyStep, { type: 'TRANSIT' }>;
                                  return (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                                      style={{ background: active ? '#00000015' : '#1e1e1e', color: textSub }}
                                    >
                                      {vehicleEmoji(s.vehicleType)} {s.line}
                                      {s.stops > 0 && <span style={{ color: active ? '#77777788' : '#444' }}> {s.stops} stopp</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs mt-0.5" style={{ color: textSub }}>
                            {r.duration}{r.distance ? ` · ${r.distance}` : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}

                {activeRoute?.mode === 'TRANSIT' && activeRoute.journeySteps && (
                  <TransitItinerary steps={activeRoute.journeySteps} destination={destination} />
                )}

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
        <div className="flex-1 relative">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={13}
            mapId="jarvis-map"
            colorScheme="DARK"
            disableDefaultUI={false}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            <MapController userCoords={userCoords} mapRef={mapInstanceRef} />
            {userCoords && (
              <AdvancedMarker position={userCoords} title="Din position">
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  boxShadow: '0 2px 14px rgba(0,0,0,0.7)',
                  border: '2px solid #111',
                  userSelect: 'none',
                }}>
                  🧍
                </div>
              </AdvancedMarker>
            )}
            {destCoords && (
              <AdvancedMarker position={destCoords} title="Destination">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    boxShadow: '0 2px 14px rgba(0,0,0,0.7)',
                    border: '2px solid #111',
                    userSelect: 'none',
                  }}>
                    📍
                  </div>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid #fff',
                    marginTop: '-2px',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
                  }} />
                </div>
              </AdvancedMarker>
            )}
            {userCoords && destCoords && activeRoute && (
              <DirectionsRenderer origin={userCoords} destination={destCoords} travelMode={activeRoute.travelMode} />
            )}
          </Map>

          {/* Min plats-knapp */}
          <button
            onClick={goToMyLocation}
            title="Gå till min plats"
            className="absolute flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              bottom: '24px',
              right: '16px',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#141414',
              border: '1px solid #2a2a2a',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              fontSize: '20px',
            }}
          >
            ◎
          </button>
        </div>
      </div>
    </APIProvider>
  );
}
