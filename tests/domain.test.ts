import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublish, checkAgeBand, participationDecision } from '../src/domain/age';
import { deliveryTimeForUser, resolveAnnouncementAudience, validateAnnouncement } from '../src/domain/announcements';
import { assertFederatedImportPermission, parseFederatedFeed, submissionsFromFederatedFeed } from '../src/domain/federation';
import { certificateEligible, estimateReach, eventsOverlap, materialEventChangeFields, registrationAnswerErrors, validateProjectSubmission, validateRegistrationQuestions } from '../src/domain/operations';
import { CHECK_IN_PAYLOAD_PREFIX, checkInPayload, createCheckInToken, parseCheckInPayload } from '../src/domain/checkin';
import { communitiesFromEvents } from '../src/domain/communities';
import { duplicateCandidates, hasListing, normalizeTitle, normalizeUrl } from '../src/domain/dedupe';
import { defaultFilters, organizerAgeRule } from '../src/domain/defaults';
import { eventToICS, filterEvents, participationFit } from '../src/domain/events';
import { haversineKm } from '../src/domain/geo';
import { localityById } from '../src/domain/localities';
import { assertPublicEventUrl } from '../src/domain/inputAdapters';
import { parseInstantText } from '../src/domain/parser';
import { buildSampleEvents } from '../src/domain/sample';
import { canReviewSubmissions, isWorkspaceAdmin } from '../src/domain/permissions';
import { approvalRegistrationStatus, confirmedNativeRegistrations, hasNativeCapacity, initialNativeRegistrationStatus, isConfirmedNative, nextWaitlistCandidate, waitlistPosition } from '../src/domain/registration';
import { applySubmissionEdits, editsFromSubmission, eventFromReviewedSubmission, validateSubmissionEdits } from '../src/domain/review';
import { buildInitialSources, sourceCanIngest } from '../src/domain/sources';
import type { AgeBand, KnotEvent, Registration, RegistrationStatus, Submission, UserAccount } from '../src/domain/types';
import { validWebUrl, validateQuickPost, type QuickPostInput } from '../src/domain/validation';

const now = new Date('2026-10-24T06:00:00.000Z');
const samples = () => buildSampleEvents(now);
const eventById = (events: KnotEvent[], id: string) => {
  const event = events.find((candidate) => candidate.id === id);
  assert.ok(event, `Missing fixture ${id}`);
  return event;
};
const user = (ageBand: AgeBand, guardianConsent: UserAccount['guardianConsent'] = 'not_required'): UserAccount => ({
  id: `user-${ageBand}`, email: `${ageBand}@example.com`, name: 'Test User', passwordSalt: 'salt', passwordHash: 'hash',
  role: 'participant', ageBand, ageBandConfirmedOn: now.toISOString(), guardianConsent,
  areaLocalityId: 'indiranagar', radiusKm: 10, interests: ['Design'], skills: ['Figma'], learningGoals: [], createdAt: now.toISOString(),
});

function quickPost(patch: Partial<QuickPostInput> = {}): QuickPostInput {
  return {
    title: 'Test Community Event', eventType: 'meetup', startAt: '2026-11-01T10:00', endAt: '2026-11-01T12:00',
    mode: 'in_person', venueName: 'Test Venue', localityId: 'koramangala', address: '',
    registrationKind: 'native', capacity: null, approval: 'none', waitlistEnabled: false,
    registrationUrl: '', onlineJoinUrl: '', ageRule: organizerAgeRule('all_ages'),
    description: '', eligibilityText: '', interests: [], skills: [], priceKind: 'free', priceAmount: 0,
    registrationDeadline: '2026-10-31T22:00', ...patch,
  };
}

test('age bands distinguish allowed, excluded and uncertain participation', () => {
  assert.equal(checkAgeBand('18_plus', organizerAgeRule('adults_only')), 'can_join');
  assert.equal(checkAgeBand('16_17', organizerAgeRule('adults_only')), 'cannot_join');
  assert.equal(checkAgeBand('13_15', organizerAgeRule('age_range', 13, 17)), 'can_join');
  assert.equal(checkAgeBand('under_13', organizerAgeRule('age_range', 13, 17)), 'cannot_join');
  assert.equal(checkAgeBand('13_15', organizerAgeRule('age_range', 14, 16)), 'check_rule');
  assert.equal(checkAgeBand('18_plus', organizerAgeRule('not_stated')), 'check_rule');
  assert.equal(checkAgeBand(null, organizerAgeRule('all_ages')), 'check_rule');
});

