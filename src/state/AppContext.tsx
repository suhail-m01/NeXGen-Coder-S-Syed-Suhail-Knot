import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { canPublish, participationDecision } from '../domain/age';
import { eventTypeLabel, filterEvents } from '../domain/events';
import { localityById } from '../domain/localities';
import { parseInstantText } from '../domain/parser';
import { defaultFilters } from '../domain/defaults';
import { canManageSources, canReviewSubmissions } from '../domain/permissions';
import { hasListing } from '../domain/dedupe';
import { assertFederatedImportPermission, parseFederatedFeed, submissionsFromFederatedFeed } from '../domain/federation';
import { approvalRegistrationStatus, initialNativeRegistrationStatus, isConfirmedNative, nextWaitlistCandidate, waitlistPosition } from '../domain/registration';
import { createCheckInToken, parseCheckInPayload, type CheckInScanResult } from '../domain/checkin';
import { deliveryTimeForUser, resolveAnnouncementAudience, validateAnnouncement } from '../domain/announcements';
import { canCheckInEvent, canJudgeEvent, canManageEvent, certificateEligible, materialEventChangeFields, registrationAnswerErrors, safetyChecklistComplete, validateProjectSubmission, validateRegistrationQuestions } from '../domain/operations';
import { applySubmissionEdits, eventFromReviewedSubmission, reviewedSubmissionListing, validateSubmissionEdits, type SubmissionReviewEdits } from '../domain/review';
import type { QuickPostInput } from '../domain/validation';
import { validWebUrl, validateQuickPost } from '../domain/validation';
import type {
  Announcement, AnnouncementInput, AppData, AttendeeQuestion, EventFilters, EventOperationsPatch,
  EventSeries, KnotEvent, ParticipationCertificate, ProjectScore, ProjectSubmission,
  Registration, RegistrationStatus, SourceRecord, Submission, TrustReport, UserAccount,
} from '../domain/types';
import { createSalt, hashPassword, verifyPassword } from '../data/auth';
import { createInitialData, loadData, makeId, saveData } from '../data/repository';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  ageBand: UserAccount['ageBand'];
  role: UserAccount['role'];
  areaLocalityId: string | null;
  interests: string[];
  guardianEmail?: string;
}

interface AppContextValue {
  data: AppData;
  currentUser: UserAccount | null;
  filters: EventFilters;
  setFilters: (filters: EventFilters) => void;
  unreadCount: number;
  requireAuth: (returnTo: string, action: string) => void;
  signUp: (input: SignUpInput) => Promise<UserAccount>;
  signIn: (email: string, password: string) => Promise<UserAccount>;
  signOut: () => void;
  deleteAccount: () => void;
  updateProfile: (patch: Partial<Pick<UserAccount, 'name' | 'areaLocalityId' | 'radiusKm' | 'interests' | 'skills' | 'learningGoals' | 'announcementOptOut' | 'personalizationConsent' | 'learnedInterests' | 'experienceLevel' | 'education' | 'availability' | 'maxPriceInr' | 'teamStatus' | 'quietHoursStart' | 'quietHoursEnd'>>) => void;
  toggleSave: (eventId: string) => boolean;
  toggleFollow: (communityId: string) => boolean;
  participate: (event: KnotEvent, selfDeclaredAgeRuleMet?: boolean, answers?: Record<string, string>) => 'auth_required' | 'opened_externally' | 'open_blocked' | 'registered' | 'pending' | 'waitlisted' | 'duplicate' | 'check_rule' | 'cannot_join' | 'needs_consent' | 'not_open_yet' | 'closed' | 'answers_required';
  selfConfirmExternal: (eventId: string) => void;
  publishQuickEvent: (input: QuickPostInput) => KnotEvent;
  createSubmission: (rawText: string, inputType?: 'text' | 'url') => Submission;
  importFederatedEvents: (sourceId: string, rawJson: string) => number;
  submitSubmission: (submissionId: string, review: { title: string; startAt: string | null; venueName: string | null; registrationUrl: string | null }) => void;
  approveSubmission: (submissionId: string, edits: SubmissionReviewEdits, note: string) => KnotEvent;
  moderateSubmission: (submissionId: string, action: 'needs_info' | 'rejected', note: string) => void;
  mergeSubmission: (submissionId: string, targetEventId: string, edits: SubmissionReviewEdits, note: string) => void;
  updateSourceRecord: (sourceId: string, patch: Pick<SourceRecord, 'permission' | 'active' | 'approvedMethods' | 'evidenceUrl' | 'notes'>) => void;
  updateVenue: (eventId: string, name: string, address: string) => void;
  setEventCancellation: (eventId: string, cancelled: boolean) => void;
  reviewRegistration: (registrationId: string, decision: 'approve' | 'reject') => Extract<RegistrationStatus, 'approved' | 'waitlisted' | 'rejected'>;
  cancelRegistration: (registrationId: string) => void;
  scanCheckIn: (eventId: string, payload: string) => CheckInScanResult;
  checkInRegistration: (registrationId: string) => void;
  sendAnnouncement: (eventId: string, input: AnnouncementInput) => Announcement;
  submitFeedback: (eventId: string, rating: number, comment: string) => void;
  createTeamPost: (eventId: string, role: string, skills: string[], lookingFor: string, note: string) => void;
  requestTeam: (postId: string, note: string) => void;
  respondTeamRequest: (requestId: string, status: 'accepted' | 'declined') => void;
  updateEventOperations: (eventId: string, patch: EventOperationsPatch, summary?: string, materialConfirmed?: boolean) => void;
  createSeries: (title: string) => EventSeries;
  saveSearch: (name: string) => void;
  deleteSearch: (searchId: string) => void;
  checkSavedSearch: (searchId: string) => number;
  toggleTopicFollow: (topic: string) => void;
  toggleGoing: (eventId: string) => void;
  askQuestion: (eventId: string, body: string, visibility: AttendeeQuestion['visibility']) => void;
  answerQuestion: (questionId: string, answer: string, publishFaq: boolean) => void;
  submitProject: (input: Pick<ProjectSubmission, 'eventId' | 'roundId' | 'title' | 'description' | 'repositoryUrl' | 'videoUrl' | 'documentUrl' | 'showcase'>) => void;
  updateProjectStatus: (submissionId: string, status: ProjectSubmission['status']) => void;
  scoreProject: (submissionId: string, score: Pick<ProjectScore, 'innovation' | 'execution' | 'impact' | 'feedback'>) => void;
  submitReport: (input: Pick<TrustReport, 'eventId' | 'targetType' | 'reason' | 'details' | 'priority'>) => void;
  reviewReport: (reportId: string, status: 'resolved' | 'dismissed', note: string) => void;
  submitClaim: (eventId: string, evidence: string) => void;
  reviewClaim: (claimId: string, decision: 'approved' | 'rejected', note: string) => void;
  completeGuardianConsent: (guardianEmail: string) => void;
  withdrawGuardianConsent: () => void;
  reconfirmAgeBand: (ageBand: UserAccount['ageBand']) => void;
  issueCertificate: (eventId: string) => ParticipationCertificate;
  markNotificationsRead: () => void;
  resetWorkspace: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = data.users.find((user) => user.id === data.session?.userId) ?? null;

