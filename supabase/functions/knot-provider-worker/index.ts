import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const text = (value: unknown) => typeof value === 'string' ? value : '';

async function liveKitJwt(room: string, admin = false) {
  const key = Deno.env.get('LIVEKIT_API_KEY') ?? '';
  const secret = Deno.env.get('LIVEKIT_API_SECRET') ?? '';
  if (!key || !secret) throw new Error('PROVIDER_NOT_CONFIGURED');
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ iss: key, sub: key, iat: now, nbf: now - 5, exp: now + 300, video: admin ? { roomCreate: true, roomList: true } : { roomJoin: true, room } })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const signature = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(`${header}.${payload}`));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return `${header}.${payload}.${encoded}`;
}

async function execute(job: Record<string, unknown>) {
  const provider = text(job.provider);
  const payload = typeof job.payload === 'object' && job.payload ? job.payload as Record<string, unknown> : {};
  if (provider === 'resend') {
    const key = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('RESEND_FROM_EMAIL');
    if (!key || !from) throw new Error('PROVIDER_NOT_CONFIGURED');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ from, to: payload.to, subject: text(payload.subject).slice(0, 200), html: text(payload.html).slice(0, 200000), text: text(payload.text).slice(0, 100000) }) });
    const body = await response.json(); if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    return { reference: text(body.id), providerStatus: 'accepted' };
  }
  if (provider === 'razorpay') {
    const id = Deno.env.get('RAZORPAY_KEY_ID'); const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!id || !secret) throw new Error('PROVIDER_NOT_CONFIGURED');
    const amount = Number(payload.amount_inr); if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_PAYMENT_AMOUNT');
    const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'content-type': 'application/json' }, body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: text(job.idempotency_key).slice(0, 40) }) });
    const body = await response.json(); if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    if (payload.order_id) await db.from('knot_payment_orders').update({ provider_order_id: text(body.id), status: 'pending', updated_at: new Date().toISOString() }).eq('id', payload.order_id).neq('status', 'paid');
    return { reference: text(body.id), providerStatus: 'order_created_not_paid' };
  }
  if (provider === 'whatsapp') {
    const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN'); const phone = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'); const version = Deno.env.get('WHATSAPP_GRAPH_VERSION');
    if (!token || !phone || !version) throw new Error('PROVIDER_NOT_CONFIGURED');
    const response = await fetch(`https://graph.facebook.com/${version}/${phone}/messages`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: payload.to, type: 'template', template: payload.template }) });
    const body = await response.json(); if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    return { reference: text(body.messages?.[0]?.id), providerStatus: 'accepted' };
  }
  if (provider === 'livekit') {
    const ws = Deno.env.get('LIVEKIT_WS_URL'); if (!ws) throw new Error('PROVIDER_NOT_CONFIGURED');
    const room = text(payload.room).slice(0, 200); if (!/^[A-Za-z0-9_-]+$/.test(room)) throw new Error('INVALID_ROOM');
    const endpoint = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:').replace(/\/$/, '');
    const response = await fetch(`${endpoint}/twirp/livekit.RoomService/CreateRoom`, { method: 'POST', headers: { authorization: `Bearer ${await liveKitJwt(room, true)}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: room, empty_timeout: 600, max_participants: Math.min(100, Math.max(2, Number(payload.max_participants) || 20)) }) });
    const body = await response.json(); if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
    if (payload.room_id) await db.from('knot_video_rooms').update({ provider_room_id: text(body.name || room), status: 'active', updated_at: new Date().toISOString() }).eq('id', payload.room_id);
    return { reference: text(body.name || room), providerStatus: 'room_active' };
  }
  throw new Error('UNSUPPORTED_PROVIDER_OPERATION');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
  if (!url || !serviceKey) return json(503, { error: 'WORKER_NOT_CONFIGURED' });
  if (request.headers.get('authorization') !== `Bearer ${serviceKey}`) return json(401, { error: 'SERVICE_AUTHORIZATION_REQUIRED' });
  const { data: jobs, error } = await db.rpc('knot_claim_outbox', { p_limit: 10 });
  if (error) return json(500, { error: 'JOB_CLAIM_FAILED' });
  let confirmed = 0; let deferred = 0; let failed = 0;
  for (const job of jobs ?? []) {
    try {
      const result = await execute(job);
      await db.from('knot_outbox').update({ status: 'confirmed', provider_reference: result.reference, last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing');
      confirmed += 1;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'PROVIDER_EXECUTION_FAILED';
      const unconfigured = message === 'PROVIDER_NOT_CONFIGURED';
      const retry = unconfigured || (Number(job.attempts) < 5 && !message.startsWith('INVALID_'));
      await db.from('knot_outbox').update({ status: retry ? 'pending' : 'failed', available_at: new Date(Date.now() + (unconfigured ? 3600000 : Math.min(300000, 15000 * 2 ** Number(job.attempts)))).toISOString(), last_error: message.slice(0, 200), updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing');
      if (retry) deferred += 1; else failed += 1;
    }
  }
  return json(200, { claimed: jobs?.length ?? 0, confirmed, deferred, failed, note: 'Confirmed means the provider accepted the requested operation; payment capture and message delivery are separate states.' });
});
