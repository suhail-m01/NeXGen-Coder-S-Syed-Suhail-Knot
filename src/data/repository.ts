import { buildSampleEvents } from '../domain/sample';
import { buildInitialSources } from '../domain/sources';
import { createCheckInToken } from '../domain/checkin';
import type { AppData } from '../domain/types';

const STORAGE_KEY = 'knot.product.data.v1';
const DATA_VERSION = 1;

export const createInitialData = (): AppData => ({
  version: DATA_VERSION,
  events: buildSampleEvents(),
  users: [],
  session: null,
  registrations: [],
  saves: [],
  follows: [],
  notifications: [],
  announcements: [],
  submissions: [],
  sources: buildInitialSources(),
  feedback: [],
  teamPosts: [],
  teamRequests: [],
  savedSearches: [],
  topicFollows: [],
  going: [],
  questions: [],
  projectSubmissions: [],
  projectScores: [],
  reports: [],
  claims: [],
  consentRecords: [],
  certificates: [],
  auditRecords: [],
  series: [],
  seriesRuns: [],
  teamInvitations: [],
  teamContinuity: [],
  referralCampaigns: [],
  referralVisits: [],
  mediaAssets: [],
  personalizationSignals: [],
});

export function loadData(): AppData {
  if (typeof window === 'undefined') return createInitialData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== DATA_VERSION || !Array.isArray(parsed.events)) return createInitialData();
    const initial = createInitialData();
    const parsedUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const hasEligibleAdmin = parsedUsers.some((user) => user.ageBand === '18_plus' && (user.role === 'admin' || user.workspaceAdmin === true));
    const firstAdultIndex = parsedUsers.findIndex((user) => user.ageBand === '18_plus');
    const users = parsedUsers.map((user, index) => ({
      ...user,
      workspaceAdmin: user.ageBand === '18_plus'
        ? user.workspaceAdmin ?? (!hasEligibleAdmin && index === firstAdultIndex)
        : false,
      accountStatus: user.accountStatus ?? (user.guardianConsent === 'withdrawn' ? 'restricted' : 'active'),
      personalizationConsent: user.personalizationConsent ?? false,
      returnAnalyticsConsent: user.returnAnalyticsConsent ?? false,
      learnedInterests: user.learnedInterests ?? [],
      guardianEmail: user.guardianEmail ?? null,
    }));
    const submissions = (Array.isArray(parsed.submissions) ? parsed.submissions : []).map((submission) => ({
      ...submission,
      review: submission.review ?? null,
    }));
    const registrations = (Array.isArray(parsed.registrations) ? parsed.registrations : []).map((registration) => (
      registration.kind === 'native' && !registration.checkInToken ? { ...registration, checkInToken: createCheckInToken() } : registration
    ));
    const events = parsed.events.map((event) => ({
      ...event,
      visibility: event.visibility ?? 'public',
      seriesId: event.seriesId ?? null,
      registration: {
        ...event.registration,
        waitlistEnabled: event.registration.waitlistEnabled ?? (event.registration.kind === 'native' && event.registration.capacity !== null),
      },
    }));
    return {
      ...initial,
      ...parsed,
      events,
      users,
      registrations,
      saves: Array.isArray(parsed.saves) ? parsed.saves : [],
      follows: Array.isArray(parsed.follows) ? parsed.follows : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
      submissions,
      sources: Array.isArray(parsed.sources) ? parsed.sources : initial.sources,
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      teamPosts: Array.isArray(parsed.teamPosts) ? parsed.teamPosts : [],
      teamRequests: Array.isArray(parsed.teamRequests) ? parsed.teamRequests : [],
      savedSearches: Array.isArray(parsed.savedSearches) ? parsed.savedSearches : [],
      topicFollows: Array.isArray(parsed.topicFollows) ? parsed.topicFollows : [],
      going: Array.isArray(parsed.going) ? parsed.going : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      projectSubmissions: Array.isArray(parsed.projectSubmissions) ? parsed.projectSubmissions : [],
      projectScores: Array.isArray(parsed.projectScores) ? parsed.projectScores : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
      consentRecords: Array.isArray(parsed.consentRecords) ? parsed.consentRecords : [],
      certificates: Array.isArray(parsed.certificates) ? parsed.certificates : [],
      auditRecords: Array.isArray(parsed.auditRecords) ? parsed.auditRecords : [],
      series: Array.isArray(parsed.series) ? parsed.series : [],
      seriesRuns: Array.isArray(parsed.seriesRuns) ? parsed.seriesRuns : [],
      teamInvitations: Array.isArray(parsed.teamInvitations) ? parsed.teamInvitations : [],
      teamContinuity: Array.isArray(parsed.teamContinuity) ? parsed.teamContinuity : [],
      referralCampaigns: Array.isArray(parsed.referralCampaigns) ? parsed.referralCampaigns : [],
      referralVisits: Array.isArray(parsed.referralVisits) ? parsed.referralVisits : [],
      mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : [],
      personalizationSignals: Array.isArray(parsed.personalizationSignals) ? parsed.personalizationSignals : [],
    };
  } catch {
    return createInitialData();
  }
}

export function saveData(data: AppData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

export function makeId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}