test('guest participation requires authentication before an external handoff', () => {
  const event = eventById(samples(), 'sample-ai-builders');
  assert.equal(participationDecision(null, event, now), 'auth_required');
});

test('minor participation requires guardian consent and the native safety checklist', () => {
  const event = eventById(samples(), 'sample-design-systems');
  assert.equal(participationDecision(user('13_15', 'pending'), event, now), 'needs_consent');
  assert.equal(participationDecision(user('13_15', 'complete'), event, now), 'not_open_yet');
  assert.equal(participationDecision(user('13_15', 'complete'), { ...event, nativeSafetyChecklistComplete: true }, now), 'can_join');
  assert.equal(canPublish(user('16_17')), false);
  assert.equal(canPublish(user('18_plus')), true);
});

test('adult accounts cannot join youth-only events', () => {
  const event = eventById(samples(), 'sample-hardware-jam');
  assert.equal(participationDecision(user('18_plus'), event, now), 'cannot_join');
  assert.equal(participationDecision(user('13_15'), event, now), 'needs_consent');
});

test('participation closes for past events and respects registration opening time', () => {
  const event = eventById(samples(), 'sample-design-systems');
  assert.equal(participationDecision(user('18_plus'), { ...event, startAt: '2026-10-20T04:30:00.000Z' }, now), 'closed');
  assert.equal(participationDecision(user('18_plus'), { ...event, registrationOpensAt: '2026-10-25T04:30:00.000Z' }, now), 'not_open_yet');
  assert.equal(participationDecision(user('18_plus'), { ...event, registrationDeadline: '2026-10-23T04:30:00.000Z' }, now), 'closed');
  assert.equal(participationDecision(user('18_plus'), { ...event, status: 'pending_review' }, now), 'closed');
});

test('catalog filtering removes ended and cancelled events', () => {
  const events = samples();
  const ended = { ...events[0]!, id: 'ended', startAt: '2026-10-20T04:30:00.000Z', endAt: '2026-10-20T08:30:00.000Z' };
  const cancelled = { ...events[1]!, id: 'cancelled', status: 'cancelled' as const };
  const result = filterEvents([...events, ended, cancelled], { ...defaultFilters(), localityId: null, radiusKm: 100 }, now);
  assert.equal(result.some((event) => event.id === 'ended' || event.id === 'cancelled'), false);
});

test('interest, skill and online filters compose', () => {
  const events = samples();
  const base = { ...defaultFilters(), localityId: null, radiusKm: 100 };
  const design = filterEvents(events, { ...base, interest: 'Design' }, now);
  assert.ok(design.length > 0);
  assert.ok(design.every((event) => event.interests.includes('Design')));
  const reactOnline = filterEvents(events, { ...base, skill: 'React', mode: 'online' }, now);
  assert.ok(reactOnline.some((event) => event.id === 'sample-open-source'));
  assert.ok(reactOnline.every((event) => event.mode === 'online' && event.skills.includes('React')));
});

test('joinable filtering excludes known age conflicts but not unknown rules', () => {
  const events = samples();
  const unknown = { ...events[0]!, id: 'unknown-age', ageRule: organizerAgeRule('not_stated') };
  const result = filterEvents([...events, unknown], { ...defaultFilters(), localityId: null, radiusKm: 100, ageBand: '18_plus', onlyJoinable: true }, now);
  assert.equal(result.some((event) => event.id === 'sample-hardware-jam'), false);
  assert.equal(result.some((event) => event.id === 'unknown-age'), true);
});

test('Participation Fit explains matches and never treats unknown eligibility as strong', () => {
  const event = eventById(samples(), 'sample-design-systems');
  const origin = localityById('indiranagar');
  const strong = participationFit(user('18_plus'), event, origin);
  assert.equal(strong.label, 'strong');
  assert.ok(strong.reasons.some((reason) => reason.includes('Design')));
  const unknown = participationFit(user('18_plus'), { ...event, eligibilityKnown: false, eligibilityText: '' }, origin);
  assert.equal(unknown.label, 'possible');
  assert.equal(participationFit(null, event, origin).label, null);
});

test('Quick Post accepts a valid native in-person event', () => {
  assert.deepEqual(validateQuickPost(quickPost(), now), {});
});

test('Quick Post enforces core timing, age, venue and price rules', () => {
  const errors = validateQuickPost(quickPost({
    title: 'Hi', startAt: '2026-10-20T10:00', endAt: '2026-10-19T10:00', venueName: '',
    registrationDeadline: '2026-11-02T10:00', ageRule: organizerAgeRule('not_stated'), priceKind: 'paid', priceAmount: null,
  }), now);
  assert.ok(errors.title && errors.startAt && errors.endAt && errors.venueName && errors.registrationDeadline && errors.ageRule && errors.price);
});

