import type {
  KnotEvent, ReferralCampaign, ReferralVisit, Registration, TeamInvitation,
  TeamPost, TeamRequest, UserAccount,
} from './types';

const confirmedNative = new Set(['registered', 'approved', 'checked_in', 'attended']);

export function effectiveInvitationStatus(invitation: TeamInvitation, now = new Date()) {
  if (invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() <= now.getTime()) return 'expired' as const;
  return invitation.status;
}

/** One shared membership derivation prevents requests and invitations from overfilling a team. */
export function acceptedTeamMemberIds(
  post: TeamPost,
  requests: TeamRequest[],
  invitations: TeamInvitation[],
) {
  return [...new Set([
    post.ownerId,
    ...requests.filter((request) => request.postId === post.id && request.status === 'accepted').map((request) => request.requesterId),
    ...invitations.filter((invitation) => invitation.postId === post.id && invitation.status === 'accepted').map((invitation) => invitation.inviteeId),
  ])];
}

export function teamReadiness(
  post: TeamPost,
  event: KnotEvent,
  requests: TeamRequest[],
  invitations: TeamInvitation[],
  users: UserAccount[],
  now = new Date(),
) {
  const memberIds = acceptedTeamMemberIds(post, requests, invitations);
  const memberCount = memberIds.length;
  const minimum = event.team.minSize ?? 1;
  const maximum = event.team.maxSize ?? null;
  const deadlinePassed = Boolean(event.team.formationDeadline && new Date(event.team.formationDeadline).getTime() <= now.getTime());
  const coveredSkills = new Set(post.skills);
  for (const memberId of memberIds) {
    const user = users.find((candidate) => candidate.id === memberId);
    user?.skills.forEach((skill) => coveredSkills.add(skill));
  }
  const missingSkills = event.skills.filter((skill) => !coveredSkills.has(skill));
  const warnings: string[] = [];
  if (deadlinePassed) warnings.push('The team-formation deadline has passed.');
  if (memberCount < minimum) warnings.push(`Add ${minimum - memberCount} more ${minimum - memberCount === 1 ? 'member' : 'members'} to reach the event minimum.`);
  if (maximum !== null && memberCount > maximum) warnings.push('The team exceeds the event maximum; organizer review is required.');
  if (missingSkills.length) warnings.push(`Complementary skills to consider: ${missingSkills.join(', ')}.`);
  const status = deadlinePassed ? 'closed'
    : memberCount < minimum ? 'needs_members'
      : missingSkills.length ? 'complementary_skills'
        : 'ready';
  return { memberIds, memberCount, minimum, maximum, deadlinePassed, missingSkills, warnings, status };
}

export function referralChannelStats(
  eventId: string,
  campaigns: ReferralCampaign[],
  visits: ReferralVisit[],
  registrations: Registration[],
) {
  return campaigns.filter((campaign) => campaign.eventId === eventId).map((campaign) => {
    const campaignVisits = visits.filter((visit) => visit.campaignId === campaign.id);
    const uniqueSessions = new Set(campaignVisits.map((visit) => visit.sessionKey)).size;
    const nativeRegistrations = registrations.filter((registration) =>
      registration.referralCampaignId === campaign.id && registration.kind === 'native' && confirmedNative.has(registration.status)).length;
    const externalHandoffs = registrations.filter((registration) =>
      registration.referralCampaignId === campaign.id && registration.kind === 'external').length;
    return {
      campaign,
      visits: uniqueSessions,
      nativeRegistrations,
      externalHandoffs,
      nativeConversionRate: uniqueSessions ? Math.round((nativeRegistrations / uniqueSessions) * 1000) / 10 : null,
    };
  });
}

export interface ReturnCohort {
  cohort: string;
  eligibleAdults: number | null;
  returnedAdults: number | null;
  returnRate: number | null;
  status: 'mature' | 'pending' | 'suppressed';
}

/**
 * Same-organizer, verified-native-attendance cohorts only. Adults explicitly opt in;
 * external self-reports, minors, restricted/closed accounts and immature windows are excluded.
 */
export function buildReturnCohorts(
  events: KnotEvent[],
  registrations: Registration[],
  users: UserAccount[],
  organizerId: string,
  now = new Date(),
  minimumCohortSize = 5,
): ReturnCohort[] {
  const eligibleUsers = new Set(users.filter((user) =>
    user.ageBand === '18_plus' && user.returnAnalyticsConsent === true &&
    user.accountStatus !== 'closed' && user.accountStatus !== 'restricted').map((user) => user.id));
  const ownedEvents = new Map(events.filter((event) => event.organizerId === organizerId).map((event) => [event.id, event]));
  const attendance = registrations.filter((registration) =>
    registration.kind === 'native' && registration.status === 'attended' && eligibleUsers.has(registration.userId) && ownedEvents.has(registration.eventId))
    .map((registration) => ({ registration, event: ownedEvents.get(registration.eventId)! }))
    .filter((item) => new Date(item.event.endAt ?? item.event.startAt).getTime() <= now.getTime())
    .sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  const byUser = new Map<string, typeof attendance>();
  for (const item of attendance) byUser.set(item.registration.userId, [...(byUser.get(item.registration.userId) ?? []), item]);
  const cohorts = new Map<string, { firstStart: number; returned: boolean }[]>();
  for (const items of byUser.values()) {
    const first = items[0];
    const firstStart = new Date(first.event.startAt).getTime();
    const returned = items.slice(1).some((item) => {
      const start = new Date(item.event.startAt).getTime();
      return start > firstStart && start <= firstStart + 60 * 86_400_000;
    });
    const key = first.event.startAt.slice(0, 7);
    cohorts.set(key, [...(cohorts.get(key) ?? []), { firstStart, returned }]);
  }
  return [...cohorts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([cohort, members]) => {
    const mature = members.every((member) => member.firstStart + 60 * 86_400_000 <= now.getTime());
    const eligibleAdults = members.length;
    const returnedAdults = members.filter((member) => member.returned).length;
    const status = eligibleAdults < minimumCohortSize ? 'suppressed' : mature ? 'mature' : 'pending';
    return {
      cohort,
      eligibleAdults: status === 'suppressed' ? null : eligibleAdults,
      returnedAdults: status === 'suppressed' ? null : returnedAdults,
      status,
      returnRate: status === 'mature' ? Math.round((returnedAdults / eligibleAdults) * 1000) / 10 : null,
    };
  });
}
