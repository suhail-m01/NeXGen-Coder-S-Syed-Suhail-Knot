import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const allowedOrigins = new Set((Deno.env.get('APP_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean));
const text = (value: unknown) => typeof value === 'string' ? value : '';
const object = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

function originAllowed(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsed.hostname) && ['http:', 'https:'].includes(parsed.protocol);
  } catch { return false; }
}
function headers(request: Request) {
  const origin = request.headers.get('origin');
  return {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    vary: 'Origin',
    ...(origin && originAllowed(origin) ? {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-max-age': '3600',
    } : {}),
  };
}
const json = (request: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: headers(request) });

async function keyedHash(query: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(query));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, '0')).join('');
}
function normalizedCandidate(value: unknown) {
  const result = object(value);
  const latitude = Number(result.lat); const longitude = Number(result.lon);
  const displayName = text(result.display_name).trim().slice(0, 500);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !displayName) return null;
  const address = object(result.address);
  const resultType = (text(result.addresstype) || text(result.type)).slice(0, 80);
  const precision = address.house_number || ['house', 'building'].includes(resultType) ? 'exact'
    : ['road', 'neighbourhood', 'suburb', 'quarter', 'residential', 'hamlet', 'village'].includes(resultType) ? 'locality'
      : ['city', 'town', 'municipality', 'county', 'state'].includes(resultType) ? 'city' : 'approximate';
  const boundingBox = Array.isArray(result.boundingbox) ? result.boundingbox.map(Number) : [];
  const rawOsmId = result.osm_id;
  const osmId = (typeof rawOsmId === 'number' || typeof rawOsmId === 'string' && rawOsmId.trim()) && Number.isSafeInteger(Number(rawOsmId)) ? Number(rawOsmId) : null;
  return {
    latitude, longitude, displayName, precision, resultType,
    osmType: text(result.osm_type).slice(0, 30) || null,
    osmId,
    boundingBox: boundingBox.length === 4 && boundingBox.every(Number.isFinite) ? boundingBox : [],
    geocodedAt: new Date().toISOString(),
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (!originAllowed(origin)) return json(request, 403, { error: 'ORIGIN_NOT_ALLOWED' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== 'POST') return json(request, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!url || !serviceKey) return json(request, 503, { error: 'GEOCODING_NOT_CONFIGURED' });
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json(request, 401, { error: 'AUTH_REQUIRED' });
  const { data: profile } = await db.from('knot_profiles').select('account_status,age_band').eq('id', auth.user.id).maybeSingle();
  if (!profile || profile.account_status !== 'active' || profile.age_band !== '18_plus') return json(request, 403, { error: 'ADULT_PUBLISH_ACCESS_REQUIRED' });

  let reserved = false;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 4096) return json(request, 413, { error: 'REQUEST_TOO_LARGE' });
    const body = JSON.parse(raw || '{}');
    const query = text(body.query).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    if (query.length < 3 || query.length > 500) return json(request, 400, { error: 'INVALID_ADDRESS_QUERY' });
    const queryHash = await keyedHash(query);
    const { data: reservation, error: reservationError } = await db.rpc('knot_geocode_reserve', { p_user_id: auth.user.id, p_query_hash: queryHash });
    if (reservationError) {
      const limited = /RATE_LIMITED/.test(reservationError.message);
      return json(request, limited ? 429 : 503, { error: limited ? 'GEOCODE_RATE_LIMITED' : 'GEOCODE_RESERVATION_FAILED' });
    }
    if (reservation?.status === 'hit') return json(request, 200, { ...reservation.response, cache: 'hit' });
    if (reservation?.status === 'retry') return json(request, 429, { error: 'GEOCODE_BUSY', retryAfter: reservation.retryAfter ?? 1 });
    if (reservation?.status !== 'miss') return json(request, 503, { error: 'GEOCODE_RESERVATION_FAILED' });
    reserved = true;

    const base = new URL(Deno.env.get('NOMINATIM_BASE_URL') ?? 'https://nominatim.openstreetmap.org/');
    if (base.protocol !== 'https:' || base.username || base.password) return json(request, 503, { error: 'GEOCODING_NOT_CONFIGURED' });
    const endpoint = new URL(`${base.pathname.replace(/\/$/, '')}/search`, base.origin);
    endpoint.search = new URLSearchParams({
      format: 'jsonv2', limit: '1', dedupe: '1', addressdetails: '1', countrycodes: 'in',
      layer: 'address,poi', 'accept-language': 'en', q: query,
    }).toString();
    const contact = Deno.env.get('NOMINATIM_CONTACT_EMAIL');
    if (contact) endpoint.searchParams.set('email', contact);
    const userAgent = Deno.env.get('NOMINATIM_USER_AGENT') ?? `KnotEventDiscovery/1.0 (${url})`;
    const upstream = await fetch(endpoint, {
      headers: { accept: 'application/json', 'user-agent': userAgent },
      redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return json(request, upstream.status === 429 ? 429 : 502, { error: upstream.status === 429 ? 'UPSTREAM_RATE_LIMITED' : 'GEOCODE_UPSTREAM_UNAVAILABLE', upstreamStatus: upstream.status });
    const results: unknown = await upstream.json();
    const candidate = Array.isArray(results) && results.length ? normalizedCandidate(results[0]) : null;
    const response = {
      candidate,
      attribution: '© OpenStreetMap contributors · Nominatim',
      note: 'A geocode is a location estimate, not venue, safety or ownership verification.',
    };
    const expiresAt = new Date(Date.now() + (candidate ? 30 : 1) * 86400000).toISOString();
    const { error: cacheError } = await db.from('knot_geocode_cache').upsert({ query_hash: queryHash, response, expires_at: expiresAt });
    return json(request, 200, { ...response, cache: cacheError ? 'not_stored' : 'miss' });
  } catch (reason) {
    if (reason instanceof SyntaxError) return json(request, 400, { error: 'INVALID_JSON' });
    const failure = reason instanceof Error && reason.name === 'TimeoutError' ? 'timeout' : 'request_failed';
    return json(request, 502, { error: 'GEOCODE_UPSTREAM_UNAVAILABLE', failure });
  } finally {
    if (reserved) await db.rpc('knot_geocode_finish');
  }
});