test('online Quick Post supports registration now and joining details later for external registration', () => {
  assert.deepEqual(validateQuickPost(quickPost({ mode: 'online', registrationKind: 'external', registrationUrl: 'https://example.com/register', onlineJoinUrl: '' }), now), {});
  assert.deepEqual(validateQuickPost(quickPost({ mode: 'online', registrationKind: 'external', registrationUrl: '', onlineJoinUrl: 'https://meet.example.com/event' }), now), {});
  assert.ok(validateQuickPost(quickPost({ mode: 'online', registrationKind: 'external', registrationUrl: '', onlineJoinUrl: '' }), now).registrationUrl);
});

test('native online registration requires a joining link', () => {
  assert.ok(validateQuickPost(quickPost({ mode: 'online', registrationKind: 'native', onlineJoinUrl: '' }), now).onlineJoinUrl);
  assert.deepEqual(validateQuickPost(quickPost({ mode: 'online', registrationKind: 'native', onlineJoinUrl: 'https://meet.example.com/event' }), now), {});
});

test('URL validation rejects non-web and malformed URLs', () => {
  assert.equal(validWebUrl('https://example.com/event'), true);
  assert.equal(validWebUrl('http://example.com/event'), true);
  assert.equal(validWebUrl('javascript:alert(1)'), false);
  assert.equal(validWebUrl('not a url'), false);
});

test('Instant Add does not invent free pricing or numeric ages', () => {
  const missing = parseInstantText('Design Workshop\n14/11/2026\nVenue: Indiranagar', now);
  assert.equal(missing.price.value.kind, 'unknown');
  assert.equal(missing.ageRule.value.mode, 'not_stated');
  const conditional = parseInstantText('Design Workshop\nFree for members\nOpen to college students', now);
  assert.equal(conditional.price.value.kind, 'unknown');
  assert.match(conditional.price.value.note, /Free for members/);
  assert.equal(conditional.ageRule.value.mode, 'not_stated');
  assert.equal(conditional.ageRule.confidence, 'low');
});

test('Instant Add extracts explicit free, age, team, date and time evidence', () => {
  const draft = parseInstantText('AI Builders Hackathon\nDate: 14/11/2026\nTime: 6 PM\nVenue: Koramangala\nOpen to: 18+\nFree for everyone\nTeam size: 2-4\nRegister: https://example.com/register', now);
  assert.equal(draft.title.value, 'AI Builders Hackathon');
  assert.equal(draft.eventType.value, 'hackathon');
  assert.equal(draft.price.value.kind, 'free');
  assert.equal(draft.ageRule.value.mode, 'adults_only');
  assert.deepEqual(draft.teamSize.value, { min: 2, max: 4 });
  assert.equal(draft.registrationUrl.value, 'https://example.com/register');
  assert.equal(new Date(draft.startDatetime.value!).getHours(), 18);
});

test('Instant Add rolls a year-less past date into the next year', () => {
  const draft = parseInstantText('Community Meetup\n15 January at 6 PM', new Date(2026, 11, 30));
  assert.equal(new Date(draft.startDatetime.value!).getFullYear(), 2027);
  assert.equal(draft.startDatetime.confidence, 'medium');
});

test('dedupe normalizes tracking URLs and titles', () => {
  assert.equal(normalizeUrl('HTTPS://Example.com/event/?utm_source=x#details'), 'example.com/event');
  assert.equal(normalizeTitle('  AI: Builders & Makers '), 'ai builders makers');
  const events = samples();
  const original = events[0]!;
  const same = { ...events[1]!, id: 'same', title: original.title, startAt: original.startAt, venue: original.venue, listings: original.listings.map((listing) => ({ ...listing, originalUrl: `${listing.originalUrl}?utm_source=test` })) };
  assert.ok(duplicateCandidates(original, [same]).some((event) => event.id === 'same'));
  assert.equal(hasListing(original, original.listings[0]!), true);
});

test('ICS export includes UTC times and escaped text', () => {
  const event = { ...eventById(samples(), 'sample-design-systems'), title: 'Design, Build; Test', summary: 'Line one\nLine two' };
  const ics = eventToICS(event);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Design\\, Build\\; Test/);
  assert.match(ics, /DESCRIPTION:Line one\\nLine two/);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/);
});

