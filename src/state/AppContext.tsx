import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { canPublish, participationDecision } from '../domain/age';
import { eventTypeLabel } from '../domain/events';
import { localityById } from '../domain/localities';
import { parseInstantText } from '../domain/parser';
import { defaultFilters } from '../domain/defaults';
import type { QuickPostInput } from '../domain/validation';
import { validateQuickPost } from '../domain/validation';
import type { AppData, EventFilters, KnotEvent, Registration, Submission, UserAccount } from '../domain/types';
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
  updateProfile: (patch: Partial<Pick<UserAccount, 'name' | 'areaLocalityId' | 'radiusKm' | 'interests' | 'skills' | 'learningGoals'>>) => void;
  toggleSave: (eventId: string) => boolean;
  toggleFollow: (communityId: string) => boolean;
  participate: (event: KnotEvent, selfDeclaredAgeRuleMet?: boolean) => 'auth_required' | 'opened_externally' | 'open_blocked' | 'registered' | 'pending' | 'duplicate' | 'check_rule' | 'cannot_join' | 'needs_consent' | 'not_open_yet' | 'closed';
  selfConfirmExternal: (eventId: string) => void;
  publishQuickEvent: (input: QuickPostInput) => KnotEvent;
  createSubmission: (rawText: string, inputType?: 'text' | 'url') => Submission;
  submitSubmission: (submissionId: string, review: { title: string; startAt: string | null; venueName: string | null; registrationUrl: string | null }) => void;
  updateVenue: (eventId: string, name: string, address: string) => void;
  setEventCancellation: (eventId: string, cancelled: boolean) => void;
  checkInRegistration: (registrationId: string) => void;
  submitFeedback: (eventId: string, rating: number, comment: string) => void;
  createTeamPost: (eventId: string, role: string, skills: string[], lookingFor: string, note: string) => void;
  requestTeam: (postId: string, note: string) => void;
  respondTeamRequest: (requestId: string, status: 'accepted' | 'declined') => void;
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

  const requireAuth = (returnTo: string, action: string) => {
    const params = new URLSearchParams({ returnTo, action });
    navigate(`/auth?${params.toString()}`, { state: { from: location.pathname } });
  };

  const signUp = async (input: SignUpInput) => {
    if (input.ageBand !== '18_plus') throw new Error('MINOR_ACCOUNTS_GATED');
    if (input.name.trim().length < 2) throw new Error('Enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Use at least 8 characters for your password.');
    if (data.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw new Error('An account with this email already exists. Sign in instead.');
    const passwordSalt = createSalt();
    const passwordHash = await hashPassword(input.password, passwordSalt);
    const user: UserAccount = {
      id: makeId('user'), email: input.email.toLowerCase(), name: input.name.trim(), passwordSalt, passwordHash,
      role: input.role, ageBand: input.ageBand, ageBandConfirmedOn: new Date().toISOString(),
      guardianConsent: 'not_required', areaLocalityId: input.areaLocalityId, radiusKm: 10,
      interests: input.interests, skills: [], learningGoals: [], createdAt: new Date().toISOString(),
    };
    setData((previous) => ({ ...previous, users: [...previous.users, user], session: { userId: user.id, createdAt: new Date().toISOString() } }));
    return user;
  };

  const signIn = async (email: string, password: string) => {
    const user = data.users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw new Error('Email or password is incorrect.');
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
    };
    saveData(next);
    setData(next);
    window.location.replace('/');
  };

  const updateProfile: AppContextValue['updateProfile'] = (patch) => {
    if (!currentUser) return;
    setData((previous) => ({ ...previous, users: previous.users.map((user) => user.id === currentUser.id ? { ...user, ...patch } : user) }));
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

  const participate: AppContextValue['participate'] = (event, selfDeclaredAgeRuleMet = false) => {
    const decision = participationDecision(currentUser, event);
    if (decision === 'auth_required') {
      requireAuth(`/events/${event.id}`, 'register for this event');
      return decision;
    }
    if (decision !== 'can_join' && decision !== 'check_rule') return decision;
    if (decision === 'check_rule' && !selfDeclaredAgeRuleMet) return 'check_rule';
    if (!currentUser) return 'auth_required';

    const existing = data.registrations.find((registration) => registration.eventId === event.id && registration.userId === currentUser.id);
    if (existing && !['cancelled', 'rejected'].includes(existing.status)) return 'duplicate';
    if (event.registration.kind === 'native' && event.registration.capacity !== null) {
      const activeCount = data.registrations.filter((registration) => registration.eventId === event.id && registration.kind === 'native' && !['cancelled', 'rejected'].includes(registration.status)).length;
      if (activeCount >= event.registration.capacity) return 'closed';
    }
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

    const status = event.registration.approval === 'manual' ? 'pending' : 'registered';
    const registration: Registration = {
      id: makeId('registration'), eventId: event.id, userId: currentUser.id, kind: 'native', status,
      selfDeclaredAgeRuleMet, createdAt: now, updatedAt: now,
    };
    setData((previous) => ({
      ...previous,
      registrations: [...previous.registrations, registration],
      notifications: [...previous.notifications, {
        id: makeId('notification'), userId: currentUser.id, eventId: event.id, type: 'event',
        title: status === 'registered' ? 'Registration confirmed' : 'Registration submitted',
        body: status === 'registered' ? `You are registered for ${event.title}.` : `The organizer will review your registration for ${event.title}.`,
        dedupeKey: `${event.id}-registration-${currentUser.id}`, readAt: null, createdAt: now,
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
      registration: { kind: input.registrationKind, externalUrl, capacity: null, approval: 'none' },
      ageRule: input.ageRule, interests: input.interests, skills: input.skills, learningOutcomes: input.skills,
      eligibilityText: input.eligibilityText.trim(), eligibilityKnown: Boolean(input.eligibilityText.trim()),
      experienceLevel: 'not_stated', team: { mode: 'not_stated', minSize: null, maxSize: null, formationDeadline: null },
      price: { kind: input.priceKind, amountInr: input.priceKind === 'free' ? 0 : input.priceAmount, note: input.priceKind === 'unknown' ? '' : 'Organizer stated' },
      prizes: [], nativeSafetyChecklistComplete: false, isSample: false, createdById: currentUser.id,
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
      draft: parseInstantText(rawText), canonicalEventId: null, createdAt: new Date().toISOString(),
    };
    setData((previous) => ({ ...previous, submissions: [submission, ...previous.submissions] }));
    return submission;
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

  const updateVenue = (eventId: string, name: string, address: string) => {
    if (!currentUser || !name.trim()) return;
    const event = data.events.find((candidate) => candidate.id === eventId);
    if (!event || event.organizerId !== currentUser.id || !event.venue) return;
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
    if (!event || (event.organizerId !== currentUser.id && currentUser.role !== 'admin')) throw new Error('Only this event’s organizer can change its status.');
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

  const checkInRegistration = (registrationId: string) => {
    if (!currentUser) throw new Error('Sign in required.');
    const registration = data.registrations.find((candidate) => candidate.id === registrationId);
    const event = registration ? data.events.find((candidate) => candidate.id === registration.eventId) : null;
    if (!registration || !event || (event.organizerId !== currentUser.id && currentUser.role !== 'admin')) throw new Error('Only this event’s organizer can check in registrations.');
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

  const markNotificationsRead = () => {
    if (!currentUser) return;
    setData((previous) => ({
      ...previous,
      notifications: previous.notifications.map((notification) => notification.userId === currentUser.id && !notification.readAt
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
    unreadCount: currentUser ? data.notifications.filter((notification) => notification.userId === currentUser.id && !notification.readAt).length : 0,
    requireAuth, signUp, signIn, signOut, deleteAccount, updateProfile, toggleSave, toggleFollow, participate,
    selfConfirmExternal, publishQuickEvent, createSubmission, submitSubmission, updateVenue, setEventCancellation,
    checkInRegistration, submitFeedback, createTeamPost, requestTeam, respondTeamRequest,
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
