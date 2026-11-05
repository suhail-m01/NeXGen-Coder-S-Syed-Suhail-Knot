import assert from 'node:assert/strict';
import test from 'node:test';
import { hackathonQuery } from '../src/features/hackathons/api';
import { localDateInputValue, rangeForDatePreset } from '../src/features/hackathons/dateUtils';
import { formatHackathonPrice, hackathonLocation } from '../src/features/hackathons/format';
import { nearestHackathonCity, parseHackathonLocation } from '../src/features/hackathons/location';

test('hackathon query serializes filters and converts custom dates from the local calendar', () => {
  const query = hackathonQuery({ city: 'Bengaluru', mode: 'online', price: 'free', from: '2026-12-01', to: '2026-12-02', page: 1, limit: 12 });
  const params = new URLSearchParams(query);
  assert.equal(params.get('city'), 'Bengaluru');
  assert.equal(params.get('mode'), 'online');
  assert.equal(params.get('price'), 'free');
  assert.equal(params.get('from'), new Date('2026-12-01T00:00:00.000').toISOString());
  assert.equal(params.get('to'), new Date('2026-12-02T23:59:59.999').toISOString());
  assert.equal(params.has('page'), false);
});

test('date presets use real local day and weekend boundaries', () => {
  const now = new Date('2026-11-05T12:00:00');
  const today = rangeForDatePreset('today', now);
  assert.equal(new Date(today.from).getHours(), 0);
  assert.equal(new Date(today.to).getHours(), 23);
  const weekend = rangeForDatePreset('weekend', now);
  assert.equal(new Date(weekend.from).getDay(), 6);
  assert.equal(new Date(weekend.to).getDay(), 0);
  assert.equal(localDateInputValue(today.from), '2026-11-05');
});

test('UI price and location labels preserve unknown and approximate states', () => {
  assert.equal(formatHackathonPrice({ isFree: null, priceAmount: null, currency: null }), 'Price not stated');
  assert.equal(formatHackathonPrice({ isFree: false, priceAmount: 500, currency: null }), '500 · currency not stated');
  assert.equal(formatHackathonPrice({ isFree: true, priceAmount: null, currency: null }), 'Free');
  assert.match(hackathonLocation({ mode: 'offline', area: null, city: 'Bengaluru', venue: null, locationPrecision: 'city' }), /approximate city/);
  assert.equal(hackathonLocation({ mode: 'online', area: null, city: null, venue: null, locationPrecision: 'none' }), 'Online');
});

test('location selection and nearest-city fallback reuse existing locality anchors', () => {
  assert.equal(nearestHackathonCity(12.9352, 77.6245), 'Bengaluru');
  assert.deepEqual(parseHackathonLocation('Koramangala, Bengaluru', [{ label: 'Koramangala, Bengaluru', city: 'Bengaluru', area: 'Koramangala' }]), { city: 'Bengaluru', area: 'Koramangala' });
  assert.deepEqual(parseHackathonLocation('Mysuru', []), { city: 'Mysuru', area: '' });
});
