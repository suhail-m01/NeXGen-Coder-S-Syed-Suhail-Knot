import { createClient } from 'npm:@supabase/supabase-js@2';
const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
async function hmac(secret: string, body: string) {
  return hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(body)));
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!secret) return json(503, { error: 'WEBHOOK_NOT_CONFIGURED' });
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  if (!equal(await hmac(secret, raw), signature)) return json(401, { error: 'INVALID_SIGNATURE' });
  const eventId = request.headers.get('x-razorpay-event-id');
  if (!eventId) return json(400, { error: 'EVENT_ID_REQUIRED' });
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json(400, { error: 'INVALID_JSON' }); }
  const event = String(payload.event ?? '');
  if (!['payment.captured', 'payment.failed'].includes(event)) return json(200, { ignored: true });
  const payment = payload.payload?.payment?.entity;
  const providerOrderId = String(payment?.order_id ?? '');
  const { data: order } = await db.from('knot_payment_orders').select('*').eq('provider_order_id', providerOrderId).maybeSingle();
  if (!order) return json(202, { accepted: false, reason: 'ORDER_NOT_READY' });
  if (Math.round(Number(order.amount_inr) * 100) !== Number(payment.amount) || String(payment.currency).toUpperCase() !== order.currency) return json(422, { error: 'PAYMENT_AMOUNT_MISMATCH' });
  const status = event === 'payment.captured' ? 'paid' : 'failed';
  let update = db.from('knot_payment_orders').update({ status, provider_payment_id: String(payment.id ?? ''), updated_at: new Date().toISOString() }).eq('id', order.id);
  update = status === 'paid' ? update.neq('status', 'refunded') : update.neq('status', 'paid');
  const { error } = await update;
  if (error) return json(500, { error: 'PAYMENT_UPDATE_FAILED' });
  const payloadHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
  const { error: replayError } = await db.from('knot_webhook_events').insert({ provider: 'razorpay', external_event_id: eventId, payload_hash: payloadHash });
  if (replayError && replayError.code !== '23505') return json(500, { error: 'REPLAY_LEDGER_FAILED' });
  return json(200, { accepted: true, duplicate: replayError?.code === '23505', status });
});
