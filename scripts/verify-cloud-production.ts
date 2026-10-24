import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { buildSampleEvents } from '../src/domain/sample';
import { eventToCloudRow } from '../src/data/supabase/mappers';

if (process.env.KNOT_RUN_CLOUD_TESTS !== '1') throw new Error('Set KNOT_RUN_CLOUD_TESTS=1 for disposable remote integration tests.');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));
Object.assign(globalThis, { WebSocket });
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Publishable Supabase configuration is required.');
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = (role: string) => `knot-cloud-test-${role}-${suffix}@example.com`;
const password = 'CloudTest!234567';
let checks = 0;
const pass = (message: string) => { checks += 1; console.log(`✓ ${message}`); };

async function account(role: string, ageBand = '18_plus') {
  const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({
    email: email(role), password,
    options: { data: { name: `Cloud Test ${role}`, age_band: ageBand, role: role === 'organizer' ? 'organizer' : 'participant', interests: [] } },
  });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error('Disposable account requires temporary test auto-confirmation.');
  return { client, userId: data.user.id };
}
async function eventFor(organizer: { client: SupabaseClient; userId: string }, kind: 'native' | 'external' = 'native', visibility: 'public' | 'unlisted' = 'unlisted', label = 'capacity') {
  const event = structuredClone(buildSampleEvents().find((item) => item.registration.kind === 'native') ?? buildSampleEvents()[0]!);
  event.id = `event-cloud-test-${label}-${suffix}`; event.slug = event.id; event.title = `[TEST] Cloud ${label} ${suffix}`;
  event.organizerId = organizer.userId; event.createdById = organizer.userId; event.isSample = true;
  event.status = 'published'; event.visibility = visibility; event.registration.kind = kind; event.registration.capacity = kind === 'native' ? 1 : null;
  event.registration.approval = 'none'; event.registration.waitlistEnabled = true; event.registration.questions = [];
  event.registration.externalUrl = kind === 'external' ? 'https://example.com/external-registration' : null;
  event.listings = event.listings.map((listing, index) => ({ ...listing, registrationUrl: kind === 'external' && index === 0 ? event.registration.externalUrl : null }));
  event.registrationOpensAt = null; event.registrationDeadline = null; event.startAt = new Date(Date.now() + 7 * 86400000).toISOString();
  event.endAt = new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(); event.onlineJoinUrl = 'https://example.com/private-join';
  const { row, privateRow } = eventToCloudRow(event, organizer.userId);
  const { error } = await organizer.client.rpc('knot_create_event', { p_event: row, p_private: privateRow });
  if (error) throw error;
  return event;
}
async function subscribeChannel(channel: ReturnType<SupabaseClient['channel']>) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Realtime subscription timed out')), 15000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); reject(new Error(`Realtime subscription failed: ${status}`)); }
    });
  });
}
async function within<T>(promise: Promise<T>, label: string, milliseconds = 15000): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds))]);
}

async function register(client: SupabaseClient, eventId: string) {
  const { data, error } = await client.rpc('knot_register_native', { p_event_id: eventId, p_answers: {}, p_self_declared_age_rule_met: false, p_referral_campaign_id: null });
  if (error) throw error;
  return data;
}

