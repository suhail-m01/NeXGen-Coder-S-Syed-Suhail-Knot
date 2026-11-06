import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  COMMUTE_TRANSIT_HUBS, 
  COMMUTE_MODE_CONFIG, 
  getCommuteSquadsForEvent, 
  joinSquad, 
  leaveSquad, 
  addSquad 
} from '../src/domain/commute';

test('commute transit hubs include major Bengaluru metro and bus interchanges', () => {
  assert.ok(COMMUTE_TRANSIT_HUBS.some((h) => h.includes('Indiranagar Metro')));
  assert.ok(COMMUTE_TRANSIT_HUBS.some((h) => h.includes('Silk Board')));
  assert.ok(COMMUTE_TRANSIT_HUBS.some((h) => h.includes('HSR Layout')));
  assert.ok(COMMUTE_TRANSIT_HUBS.some((h) => h.includes('Kengeri')));
});

test('commute mode config defines labels and capacities for metro, cab, and bike', () => {
  assert.equal(COMMUTE_MODE_CONFIG.metro_squad.label, 'Metro Squad');
  assert.equal(COMMUTE_MODE_CONFIG.cab_pool.label, 'Cab / Auto Pool');
  assert.equal(COMMUTE_MODE_CONFIG.bike_convoy.label, 'Two-Wheeler Convoy');
  assert.ok(COMMUTE_MODE_CONFIG.metro_squad.defaultCapacity >= 8);
  assert.equal(COMMUTE_MODE_CONFIG.cab_pool.defaultCapacity, 4);
});

test('getCommuteSquadsForEvent returns initial seeded squads for an event', () => {
  const squads = getCommuteSquadsForEvent('evt-test-123');
  assert.ok(Array.isArray(squads));
  assert.ok(squads.length >= 2);
  const first = squads[0];
  assert.ok(first.pickupHub);
  assert.ok(first.departureTime);
  assert.ok(Array.isArray(first.members));
});

test('joinSquad and leaveSquad manage squad participants safely', () => {
  const eventId = 'evt-test-mgmt';
  const initial = getCommuteSquadsForEvent(eventId);
  const targetSquad = initial[0];

  const joined = joinSquad(eventId, targetSquad.id, {
    userId: 'u-tester-42',
    name: 'Alam Nawaz Sha',
    pickupHub: targetSquad.pickupHub,
    joinedAt: new Date().toISOString(),
  });

  const updatedSquad = joined.find((s) => s.id === targetSquad.id);
  assert.ok(updatedSquad?.members.some((m) => m.userId === 'u-tester-42'));

  // Test leaving
  const left = leaveSquad(eventId, targetSquad.id, 'u-tester-42');
  const afterLeave = left.find((s) => s.id === targetSquad.id);
  assert.ok(!afterLeave?.members.some((m) => m.userId === 'u-tester-42'));
});

test('addSquad prepends custom organizer/attendee squads', () => {
  const eventId = 'evt-test-add';
  const newSquad = {
    id: 'squad-custom-test',
    eventId,
    pickupHub: 'Kengeri Bus Terminal',
    mode: 'cab_pool' as const,
    departureTime: '7:45 AM',
    targetArrival: '8:30 AM',
    organizerName: 'Alam',
    organizerContact: 'alam@example.com',
    capacity: 4,
    members: [],
  };

  const squads = addSquad(eventId, newSquad);
  assert.equal(squads[0].id, 'squad-custom-test');
});