test('geodesic locality distance is nonzero and symmetric', () => {
  const koramangala = localityById('koramangala')!;
  const whitefield = localityById('whitefield')!;
  const a = haversineKm(koramangala.latitude, koramangala.longitude, whitefield.latitude, whitefield.longitude);
  const b = haversineKm(whitefield.latitude, whitefield.longitude, koramangala.latitude, koramangala.longitude);
  assert.ok(a > 5 && a < 30);
  assert.equal(a, b);
});

test('community profiles are derived from canonical event relationships', () => {
  const communities = communitiesFromEvents(samples());
  const community = communities.find((item) => item.id === 'community-sample-ai-collective');
  assert.ok(community);
  assert.equal(community.isSample, true);
  assert.ok(community.events.every((event) => event.communityId === community.id));
  assert.ok(community.interests.includes('AI/ML'));
});

test('sample catalog remains explicitly labelled and source-linked', () => {
  const events = samples();
  assert.ok(events.length >= 12);
  assert.ok(events.every((event) => event.isSample));
  assert.ok(events.every((event) => event.listings.length > 0 && event.listings.every((listing) => listing.originalUrl)));
  assert.ok(events.filter((event) => new Date(event.startAt) > now).length >= 10);
  assert.equal(eventById(events, 'sample-research-circle').price.kind, 'unknown');
});

const reviewSubmission = (): Submission => ({
  id: 'submission-review-test', submitterId: 'submitter-1', inputType: 'text',
  rawText: 'Bengaluru Product & AI Meetup\nDate: 14/11/2026\nTime: 6 PM\nVenue: Koramangala\nOpen to: 18+\nFree for everyone\nRegister: https://example.com/product-ai\nContact: +91 9999999999\nPRIVATE-NOTE',
  status: 'pending_review', canonicalEventId: null, review: null, createdAt: now.toISOString(),
  draft: parseInstantText('Bengaluru Product & AI Meetup\nDate: 14/11/2026\nTime: 6 PM\nVenue: Koramangala\nOpen to: 18+\nFree for everyone\nRegister: https://example.com/product-ai\nContact: +91 9999999999\nPRIVATE-NOTE', now),
});

test('source permission gate requires activation, an approved method and external evidence', () => {
  const sources = buildInitialSources(now);
  const native = sources.find((source) => source.id === 'source-knot-native')!;
  const sample = sources.find((source) => source.id === 'source-sample-catalog')!;
  const platform = sources.find((source) => source.id === 'source-unstop')!;
  assert.equal(sourceCanIngest(native, 'native'), true);
  assert.equal(sourceCanIngest(sample, 'manual'), false);
  assert.equal(sourceCanIngest(platform, 'api'), false);
  const approvedWithoutEvidence = { ...platform, permission: 'approved' as const, active: true, approvedMethods: ['api' as const] };
  assert.equal(sourceCanIngest(approvedWithoutEvidence, 'api'), false);
  const approved = { ...approvedWithoutEvidence, evidenceUrl: 'https://example.com/permission' };
  assert.equal(sourceCanIngest(approved, 'api'), true);
  assert.equal(sourceCanIngest(approved, 'open_web'), false);
  assert.equal(sourceCanIngest({ ...approved, active: false }, 'api'), false);
});

test('review permission is explicit, adult-only and not granted to ordinary accounts', () => {
  const owner = { ...user('18_plus'), workspaceAdmin: true };
  assert.equal(isWorkspaceAdmin(owner), true);
  assert.equal(canReviewSubmissions(owner), true);
  assert.equal(canReviewSubmissions(user('18_plus')), false);
  assert.equal(canReviewSubmissions({ ...owner, ageBand: '16_17' as const }), false);
  assert.equal(canReviewSubmissions(null), false);
  assert.equal(canReviewSubmissions({ ...user('18_plus'), role: 'admin' as const }), true);
});

test('submission review validation blocks incomplete, past and already-reviewed publication', () => {
  const submission = reviewSubmission();
  const edits = editsFromSubmission(submission);
  assert.deepEqual(validateSubmissionEdits(submission, edits, now), {});
  const errors = validateSubmissionEdits(submission, {
    ...edits, title: 'Hi', startAt: '2026-10-20T10:00:00.000Z', venueName: '', registrationUrl: 'javascript:alert(1)', summary: 'short',
  }, now);
  assert.ok(errors.title && errors.startAt && errors.venueName && errors.registrationUrl && errors.summary);
  assert.ok(validateSubmissionEdits({ ...submission, status: 'rejected' }, edits, now).form);
});

