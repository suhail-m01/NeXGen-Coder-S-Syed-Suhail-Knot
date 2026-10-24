import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSampleEvents } from '../src/domain/sample';
import { cloudRowToEvent, eventToCloudRow, profilePatchFromUser } from '../src/data/supabase/mappers';
import type { EventResource, UserAccount } from '../src/domain/types';

test('cloud event payload separates public, participant and organizer-only data', () => {
  const event = structuredClone(buildSampleEvents()[0]!);
  const participantGuide: EventResource = { id: 'private-guide', title: 'Participant guide', url: 'https://example.com/private-guide', kind: 'guide', visibility: 'participant_only' };
  event.onlineJoinUrl = 'https://video.example/private-room';
  event.resources = [...(event.resources ?? []), participantGuide];
  event.collaborators = [{ id: 'collaboration', userId: 'private-user-id', role: 'co_organizer', addedAt: new Date().toISOString() }];
  const { row, privateRow } = eventToCloudRow(event, 'organizer-uuid');
  const publicJson = JSON.stringify(row.public_data);
  assert.equal(publicJson.includes('private-room'), false);
  assert.equal(publicJson.includes('private-guide'), false);
  assert.equal(publicJson.includes('private-user-id'), false);
  assert.equal(row.organizer_id, 'organizer-uuid');
  const restored = cloudRowToEvent(row, privateRow);
  assert.equal(restored.onlineJoinUrl, event.onlineJoinUrl);
  assert.equal(restored.resources?.some((resource) => resource.id === 'private-guide'), true);
  assert.equal(restored.collaborators?.[0]?.userId, 'private-user-id');
  assert.equal(restored.organizerId, 'organizer-uuid');
});

test('cloud event row is authoritative over payload status and ownership', () => {
  const event = structuredClone(buildSampleEvents()[0]!);
  const { row } = eventToCloudRow(event, 'organizer-uuid');
  row.status = 'draft';
  row.visibility = 'private';
  row.public_data.status = 'published';
  row.public_data.organizerId = 'attacker-controlled-value';
  const restored = cloudRowToEvent(row);
  assert.equal(restored.status, 'draft');
  assert.equal(restored.visibility, 'private');
  assert.equal(restored.organizerId, 'organizer-uuid');
  assert.equal(restored.onlineJoinUrl, null);
});

test('unowned labelled legacy rows do not acquire placeholder organizer ownership', () => {
  const event = structuredClone(buildSampleEvents()[0]!);
  const { row } = eventToCloudRow(event, 'organizer-uuid');
  row.organizer_id = null;
  row.public_data.organizerId = 'untrusted-payload-owner';
  row.public_data.createdById = 'untrusted-payload-owner';
  const restored = cloudRowToEvent(row);
  assert.equal(restored.organizerId, null);
  assert.equal(restored.createdById, null);
});

test('profile cloud patch excludes identity and privilege escalation fields', () => {
  const patch = profilePatchFromUser({
    name: 'Updated name', returnAnalyticsConsent: true,
    role: 'admin', workspaceAdmin: true, accountStatus: 'active', ageBand: '13_15', email: 'attacker@example.com',
  } as Partial<UserAccount>);
  assert.deepEqual(patch, { name: 'Updated name', return_analytics_consent: true });
});

test('empty or malformed optional cloud payloads remain conservative', () => {
  const event = structuredClone(buildSampleEvents()[0]!);
  const { row } = eventToCloudRow(event, 'organizer-uuid');
  row.public_data = {};
  const restored = cloudRowToEvent(row);
  assert.equal(restored.onlineJoinUrl, null);
  assert.deepEqual(restored.collaborators, []);
  assert.deepEqual(restored.revisions, []);
  assert.equal(restored.registration.kind, event.registration.kind);
});
