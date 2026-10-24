import type { AppData, EventFilters, KnotEvent, MediaAsset, PersonalizationAction, SavedSearch, UserAccount } from '../../domain/types';
import { createInitialData, makeId } from '../repository';
import { cloudError, getSupabase } from './client';
import { getCloudSessionUser } from './auth';
import { cloudRowToEvent, cloudRowToRegistration, cloudRowToSource, eventToCloudRow, profilePatchFromUser, type CloudEventRow } from './mappers';

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];

export async function loadCloudSnapshot(): Promise<AppData> {
  const supabase = getSupabase();
  const user = await getCloudSessionUser();
  const eventResult = await supabase.from('knot_events').select('*').order('starts_at');
  if (eventResult.error) throw cloudError(eventResult.error);
  const [privateResult, registrationResult, saveResult, followResult, topicResult, goingResult, searchResult, sourceResult] = await Promise.all([
    user ? supabase.from('knot_event_private').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_registrations').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_saves').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_follows').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_topic_follows').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_going').select('*') : Promise.resolve({ data: [], error: null }),
    user ? supabase.from('knot_saved_searches').select('*') : Promise.resolve({ data: [], error: null }),
    supabase.from('knot_sources').select('*'),
  ]);
  const failure = [privateResult, registrationResult, saveResult, followResult, topicResult, goingResult, searchResult, sourceResult].find((result) => result.error);
  if (failure?.error) throw cloudError(failure.error);
  const privateByEvent = new Map(rows(privateResult.data).map((row) => [String(row.event_id), row]));
  const events = (eventResult.data as unknown as CloudEventRow[]).map((row) => cloudRowToEvent(row, privateByEvent.get(row.id)));
  const registrations = rows(registrationResult.data).map(cloudRowToRegistration);
  const saves = rows(saveResult.data).map((row) => ({ userId: String(row.user_id), eventId: String(row.event_id), createdAt: String(row.created_at) }));
  const follows = rows(followResult.data).map((row) => ({ userId: String(row.user_id), communityId: String(row.community_id), createdAt: String(row.created_at) }));
  const topicFollows = rows(topicResult.data).map((row) => ({ userId: String(row.user_id), topic: String(row.topic), createdAt: String(row.created_at) }));
  const going = rows(goingResult.data).map((row) => ({ userId: String(row.user_id), eventId: String(row.event_id), createdAt: String(row.created_at) }));
  const savedSearches: SavedSearch[] = rows(searchResult.data).map((row) => ({
    id: String(row.id), userId: String(row.user_id), name: String(row.name), filters: row.filters as EventFilters,
    alertEnabled: true, lastCheckedAt: String(row.last_checked_at ?? row.created_at), createdAt: String(row.created_at),
  }));
  const initial = createInitialData();
  return {
    ...initial,
    events, users: user ? [user] : [], session: user ? { userId: user.id, createdAt: new Date().toISOString() } : null,
    registrations, saves, follows, topicFollows, going, savedSearches,
    sources: rows(sourceResult.data).map(cloudRowToSource),
    notifications: [], announcements: [], submissions: [], feedback: [], teamPosts: [], teamRequests: [], questions: [],
    projectSubmissions: [], projectScores: [], reports: [], claims: [], consentRecords: [], certificates: [], auditRecords: [],
    series: [], seriesRuns: [], teamInvitations: [], teamContinuity: [], referralCampaigns: [], referralVisits: [], mediaAssets: [],
  };
}

export async function cloudGetEvent(eventId: string): Promise<KnotEvent> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('knot_get_event', { p_event_id: eventId });
  if (error) throw cloudError(error);
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw cloudError(sessionError);
  let privateRow: Row | undefined;
  if (sessionData.session?.user) {
    const privateResult = await supabase.from('knot_event_private').select('*').eq('event_id', String(data.id)).maybeSingle();
    if (privateResult.error) throw cloudError(privateResult.error);
    privateRow = privateResult.data ?? undefined;
  }
  return cloudRowToEvent(data as CloudEventRow, privateRow);
}

export async function cloudCreateEvent(event: KnotEvent, organizerId: string) {
  const { row, privateRow } = eventToCloudRow(event, organizerId);
  const { data, error } = await getSupabase().rpc('knot_create_event', { p_event: row, p_private: privateRow });
  if (error) throw cloudError(error);
  return cloudRowToEvent(data as CloudEventRow, privateRow);
}

export async function cloudUpdateProfile(userId: string, patch: Partial<UserAccount>) {
  const { error } = await getSupabase().from('knot_profiles').update(profilePatchFromUser(patch)).eq('id', userId);
  if (error) throw cloudError(error);
}