test('human approval creates a non-sample canonical event with a reviewed community listing', () => {
  const submission = reviewSubmission();
  const edits = editsFromSubmission(submission);
  const event = eventFromReviewedSubmission(submission, edits, {
    eventId: 'event-reviewed', listingId: 'listing-reviewed', venueId: 'venue-reviewed', reviewerId: 'admin-1', now: now.toISOString(),
  });
  assert.equal(event.id, 'event-reviewed');
  assert.equal(event.isSample, false);
  assert.equal(event.organizerId, 'admin-1');
  assert.equal(event.createdById, 'submitter-1');
  assert.equal(event.registration.kind, 'external');
  assert.equal(event.listings.length, 1);
  assert.equal(event.listings[0]!.source, 'Community submission · human reviewed');
  assert.equal(event.listings[0]!.confidence, 'medium');
  assert.equal(event.venue?.localityId, 'koramangala');
  assert.equal(event.onlineJoinUrl, null);
});

test('reviewed public events do not copy private evidence or contact details from raw submissions', () => {
  const submission = reviewSubmission();
  const edits = { ...editsFromSubmission(submission), title: 'Reviewed Product & AI Meetup' };
  const applied = applySubmissionEdits(submission.draft, edits);
  assert.equal(applied.title.confidence, 'high');
  assert.equal(applied.title.value, 'Reviewed Product & AI Meetup');
  const event = eventFromReviewedSubmission(submission, edits, {
    eventId: 'event-privacy', listingId: 'listing-privacy', venueId: 'venue-privacy', reviewerId: 'admin-1', now: now.toISOString(),
  });
  const publicRecord = JSON.stringify(event);
  assert.equal(publicRecord.includes('PRIVATE-NOTE'), false);
  assert.equal(publicRecord.includes('9999999999'), false);
  assert.match(event.description, /Private submission evidence is not included/);
});

const registrationEvent = (capacity: number | null = 1, approval: 'none' | 'manual' = 'none', waitlistEnabled = true): KnotEvent => ({
  ...eventById(samples(), 'sample-design-systems'),
  id: 'registration-test',
  registration: { kind: 'native', externalUrl: null, capacity, approval, waitlistEnabled },
});
const nativeRegistration = (id: string, status: RegistrationStatus, createdAt = '2026-10-24T06:00:00.000Z', kind: 'native' | 'external' = 'native'): Registration => ({
  id, eventId: 'registration-test', userId: `user-${id}`, kind, status, selfDeclaredAgeRuleMet: false,
  createdAt, updatedAt: createdAt,
});

test('only confirmed native states consume event capacity', () => {
  const event = registrationEvent(3);
  const registrations = [
    nativeRegistration('registered', 'registered'), nativeRegistration('approved', 'approved'),
    nativeRegistration('pending', 'pending'), nativeRegistration('waitlisted', 'waitlisted'),
    nativeRegistration('rejected', 'rejected'), nativeRegistration('cancelled', 'cancelled'),
    nativeRegistration('external', 'self_confirmed_registered', undefined, 'external'),
  ];
  assert.equal(confirmedNativeRegistrations(registrations, event.id).length, 2);
  assert.equal(hasNativeCapacity(event, registrations), true);
  assert.equal(isConfirmedNative(registrations[0]!), true);
  assert.equal(isConfirmedNative(registrations[2]!), false);
  assert.equal(isConfirmedNative(registrations[6]!), false);
  assert.equal(hasNativeCapacity(event, [...registrations, nativeRegistration('attended', 'attended')]), false);
});

test('initial native registration branches between registered, pending, waitlisted and closed', () => {
  const automatic = registrationEvent(1);
  assert.equal(initialNativeRegistrationStatus(automatic, []), 'registered');
  const confirmed = [nativeRegistration('confirmed', 'registered')];
  assert.equal(initialNativeRegistrationStatus(automatic, confirmed), 'waitlisted');
  assert.equal(initialNativeRegistrationStatus(registrationEvent(1, 'none', false), confirmed), 'closed');
  assert.equal(initialNativeRegistrationStatus(automatic, [nativeRegistration('pending', 'pending')]), 'registered');
  assert.equal(initialNativeRegistrationStatus(registrationEvent(1, 'manual'), []), 'pending');
  assert.equal(initialNativeRegistrationStatus(registrationEvent(1, 'manual'), confirmed), 'pending');
  assert.equal(initialNativeRegistrationStatus(registrationEvent(null), confirmed), 'registered');
});

