import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInstantText } from '../src/domain/parser';
import { editsFromSubmission } from '../src/domain/review';
import type { Submission } from '../src/domain/types';

const now = new Date('2026-11-06T00:00:00.000Z');

function submissionWith(raw: string): Submission {
  return {
    id: 'submission-test', submitterId: 'adult-test', inputType: 'text', rawText: raw,
    status: 'pending_review', draft: parseInstantText(raw, now), canonicalEventId: null,
    review: null, createdAt: now.toISOString(),
  };
}

test('forwarded hackathon preserves explicit date and venue without treating prizes as ticket prices', () => {
  const draft = parseInstantText(`Vecnaverse Hackathon\nDate: 28/11/2026 to 29/11/2026\nTime: 9:00 AM IST\nVenue: Community Innovation Hub, Koramangala 5th Block\nPrize Pool: ₹1,50,000\nRegister: https://unstop.com/`, now);
  assert.equal(draft.startDatetime.value?.slice(0, 10), '2026-11-28');
  assert.equal(new Date(draft.startDatetime.value!).getHours(), 9);
  assert.equal(draft.venueName.value, 'Community Innovation Hub, Koramangala 5th Block');
  assert.equal(draft.registrationUrl.value, 'https://unstop.com/');
  assert.equal(draft.price.value.kind, 'unknown');
  assert.equal(draft.price.value.amountInr, null);
});

test('only explicit fee evidence creates a paid amount', () => {
  const paid = parseInstantText('Design Workshop\nDate: 14/11/2026\nTicket price: ₹1,500\nVenue: Indiranagar', now);
  assert.equal(paid.price.value.kind, 'paid');
  assert.equal(paid.price.value.amountInr, 1500);
  const unknown = parseInstantText('Design Workshop\nDate: 14/11/2026\nVenue: Indiranagar', now);
  assert.equal(unknown.price.value.kind, 'unknown');
  assert.equal(unknown.mode.value, 'in_person');
  const noMode = parseInstantText('Unstructured community note with no schedule or place', now);
  assert.equal(noMode.mode.value, null);
});

test('review locality follows evidence or submitter confirmation, never a Koramangala default', () => {
  const indiranagar = submissionWith('Design Workshop\nDate: 14/11/2026\nVenue: 100 Feet Rd, Indiranagar\nRegister: https://example.com/design');
  assert.equal(editsFromSubmission(indiranagar).localityId, 'indiranagar');
  const unknown = submissionWith('Design Workshop\nDate: 14/11/2026\nRegister: https://example.com/design');
  assert.equal(editsFromSubmission(unknown).localityId, '');
  unknown.draft.localityId = { value: 'hsr-layout', confidence: 'high', evidence: 'Confirmed by submitter' };
  assert.equal(editsFromSubmission(unknown).localityId, 'hsr-layout');
});
