import assert from 'node:assert/strict';
import test from 'node:test';
import { canPublish, checkAgeBand, participationDecision } from '../src/domain/age';
import { communitiesFromEvents } from '../src/domain/communities';
import { duplicateCandidates, hasListing, normalizeTitle, normalizeUrl } from '../src/domain/dedupe';
import { defaultFilters, organizerAgeRule } from '../src/domain/defaults';
import { eventToICS, filterEvents, participationFit } from '../src/domain/events';
import { haversineKm } from '../src/domain/geo';
import { localityById } from '../src/domain/localities';
import { parseInstantText } from '../src/domain/parser';
import { buildSampleEvents } from '../src/domain/sample';
import type { AgeBand, KnotEvent, UserAccount } from '../src/domain/types';
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
    registrationKind: 'native', registrationUrl: '', onlineJoinUrl: '', ageRule: organizerAgeRule('all_ages'),
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