test('manual approval uses available capacity or waitlist without counting pending records', () => {
  const event = registrationEvent(1, 'manual');
  assert.equal(approvalRegistrationStatus(event, [nativeRegistration('pending', 'pending')]), 'approved');
  const confirmed = [nativeRegistration('confirmed', 'approved'), nativeRegistration('pending', 'pending')];
  assert.equal(approvalRegistrationStatus(event, confirmed), 'waitlisted');
  assert.equal(approvalRegistrationStatus(registrationEvent(1, 'manual', false), confirmed), 'closed');
});

test('waitlist order is deterministic and promotion selects the oldest entry only when capacity opens', () => {
  const event = registrationEvent(1);
  const confirmed = nativeRegistration('confirmed', 'registered', '2026-10-24T05:00:00.000Z');
  const later = nativeRegistration('later', 'waitlisted', '2026-10-24T07:00:00.000Z');
  const oldest = nativeRegistration('oldest', 'waitlisted', '2026-10-24T06:00:00.000Z');
  const full = [later, confirmed, oldest];
  assert.equal(waitlistPosition(full, oldest.id), 1);
  assert.equal(waitlistPosition(full, later.id), 2);
  assert.equal(nextWaitlistCandidate(event, full), null);
  const afterCancellation = full.map((registration) => registration.id === confirmed.id ? { ...registration, status: 'cancelled' as const } : registration);
  assert.equal(nextWaitlistCandidate(event, afterCancellation)?.id, oldest.id);
});

test('Quick Post validates finite native capacity without changing unlimited defaults', () => {
  assert.deepEqual(validateQuickPost(quickPost({ capacity: 2, approval: 'manual', waitlistEnabled: true }), now), {});
  assert.ok(validateQuickPost(quickPost({ capacity: 0 }), now).capacity);
  assert.ok(validateQuickPost(quickPost({ capacity: 1.5 }), now).capacity);
  assert.deepEqual(validateQuickPost(quickPost({ capacity: null }), now), {});
});

test('QR check-in tokens are random, fixed-length and independent of identity fields', () => {
  const first = createCheckInToken();
  const second = createCheckInToken();
  assert.match(first, /^[a-f0-9]{48}$/);
  assert.match(second, /^[a-f0-9]{48}$/);
  assert.notEqual(first, second);
  const payload = checkInPayload(first);
  assert.equal(payload, `${CHECK_IN_PAYLOAD_PREFIX}${first}`);
  assert.equal(payload.includes('@'), false);
  assert.equal(payload.includes('registration'), false);
});

test('QR and manual check-in payloads round-trip while malformed tokens are rejected', () => {
  const token = createCheckInToken();
  assert.equal(parseCheckInPayload(checkInPayload(token)), token);
  assert.equal(parseCheckInPayload(`  ${token.toUpperCase()}  `), token);
  assert.equal(parseCheckInPayload('person@example.com'), null);
  assert.equal(parseCheckInPayload('knot:checkin:v1:short'), null);
  assert.equal(parseCheckInPayload(`https://example.com/${token}`), null);
  assert.equal(parseCheckInPayload(''), null);
});

test('announcement audiences include only active native states and deduplicate people', () => {
  const registrations = [
    nativeRegistration('one', 'registered'), nativeRegistration('two', 'pending'),
    nativeRegistration('three', 'waitlisted'), nativeRegistration('four', 'rejected'),
    nativeRegistration('five', 'self_confirmed_registered', undefined, 'external'),
    nativeRegistration('six', 'approved'), nativeRegistration('seven', 'attended'),
    nativeRegistration('eight', 'cancelled'),
    { ...nativeRegistration('one-duplicate', 'pending'), userId: 'user-one' },
  ];
  const users = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'].map((id) => ({
    ...user('18_plus'), id: `user-${id}`, email: `${id}@example.com`, announcementOptOut: id === 'six',
  }));
  const all = resolveAnnouncementAudience('registration-test', 'all_native', registrations, users);
  assert.equal(all.audienceCount, 5);
  assert.equal(all.recipients.length, 4);
  assert.equal(all.optedOutCount, 1);
  assert.equal(all.recipients.some((recipient) => recipient.id === 'user-four' || recipient.id === 'user-five' || recipient.id === 'user-eight'), false);
  assert.equal(resolveAnnouncementAudience('registration-test', 'confirmed', registrations, users).audienceCount, 3);
  assert.equal(resolveAnnouncementAudience('registration-test', 'confirmed', registrations, users).recipients.length, 2);
  assert.equal(resolveAnnouncementAudience('registration-test', 'pending', registrations, users).audienceCount, 2);
  assert.equal(resolveAnnouncementAudience('registration-test', 'waitlisted', registrations, users).audienceCount, 1);
  assert.equal(resolveAnnouncementAudience('registration-test', 'attended', registrations, users).audienceCount, 1);
});

