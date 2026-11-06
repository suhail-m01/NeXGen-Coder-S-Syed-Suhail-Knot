import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLiveEvents } from '../src/domain/liveEvents';
import { getCommuteSquadsForEvent } from '../src/domain/commute';
import { CURATED_HACKATHON_SNAPSHOT_AT, LIVE_VERIFIED_HACKATHONS } from '../src/features/hackathons/liveSeed';

test('local catalog is deterministic and every generated record is visibly sample-scoped', () => {
  const first = buildLiveEvents();
  const second = buildLiveEvents();
  assert.deepEqual(first, second);
  assert.ok(first.length > LIVE_VERIFIED_HACKATHONS.length);
  assert.ok(first.every((event) => event.isSample));
  assert.ok(first.every((event) => event.lastCheckedAt === CURATED_HACKATHON_SNAPSHOT_AT));
  assert.ok(first.every((event) => event.listings.every((listing) => listing.status === 'stale' && listing.confidence === 'low')));
  assert.ok(first.every((event) => event.venue?.confirmedBy !== 'organizer'));
});

test('curated Hackathon dates and external handoffs are preserved without live join claims', () => {
  const events = buildLiveEvents().slice(0, LIVE_VERIFIED_HACKATHONS.length);
  events.forEach((event, index) => {
    const source = LIVE_VERIFIED_HACKATHONS[index];
    assert.equal(event.startAt, source.startDate);
    assert.equal(event.endAt, source.endDate);
    assert.equal(event.registrationDeadline, source.registrationDeadline);
    assert.equal(event.registration.kind, 'external');
    assert.equal(event.registration.externalUrl, source.officialUrl);
    assert.equal(event.onlineJoinUrl, null);
    assert.equal(event.lastCheckedAt, CURATED_HACKATHON_SNAPSHOT_AT);
  });
});

test('commute seed entries are fictional, labelled samples without contact details', () => {
  const squads = getCommuteSquadsForEvent('evt-truthfulness-sample');
  assert.ok(squads.length >= 2);
  assert.ok(squads.every((squad) => squad.isSample === true));
  assert.ok(squads.every((squad) => squad.organizerContact === ''));
  assert.ok(squads.every((squad) => squad.members.every((member) => member.userId.startsWith('sample-commute-'))));
  const serialized = JSON.stringify(squads);
  for (const fictionalLegacyIdentity of ['Rohit K.', 'Priya Verma', 'Vikram Joshi', '98450', '97412', '99001']) {
    assert.equal(serialized.includes(fictionalLegacyIdentity), false);
  }
});