export async function cloudRegisterNative(eventId: string, answers: Record<string, string>, selfDeclaredAgeRuleMet: boolean, referralCampaignId: string | null) {
  const { data, error } = await getSupabase().rpc('knot_register_native', {
    p_event_id: eventId, p_answers: answers, p_self_declared_age_rule_met: selfDeclaredAgeRuleMet,
    p_referral_campaign_id: referralCampaignId,
  });
  if (error) throw cloudError(error);
  return cloudRowToRegistration(data);
}

export async function cloudRecordExternalHandoff(eventId: string, selfDeclaredAgeRuleMet: boolean, referralCampaignId: string | null) {
  const { data, error } = await getSupabase().rpc('knot_record_external_handoff', {
    p_event_id: eventId, p_self_declared_age_rule_met: selfDeclaredAgeRuleMet, p_referral_campaign_id: referralCampaignId,
  });
  if (error) throw cloudError(error);
  return cloudRowToRegistration(data);
}

export async function cloudSelfConfirmExternal(eventId: string) {
  const { data, error } = await getSupabase().rpc('knot_self_confirm_external', { p_event_id: eventId });
  if (error) throw cloudError(error);
  return cloudRowToRegistration(data);
}

export async function cloudRecordInterestSignal(eventId: string, action: PersonalizationAction, dwellSeconds?: number) {
  const { data, error } = await getSupabase().rpc('knot_record_interest_signal', {
    p_event_id: eventId, p_action: action, p_dwell_seconds: action === 'view' ? Math.max(5, Math.floor(dwellSeconds ?? 5)) : null,
  });
  if (error) throw cloudError(error);
  const result = Array.isArray(data?.learnedInterests) ? data.learnedInterests.filter((item: unknown): item is string => typeof item === 'string') : [];
  return { recorded: data?.recorded === true, learnedInterests: result, reason: typeof data?.reason === 'string' ? data.reason : null };
}

export async function cloudCancelRegistration(registrationId: string) {
  const { data, error } = await getSupabase().rpc('knot_cancel_registration', { p_registration_id: registrationId });
  if (error) throw cloudError(error);
  return cloudRowToRegistration(data);
}

export async function cloudSetSaved(userId: string, eventId: string, saved: boolean) {
  const query = saved
    ? getSupabase().from('knot_saves').upsert({ user_id: userId, event_id: eventId })
    : getSupabase().from('knot_saves').delete().eq('user_id', userId).eq('event_id', eventId);
  const { error } = await query;
  if (error) throw cloudError(error);
}

export async function cloudSetFollow(userId: string, communityId: string, following: boolean) {
  const query = following
    ? getSupabase().from('knot_follows').upsert({ user_id: userId, community_id: communityId })
    : getSupabase().from('knot_follows').delete().eq('user_id', userId).eq('community_id', communityId);
  const { error } = await query;
  if (error) throw cloudError(error);
}

export async function cloudRecordReferralVisit(token: string, sessionKey: string) {
  const { data, error } = await getSupabase().rpc('knot_record_referral_visit', { p_token: token, p_session_key: sessionKey });
  if (error) throw cloudError(error);
  return data === true;
}

export async function cloudUploadMedia(asset: MediaAsset, blob: Blob) {
  const supabase = getSupabase();
  const storagePath = `${asset.uploaderId}/${asset.eventId}/${asset.id}.webp`;
  const { error: uploadError } = await supabase.storage.from('knot-media').upload(storagePath, blob, { contentType: 'image/webp', upsert: false });
  if (uploadError) throw cloudError(uploadError);
  const { error } = await supabase.from('knot_media_assets').insert({
    id: asset.id, event_id: asset.eventId, uploader_id: asset.uploaderId,
    kind: asset.kind, title: asset.title, alt_text: asset.altText, mime_type: 'image/webp', size_bytes: asset.sizeBytes,
    width: asset.width, height: asset.height, storage_path: storagePath, consent_basis: asset.consentBasis, status: 'draft',
  });
  if (error) {
    await supabase.storage.from('knot-media').remove([storagePath]);
    throw cloudError(error);
  }
  return storagePath;
}

export async function cloudSetMediaStatus(assetId: string, status: 'draft' | 'published' | 'removed') {
  const { error } = await getSupabase().from('knot_media_assets').update({ status, updated_at: new Date().toISOString() }).eq('id', assetId);
  if (error) throw cloudError(error);
}

export async function cloudSignedMediaUrl(storagePath: string, expiresSeconds = 300) {
  const { data, error } = await getSupabase().storage.from('knot-media').createSignedUrl(storagePath, expiresSeconds);
  if (error) throw cloudError(error);
  return data.signedUrl;
}

export function newCloudId(prefix: string) {
  return makeId(prefix);
}