test('announcement validation rejects empty or oversized recipient messages', () => {
  assert.equal(validateAnnouncement({ kind: 'general', audience: 'confirmed', subject: 'Valid subject', body: 'A useful operational update.' }), null);
  assert.ok(validateAnnouncement({ kind: 'general', audience: 'confirmed', subject: 'Hi', body: 'A useful operational update.' }));
  assert.ok(validateAnnouncement({ kind: 'general', audience: 'confirmed', subject: 'Valid subject', body: 'Short' }));
  assert.ok(validateAnnouncement({ kind: 'general', audience: 'confirmed', subject: 'x'.repeat(101), body: 'A useful operational update.' }));
  assert.ok(validateAnnouncement({ kind: 'general', audience: 'confirmed', subject: 'Valid subject', body: 'x'.repeat(1201) }));
});

test('registration questions reject sensitive data and validate required choices', () => {
  const sensitive = [{ id: 'q1', label: 'Your Aadhaar number', kind: 'short_text' as const, required: true, options: [] }];
  assert.match(validateRegistrationQuestions(sensitive) ?? '', /sensitive/);
  const questions = [{ id: 'q1', label: 'T-shirt size', kind: 'single_choice' as const, required: true, options: ['M', 'L'] }];
  assert.equal(validateRegistrationQuestions(questions), null);
  assert.deepEqual(registrationAnswerErrors(questions, {}), { q1: 'This answer is required.' });
  assert.deepEqual(registrationAnswerErrors(questions, { q1: 'XL' }), { q1: 'Choose one of the available options.' });
  assert.deepEqual(registrationAnswerErrors(questions, { q1: 'L' }), {});
});

test('schedule overlap uses real intervals and project submission validates evidence links', () => {
  const [first, second] = samples();
  assert.ok(first && second);
  assert.equal(eventsOverlap(first, { ...second, startAt: first.startAt, endAt: first.endAt }), true);
  assert.equal(eventsOverlap(first, { ...second, startAt: '2030-01-01T00:00:00.000Z', endAt: '2030-01-01T01:00:00.000Z' }), false);
  assert.match(validateProjectSubmission({ title: 'Knot', description: 'A complete project summary', repositoryUrl: 'javascript:alert(1)', videoUrl: '', documentUrl: '' }) ?? '', /HTTP/);
  assert.equal(validateProjectSubmission({ title: 'Knot', description: 'A complete project summary', repositoryUrl: 'https://github.com/example/project', videoUrl: '', documentUrl: '' }), null);
});

test('certificates require native organizer attendance after the event', () => {
  const event = { ...samples()[0]!, endAt: '2026-10-23T12:00:00.000Z' };
  const base: Registration = { id: 'r1', eventId: event.id, userId: 'u1', status: 'attended', kind: 'native', selfDeclaredAgeRuleMet: true, createdAt: now.toISOString(), updatedAt: now.toISOString(), checkedInAt: now.toISOString(), checkInToken: 'token' };
  assert.equal(certificateEligible(base, event, now), true);
  assert.equal(certificateEligible({ ...base, status: 'registered' }, event, now), false);
  assert.equal(certificateEligible({ ...base, kind: 'external', status: 'self_confirmed_registered' }, event, now), false);
  assert.equal(certificateEligible(base, event, new Date('2026-10-20T00:00:00Z')), false);
});

test('custom date filtering includes overlapping dates without treating unknown price as free', () => {
  const events = samples();
  const ranged = filterEvents(events, { ...defaultFilters(), time: 'custom', customFrom: '2026-11-01', customTo: '2026-11-30' }, now);
  assert.ok(ranged.length > 0);
  assert.equal(filterEvents(events, { ...defaultFilters(), time: 'custom', customFrom: '2032-01-01', customTo: '2032-01-02' }, now).length, 0);
  const unknownPriced = events.map((event) => ({ ...event, price: { kind: 'unknown' as const, amountInr: null, note: '' } }));
  assert.equal(filterEvents(unknownPriced, { ...defaultFilters(), price: 'free' }, now).length, 0);
  assert.ok(filterEvents(unknownPriced, { ...defaultFilters(), price: 'unknown' }, now).length > 0);
});

