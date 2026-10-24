import type { KnotEvent, Registration, SourceRecord, UserAccount } from '../../domain/types';

type Row = Record<string, unknown>;
const object = (value: unknown): Row => typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Row : {};
const string = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const nullableString = (value: unknown) => typeof value === 'string' && value ? value : null;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export interface CloudEventRow extends Row {
  id: string;
  slug: string;
  organizer_id: string | null;
  title: string;
  status: KnotEvent['status'];
  visibility: NonNullable<KnotEvent['visibility']>;
  starts_at: string;
  ends_at: string | null;
  registration_kind: KnotEvent['registration']['kind'];
  capacity: number | null;
  approval: KnotEvent['registration']['approval'];
  waitlist_enabled: boolean;
  registration_opens_at: string | null;
  registration_deadline: string | null;
  age_mode: string;
  min_age: number | null;
  max_age: number | null;
  public_data: Row;
  created_at: string;
  updated_at: string;
}

/** Only safe public fields enter the anonymously readable event payload. */
export function eventToCloudRow(event: KnotEvent, organizerId: string) {
  const {
    onlineJoinUrl, collaborators, revisions, resources, ...safeEvent
  } = event;
  const publicResources = (resources ?? []).filter((resource) => resource.visibility === 'public');
  const publicData = {
    ...safeEvent,
    organizerId,
    createdById: organizerId,
    resources: publicResources,
    registration: { ...event.registration, questions: event.registration.questions ?? [] },
  };
  const row: CloudEventRow = {
    id: event.id,
    slug: event.slug,
    organizer_id: organizerId,
    title: event.title,
    status: event.status,
    visibility: event.visibility ?? 'public',
    starts_at: event.startAt,
    ends_at: event.endAt,
    registration_kind: event.registration.kind,
    capacity: event.registration.capacity,
    approval: event.registration.approval,
    waitlist_enabled: event.registration.waitlistEnabled,
    registration_opens_at: event.registrationOpensAt,
    registration_deadline: event.registrationDeadline,
    age_mode: event.ageRule.mode,
    min_age: event.ageRule.minAge,
    max_age: event.ageRule.maxAge,
    public_data: publicData as unknown as Row,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  };
  const privateRow = {
    event_id: event.id,
    online_join_url: onlineJoinUrl,
    participant_data: {
      resources: (resources ?? []).filter((resource) => resource.visibility === 'participant_only'),
      collaborators: collaborators ?? [],
      revisions: revisions ?? [],
    },
    updated_at: event.updatedAt,
  };
  return { row, privateRow };
}

export function cloudRowToEvent(row: CloudEventRow, privateRow?: Row): KnotEvent {
  const data = object(row.public_data);
  const privateData = object(privateRow?.participant_data);
  const publicResources = Array.isArray(data.resources) ? data.resources : [];
  const participantResources = Array.isArray(privateData.resources) ? privateData.resources : [];
  const registration = object(data.registration);
  const ageRule = object(data.ageRule);
  return {
    ...data,
    id: row.id,
    slug: row.slug,
    title: row.title,
    organizerId: row.organizer_id,
    createdById: row.organizer_id,
    status: row.status,
    visibility: row.visibility,
    startAt: row.starts_at,
    endAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    registrationOpensAt: row.registration_opens_at,
    registrationDeadline: row.registration_deadline,
    registration: {
      ...registration,
      kind: row.registration_kind,
      capacity: row.capacity,
      approval: row.approval,
      waitlistEnabled: row.waitlist_enabled,
      questions: Array.isArray(registration.questions) ? registration.questions : [],
    },
    ageRule: { ...ageRule, mode: row.age_mode, minAge: row.min_age, maxAge: row.max_age },
    onlineJoinUrl: nullableString(privateRow?.online_join_url),
    resources: [...publicResources, ...participantResources],
    collaborators: Array.isArray(privateData.collaborators) ? privateData.collaborators : [],
    revisions: Array.isArray(privateData.revisions) ? privateData.revisions : [],
  } as unknown as KnotEvent;
}

export function profileToUser(row: Row): UserAccount {
  return {
    id: string(row.id), email: string(row.email), name: string(row.name), passwordSalt: '', passwordHash: '',
    role: string(row.role, 'participant') as UserAccount['role'], workspaceAdmin: row.workspace_admin === true,
    announcementOptOut: row.announcement_opt_out === true,
    ageBand: string(row.age_band, '18_plus') as UserAccount['ageBand'], ageBandConfirmedOn: string(row.age_band_confirmed_on),
    guardianConsent: string(row.guardian_consent, 'not_required') as UserAccount['guardianConsent'],
    areaLocalityId: nullableString(row.area_locality_id), radiusKm: Number(row.radius_km ?? 10),
    interests: strings(row.interests), skills: strings(row.skills), learningGoals: strings(row.learning_goals),
    accountStatus: string(row.account_status, 'active') as UserAccount['accountStatus'], guardianEmail: nullableString(row.guardian_email),
    personalizationConsent: row.personalization_consent === true, returnAnalyticsConsent: row.return_analytics_consent === true,
    learnedInterests: strings(row.learned_interests), experienceLevel: string(row.experience_level, 'not_stated') as UserAccount['experienceLevel'],
    education: string(row.education), availability: string(row.availability), maxPriceInr: row.max_price_inr === null ? null : Number(row.max_price_inr),
    teamStatus: string(row.team_status, 'not_stated') as UserAccount['teamStatus'], quietHoursStart: string(row.quiet_hours_start),
    quietHoursEnd: string(row.quiet_hours_end), createdAt: string(row.created_at),
  };
}

export function profilePatchFromUser(patch: Partial<UserAccount>): Row {
  const allowed: Row = {
    name: patch.name, area_locality_id: patch.areaLocalityId, radius_km: patch.radiusKm,
    interests: patch.interests, skills: patch.skills, learning_goals: patch.learningGoals,
    announcement_opt_out: patch.announcementOptOut, personalization_consent: patch.personalizationConsent,
    return_analytics_consent: patch.returnAnalyticsConsent, learned_interests: patch.learnedInterests,
    experience_level: patch.experienceLevel, education: patch.education, availability: patch.availability,
    max_price_inr: patch.maxPriceInr, team_status: patch.teamStatus,
    quiet_hours_start: patch.quietHoursStart, quiet_hours_end: patch.quietHoursEnd,
  };
  return Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
}

export function cloudRowToRegistration(row: Row): Registration {
  return {
    id: string(row.id), eventId: string(row.event_id), userId: string(row.user_id), kind: string(row.kind) as Registration['kind'],
    status: string(row.status) as Registration['status'], selfDeclaredAgeRuleMet: row.self_declared_age_rule_met === true,
    createdAt: string(row.created_at), updatedAt: string(row.updated_at), checkedInAt: nullableString(row.checked_in_at) ?? undefined,
    checkInToken: nullableString(row.check_in_token) ?? undefined, answers: object(row.answers) as Record<string, string>,
    referralCampaignId: nullableString(row.referral_campaign_id),
  };
}

export function cloudRowToSource(row: Row): SourceRecord {
  return {
    id: string(row.id), name: string(row.name), kind: 'open_web', baseUrl: nullableString(row.base_url),
    permission: string(row.permission, 'review_required') as SourceRecord['permission'],
    approvedMethods: strings(row.approved_methods) as SourceRecord['approvedMethods'], active: row.active === true,
    evidenceUrl: nullableString(row.evidence_url), notes: string(row.notes), lastReviewedAt: null, updatedBy: null,
    updatedAt: string(row.updated_at),
  };
}
