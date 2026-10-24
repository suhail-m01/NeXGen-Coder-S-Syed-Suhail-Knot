import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSampleEvents } from '../src/domain/sample';
import { discoveryOverview, editDistanceWithin, eventSearchScore, paginateDiscovery } from '../src/domain/discovery';
import { appendPersonalizationSignal, deriveLearnedInterests, newPersonalizationSignal } from '../src/domain/personalization';
import { filterEvents, participationFit, sortEvents } from '../src/domain/events';
import { defaultFilters } from '../src/domain/defaults';
import type { GoingRecord, PersonalizationSignal, Registration, SavedEvent, UserAccount } from '../src/domain/types';

const events = buildSampleEvents();
const adult: UserAccount = {
  id: 'adult', email: 'adult@example.com', name: 'Adult', passwordSalt: '', passwordHash: '', role: 'participant',
  ageBand: '18_plus', ageBandConfirmedOn: '2026-01-01T00:00:00.000Z', guardianConsent: 'not_required',
  areaLocalityId: null, radiusKm: 10, interests: [], skills: [], learningGoals: [], createdAt: '2026-01-01T00:00:00.000Z',
  accountStatus: 'active', personalizationConsent: true, learnedInterests: [],
};

test('typo-tolerant discovery retains multi-word precision and relevance ordering', () => {
  const hackathon = events.find((event) => event.eventType === 'hackathon')!;
  assert.ok(eventSearchScore(hackathon, 'hakathon') > 0);
  assert.ok(eventSearchScore(hackathon, `${hackathon.title.slice(0, 8)} completely-unrelated-token`) === 0);
  assert.equal(editDistanceWithin('cat', 'dog', 1), false);
  const filters = { ...defaultFilters(), query: 'hakathon', sort: 'relevance' as const, localityId: null };
  assert.ok(filterEvents(events, filters).includes(hackathon));
  const ranked = sortEvents(events.filter((event) => eventSearchScore(event, hackathon.title) > 0), { ...filters, query: hackathon.title }, null);
  assert.equal(ranked[0]?.id, hackathon.id);
});

test('pagination is bounded and reports an honest next page', () => {
  const page = paginateDiscovery(events, 1, 2);
  assert.equal(page.items.length, 2);
  assert.equal(page.total, events.length);
  assert.equal(page.hasMore, events.length > 2);
  assert.equal(page.nextPage, events.length > 2 ? 2 : null);
  assert.equal(paginateDiscovery(events, -4, 1000).pageSize, 100);
});

test('aggregate trends suppress small groups and exclude external/self-reported evidence', () => {
  const event = { ...events[0]!, id: 'real-event', isSample: false, status: 'published' as const, startAt: '2027-01-01T10:00:00.000Z', endAt: '2027-01-01T12:00:00.000Z' };
  const registrations: Registration[] = Array.from({ length: 6 }, (_, index) => ({
    id: `r${index}`, eventId: event.id, userId: `u${index}`, kind: index === 5 ? 'external' : 'native',
    status: index === 5 ? 'self_confirmed_registered' : 'registered', selfDeclaredAgeRuleMet: false,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  }));
  const saves: SavedEvent[] = Array.from({ length: 4 }, (_, index) => ({ userId: `s${index}`, eventId: event.id, createdAt: '2026-01-01T00:00:00.000Z' }));
  const going: GoingRecord[] = [];
  const result = discoveryOverview([event], registrations, saves, going, new Date('2026-06-01T00:00:00.000Z'));
  assert.equal(result.trending.length, 1);
  assert.equal(result.trending[0]?.confirmedNative, 5);
  assert.equal(result.trending[0]?.saves, null);
  assert.ok(result.categories.length > 0);
});

test('personalization requires active adult opt-in', () => {
  const event = events[0]!;
  assert.equal(newPersonalizationSignal({ ...adult, personalizationConsent: false }, event, 'view', 'x'), null);
  assert.equal(newPersonalizationSignal({ ...adult, ageBand: '16_17' }, event, 'view', 'x'), null);
  assert.ok(newPersonalizationSignal(adult, event, 'view', 'x'));
});

test('interest signals dedupe daily, decay and expire without storing attendance claims', () => {
  const event = { ...events[0]!, interests: ['AI/ML', 'Design'] };
  const now = new Date('2026-06-01T12:00:00.000Z');
  const first = newPersonalizationSignal(adult, event, 'save', 'first', now)!;
  const duplicate = { ...first, id: 'duplicate' };
  const appended = appendPersonalizationSignal([], first, now);
  const deduped = appendPersonalizationSignal(appended.signals, duplicate, now);
  assert.equal(appended.added, true);
  assert.equal(deduped.added, false);
  assert.deepEqual(deduped.learnedInterests, ['AI/ML', 'Design']);
  const expired: PersonalizationSignal = { ...first, expiresAt: '2026-06-01T00:00:00.000Z' };
  assert.deepEqual(deriveLearnedInterests([expired], adult.id, now), []);
  assert.deepEqual(deriveLearnedInterests([first], 'someone-else', now), []);
});

test('learned interests affect fit only for consenting adults', () => {
  const event = { ...events.find((item) => item.interests.includes('AI/ML'))!, eligibilityKnown: true, ageRule: { ...events[0]!.ageRule, mode: 'adults_only' as const } };
  const user = { ...adult, learnedInterests: ['AI/ML'] };
  const fit = participationFit(user, event, null);
  assert.ok(fit.reasons.some((reason) => reason.includes('consented adult activity')));
  const withdrawn = participationFit({ ...user, personalizationConsent: false }, event, null);
  assert.equal(withdrawn.reasons.some((reason) => reason.includes('consented adult activity')), false);
});