  useEffect(() => saveData(data), [data]);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    const processScheduledAnnouncements = () => {
      const snapshot = dataRef.current;
      const dueIds = new Set(snapshot.announcements.filter((announcement) => announcement.status === 'scheduled' && announcement.scheduledFor && new Date(announcement.scheduledFor).getTime() <= Date.now()).map((announcement) => announcement.id));
      if (!dueIds.size) return;
      const now = new Date().toISOString();
      setData((previous) => {
        const deliveries: AppData['notifications'] = [];
        const audits: AppData['auditRecords'] = [];
        const announcements = previous.announcements.map((announcement) => {
          if (!dueIds.has(announcement.id) || announcement.status !== 'scheduled') return announcement;
          const audience = resolveAnnouncementAudience(announcement.eventId, announcement.audience, previous.registrations, previous.users);
          for (const recipient of audience.recipients) {
            deliveries.push({
              id: makeId('notification'), userId: recipient.id, eventId: announcement.eventId, type: 'event',
              title: announcement.subject, body: announcement.body, dedupeKey: `${announcement.id}-${recipient.id}`,
              readAt: null, createdAt: now, deliverAt: deliveryTimeForUser(recipient, new Date(now)),
            });
          }
          audits.push({ id: makeId('audit'), actorId: announcement.authorId, action: 'scheduled_announcement_processed', targetType: 'announcement', targetId: announcement.id, details: `${audience.recipients.length} in-app records written; external delivery not claimed.`, createdAt: now });
          return { ...announcement, status: 'sent' as const, sentAt: now, audienceCount: audience.audienceCount, recipientCount: audience.recipients.length, optedOutCount: audience.optedOutCount };
        });
        return { ...previous, announcements, notifications: [...previous.notifications, ...deliveries], auditRecords: [...previous.auditRecords, ...audits] };
      });
    };
    processScheduledAnnouncements();
    const timer = window.setInterval(processScheduledAnnouncements, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const requireAuth = (returnTo: string, action: string) => {
    const params = new URLSearchParams({ returnTo, action });
    navigate(`/auth?${params.toString()}`, { state: { from: location.pathname } });
  };

  const signUp = async (input: SignUpInput) => {
    if (input.ageBand === 'under_13') throw new Error('UNDER_13_ACCOUNTS_NOT_AVAILABLE');
    if (input.name.trim().length < 2) throw new Error('Enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Use at least 8 characters for your password.');
    const minor = input.ageBand !== '18_plus';
    if (minor && !/^\S+@\S+\.\S+$/.test(input.guardianEmail ?? '')) throw new Error('Enter a guardian email for the local consent workflow.');
    if (minor && input.guardianEmail?.toLowerCase() === input.email.toLowerCase()) throw new Error('Guardian email must be different from the participant email.');
    if (data.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw new Error('An account with this email already exists. Sign in instead.');
    const passwordSalt = createSalt();
    const passwordHash = await hashPassword(input.password, passwordSalt);
    const now = new Date().toISOString();
    const user: UserAccount = {
      id: makeId('user'), email: input.email.toLowerCase(), name: input.name.trim(), passwordSalt, passwordHash,
      role: minor ? 'participant' : input.role,
      announcementOptOut: false,
      workspaceAdmin: input.ageBand === '18_plus' && !data.users.some((candidate) => canReviewSubmissions(candidate)),
      ageBand: input.ageBand, ageBandConfirmedOn: now,
      guardianConsent: minor ? 'pending' : 'not_required',
      accountStatus: minor ? 'restricted' : 'active', guardianEmail: minor ? input.guardianEmail!.toLowerCase() : null,
      personalizationConsent: false, learnedInterests: [],
      areaLocalityId: input.areaLocalityId, radiusKm: 10,
      interests: input.interests, skills: [], learningGoals: [], createdAt: now,
    };
    setData((previous) => ({
      ...previous,
      users: [...previous.users, user],
      consentRecords: minor ? [...previous.consentRecords, {
        id: makeId('consent'), userId: user.id, guardianEmail: user.guardianEmail!, status: 'pending' as const,
        method: 'local_guardian_attestation' as const, createdAt: now, updatedAt: now,
      }] : previous.consentRecords,
      session: { userId: user.id, createdAt: now },
    }));
    return user;
  };

  const signIn = async (email: string, password: string) => {
    const user = data.users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw new Error('Email or password is incorrect.');
    if (user.accountStatus === 'closed') throw new Error('This account is closed. Public browsing remains available.');
    setData((previous) => ({ ...previous, session: { userId: user.id, createdAt: new Date().toISOString() } }));
    return user;
  };

  const signOut = () => {
    const next = { ...data, session: null };
    saveData(next);
    setData(next);
    window.location.replace('/');
  };

  const deleteAccount = () => {
    if (!currentUser) throw new Error('Sign in required.');
    const ownedEventIds = new Set(data.events.filter((event) => event.organizerId === currentUser.id).map((event) => event.id));
    if (data.registrations.some((registration) => ownedEventIds.has(registration.eventId) && registration.userId !== currentUser.id)) {
      throw new Error('Your events still have other participants’ operational registration records. Export those records and complete the offboarding process before deleting this organizer account.');
    }
    const ownedPostIds = new Set(data.teamPosts.filter((post) => post.ownerId === currentUser.id || ownedEventIds.has(post.eventId)).map((post) => post.id));
    const deletedSubmissionIds = new Set(data.projectSubmissions.filter((item) => item.userId === currentUser.id || ownedEventIds.has(item.eventId)).map((item) => item.id));
    const next: AppData = {
      ...data,
      users: data.users.filter((user) => user.id !== currentUser.id), session: null,
      events: data.events.filter((event) => !ownedEventIds.has(event.id)),
      registrations: data.registrations.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      saves: data.saves.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      follows: data.follows.filter((item) => item.userId !== currentUser.id),
      notifications: data.notifications.filter((item) => item.userId !== currentUser.id && (!item.eventId || !ownedEventIds.has(item.eventId))),
      submissions: data.submissions.filter((item) => item.submitterId !== currentUser.id),
      feedback: data.feedback.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      teamPosts: data.teamPosts.filter((post) => !ownedPostIds.has(post.id)),
      teamRequests: data.teamRequests.filter((item) => item.requesterId !== currentUser.id && !ownedPostIds.has(item.postId)),
      savedSearches: data.savedSearches.filter((item) => item.userId !== currentUser.id),
      topicFollows: data.topicFollows.filter((item) => item.userId !== currentUser.id),
      going: data.going.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      questions: data.questions.filter((item) => item.askerId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      projectSubmissions: data.projectSubmissions.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      projectScores: data.projectScores.filter((item) => item.judgeId !== currentUser.id && !deletedSubmissionIds.has(item.submissionId)),
      auditRecords: data.auditRecords.map((item) => item.actorId === currentUser.id ? { ...item, actorId: 'deleted-account' } : item),
      reports: data.reports.filter((item) => item.reporterId !== currentUser.id),
      claims: data.claims.filter((item) => item.userId !== currentUser.id),
      consentRecords: data.consentRecords.filter((item) => item.userId !== currentUser.id),
      certificates: data.certificates.filter((item) => item.userId !== currentUser.id && !ownedEventIds.has(item.eventId)),
      announcements: data.announcements.filter((item) => !ownedEventIds.has(item.eventId)),
      series: data.series.filter((item) => item.organizerId !== currentUser.id),
    };
    saveData(next);
    setData(next);
    window.location.replace('/');
  };

  const updateProfile: AppContextValue['updateProfile'] = (patch) => {
    if (!currentUser) return;
    const safePatch = currentUser.ageBand === '18_plus'
      ? patch
      : { ...patch, personalizationConsent: false, learnedInterests: [] };
    setData((previous) => ({ ...previous, users: previous.users.map((user) => user.id === currentUser.id ? { ...user, ...safePatch } : user) }));
  };

  const toggleSave = (eventId: string) => {
    if (!currentUser) {
      requireAuth(`/events/${eventId}`, 'save this event');
      return false;
    }
    const exists = data.saves.some((save) => save.userId === currentUser.id && save.eventId === eventId);
    setData((previous) => ({
      ...previous,
      saves: exists ? previous.saves.filter((save) => !(save.userId === currentUser.id && save.eventId === eventId)) : [...previous.saves, { userId: currentUser.id, eventId, createdAt: new Date().toISOString() }],
    }));
    return !exists;
  };

  const toggleFollow = (communityId: string) => {
    if (!currentUser) {
      requireAuth(location.pathname, 'follow this community');
      return false;
    }
    const exists = data.follows.some((follow) => follow.userId === currentUser.id && follow.communityId === communityId);
    setData((previous) => ({
      ...previous,
      follows: exists ? previous.follows.filter((follow) => !(follow.userId === currentUser.id && follow.communityId === communityId)) : [...previous.follows, { userId: currentUser.id, communityId, createdAt: new Date().toISOString() }],
    }));
    return !exists;
  };

  const participate: AppContextValue['participate'] = (event, selfDeclaredAgeRuleMet = false, answers = {}) => {
    const decision = participationDecision(currentUser, event);
    if (decision === 'auth_required') {
      requireAuth(`/events/${event.id}`, 'register for this event');
      return decision;
    }
    if (decision !== 'can_join' && decision !== 'check_rule') return decision;
    if (decision === 'check_rule' && !selfDeclaredAgeRuleMet) return 'check_rule';
    if (!currentUser) return 'auth_required';
    if (event.registration.kind === 'native' && Object.keys(registrationAnswerErrors(event.registration.questions ?? [], answers)).length) return 'answers_required';

    const existing = data.registrations.find((registration) => registration.eventId === event.id && registration.userId === currentUser.id);
    if (existing && !['cancelled', 'rejected'].includes(existing.status)) return 'duplicate';
    const now = new Date().toISOString();
    if (event.registration.kind === 'external') {
      const target = event.registration.externalUrl ?? event.listings.find((listing) => listing.isPrimary)?.registrationUrl;
      if (!target) return 'closed';
      const opened = window.open('about:blank', '_blank');
      if (!opened) return 'open_blocked';
      opened.opener = null;
      opened.location.href = target;
      const registration: Registration = {
        id: makeId('registration'), eventId: event.id, userId: currentUser.id, kind: 'external',
        status: 'opened_externally', selfDeclaredAgeRuleMet, createdAt: now, updatedAt: now,
      };
      setData((previous) => ({ ...previous, registrations: [...previous.registrations, registration] }));
      return 'opened_externally';
    }

    const status = initialNativeRegistrationStatus(event, data.registrations);
    if (status === 'closed') return 'closed';
    const registration: Registration = {
      id: makeId('registration'), eventId: event.id, userId: currentUser.id, kind: 'native', status,
      selfDeclaredAgeRuleMet, createdAt: now, updatedAt: now, checkInToken: createCheckInToken(),
      answers: Object.fromEntries((event.registration.questions ?? []).map((question) => [question.id, (answers[question.id] ?? '').trim()])),
    };
    const position = status === 'waitlisted' ? waitlistPosition([...data.registrations, registration], registration.id) : null;
    const title = status === 'registered' ? 'Registration confirmed' : status === 'pending' ? 'Registration submitted' : 'Waitlist joined';
    const body = status === 'registered'
      ? `You are registered for ${event.title}.`
      : status === 'pending'
        ? `The organizer will review your registration for ${event.title}. This is not confirmed yet.`
        : `You are waitlisted for ${event.title}${position ? ` at position ${position}` : ''}. This is not a confirmed registration.`;
    setData((previous) => ({
      ...previous,
      registrations: [...previous.registrations, registration],
      notifications: [...previous.notifications, {
        id: makeId('notification'), userId: currentUser.id, eventId: event.id, type: 'event',
        title, body, dedupeKey: `${event.id}-registration-${currentUser.id}`, readAt: null, createdAt: now,
      }],
    }));
    return status;
  };

  const selfConfirmExternal = (eventId: string) => {
    if (!currentUser) return;
    setData((previous) => ({
      ...previous,
      registrations: previous.registrations.map((registration) => registration.eventId === eventId && registration.userId === currentUser.id && registration.kind === 'external'
        ? { ...registration, status: 'self_confirmed_registered', updatedAt: new Date().toISOString() }
        : registration),
    }));
  };

  const publishQuickEvent = (input: QuickPostInput) => {
    if (!currentUser) {
      requireAuth('/publish', 'publish an event');
      throw new Error('AUTH_REQUIRED');
    }
    if (!canPublish(currentUser)) throw new Error('Publishing and hosting are adult-only actions.');
    const errors = validateQuickPost(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const now = new Date().toISOString();
    const id = makeId('event');
    const locality = localityById(input.localityId);
    const externalUrl = input.registrationKind === 'external' ? input.registrationUrl : null;
    const event: KnotEvent = {
      id, slug: `${slugify(input.title)}-${id.slice(-6)}`, title: input.title.trim(),
      tagline: input.description.trim().slice(0, 100) || `${eventTypeLabel(input.eventType)} by ${currentUser.name}`,
      summary: input.description.trim().slice(0, 180) || `${eventTypeLabel(input.eventType)} published on Knot.`,
      description: input.description.trim(), eventType: input.eventType,
      organizerId: currentUser.id, organizerName: currentUser.name, communityId: `community-${currentUser.id}`,
      mode: input.mode, startAt: new Date(input.startAt).toISOString(),
      endAt: input.endAt ? new Date(input.endAt).toISOString() : null, timezone: 'Asia/Kolkata',
      registrationOpensAt: null, registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline).toISOString() : null,
      submissionDeadline: null, status: 'published',
      venue: input.mode === 'online' ? null : {
        id: makeId('venue'), name: input.venueName.trim(), address: input.address.trim() || `${locality?.name ?? 'Bengaluru'}, Bengaluru`,
        localityId: input.localityId, city: 'Bengaluru', latitude: locality?.latitude ?? null, longitude: locality?.longitude ?? null,
        locationPrecision: 'locality', confirmedBy: 'organizer',
      },
      onlineJoinUrl: input.onlineJoinUrl || null,
      registration: {
        kind: input.registrationKind, externalUrl, capacity: input.registrationKind === 'native' ? input.capacity : null,
        approval: input.registrationKind === 'native' ? input.approval : 'none',
        waitlistEnabled: input.registrationKind === 'native' && input.capacity !== null && input.waitlistEnabled,
      },
      ageRule: input.ageRule, interests: input.interests, skills: input.skills, learningOutcomes: input.skills,
      eligibilityText: input.eligibilityText.trim(), eligibilityKnown: Boolean(input.eligibilityText.trim()),
      experienceLevel: 'not_stated', team: { mode: 'not_stated', minSize: null, maxSize: null, formationDeadline: null },
      price: { kind: input.priceKind, amountInr: input.priceKind === 'free' ? 0 : input.priceAmount, note: input.priceKind === 'unknown' ? '' : 'Organizer stated' },
      prizes: [], nativeSafetyChecklistComplete: false, visibility: 'public', seriesId: null, isSample: false, createdById: currentUser.id,
      createdAt: now, updatedAt: now, firstDiscoveredAt: now, lastCheckedAt: now,
      listings: [{
        id: makeId('listing'), source: 'Knot', externalId: id, originalUrl: `/events/${id}`, registrationUrl: externalUrl,
        firstDiscoveredAt: now, lastCheckedAt: now, lastMeaningfulChangeAt: null, confidence: 'high', status: 'fresh', isPrimary: true,
      }],
      revisions: [],
    };
    setData((previous) => ({ ...previous, events: [event, ...previous.events] }));
    return event;
  };

  const createSubmission = (rawText: string, inputType: 'text' | 'url' = 'text') => {
    if (!currentUser) {
      requireAuth('/add', 'add an event');
      throw new Error('AUTH_REQUIRED');
    }
    if (!canPublish(currentUser)) throw new Error('Event submissions are adult-only in this phase.');
    if (rawText.trim().length < 20) throw new Error('Paste at least a few event details so Knot has something to read.');
    const submission: Submission = {
      id: makeId('submission'), submitterId: currentUser.id, inputType, rawText: rawText.trim(), status: 'draft',
      draft: parseInstantText(rawText), canonicalEventId: null, review: null, createdAt: new Date().toISOString(),
    };
    setData((previous) => ({ ...previous, submissions: [submission, ...previous.submissions] }));
    return submission;
  };

  const importFederatedEvents = (sourceId: string, rawJson: string) => {
    if (!currentUser || !canReviewSubmissions(currentUser)) throw new Error('Reviewer access required for federated imports.');
    const source = data.sources.find((candidate) => candidate.id === sourceId);
    if (!source || !['platform', 'open_web'].includes(source.kind)) throw new Error('External source not found.');
    assertFederatedImportPermission(source);
    const records = parseFederatedFeed(rawJson);
    const submissions = submissionsFromFederatedFeed(records, source, currentUser.id, new Date().toISOString(), () => makeId('submission'));
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      submissions: [...submissions, ...previous.submissions],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'federated_feed_imported', targetType: 'source', targetId: sourceId, details: `${submissions.length} records entered pending human review; no auto-publication.`, createdAt: now }],
    }));
    return submissions.length;
  };

  const submitSubmission = (submissionId: string, review: { title: string; startAt: string | null; venueName: string | null; registrationUrl: string | null }) => {
    if (!currentUser) return;
    setData((previous) => ({
      ...previous,
      submissions: previous.submissions.map((submission) => submission.id === submissionId && submission.submitterId === currentUser.id
        ? {
          ...submission,
          status: 'pending_review',
          draft: {
            ...submission.draft,
            title: { ...submission.draft.title, value: review.title, confidence: 'high', evidence: 'Confirmed by submitter' },
            startDatetime: { ...submission.draft.startDatetime, value: review.startAt, confidence: review.startAt ? 'high' : 'missing', evidence: review.startAt ? 'Confirmed by submitter' : '' },
            venueName: { ...submission.draft.venueName, value: review.venueName, confidence: review.venueName ? 'high' : 'missing', evidence: review.venueName ? 'Confirmed by submitter' : '' },
            registrationUrl: { ...submission.draft.registrationUrl, value: review.registrationUrl, confidence: review.registrationUrl ? 'high' : 'missing', evidence: review.registrationUrl ? 'Confirmed by submitter' : '' },
          },
        } : submission),
    }));
  };

  const requireReviewer = () => {
    if (!currentUser || !canReviewSubmissions(currentUser)) throw new Error('Workspace reviewer access is required.');
    return currentUser;
  };

  const approveSubmission = (submissionId: string, edits: SubmissionReviewEdits, note: string) => {
    const reviewer = requireReviewer();
    const submission = data.submissions.find((candidate) => candidate.id === submissionId);
    if (!submission) throw new Error('Submission not found.');
    const errors = validateSubmissionEdits(submission, edits);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const now = new Date().toISOString();
    const event = eventFromReviewedSubmission(submission, edits, {
      eventId: makeId('event'), listingId: makeId('listing'), venueId: makeId('venue'), reviewerId: reviewer.id, now,
    });
    const review = { reviewerId: reviewer.id, action: 'approved' as const, note: note.trim(), at: now };
    setData((previous) => ({
      ...previous,
      events: [event, ...previous.events],
      submissions: previous.submissions.map((candidate) => candidate.id === submissionId ? {
        ...candidate, status: 'published', canonicalEventId: event.id,
        draft: applySubmissionEdits(candidate.draft, edits), review,
      } : candidate),
      notifications: submission.submitterId === reviewer.id ? previous.notifications : [...previous.notifications, {
        id: makeId('notification'), userId: submission.submitterId, eventId: event.id, type: 'system' as const,
        title: 'Submission published', body: `${event.title} was reviewed and published on Knot.`,
        dedupeKey: `${submissionId}-published-${reviewer.id}`, readAt: null, createdAt: now,
      }],
    }));
    return event;
  };

  const moderateSubmission = (submissionId: string, action: 'needs_info' | 'rejected', note: string) => {
    const reviewer = requireReviewer();
    if (note.trim().length < 5) throw new Error('Add a clear review note for the submitter.');
    const submission = data.submissions.find((candidate) => candidate.id === submissionId);
    if (!submission || !['pending_review', 'needs_info'].includes(submission.status)) throw new Error('This submission is not available for moderation.');
    const now = new Date().toISOString();
    const review = { reviewerId: reviewer.id, action, note: note.trim(), at: now };
    setData((previous) => ({
      ...previous,
      submissions: previous.submissions.map((candidate) => candidate.id === submissionId ? { ...candidate, status: action, review } : candidate),
      notifications: submission.submitterId === reviewer.id ? previous.notifications : [...previous.notifications, {
        id: makeId('notification'), userId: submission.submitterId, eventId: null, type: 'system' as const,
        title: action === 'needs_info' ? 'Submission needs information' : 'Submission not published',
        body: action === 'needs_info' ? `Reviewer request: ${note.trim()}` : `Review outcome: ${note.trim()}`,
        dedupeKey: `${submissionId}-${action}-${now}`, readAt: null, createdAt: now,
      }],
    }));
  };

  const mergeSubmission = (submissionId: string, targetEventId: string, edits: SubmissionReviewEdits, note: string) => {
    const reviewer = requireReviewer();
    const submission = data.submissions.find((candidate) => candidate.id === submissionId);
    const target = data.events.find((candidate) => candidate.id === targetEventId);
    if (!submission || !['pending_review', 'needs_info'].includes(submission.status)) throw new Error('This submission is not available to merge.');
    if (!target) throw new Error('Choose a canonical event to merge into.');
    if (!validWebUrl(edits.registrationUrl.trim())) throw new Error('A valid original or registration URL is required to preserve the listing.');
    const now = new Date().toISOString();
    const listing = reviewedSubmissionListing(submission, edits, makeId('listing'), now);
    const review = { reviewerId: reviewer.id, action: 'merged' as const, note: note.trim(), at: now };
    setData((previous) => ({
      ...previous,
      events: previous.events.map((event) => {
        if (event.id !== targetEventId) return event;
        const alreadyListed = hasListing(event, listing);
        return {
          ...event,
          listings: alreadyListed ? event.listings : [...event.listings, listing],
          updatedAt: now,
          lastCheckedAt: now,
          revisions: [...event.revisions, {
            id: makeId('revision'), at: now, changedBy: reviewer.id, fields: ['listings'],
            summary: alreadyListed ? `Confirmed existing listing from community submission ${submission.id}` : `Merged community submission ${submission.id} as a new listing`,
          }],
        };
      }),
      submissions: previous.submissions.map((candidate) => candidate.id === submissionId ? {
        ...candidate, status: 'merged', canonicalEventId: targetEventId,
        draft: applySubmissionEdits(candidate.draft, edits), review,
      } : candidate),
      notifications: submission.submitterId === reviewer.id ? previous.notifications : [...previous.notifications, {
        id: makeId('notification'), userId: submission.submitterId, eventId: targetEventId, type: 'system' as const,
        title: 'Submission merged', body: `${submission.draft.title.value ?? 'Your submission'} was connected to the existing event ${target.title}.`,
        dedupeKey: `${submissionId}-merged-${targetEventId}`, readAt: null, createdAt: now,
      }],
    }));
  };

  const updateSourceRecord = (sourceId: string, patch: Pick<SourceRecord, 'permission' | 'active' | 'approvedMethods' | 'evidenceUrl' | 'notes'>) => {
    const reviewer = requireReviewer();
    if (!canManageSources(reviewer)) throw new Error('Source management permission is required.');
    const source = data.sources.find((candidate) => candidate.id === sourceId);
    if (!source || !['platform', 'open_web'].includes(source.kind)) throw new Error('Built-in source records are read-only.');
    const next: SourceRecord = {
      ...source,
      ...patch,
      evidenceUrl: patch.evidenceUrl?.trim() || null,
      notes: patch.notes.trim(),
      approvedMethods: Array.from(new Set(patch.approvedMethods)),
    };
    if (next.approvedMethods.includes('native')) throw new Error('External sources cannot use the native ingestion method.');
    if (next.permission === 'approved' && !validWebUrl(next.evidenceUrl ?? '')) throw new Error('Add a valid permission or terms-evidence URL before approval.');
    if (next.active && next.permission !== 'approved') throw new Error('A source must be approved before it can be activated.');
    if (next.active && next.approvedMethods.length === 0) throw new Error('Choose at least one approved collection method.');
    const now = new Date().toISOString();
    Object.assign(next, { lastReviewedAt: now, updatedBy: reviewer.id, updatedAt: now });
    setData((previous) => ({ ...previous, sources: previous.sources.map((candidate) => candidate.id === sourceId ? next : candidate) }));
  };

  const updateVenue = (eventId: string, name: string, address: string) => {
    if (!currentUser || !name.trim()) return;
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || !canManageEvent(currentUser, event) || !event.venue) return;
    const now = new Date().toISOString();
    const revisionId = makeId('revision');
    const affectedIds = new Set<string>([
      ...data.saves.filter((save) => save.eventId === eventId).map((save) => save.userId),
      ...data.registrations.filter((registration) => registration.eventId === eventId).map((registration) => registration.userId),
    ]);
    setData((previous) => ({
      ...previous,
      events: previous.events.map((candidate) => candidate.id === eventId ? {
        ...candidate, venue: candidate.venue ? { ...candidate.venue, name: name.trim(), address: address.trim() } : null,
        updatedAt: now, lastCheckedAt: now, status: 'changed',
        revisions: [...candidate.revisions, { id: revisionId, at: now, changedBy: currentUser.id, fields: ['venue'], summary: `Venue changed to ${name.trim()}` }],
      } : candidate),
      notifications: [...previous.notifications, ...Array.from(affectedIds).map((userId) => ({
        id: makeId('notification'), userId, eventId, type: 'material_change' as const,
        title: 'Venue changed', body: `${event.title} now takes place at ${name.trim()}.`,
        dedupeKey: `${eventId}-${revisionId}-${userId}`, readAt: null, createdAt: now,
      }))],
    }));
  };

  const setEventCancellation = (eventId: string, cancelled: boolean) => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || !canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can change its status.');
    const now = new Date().toISOString();
    const revisionId = makeId('revision');
    const affectedIds = new Set<string>([
      ...data.saves.filter((save) => save.eventId === eventId).map((save) => save.userId),
      ...data.registrations.filter((registration) => registration.eventId === eventId).map((registration) => registration.userId),
    ]);
    setData((previous) => ({
      ...previous,
      events: previous.events.map((candidate) => candidate.id === eventId ? {
        ...candidate, status: cancelled ? 'cancelled' : 'published', updatedAt: now, lastCheckedAt: now,
        revisions: [...candidate.revisions, { id: revisionId, at: now, changedBy: currentUser.id, fields: ['status'], summary: cancelled ? 'Event cancelled by organizer' : 'Event reopened by organizer' }],
      } : candidate),
      notifications: [...previous.notifications, ...Array.from(affectedIds).map((userId) => ({
        id: makeId('notification'), userId, eventId, type: 'material_change' as const,
        title: cancelled ? 'Event cancelled' : 'Event reopened',
        body: cancelled ? `${event.title} was cancelled by its organizer.` : `${event.title} is active again. Review the latest details.`,
        dedupeKey: `${eventId}-${revisionId}-${userId}`, readAt: null, createdAt: now,
      }))],
    }));
  };

  const reviewRegistration = (registrationId: string, decision: 'approve' | 'reject') => {
    if (!currentUser) throw new Error('Sign in required.');
    const registration = data.registrations.find((candidate) => candidate.id === registrationId);
    const event = registration ? data.events.find((candidate) => candidate.id === registration.eventId) : null;
    if (!registration || !event || registration.kind !== 'native') throw new Error('Native registration not found.');
    if (!canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can review registrations.');
    if (event.status === 'cancelled') throw new Error('Reopen the event before reviewing registrations.');
    let next: 'approved' | 'waitlisted' | 'rejected';
    if (decision === 'approve') {
      if (new Date(event.endAt ?? event.startAt).getTime() <= Date.now()) throw new Error('Registration review is closed because this event has ended.');
      if (registration.status !== 'pending') throw new Error('Only a pending registration can be approved.');
      const approvalStatus = approvalRegistrationStatus(event, data.registrations);
      if (approvalStatus === 'closed') throw new Error('Confirmed capacity is full and this event has no waitlist.');
      next = approvalStatus;
    } else {
      if (!['pending', 'waitlisted'].includes(registration.status)) throw new Error('Only pending or waitlisted records can be rejected in registration review.');
      next = 'rejected';
    }
    const now = new Date().toISOString();
    const title = next === 'approved' ? 'Registration approved' : next === 'waitlisted' ? 'Registration waitlisted' : registration.status === 'waitlisted' ? 'Waitlist entry removed' : 'Registration not accepted';
    const body = next === 'approved'
      ? `Your registration for ${event.title} is approved and confirmed.`
      : next === 'waitlisted'
        ? `Your registration for ${event.title} was reviewed and added to the waitlist. It is not confirmed.`
        : `Your ${registration.status === 'waitlisted' ? 'waitlist entry' : 'registration request'} for ${event.title} was not accepted by the organizer.`;
    setData((previous) => ({
      ...previous,
      registrations: previous.registrations.map((candidate) => candidate.id === registrationId ? { ...candidate, status: next, updatedAt: now } : candidate),
      notifications: [...previous.notifications, {
        id: makeId('notification'), userId: registration.userId, eventId: event.id, type: 'event' as const,
        title, body, dedupeKey: `${registrationId}-${next}-${now}`, readAt: null, createdAt: now,
      }],
    }));
    return next;
  };

  const cancelRegistration = (registrationId: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const registration = data.registrations.find((candidate) => candidate.id === registrationId);
    const event = registration ? data.events.find((candidate) => candidate.id === registration.eventId) : null;
    if (!registration || !event || registration.userId !== currentUser.id || registration.kind !== 'native') throw new Error('Native registration not found for this account.');
    if (!['registered', 'approved', 'pending', 'waitlisted'].includes(registration.status)) throw new Error('This participation record cannot be cancelled.');
    const freesConfirmedSpot = ['registered', 'approved'].includes(registration.status);
    const canPromote = event.status !== 'cancelled' && new Date(event.endAt ?? event.startAt).getTime() > Date.now();
    const now = new Date().toISOString();
    setData((previous) => {
      const cancelled = previous.registrations.map((candidate) => candidate.id === registrationId ? { ...candidate, status: 'cancelled' as const, updatedAt: now } : candidate);
      const promoted = freesConfirmedSpot && canPromote ? nextWaitlistCandidate(event, cancelled) : null;
      const promotedStatus = event.registration.approval === 'manual' ? 'approved' as const : 'registered' as const;
      return {
        ...previous,
        registrations: promoted
          ? cancelled.map((candidate) => candidate.id === promoted.id ? { ...candidate, status: promotedStatus, updatedAt: now } : candidate)
          : cancelled,
        notifications: promoted ? [...previous.notifications, {
          id: makeId('notification'), userId: promoted.userId, eventId: event.id, type: 'event' as const,
          title: 'Waitlist promoted',
          body: `A confirmed spot opened for ${event.title}. Your waitlist entry is now ${promotedStatus === 'approved' ? 'approved' : 'registered'}.`,
          dedupeKey: `${promoted.id}-promoted-${now}`, readAt: null, createdAt: now,
        }] : previous.notifications,
      };
    });
  };

  const scanCheckIn = (eventId: string, payload: string): CheckInScanResult => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || event.registration.kind !== 'native') throw new Error('Native event not found.');
    if (!canCheckInEvent(currentUser, event)) throw new Error('Only an authorized check-in operator can scan passes.');
    const token = parseCheckInPayload(payload);
    const registration = token ? data.registrations.find((candidate) => candidate.kind === 'native' && candidate.checkInToken === token) : null;
    if (!registration) return { status: 'invalid', message: 'No valid Knot check-in pass was found.', registrationId: null, checkedInAt: null };
    const participant = data.users.find((candidate) => candidate.id === registration.userId);
    const name = participant?.name ?? 'This participant';
    if (registration.eventId !== eventId) return { status: 'wrong_event', message: `${name}’s pass belongs to a different event.`, registrationId: registration.id, checkedInAt: registration.checkedInAt ?? null };
    if (['attended', 'checked_in'].includes(registration.status)) return { status: 'duplicate', message: `Duplicate scan: ${name} was already checked in. No second attendance record was created.`, registrationId: registration.id, checkedInAt: registration.checkedInAt ?? null };
    if (!['registered', 'approved'].includes(registration.status)) return { status: 'not_eligible', message: `${name} has a ${registration.status.replaceAll('_', ' ')} record, not a confirmed registration eligible for check-in.`, registrationId: registration.id, checkedInAt: null };
    if (event.status === 'cancelled') return { status: 'closed', message: 'Check-in is unavailable because this event was cancelled.', registrationId: registration.id, checkedInAt: null };
    if (Date.now() < new Date(event.startAt).getTime() - 2 * 3_600_000) return { status: 'closed', message: 'Check-in opens two hours before the event.', registrationId: registration.id, checkedInAt: null };
    if (Date.now() > new Date(event.endAt ?? event.startAt).getTime() + 12 * 3_600_000) return { status: 'closed', message: 'Check-in has closed for this event.', registrationId: registration.id, checkedInAt: null };
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      registrations: previous.registrations.map((candidate) => candidate.id === registration.id ? { ...candidate, status: 'attended', checkedInAt: now, updatedAt: now } : candidate),
    }));
    return { status: 'checked_in', message: `Check-in recorded for ${name}.`, registrationId: registration.id, checkedInAt: now };
  };

  const checkInRegistration = (registrationId: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const registration = data.registrations.find((candidate) => candidate.id === registrationId);
    const event = registration ? data.events.find((candidate) => candidate.id === registration.eventId) : null;
    if (!registration || !event || !canCheckInEvent(currentUser, event)) throw new Error('Only an authorized check-in operator can check in registrations.');
    if (registration.kind !== 'native') throw new Error('External handoffs are not native registrations and cannot be checked in as Knot registrations.');
    if (!['registered', 'approved'].includes(registration.status)) throw new Error('Only an active, approved native registration can be checked in.');
    if (Date.now() < new Date(event.startAt).getTime() - 2 * 3_600_000) throw new Error('Check-in opens two hours before the event.');
    if (Date.now() > new Date(event.endAt ?? event.startAt).getTime() + 12 * 3_600_000) throw new Error('Check-in has closed for this event.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      registrations: previous.registrations.map((candidate) => candidate.id === registrationId
        ? { ...candidate, status: 'attended', checkedInAt: now, updatedAt: now } : candidate),
    }));
  };

  const sendAnnouncement = (eventId: string, input: AnnouncementInput) => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || !canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can send announcements.');
    const validationError = validateAnnouncement(input);
    if (validationError) throw new Error(validationError);
    const scheduledDate = input.scheduledFor ? new Date(input.scheduledFor) : null;
    if (scheduledDate && !Number.isFinite(scheduledDate.getTime())) throw new Error('Choose a valid schedule time.');
    const scheduled = Boolean(scheduledDate && scheduledDate.getTime() > Date.now());
    const audience = resolveAnnouncementAudience(eventId, input.audience, data.registrations, data.users);
    if (audience.audienceCount === 0) throw new Error('No native participants match this audience.');
    if (audience.recipients.length === 0) throw new Error('Everyone in this audience has opted out. No announcement was sent.');
    const now = new Date().toISOString();
    const announcement: Announcement = {
      id: makeId('announcement'), eventId, authorId: currentUser.id,
      kind: input.kind, audience: input.audience,
      subject: input.subject.trim(), body: input.body.trim(),
      channel: 'in_app', status: scheduled ? 'scheduled' : 'sent',
      scheduledFor: scheduled ? scheduledDate!.toISOString() : null, sentAt: scheduled ? null : now,
      audienceCount: audience.audienceCount,
      recipientCount: audience.recipients.length,
      optedOutCount: audience.optedOutCount,
      createdAt: now,
    };
    setData((previous) => ({
      ...previous,
      announcements: [announcement, ...previous.announcements],
      notifications: scheduled ? previous.notifications : [
        ...previous.notifications,
        ...audience.recipients.map((recipient) => ({
          id: makeId('notification'), userId: recipient.id, eventId, type: 'event' as const,
          title: announcement.subject, body: announcement.body,
          dedupeKey: `${announcement.id}-${recipient.id}`, readAt: null, createdAt: now,
          deliverAt: deliveryTimeForUser(recipient, new Date(now)),
        })),
      ],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: scheduled ? 'announcement_scheduled' : 'announcement_sent', targetType: 'announcement', targetId: announcement.id, details: `${audience.recipients.length} in-app recipients; no external delivery claimed.`, createdAt: now }],
    }));
    return announcement;
  };

  const submitFeedback = (eventId: string, rating: number, comment: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    const registration = data.registrations.find((candidate) => candidate.eventId === eventId && candidate.userId === currentUser.id);
    if (!event || !registration || new Date(event.endAt ?? event.startAt).getTime() > Date.now()) throw new Error('Feedback opens after an event in your plan.');
    if (!['registered', 'approved', 'checked_in', 'attended', 'self_confirmed_registered'].includes(registration.status)) throw new Error('Feedback requires a native registration or your self-confirmed external registration.');
    if (data.feedback.some((item) => item.eventId === eventId && item.userId === currentUser.id)) throw new Error('You have already shared feedback for this event.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from 1 to 5.');
    setData((previous) => ({
      ...previous,
      feedback: [...previous.feedback, {
        id: makeId('feedback'), eventId, userId: currentUser.id, rating, comment: comment.trim(),
        attendanceBasis: registration.status === 'attended' ? 'organizer_checked_in' : 'registered_not_verified',
        createdAt: new Date().toISOString(),
      }],
    }));
  };

  const createTeamPost = (eventId: string, role: string, skills: string[], lookingFor: string, note: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    if (currentUser.ageBand !== '18_plus') throw new Error('Public team formation is gated until Minor Mode protections are active.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || event.team.mode === 'solo') throw new Error('This event does not have team formation enabled.');
    if (data.teamPosts.some((post) => post.eventId === eventId && post.ownerId === currentUser.id)) throw new Error('You already have a team post for this event.');
    if (!role.trim() || !lookingFor.trim()) throw new Error('Add your role and who you are looking for.');
    setData((previous) => ({
      ...previous,
      teamPosts: [...previous.teamPosts, {
        id: makeId('team'), eventId, communityId: event.communityId, ownerId: currentUser.id,
        displayName: currentUser.name, role: role.trim(), skills, lookingFor: lookingFor.trim(),
        note: note.trim(), status: 'open', createdAt: new Date().toISOString(),
      }],
    }));
  };

  const requestTeam = (postId: string, note: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    if (currentUser.ageBand !== '18_plus') throw new Error('Public team formation is gated until Minor Mode protections are active.');
    const post = data.teamPosts.find((candidate) => candidate.id === postId);
    if (!post || post.status !== 'open') throw new Error('This team post is not open.');
    if (post.ownerId === currentUser.id) throw new Error('This is your own team post.');
    if (data.teamRequests.some((request) => request.postId === postId && request.requesterId === currentUser.id && request.status !== 'declined')) throw new Error('You already sent a request to this team.');
    setData((previous) => ({
      ...previous,
      teamRequests: [...previous.teamRequests, {
        id: makeId('team-request'), postId, requesterId: currentUser.id,
        displayName: currentUser.name, note: note.trim(), status: 'pending', createdAt: new Date().toISOString(),
      }],
    }));
  };

  const respondTeamRequest = (requestId: string, status: 'accepted' | 'declined') => {
    if (!currentUser) throw new Error('Sign in required.');
    const request = data.teamRequests.find((candidate) => candidate.id === requestId);
    const post = request ? data.teamPosts.find((candidate) => candidate.id === request.postId) : null;
    const event = post ? data.events.find((candidate) => candidate.id === post.eventId) : null;
    if (!request || !post || !event || post.ownerId !== currentUser.id) throw new Error('Only the team post owner can respond.');
    if (request.status !== 'pending') throw new Error('This request has already been answered.');
    if (status === 'accepted') {
      const accepted = data.teamRequests.filter((candidate) => candidate.postId === post.id && candidate.status === 'accepted').length;
      if (event.team.maxSize && accepted + 2 > event.team.maxSize) throw new Error(`This event allows teams of at most ${event.team.maxSize} people.`);
    }
    setData((previous) => ({
      ...previous,
      teamRequests: previous.teamRequests.map((candidate) => candidate.id === requestId ? { ...candidate, status } : candidate),
    }));
  };

  const updateEventOperations = (eventId: string, patch: EventOperationsPatch, summary = 'Event operations updated', materialConfirmed = false) => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || !canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can change these operations.');
    if (patch.registrationQuestions) {
      const error = validateRegistrationQuestions(patch.registrationQuestions);
      if (error) throw new Error(error);
    }
    if (patch.resources?.some((resource) => resource.title.trim().length < 2 || !validWebUrl(resource.url))) throw new Error('Every resource needs a title and a valid HTTP or HTTPS URL.');
    if (patch.rounds?.some((round) => !round.title.trim() || !Number.isFinite(new Date(round.startAt).getTime()) || !Number.isFinite(new Date(round.endAt).getTime()) || new Date(round.startAt).getTime() >= new Date(round.endAt).getTime() || (round.submissionDeadline && !Number.isFinite(new Date(round.submissionDeadline).getTime())))) throw new Error('Every round needs a title and valid start/end times, with the end after its start.');
    if (patch.sessions?.some((session) => !session.title.trim() || !Number.isFinite(new Date(session.startAt).getTime()) || !Number.isFinite(new Date(session.endAt).getTime()) || new Date(session.startAt).getTime() >= new Date(session.endAt).getTime())) throw new Error('Every session needs a title and valid start/end times, with the end after its start.');
    if (patch.submissionDeadline && !Number.isFinite(new Date(patch.submissionDeadline).getTime())) throw new Error('Choose a valid project submission deadline.');
    if (patch.team && ((patch.team.minSize !== null && (!Number.isInteger(patch.team.minSize) || patch.team.minSize < 1)) || (patch.team.maxSize !== null && (!Number.isInteger(patch.team.maxSize) || patch.team.maxSize < 1)) || (patch.team.minSize !== null && patch.team.maxSize !== null && patch.team.minSize > patch.team.maxSize))) throw new Error('Team sizes must be positive whole numbers with minimum no greater than maximum.');
    if (patch.price?.kind === 'paid' && (!patch.price.amountInr || patch.price.amountInr <= 0)) throw new Error('A paid event needs a positive INR amount, or use Price not stated.');
    if (patch.collaborators?.some((person) => {
      const user = data.users.find((candidate) => candidate.id === person.userId);
      return !user || user.ageBand !== '18_plus' || user.accountStatus === 'closed';
    })) throw new Error('Collaborators must be active adult accounts.');
    const materialFields = materialEventChangeFields(event, patch);
    const affectedUserIds = new Set([
      ...data.registrations.filter((registration) => registration.eventId === eventId && !['cancelled', 'rejected'].includes(registration.status)).map((registration) => registration.userId),
      ...data.saves.filter((save) => save.eventId === eventId).map((save) => save.userId),
    ]);
    if (materialFields.length && affectedUserIds.size && !materialConfirmed) throw new Error(`Confirm the material change to ${materialFields.join(', ')} before notifying affected participants.`);
    const now = new Date().toISOString();
    const revisionId = makeId('revision');
    const { registrationQuestions, ...eventPatch } = patch;
    setData((previous) => ({
      ...previous,
      events: previous.events.map((candidate) => candidate.id === eventId ? {
        ...candidate,
        ...eventPatch,
        registration: registrationQuestions ? { ...candidate.registration, questions: registrationQuestions } : candidate.registration,
        nativeSafetyChecklistComplete: patch.safetyChecklist ? safetyChecklistComplete(patch.safetyChecklist) : candidate.nativeSafetyChecklistComplete,
        updatedAt: now,
        revisions: [...candidate.revisions, { id: revisionId, at: now, changedBy: currentUser.id, fields: Object.keys(patch), summary }],
      } : candidate),
      notifications: materialFields.length ? [
        ...previous.notifications,
        ...[...affectedUserIds].map((userId) => ({ id: makeId('notification'), userId, eventId, type: 'material_change' as const, title: `Important update: ${event.title}`, body: `Participant-critical details changed (${materialFields.join(', ')}). Review the latest event information.`, dedupeKey: `${revisionId}-${userId}`, readAt: null, createdAt: now })),
      ] : previous.notifications,
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: materialFields.length ? 'material_event_change_confirmed' : 'event_operations_updated', targetType: 'event', targetId: eventId, details: materialFields.length ? `${summary}; confirmed fields: ${materialFields.join(', ')}` : summary, createdAt: now }],
    }));
  };

  const createSeries = (title: string) => {
    if (!currentUser || !canPublish(currentUser) || currentUser.accountStatus === 'restricted') throw new Error('An active adult organizer account is required.');
    if (title.trim().length < 3 || title.trim().length > 120) throw new Error('Use a series title between 3 and 120 characters.');
    const series: EventSeries = { id: makeId('series'), organizerId: currentUser.id, title: title.trim(), createdAt: new Date().toISOString() };
    setData((previous) => ({ ...previous, series: [...previous.series, series] }));
    return series;
  };

  const saveSearch = (name: string) => {
    if (!currentUser) { requireAuth(location.pathname, 'save this search'); return; }
    if (currentUser.accountStatus === 'restricted') throw new Error('Complete guardian consent before saving personalized searches.');
    if (name.trim().length < 2 || name.trim().length > 80) throw new Error('Use a search name between 2 and 80 characters.');
    const now = new Date().toISOString();
    setData((previous) => ({ ...previous, savedSearches: [...previous.savedSearches, { id: makeId('search'), userId: currentUser.id, name: name.trim(), filters, alertEnabled: true, lastCheckedAt: now, createdAt: now }] }));
  };

  const deleteSearch = (searchId: string) => {
    if (!currentUser) return;
    setData((previous) => ({ ...previous, savedSearches: previous.savedSearches.filter((search) => search.id !== searchId || search.userId !== currentUser.id) }));
  };

  const checkSavedSearch = (searchId: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const search = data.savedSearches.find((candidate) => candidate.id === searchId && candidate.userId === currentUser.id);
    if (!search) throw new Error('Saved search not found.');
    const now = new Date().toISOString();
    const matches = filterEvents(data.events, search.filters).filter((event) => new Date(event.createdAt).getTime() > new Date(search.lastCheckedAt).getTime());
    setData((previous) => ({
      ...previous,
      savedSearches: previous.savedSearches.map((candidate) => candidate.id === searchId ? { ...candidate, lastCheckedAt: now } : candidate),
      notifications: search.alertEnabled && currentUser.ageBand === '18_plus' && matches.length ? [...previous.notifications, {
        id: makeId('notification'), userId: currentUser.id, eventId: null, type: 'event' as const,
        title: `${matches.length} new saved-search ${matches.length === 1 ? 'match' : 'matches'}`,
        body: `${search.name} has new explicit-filter matches. This is not a registration.`,
        dedupeKey: `${searchId}-${now}`, readAt: null, createdAt: now,
      }] : previous.notifications,
    }));
    return matches.length;
  };

  const toggleTopicFollow = (topic: string) => {
    if (!currentUser) { requireAuth(location.pathname, 'follow this topic'); return; }
    if (currentUser.accountStatus === 'restricted') throw new Error('Complete guardian consent before following topics.');
    const exists = data.topicFollows.some((follow) => follow.userId === currentUser.id && follow.topic === topic);
    setData((previous) => ({ ...previous, topicFollows: exists ? previous.topicFollows.filter((follow) => !(follow.userId === currentUser.id && follow.topic === topic)) : [...previous.topicFollows, { userId: currentUser.id, topic, createdAt: new Date().toISOString() }] }));
  };

  const toggleGoing = (eventId: string) => {
    if (!currentUser) { requireAuth(`/events/${eventId}`, 'mark that you are going'); return; }
    if (currentUser.accountStatus === 'restricted') throw new Error('Complete guardian consent before adding a going record.');
    if (!data.events.some((event) => event.id === eventId)) throw new Error('Event not found.');
    const exists = data.going.some((item) => item.userId === currentUser.id && item.eventId === eventId);
    setData((previous) => ({ ...previous, going: exists ? previous.going.filter((item) => !(item.userId === currentUser.id && item.eventId === eventId)) : [...previous.going, { userId: currentUser.id, eventId, createdAt: new Date().toISOString() }] }));
  };

  const askQuestion = (eventId: string, body: string, visibility: AttendeeQuestion['visibility']) => {
    if (!currentUser) { requireAuth(`/events/${eventId}`, 'ask the organizer a question'); return; }
    const registration = data.registrations.find((item) => item.eventId === eventId && item.userId === currentUser.id && !['cancelled', 'rejected', 'opened_externally'].includes(item.status));
    if (!registration) throw new Error('A participation record is required before using the attendee question inbox.');
    if (body.trim().length < 5 || body.trim().length > 1000) throw new Error('Use a question between 5 and 1,000 characters.');
    setData((previous) => ({ ...previous, questions: [...previous.questions, {
      id: makeId('question'), eventId, askerId: currentUser.id, body: body.trim(), visibility,
      status: 'open', answer: null, answeredBy: null, createdAt: new Date().toISOString(), answeredAt: null,
    }] }));
  };

  const answerQuestion = (questionId: string, answer: string, publishFaq: boolean) => {
    if (!currentUser) throw new Error('Sign in required.');
    const question = data.questions.find((candidate) => candidate.id === questionId);
    const event = question ? data.events.find((candidate) => candidate.id === question.eventId) : null;
    if (!question || !event || !canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can answer this question.');
    if (answer.trim().length < 2 || answer.trim().length > 2000) throw new Error('Use an answer between 2 and 2,000 characters.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      questions: previous.questions.map((candidate) => candidate.id === questionId ? { ...candidate, answer: answer.trim(), answeredBy: currentUser.id, answeredAt: now, status: 'answered' } : candidate),
      events: publishFaq ? previous.events.map((candidate) => candidate.id === event.id ? { ...candidate, faqs: [...(candidate.faqs ?? []), { id: makeId('faq'), question: question.body, answer: answer.trim(), visibility: question.visibility }] } : candidate) : previous.events,
      notifications: [...previous.notifications, { id: makeId('notification'), userId: question.askerId, eventId: event.id, type: 'event', title: 'Organizer answered your question', body: answer.trim(), dedupeKey: `${questionId}-answer`, readAt: null, createdAt: now }],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: publishFaq ? 'question_answered_and_published' : 'question_answered', targetType: 'question', targetId: questionId, details: event.title, createdAt: now }],
    }));
  };

  const submitProject = (input: Pick<ProjectSubmission, 'eventId' | 'roundId' | 'title' | 'description' | 'repositoryUrl' | 'videoUrl' | 'documentUrl' | 'showcase'>) => {
    if (!currentUser) { requireAuth(`/events/${input.eventId}`, 'submit a project'); return; }
    const event = data.events.find((candidate) => candidate.id === input.eventId);
    const registration = data.registrations.find((item) => item.eventId === input.eventId && item.userId === currentUser.id && isConfirmedNative(item));
    if (!event || !registration) throw new Error('A confirmed native registration is required for project submission.');
    if (data.projectSubmissions.some((item) => item.eventId === input.eventId && item.userId === currentUser.id)) throw new Error('You already submitted a project for this event.');
    const round = event.rounds?.find((candidate) => candidate.id === input.roundId);
    const deadline = round?.submissionDeadline ?? event.submissionDeadline;
    if (deadline && new Date(deadline).getTime() < Date.now()) throw new Error('The project submission deadline has passed.');
    const validationError = validateProjectSubmission(input);
    if (validationError) throw new Error(validationError);
    const now = new Date().toISOString();
    setData((previous) => ({ ...previous, projectSubmissions: [...previous.projectSubmissions, {
      ...input, id: makeId('project'), userId: currentUser.id, title: input.title.trim(), description: input.description.trim(),
      repositoryUrl: input.repositoryUrl.trim(), videoUrl: input.videoUrl.trim(), documentUrl: input.documentUrl.trim(),
      roundId: round?.id ?? null, status: 'submitted', createdAt: now, updatedAt: now,
    }] }));
  };

  const updateProjectStatus = (submissionId: string, status: ProjectSubmission['status']) => {
    if (!currentUser) throw new Error('Sign in required.');
    const submission = data.projectSubmissions.find((candidate) => candidate.id === submissionId);
    const event = submission ? data.events.find((candidate) => candidate.id === submission.eventId) : null;
    if (!submission || !event || !canManageEvent(currentUser, event)) throw new Error('Only an authorized event manager can update project status.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      projectSubmissions: previous.projectSubmissions.map((candidate) => candidate.id === submissionId ? { ...candidate, status, updatedAt: now } : candidate),
      notifications: [...previous.notifications, { id: makeId('notification'), userId: submission.userId, eventId: event.id, type: 'event', title: `Project ${status.replaceAll('_', ' ')}`, body: `${submission.title}: ${status.replaceAll('_', ' ')}.`, dedupeKey: `${submissionId}-${status}-${now}`, readAt: null, createdAt: now }],
    }));
  };

  const scoreProject = (submissionId: string, score: Pick<ProjectScore, 'innovation' | 'execution' | 'impact' | 'feedback'>) => {
    if (!currentUser) throw new Error('Sign in required.');
    const submission = data.projectSubmissions.find((candidate) => candidate.id === submissionId);
    const event = submission ? data.events.find((candidate) => candidate.id === submission.eventId) : null;
    if (!submission || !event || !canJudgeEvent(currentUser, event)) throw new Error('Only an assigned judge or event manager can score this project.');
    if ([score.innovation, score.execution, score.impact].some((value) => !Number.isInteger(value) || value < 1 || value > 5)) throw new Error('Rubric scores must be whole numbers from 1 to 5.');
    const existing = data.projectScores.find((candidate) => candidate.submissionId === submissionId && candidate.judgeId === currentUser.id);
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      projectScores: existing ? previous.projectScores.map((candidate) => candidate.id === existing.id ? { ...candidate, ...score, feedback: score.feedback.trim(), createdAt: now } : candidate) : [...previous.projectScores, { id: makeId('score'), submissionId, judgeId: currentUser.id, ...score, feedback: score.feedback.trim(), createdAt: now }],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'project_scored', targetType: 'project', targetId: submissionId, details: 'Rubric score saved; values are visible in the judging ledger.', createdAt: now }],
    }));
  };

  const submitReport = (input: Pick<TrustReport, 'eventId' | 'targetType' | 'reason' | 'details' | 'priority'>) => {
    if (!input.reason.trim() || input.details.trim().length < 10 || input.details.trim().length > 2000) throw new Error('Add a reason and details between 10 and 2,000 characters.');
    if (!currentUser && data.reports.filter((report) => !report.reporterId && report.eventId === input.eventId && Date.now() - new Date(report.createdAt).getTime() < 3_600_000).length >= 3) throw new Error('This browser has reached the hourly guest-report limit for this event. Please try again later.');
    const now = new Date().toISOString();
    setData((previous) => ({ ...previous, reports: [...previous.reports, {
      ...input, id: makeId('report'), reporterId: currentUser?.id ?? null, reason: input.reason.trim(), details: input.details.trim(),
      status: 'open', resolutionNote: null, createdAt: now, resolvedAt: null,
    }] }));
  };

  const reviewReport = (reportId: string, status: 'resolved' | 'dismissed', note: string) => {
    if (!currentUser || !canReviewSubmissions(currentUser)) throw new Error('Reviewer access required.');
    if (note.trim().length < 3) throw new Error('Add a resolution note.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      reports: previous.reports.map((report) => report.id === reportId ? { ...report, status, resolutionNote: note.trim(), resolvedAt: now } : report),
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: `report_${status}`, targetType: 'report', targetId: reportId, details: note.trim(), createdAt: now }],
    }));
  };

  const submitClaim = (eventId: string, evidence: string) => {
    if (!currentUser || currentUser.ageBand !== '18_plus' || currentUser.accountStatus === 'restricted') throw new Error('An active adult account is required to claim an event.');
    if (!data.events.some((event) => event.id === eventId)) throw new Error('Event not found.');
    if (evidence.trim().length < 10 || evidence.trim().length > 2000) throw new Error('Add claim evidence between 10 and 2,000 characters.');
    if (data.claims.some((claim) => claim.eventId === eventId && claim.userId === currentUser.id && claim.status === 'pending')) throw new Error('You already have a pending claim for this event.');
    setData((previous) => ({ ...previous, claims: [...previous.claims, { id: makeId('claim'), eventId, userId: currentUser.id, evidence: evidence.trim(), status: 'pending', reviewNote: null, reviewerId: null, createdAt: new Date().toISOString(), reviewedAt: null }] }));
  };

  const reviewClaim = (claimId: string, decision: 'approved' | 'rejected', note: string) => {
    if (!currentUser || !canReviewSubmissions(currentUser)) throw new Error('Reviewer access required.');
    const claim = data.claims.find((candidate) => candidate.id === claimId);
    const claimant = claim ? data.users.find((candidate) => candidate.id === claim.userId) : null;
    if (!claim || !claimant || claim.status !== 'pending') throw new Error('Pending claim not found.');
    if (note.trim().length < 3) throw new Error('Add a review note.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      claims: previous.claims.map((candidate) => candidate.id === claimId ? { ...candidate, status: decision, reviewNote: note.trim(), reviewerId: currentUser.id, reviewedAt: now } : candidate),
      events: decision === 'approved' ? previous.events.map((event) => event.id === claim.eventId ? { ...event, organizerId: claimant.id, organizerName: claimant.name, updatedAt: now, revisions: [...event.revisions, { id: makeId('revision'), at: now, changedBy: currentUser.id, fields: ['organizerId'], summary: 'Organizer claim approved; this is not blanket event-safety verification.' }] } : event) : previous.events,
      notifications: [...previous.notifications, { id: makeId('notification'), userId: claimant.id, eventId: claim.eventId, type: 'system', title: `Organizer claim ${decision}`, body: note.trim(), dedupeKey: `${claimId}-${decision}`, readAt: null, createdAt: now }],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: `claim_${decision}`, targetType: 'claim', targetId: claimId, details: note.trim(), createdAt: now }],
    }));
  };

  const completeGuardianConsent = (guardianEmail: string) => {
    if (!currentUser || currentUser.ageBand === '18_plus') throw new Error('A minor account is required.');
    if (guardianEmail.trim().toLowerCase() !== currentUser.guardianEmail) throw new Error('Use the guardian email supplied during account creation.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) => user.id === currentUser.id ? { ...user, guardianConsent: 'complete', accountStatus: 'active' } : user),
      consentRecords: previous.consentRecords.map((record) => record.userId === currentUser.id ? { ...record, status: 'complete', updatedAt: now } : record),
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'guardian_consent_completed_local', targetType: 'user', targetId: currentUser.id, details: 'Local guardian attestation only; not production identity verification.', createdAt: now }],
    }));
  };

  const withdrawGuardianConsent = () => {
    if (!currentUser || currentUser.ageBand === '18_plus') throw new Error('A minor account is required.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) => user.id === currentUser.id ? { ...user, guardianConsent: 'withdrawn', accountStatus: 'restricted', personalizationConsent: false, learnedInterests: [] } : user),
      registrations: previous.registrations.map((registration) => registration.userId === currentUser.id && registration.kind === 'native' && !['cancelled', 'rejected', 'attended'].includes(registration.status) ? { ...registration, status: 'cancelled', updatedAt: now } : registration),
      consentRecords: previous.consentRecords.map((record) => record.userId === currentUser.id ? { ...record, status: 'withdrawn', updatedAt: now } : record),
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'guardian_consent_withdrawn', targetType: 'user', targetId: currentUser.id, details: 'Account restricted; active native participation cancelled.', createdAt: now }],
    }));
  };

  const reconfirmAgeBand = (ageBand: UserAccount['ageBand']) => {
    if (!currentUser || ageBand === 'under_13') throw new Error('This age band cannot be used for an individual account.');
    if (currentUser.ageBand === '18_plus' && ageBand !== '18_plus') throw new Error('Changing an adult account to a minor account requires support review and a guardian-consent record.');
    const elapsed = Date.now() - new Date(currentUser.ageBandConfirmedOn).getTime();
    if (ageBand !== currentUser.ageBand && elapsed < 365 * 86_400_000) throw new Error('Age-band changes are available during annual reconfirmation. Contact support to correct a mistake.');
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) => user.id === currentUser.id ? {
        ...user, ageBand, ageBandConfirmedOn: now,
        guardianConsent: ageBand === '18_plus' ? 'not_required' : user.guardianConsent,
        accountStatus: ageBand === '18_plus' ? 'active' : user.accountStatus,
        guardianEmail: ageBand === '18_plus' ? null : user.guardianEmail,
        personalizationConsent: ageBand === '18_plus' ? user.personalizationConsent : false,
        learnedInterests: ageBand === '18_plus' ? user.learnedInterests : [],
      } : user),
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'age_band_reconfirmed', targetType: 'user', targetId: currentUser.id, details: 'Self-declared age band reconfirmed; not age verification.', createdAt: now }],
    }));
  };

  const issueCertificate = (eventId: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const event = data.events.find((candidate) => candidate.id === eventId);
    const registration = data.registrations.find((item) => item.eventId === eventId && item.userId === currentUser.id);
    if (!event || !certificateEligible(registration, event)) throw new Error('Certificates require an organizer-recorded attendance after the event ends.');
    const existing = data.certificates.find((certificate) => certificate.eventId === eventId && certificate.userId === currentUser.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const certificate: ParticipationCertificate = { id: makeId('certificate'), eventId, userId: currentUser.id, verificationCode: createCheckInToken(), issuedAt: now };
    setData((previous) => ({
      ...previous,
      certificates: [...previous.certificates, certificate],
      auditRecords: [...previous.auditRecords, { id: makeId('audit'), actorId: currentUser.id, action: 'attendance_certificate_issued', targetType: 'certificate', targetId: certificate.id, details: 'Attendance basis: organizer check-in; no skill or winner claim.', createdAt: now }],
    }));
    return certificate;
  };

  const markNotificationsRead = () => {
    if (!currentUser) return;
    setData((previous) => ({
      ...previous,
      notifications: previous.notifications.map((notification) => notification.userId === currentUser.id && !notification.readAt && (!notification.deliverAt || new Date(notification.deliverAt).getTime() <= Date.now())
        ? { ...notification, readAt: new Date().toISOString() } : notification),
    }));
  };

  const resetWorkspace = () => {
    const next = createInitialData();
    saveData(next);
    setData(next);
    setFilters(defaultFilters());
    window.location.replace('/');
  };

  const value = useMemo<AppContextValue>(() => ({
    data, currentUser, filters, setFilters,
    unreadCount: currentUser ? data.notifications.filter((notification) => notification.userId === currentUser.id && !notification.readAt && (!notification.deliverAt || new Date(notification.deliverAt).getTime() <= Date.now())).length : 0,
    requireAuth, signUp, signIn, signOut, deleteAccount, updateProfile, toggleSave, toggleFollow, participate,
    selfConfirmExternal, publishQuickEvent, createSubmission, importFederatedEvents, submitSubmission,
    approveSubmission, moderateSubmission, mergeSubmission, updateSourceRecord, updateVenue, setEventCancellation,
    reviewRegistration, cancelRegistration, scanCheckIn, checkInRegistration, sendAnnouncement, submitFeedback, createTeamPost, requestTeam, respondTeamRequest,
    updateEventOperations, createSeries, saveSearch, deleteSearch, checkSavedSearch, toggleTopicFollow, toggleGoing,
    askQuestion, answerQuestion, submitProject, updateProjectStatus, scoreProject, submitReport, reviewReport,
    submitClaim, reviewClaim, completeGuardianConsent, withdrawGuardianConsent, reconfirmAgeBand, issueCertificate,
    markNotificationsRead, resetWorkspace,
  // Context functions intentionally close over the latest data snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, currentUser, filters]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
