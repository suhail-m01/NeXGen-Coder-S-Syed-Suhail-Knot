import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudDiscoveryFilterPayload, discoveryTimeWindow } from '../src/data/supabase/discovery';
import { defaultFilters } from '../src/domain/defaults';
import { localityById } from '../src/domain/localities';

test('cloud discovery serializes tonight as an absolute India-time overlap window', () => {
  const now = new Date('2026-10-24T10:00:00.000Z');
  const filters = { ...defaultFilters(), time: 'tonight' as const };
  assert.deepEqual(discoveryTimeWindow(filters, now), {
    from: '2026-10-24T11:30:00.000Z',
    to: '2026-10-24T18:29:59.999Z',
  });
});

test('cloud discovery payload preserves filters, origin coordinates and travel intent', () => {
  const origin = localityById('koramangala');
  assert.ok(origin);
  const filters = {
    ...defaultFilters(), query: '  desgin  ', interest: 'Design', ageBand: '18_plus' as const,
    onlyJoinable: true, sort: 'relevance' as const, maxTravelMinutes: 60, radiusKm: 7,
  };
  const payload = cloudDiscoveryFilterPayload(filters, origin, new Date('2026-10-24T10:00:00.000Z'));
  assert.equal(payload.query, 'desgin');
  assert.equal(payload.latitude, origin.latitude);
  assert.equal(payload.longitude, origin.longitude);
  assert.equal(payload.radiusKm, 7);
  assert.equal(payload.maxTravelMinutes, 60);
  assert.equal(payload.ageBand, '18_plus');
  assert.equal(payload.onlyJoinable, true);
  assert.equal(filters.query, '  desgin  ');
});

test('weekend and custom windows use explicit dates without browser-locale ambiguity', () => {
  const now = new Date('2026-10-24T10:00:00.000Z'); // Saturday in India.
  assert.deepEqual(discoveryTimeWindow({ ...defaultFilters(), time: 'weekend' }, now), {
    from: '2026-10-23T18:30:00.000Z', to: '2026-10-25T18:29:59.999Z',
  });
  assert.deepEqual(discoveryTimeWindow({ ...defaultFilters(), time: 'custom', customFrom: '2026-11-01', customTo: '2026-11-02' }, now), {
    from: '2026-10-31T18:30:00.000Z', to: '2026-11-02T18:29:59.999Z',
  });
});
