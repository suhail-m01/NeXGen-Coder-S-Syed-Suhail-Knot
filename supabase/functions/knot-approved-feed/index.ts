import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@4';
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const MAX_BYTES = 2_000_000;
function privateIp(ip: string) {
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19 || b === 51));
  }
  const lower = ip.toLowerCase();
  return lower === '::' || lower === '::1' || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') ||
    lower.startsWith('feb') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('::ffff:') || lower.startsWith('64:ff9b:');
}
async function validateUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port && !['80', '443'].includes(parsed.port)) throw new Error('UNSAFE_FEED_URL');
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || privateIp(host)) throw new Error('PRIVATE_FEED_ADDRESS');
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error('UNSAFE_FEED_HOST');
  const addresses = [...await Deno.resolveDns(host, 'A'), ...await Deno.resolveDns(host, 'AAAA')];
  if (!addresses.length || addresses.some(privateIp)) throw new Error('PRIVATE_FEED_ADDRESS');
  return parsed;
}
async function download(start: string) {
  let current = await validateUrl(start);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { accept: 'application/json, application/rss+xml, application/atom+xml, text/xml', 'user-agent': 'Knot-Approved-Feed/1.0' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 3) throw new Error('TOO_MANY_REDIRECTS');
      await response.body?.cancel();
      const location = response.headers.get('location'); if (!location) throw new Error('INVALID_REDIRECT');
      current = await validateUrl(new URL(location, current).toString()); continue;
    }
    if (!response.ok || !response.body) throw new Error(`FEED_HTTP_${response.status}`);
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > MAX_BYTES) { await reader.cancel(); throw new Error('FEED_TOO_LARGE'); }
      chunks.push(value);
    }
    const merged = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    return { body: new TextDecoder().decode(merged), size, contentType: response.headers.get('content-type') ?? '' };
  }
  throw new Error('FEED_FETCH_FAILED');
}
function items(body: string, contentType: string) {
  if (contentType.includes('json') || /^[[{]/.test(body.trim())) {
    const parsed = JSON.parse(body); const list = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.events;
    if (!Array.isArray(list)) throw new Error('UNSUPPORTED_JSON_FEED');
    return list.slice(0, 100).map((value) => ({ payload: value, externalId: String(value.id ?? value.guid ?? value.url ?? '') || null }));
  }
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(body);
  const list = parsed.rss?.channel?.item ?? parsed.feed?.entry;
  const values = Array.isArray(list) ? list : list ? [list] : [];
  return values.slice(0, 100).map((value) => ({ payload: value, externalId: String(value.guid ?? value.id ?? value.link ?? '') || null }));
}
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json(401, { error: 'ADMIN_AUTH_REQUIRED' });
  const { data: profile } = await db.from('knot_profiles').select('role,workspace_admin,account_status,age_band').eq('id', auth.user.id).single();
  if (!profile || profile.account_status !== 'active' || profile.age_band !== '18_plus' || !(profile.role === 'admin' || profile.workspace_admin)) return json(403, { error: 'REVIEW_ADMIN_REQUIRED' });
  let runId: string | null = null;
  try {
    const { sourceId } = await request.json();
    const { data: source } = await db.from('knot_sources').select('*').eq('id', String(sourceId ?? '')).single();
    if (!source?.active || !['approved', 'owned'].includes(source.permission) || !source.evidence_url || !source.base_url || !source.approved_methods?.some((method: string) => ['api', 'open_web'].includes(method))) return json(403, { error: 'SOURCE_PERMISSION_REQUIRED' });
    const { data: run, error: runError } = await db.from('knot_ingestion_runs').insert({ source_id: source.id, status: 'running', requested_by: auth.user.id }).select().single();
    if (runError) throw new Error('RUN_CREATE_FAILED'); runId = run.id;
    const result = await download(source.base_url);
    const entries = items(result.body, result.contentType);
    if (entries.length) {
      const { error } = await db.from('knot_ingestion_items').insert(entries.map((entry) => ({ run_id: runId, source_id: source.id, external_id: entry.externalId, payload: entry.payload, raw_text: JSON.stringify(entry.payload).slice(0, 50000) })));
      if (error) throw new Error('REVIEW_ITEM_WRITE_FAILED');
    }
    await db.from('knot_ingestion_runs').update({ status: 'review_required', fetched_bytes: result.size, item_count: entries.length, completed_at: new Date().toISOString() }).eq('id', runId);
    return json(200, { runId, status: 'review_required', items: entries.length, bytes: result.size, published: 0 });
  } catch (reason) {
    const code = reason instanceof Error ? reason.message.slice(0, 80) : 'FEED_IMPORT_FAILED';
    if (runId) await db.from('knot_ingestion_runs').update({ status: 'failed', error_code: code, completed_at: new Date().toISOString() }).eq('id', runId);
    return json(422, { error: code, published: 0 });
  }
});