test('reach analytics suppress small counts and exclude minors and restricted accounts', () => {
  const event = samples()[0]!;
  const adults = Array.from({ length: 5 }, (_, index) => ({ ...user('18_plus'), id: `adult-${index}`, interests: [event.interests[0] ?? 'Technology'] }));
  assert.equal(estimateReach(event, adults).count, null);
  assert.equal(estimateReach(event, adults).suppressed, false);
  assert.equal(estimateReach(event, adults.slice(0, 4)).suppressed, true);
  assert.equal(estimateReach(event, [...adults.slice(0, 4), user('under_13', 'complete')]).suppressed, true);
  assert.equal(estimateReach(event, [...adults.slice(0, 4), { ...adults[0]!, id: 'restricted', accountStatus: 'restricted' }]).suppressed, true);
});

test('federated imports require source permission and enter pending review with source evidence', () => {
  const source = { ...buildInitialSources().find((candidate) => candidate.kind === 'platform')!, active: true, permission: 'approved' as const, approvedMethods: ['api' as const], evidenceUrl: 'https://example.com/permission' };
  assert.equal(assertFederatedImportPermission(source), 'api');
  const records = parseFederatedFeed(JSON.stringify([{ title: 'Reviewed external event', startAt: '2026-12-01T04:30:00.000Z', originalUrl: 'https://example.com/event', registrationUrl: 'https://example.com/register' }]));
  const [submission] = submissionsFromFederatedFeed(records, source, 'reviewer', now.toISOString(), () => 'submission-feed-1');
  assert.ok(submission);
  assert.equal(submission.status, 'pending_review');
  assert.equal(submission.draft.title.value, 'Reviewed external event');
  assert.match(submission.rawText, /originalUrl/);
  assert.throws(() => assertFederatedImportPermission({ ...source, active: false }), /not active/);
  assert.throws(() => parseFederatedFeed('[{"title":"bad"}]'), /startAt/);
});

test('quiet hours delay optional notifications without changing daytime delivery', () => {
  const recipient = { ...user('18_plus'), quietHoursStart: '22:00', quietHoursEnd: '07:00' };
  const night = new Date('2026-10-24T23:15:00');
  const expected = new Date('2026-10-25T07:00:00');
  assert.equal(deliveryTimeForUser(recipient, night), expected.toISOString());
  const morning = new Date('2026-10-24T03:00:00');
  assert.equal(deliveryTimeForUser(recipient, morning), new Date('2026-10-24T07:00:00').toISOString());
  const daytime = new Date('2026-10-24T12:00:00');
  assert.equal(deliveryTimeForUser(recipient, daytime), daytime.toISOString());
});

test('material studio changes are explicit and cosmetic saves stay non-material', () => {
  const event = samples()[0]!;
  assert.deepEqual(materialEventChangeFields(event, { description: 'A cosmetic clarification', rounds: event.rounds ?? [], sessions: event.sessions ?? [] }), []);
  assert.deepEqual(materialEventChangeFields(event, { price: { ...event.price, kind: 'paid', amountInr: 500 } }), ['price']);
  assert.ok(materialEventChangeFields(event, { submissionDeadline: '2026-12-01T00:00:00.000Z' }).includes('submissionDeadline'));
  assert.ok(materialEventChangeFields(event, { team: { ...event.team, maxSize: 8 } }).includes('team'));
});

test('public URL adapter accepts web pages but rejects credentials and private-network hosts', () => {
  assert.equal(assertPublicEventUrl('https://example.com/events/one').hostname, 'example.com');
  assert.throws(() => assertPublicEventUrl('javascript:alert(1)'), /HTTP or HTTPS/);
  assert.throws(() => assertPublicEventUrl('http://127.0.0.1/admin'), /private-host/);
  assert.throws(() => assertPublicEventUrl('http://192.168.1.4/event'), /private-host/);
  assert.throws(() => assertPublicEventUrl('https://user:secret@example.com/event'), /credentials/);
});

test('Instant Add uses structured title, ISO dates and registration evidence without inventing age rules', () => {
  const parsed = parseInstantText('Source URL: https://example.com/source\nTitle: Structured Web Event\nStart: 2026-12-14T18:00:00+05:30\nEnd: 2026-12-14T20:00:00+05:30\nRegister: https://example.com/register', now);
  assert.equal(parsed.title.value, 'Structured Web Event');
  assert.equal(parsed.startDatetime.value, new Date('2026-12-14T18:00:00+05:30').toISOString());
  assert.equal(parsed.endDatetime.value, new Date('2026-12-14T20:00:00+05:30').toISOString());
  assert.equal(parsed.registrationUrl.value, 'https://example.com/register');
  assert.equal(parsed.ageRule.value.mode, 'not_stated');
});
