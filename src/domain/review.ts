import { localityById } from './localities';
import { validWebUrl } from './validation';
import type { EventListing, EventMode, EventType, ExtractionDraft, KnotEvent, Submission } from './types';

export interface SubmissionReviewEdits {
  title: string;
  eventType: EventType;
  startAt: string;
  mode: EventMode;
  venueName: string;
  localityId: string;
  registrationUrl: string;
  organizerName: string;
  summary: string;
}

export function editsFromSubmission(submission: Submission): SubmissionReviewEdits {
  return {
    title: submission.draft.title.value ?? '',
    eventType: submission.draft.eventType.value ?? 'other',
    startAt: submission.draft.startDatetime.value ?? '',
    mode: submission.draft.mode.value ?? 'in_person',
    venueName: submission.draft.venueName.value ?? '',
    localityId: 'koramangala',
    registrationUrl: submission.draft.registrationUrl.value ?? '',
    organizerName: submission.draft.organizer.value ?? '',
    summary: submission.draft.summary.value,
  };
}

export function applySubmissionEdits(draft: ExtractionDraft, edits: SubmissionReviewEdits): ExtractionDraft {
  const reviewed = <T,>(value: T, evidence = 'Confirmed during human review') => ({ value, confidence: 'high' as const, evidence });
  return {
    ...draft,
    title: reviewed(edits.title.trim()),
    eventType: reviewed(edits.eventType),
    startDatetime: reviewed(edits.startAt),
    mode: reviewed(edits.mode),
    venueName: reviewed(edits.venueName.trim() || null),
    registrationUrl: reviewed(edits.registrationUrl.trim()),
    organizer: reviewed(edits.organizerName.trim() || null),
    summary: reviewed(edits.summary.trim()),
  };
}

export function validateSubmissionEdits(submission: Submission, edits: SubmissionReviewEdits, now = new Date()) {
  const errors: Record<string, string> = {};
  if (!['pending_review', 'needs_info'].includes(submission.status)) errors.form = 'Only pending or needs-information submissions can be published.';
  if (edits.title.trim().length < 5 || edits.title.trim().length > 120) errors.title = 'Use a title between 5 and 120 characters.';
  const start = new Date(edits.startAt).getTime();
  if (!Number.isFinite(start) || start <= now.getTime()) errors.startAt = 'Choose a valid future event start.';
  if (submission.draft.endDatetime.value && new Date(submission.draft.endDatetime.value).getTime() <= start) errors.startAt = 'The extracted end time is before this start; request corrected timing.';
  if (edits.mode !== 'online' && !edits.venueName.trim()) errors.venueName = 'An in-person or hybrid event needs a reviewed venue.';
  if (edits.mode !== 'online' && !localityById(edits.localityId)) errors.localityId = 'Choose a valid locality.';
  if (!validWebUrl(edits.registrationUrl.trim())) errors.registrationUrl = 'A valid original or registration URL is required before publication.';
  if (edits.summary.trim().length < 20) errors.summary = 'Add a short public summary of at least 20 characters.';
  return errors;
}

export function reviewedSubmissionListing(submission: Submission, edits: SubmissionReviewEdits, listingId: string, now: string): EventListing {
  return {
    id: listingId,
    source: 'Community submission · human reviewed',
    externalId: submission.id,
    originalUrl: edits.registrationUrl.trim(),
    registrationUrl: edits.registrationUrl.trim(),
    firstDiscoveredAt: submission.createdAt,
    lastCheckedAt: now,
    lastMeaningfulChangeAt: null,
    confidence: 'medium',
    status: 'fresh',
    isPrimary: false,
  };
}

export function eventFromReviewedSubmission(
  submission: Submission,
  edits: SubmissionReviewEdits,
  meta: { eventId: string; listingId: string; venueId: string; reviewerId: string; now: string },
): KnotEvent {
  const draft = applySubmissionEdits(submission.draft, edits);
  const locality = localityById(edits.localityId);
  const summary = edits.summary.trim();
  const listing = { ...reviewedSubmissionListing(submission, edits, meta.listingId, meta.now), isPrimary: true };
  return {
    id: meta.eventId,
    slug: `${edits.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${meta.eventId.slice(-6)}`,
    title: edits.title.trim(),
    tagline: summary.slice(0, 110),
    summary,
    description: `${summary}\n\nPublished after human review of a community submission. Private submission evidence is not included; source-linked does not mean safety-verified.`,
    eventType: edits.eventType,
    organizerId: meta.reviewerId,
    organizerName: edits.organizerName.trim() || 'Organizer not stated',
    communityId: `community-${meta.eventId}`,
    mode: edits.mode,
    startAt: new Date(edits.startAt).toISOString(),
    endAt: draft.endDatetime.value,
    timezone: 'Asia/Kolkata',
    registrationOpensAt: null,
    registrationDeadline: draft.registrationDeadline.value,
    submissionDeadline: null,
    status: 'published',
    venue: edits.mode === 'online' ? null : {
      id: meta.venueId,
      name: edits.venueName.trim(),
      address: draft.addressOrLocality.value || `${locality?.name ?? 'Bengaluru'}, Bengaluru`,
      localityId: edits.localityId,
      city: 'Bengaluru',
      latitude: locality?.latitude ?? null,
      longitude: locality?.longitude ?? null,
      locationPrecision: 'locality',
      confirmedBy: 'knot_team',
    },
    onlineJoinUrl: null,
    registration: { kind: 'external', externalUrl: edits.registrationUrl.trim(), capacity: null, approval: 'none', waitlistEnabled: false },
    ageRule: draft.ageRule.value,
    interests: [],
    skills: draft.skills.value,
    learningOutcomes: draft.skills.value,
    eligibilityText: draft.eligibilityText.value ?? '',
    eligibilityKnown: Boolean(draft.eligibilityText.value),
    experienceLevel: 'not_stated',
    team: draft.teamSize.value.min && draft.teamSize.value.max
      ? { mode: 'team', minSize: draft.teamSize.value.min, maxSize: draft.teamSize.value.max, formationDeadline: null }
      : { mode: 'not_stated', minSize: null, maxSize: null, formationDeadline: null },
    price: draft.price.value,
    prizes: [],
    nativeSafetyChecklistComplete: false,
    isSample: false,
    createdById: submission.submitterId,
    createdAt: meta.now,
    updatedAt: meta.now,
    firstDiscoveredAt: submission.createdAt,
    lastCheckedAt: meta.now,
    listings: [listing],
    revisions: [],
  };
}