const clients: SupabaseClient[] = [];
try {
  const minorClient = createClient(url!, key!, { auth: { persistSession: false } });
  const minor = await minorClient.auth.signUp({ email: email('minor'), password, options: { data: { name: 'Cloud Test Minor', age_band: '16_17', role: 'participant' } } });
  assert.ok(minor.error, 'Minor signup should be rejected by the production trigger');
  pass('production signup rejects a minor account');

  const organizer = await account('organizer'); clients.push(organizer.client);
  const first = await account('first'); clients.push(first.client);
  const second = await account('second'); clients.push(second.client);
  const third = await account('third'); clients.push(third.client);
  pass('four disposable adult accounts received server-managed profiles');

  const escalation = await first.client.from('knot_profiles').update({ role: 'admin', workspace_admin: true }).eq('id', first.userId);
  assert.ok(escalation.error, 'Profile privilege escalation should fail');
  pass('client cannot self-assign administration');

  const geocodeAnonymous = createClient(url!, key!, { auth: { persistSession: false } });
  const anonymousLookup = await geocodeAnonymous.functions.invoke('knot-geocode', { body: { query: 'Koramangala, Bengaluru, India' } });
  assert.ok(anonymousLookup.error, 'Anonymous geocoding must be denied');
  const anonymousCache = await geocodeAnonymous.from('knot_geocode_cache').select('*');
  assert.ok(anonymousCache.error, 'Private geocode cache must not be readable anonymously');
  const geocodeQuery = 'Koramangala, Bengaluru, India';
  const firstLookup = await organizer.client.functions.invoke('knot-geocode', { body: { query: geocodeQuery } });
  if (firstLookup.error) {
    const status = firstLookup.error.context?.status;
    const details = await firstLookup.error.context?.clone().json().catch(() => ({}));
    const expectedFailure = ['GEOCODE_UPSTREAM_UNAVAILABLE', 'UPSTREAM_RATE_LIMITED'].includes(details?.error);
    if (process.env.KNOT_REQUIRE_LIVE_GEOCODE === '1' || !expectedFailure || ![429, 502].includes(status ?? 0)) throw firstLookup.error;
    assert.equal(firstLookup.data, null);
    pass(`geocoding denies anonymous/cache access and fails closed when upstream is unavailable (HTTP ${details.upstreamStatus ?? status})`);
  } else {
    assert.ok(firstLookup.data.candidate, 'Expected a public-place Koramangala candidate');
    assert.ok(Number(firstLookup.data.candidate.latitude) > 12 && Number(firstLookup.data.candidate.latitude) < 14);
    assert.ok(Number(firstLookup.data.candidate.longitude) > 76 && Number(firstLookup.data.candidate.longitude) < 78);
    assert.equal(JSON.stringify(firstLookup.data).includes(geocodeQuery), false, 'Raw query must not be echoed into the cached response');
    const cachedLookup = await organizer.client.functions.invoke('knot-geocode', { body: { query: geocodeQuery.toLowerCase() } });
    if (cachedLookup.error) throw cachedLookup.error;
    assert.equal(cachedLookup.data.cache, 'hit');
    assert.equal(cachedLookup.data.candidate.geocodedAt, firstLookup.data.candidate.geocodedAt);
    pass('geocoding denies anonymous/cache access and reuses a normalized public-place result');
  }

  const event = await eventFor(organizer);
  const anonymous = createClient(url!, key!, { auth: { persistSession: false } });
  const bulkUnlisted = await anonymous.from('knot_events').select('*').eq('id', event.id);
  assert.equal(bulkUnlisted.data?.length, 0, 'Unlisted rows must not be bulk-readable');
  const publicRead = await anonymous.rpc('knot_get_event', { p_event_id: event.id });
  if (publicRead.error) throw publicRead.error;
  assert.equal(JSON.stringify(publicRead.data.public_data).includes('private-join'), false);
  assert.equal(publicRead.data.online_join_url, undefined);
  pass('unlisted detail works by ID without anonymous bulk export or joining-link leakage');

  const realtimeEvent = await eventFor(organizer, 'native', 'public', 'realtime');
  let profileUpdate = await first.client.from('knot_profiles').update({ personalization_consent: true }).eq('id', first.userId);
  if (profileUpdate.error) throw profileUpdate.error;
  let signal = await first.client.rpc('knot_record_interest_signal', { p_event_id: realtimeEvent.id, p_action: 'view', p_dwell_seconds: 4 });
  if (signal.error) throw signal.error;
  assert.equal(signal.data.recorded, false);
  signal = await first.client.rpc('knot_record_interest_signal', { p_event_id: realtimeEvent.id, p_action: 'view', p_dwell_seconds: 5 });
  if (signal.error) throw signal.error;
  assert.equal(signal.data.recorded, true);
  const otherUserSignals = await second.client.from('knot_interest_signals').select('*');
  assert.equal((otherUserSignals.data ?? []).some((row) => row.user_id === first.userId), false);
  profileUpdate = await first.client.from('knot_profiles').update({ personalization_consent: false }).eq('id', first.userId);
  if (profileUpdate.error) throw profileUpdate.error;
  const withdrawnSignals = await first.client.from('knot_interest_signals').select('*');
  const withdrawnProfile = await first.client.from('knot_profiles').select('learned_interests,personalization_consent').eq('id', first.userId).single();
  assert.equal(withdrawnSignals.data?.length, 0);
  assert.deepEqual(withdrawnProfile.data?.learned_interests, []);
  assert.equal(withdrawnProfile.data?.personalization_consent, false);
  pass('adult consent gates five-second signals, isolates users and withdraws all learned data');

  let notifyPublic!: () => void;
  const publicPayload = new Promise<void>((resolve) => { notifyPublic = resolve; });
  const publicChannel = anonymous.channel(`test-public-${suffix}`).on('postgres_changes', { event: '*', schema: 'public', table: 'knot_events' }, (payload) => {
    if ((payload.new as { id?: string }).id === realtimeEvent.id) notifyPublic();
  });
  await subscribeChannel(publicChannel);
  const realtimeUpdate = await organizer.client.from('knot_events').update({ title: `[TEST] Realtime update ${suffix}` }).eq('id', realtimeEvent.id);
  if (realtimeUpdate.error) throw realtimeUpdate.error;
  await within(publicPayload, 'public Realtime row delivery');
  await anonymous.removeChannel(publicChannel);
  pass('public catalog Realtime delivers an authorized row update');

  let notifySave!: () => void;
  let leakedToSecond = false;
  const savePayload = new Promise<void>((resolve) => { notifySave = resolve; });
  const firstPrivate = first.client.channel(`knot-private-${first.userId}`, { config: { private: true } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'knot_saves' }, (payload) => {
      if ((payload.new as { event_id?: string }).event_id === realtimeEvent.id) notifySave();
    });
  const secondPrivate = second.client.channel(`knot-private-${second.userId}`, { config: { private: true } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'knot_saves' }, (payload) => {
      if ((payload.new as { user_id?: string }).user_id === first.userId) leakedToSecond = true;
    });
  await subscribeChannel(firstPrivate);
  await subscribeChannel(secondPrivate);
  const saved = await first.client.from('knot_saves').upsert({ user_id: first.userId, event_id: realtimeEvent.id });
  if (saved.error) throw saved.error;
  await within(savePayload, 'private Realtime row delivery');
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.equal(leakedToSecond, false);
  await first.client.removeChannel(firstPrivate);
  await second.client.removeChannel(secondPrivate);
  pass('private Realtime delivers own state without cross-user row leakage');

  const directInsert = await first.client.from('knot_registrations').insert({ event_id: event.id, user_id: first.userId, kind: 'native', status: 'attended' });
  assert.ok(directInsert.error, 'Direct registration/attendance insert must be denied');
  pass('client cannot insert attendance directly');

  const [one, two, three] = await Promise.all([register(first.client, event.id), register(second.client, event.id), register(third.client, event.id)]);
  const statuses = [one.status, two.status, three.status];
  assert.equal(statuses.filter((status) => status === 'registered').length, 1);
  assert.equal(statuses.filter((status) => status === 'waitlisted').length, 2);
  pass('three concurrent registrations produce exactly one confirmed seat and two waitlisted records');

  const registered = [one, two, three].find((item) => item.status === 'registered');
  const waitlisted = [one, two, three].filter((item) => item.status === 'waitlisted');
  const ownerFor = (registration: { user_id: string }) => registration.user_id === first.userId ? first.client : registration.user_id === second.userId ? second.client : third.client;
  let result = await ownerFor(waitlisted[0]).rpc('knot_cancel_registration', { p_registration_id: waitlisted[0].id });
  if (result.error) throw result.error;
  let remaining = await organizer.client.from('knot_registrations').select('*').eq('event_id', event.id);
  if (remaining.error) throw remaining.error;
  assert.equal(remaining.data.filter((item) => item.status === 'registered').length, 1);
  assert.equal(remaining.data.filter((item) => item.status === 'waitlisted').length, 1);
  pass('cancelling a waitlisted record does not overbook or promote another record');

  result = await ownerFor(registered).rpc('knot_cancel_registration', { p_registration_id: registered.id });
  if (result.error) throw result.error;
  remaining = await organizer.client.from('knot_registrations').select('*').eq('event_id', event.id);
  if (remaining.error) throw remaining.error;
  assert.equal(remaining.data.filter((item) => item.status === 'registered').length, 1);
  assert.equal(remaining.data.filter((item) => item.status === 'cancelled').length, 2);
  pass('cancelling the confirmed seat promotes exactly one remaining waitlisted record');

  const externalEvent = await eventFor(organizer, 'external', 'public', 'external');
  let external = await second.client.rpc('knot_record_external_handoff', { p_event_id: externalEvent.id, p_self_declared_age_rule_met: false, p_referral_campaign_id: null });
  if (external.error) throw external.error;
  assert.equal(external.data.status, 'opened_externally');
  assert.notEqual(external.data.status, 'registered');
  external = await second.client.rpc('knot_self_confirm_external', { p_event_id: externalEvent.id });
  if (external.error) throw external.error;
  assert.equal(external.data.status, 'self_confirmed_registered');
  pass('external handoff and self-confirmation remain distinct from verified registration');

  const unauthorized = await first.client.from('knot_events').update({ title: '[TEST] Unauthorized overwrite' }).eq('id', event.id).select();
  assert.ok(unauthorized.error || unauthorized.data.length === 0);
  const unchanged = await organizer.client.from('knot_events').select('title').eq('id', event.id).single();
  assert.equal(unchanged.data?.title, event.title);
  pass('non-organizer cannot overwrite the event');

  const seriesId = `series-cloud-test-${suffix}`;
  const seriesInsert = await organizer.client.from('knot_series').insert({
    id: seriesId, organizer_id: organizer.userId, title: '[TEST] Due cloud series', template_event_id: event.id,
    frequency: 'weekly', next_at: new Date(Date.now() - 1000).toISOString(), occurrences_remaining: 2, active: true,
  });
  if (seriesInsert.error) throw seriesInsert.error;
  const forbiddenScheduler = await first.client.rpc('knot_process_series');
  assert.ok(forbiddenScheduler.error, 'Participant must not execute the server scheduler');
  pass('ordinary participant cannot execute the series scheduler');
  console.log(`\n${checks} remote production checks passed. Test event: ${event.id}; test series: ${seriesId}`);
} finally {
  await Promise.all(clients.map((client) => client.auth.signOut().catch(() => undefined)));
}
