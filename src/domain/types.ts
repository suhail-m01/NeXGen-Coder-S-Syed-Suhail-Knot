export type AgeBand = 'under_13' | '13_15' | '16_17' | '18_plus';
export type AgeRuleMode = 'all_ages' | 'min_age' | 'age_range' | 'adults_only' | 'under_18_only' | 'not_stated';
export type AgeRuleSource = 'organizer_set' | 'extracted_from_source' | 'team_set' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low' | 'missing';
export type EventType = 'hackathon' | 'workshop' | 'meetup' | 'conference' | 'summit' | 'competition' | 'webinar' | 'community_session' | 'other';
export type EventMode = 'in_person' | 'online' | 'hybrid';
export type LocationPrecision = 'exact' | 'approximate' | 'locality' | 'city' | 'none';
export type EventStatus = 'draft' | 'pending_review' | 'published' | 'changed' | 'stale' | 'cancelled' | 'ended' | 'archived';
export type RegistrationKind = 'external' | 'native';
export type UserRole = 'participant' | 'organizer' | 'admin';

export interface AgeRule {
  mode: AgeRuleMode;
  minAge: number | null;
  maxAge: number | null;
  guardianConsentRequired: 'yes' | 'no' | 'not_stated';
  guardianPresentRequired: 'yes' | 'no' | 'not_stated';
  ruleText: string;
  source: AgeRuleSource;
  confidence: Confidence;
}

export interface Locality {
  id: string;
  name: string;
  aliases: string[];
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  geocode: {
    source: string;
    osmPlaceId: number;
    displayName: string;
    resultType: string;
    boundingBox: number[];
    geocodedAt: string;
  };
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  localityId: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: LocationPrecision;
  confirmedBy: 'organizer' | 'geocoder' | 'knot_team' | 'unknown';
}

export interface EventListing {
  id: string;
  source: string;
  externalId: string | null;
  originalUrl: string;
  registrationUrl: string | null;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
  lastMeaningfulChangeAt: string | null;
  confidence: Confidence;
  status: 'fresh' | 'stale' | 'cancelled';
  isPrimary: boolean;
}

export interface EventRevision {
  id: string;
  at: string;
  changedBy: string;
  fields: string[];
  summary: string;
}

export interface RegistrationConfig {
  kind: RegistrationKind;
  externalUrl: string | null;
  capacity: number | null;
  approval: 'none' | 'manual';
}

export interface TeamRule {
  mode: 'not_stated' | 'solo' | 'team' | 'solo_or_team';
  minSize: number | null;
  maxSize: number | null;
  formationDeadline: string | null;
}

export interface Price {
  kind: 'free' | 'paid' | 'unknown';
  amountInr: number | null;
  note: string;
}

export interface KnotEvent {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  description: string;
  eventType: EventType;
  organizerId: string;
  organizerName: string;
  communityId: string;
  mode: EventMode;
  startAt: string;
  endAt: string | null;
  timezone: string;
  registrationOpensAt: string | null;
  registrationDeadline: string | null;
  submissionDeadline: string | null;
  status: EventStatus;
  venue: Venue | null;
  onlineJoinUrl: string | null;
  registration: RegistrationConfig;
  ageRule: AgeRule;
  interests: string[];
  skills: string[];
  learningOutcomes: string[];
  eligibilityText: string;
  eligibilityKnown: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'all' | 'not_stated';
  team: TeamRule;
  price: Price;
  prizes: string[];
  nativeSafetyChecklistComplete: boolean;
  isSample: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
  listings: EventListing[];
  revisions: EventRevision[];
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserRole;
  ageBand: AgeBand;
  ageBandConfirmedOn: string;
  guardianConsent: 'not_required' | 'pending' | 'complete' | 'withdrawn';
  areaLocalityId: string | null;
  radiusKm: number;
  interests: string[];
  skills: string[];
  learningGoals: string[];
  createdAt: string;
}

export interface Session {
  userId: string;
  createdAt: string;
}

export type RegistrationStatus = 'opened_externally' | 'self_confirmed_registered' | 'registered' | 'pending' | 'approved' | 'waitlisted' | 'rejected' | 'cancelled' | 'checked_in' | 'attended';

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  kind: RegistrationKind;
  status: RegistrationStatus;
  selfDeclaredAgeRuleMet: boolean;
  createdAt: string;
  updatedAt: string;
  checkedInAt?: string;
}

export interface SavedEvent {
  userId: string;
  eventId: string;
  createdAt: string;
}

export interface Follow {
  userId: string;
  communityId: string;
  createdAt: string;
}

export interface KnotNotification {
  id: string;
  userId: string;
  eventId: string | null;
  type: 'material_change' | 'deadline' | 'event' | 'system';
  title: string;
  body: string;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
}

export interface TeamPost {
  id: string;
  eventId: string;
  communityId: string;
  ownerId: string;
  displayName: string;
  role: string;
  skills: string[];
  lookingFor: string;
  note: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface TeamRequest {
  id: string;
  postId: string;
  requesterId: string;
  displayName: string;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface EventFeedback {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  attendanceBasis: 'organizer_checked_in' | 'registered_not_verified';
  createdAt: string;
}

export interface ExtractedField<T> {
  value: T;
  confidence: Confidence;
  evidence: string;
}

export interface ExtractionDraft {
  title: ExtractedField<string | null>;
  eventType: ExtractedField<EventType | null>;
  organizer: ExtractedField<string | null>;
  startDatetime: ExtractedField<string | null>;
  endDatetime: ExtractedField<string | null>;
  registrationDeadline: ExtractedField<string | null>;
  mode: ExtractedField<EventMode | null>;
  venueName: ExtractedField<string | null>;
  addressOrLocality: ExtractedField<string | null>;
  city: ExtractedField<string | null>;
  registrationUrl: ExtractedField<string | null>;
  price: ExtractedField<Price>;
  eligibilityText: ExtractedField<string | null>;
  ageRule: ExtractedField<AgeRule>;
  skills: ExtractedField<string[]>;
  teamSize: ExtractedField<{ min: number | null; max: number | null }>;
  summary: ExtractedField<string>;
}

export interface Submission {
  id: string;
  submitterId: string;
  inputType: 'text' | 'url';
  rawText: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  draft: ExtractionDraft;
  canonicalEventId: string | null;
  createdAt: string;
}

export interface AppData {
  version: number;
  events: KnotEvent[];
  users: UserAccount[];
  session: Session | null;
  registrations: Registration[];
  saves: SavedEvent[];
  follows: Follow[];
  notifications: KnotNotification[];
  submissions: Submission[];
  feedback: EventFeedback[];
  teamPosts: TeamPost[];
  teamRequests: TeamRequest[];
}

export interface EventFilters {
  query: string;
  eventType: 'all' | EventType;
  mode: 'all' | EventMode;
  time: 'any' | 'today' | 'tonight' | 'tomorrow' | 'weekend' | 'next7';
  localityId: string | null;
  radiusKm: number;
  interest: string;
  skill: string;
  ageRule: 'all' | 'all_ages' | '13_plus' | '16_plus' | '18_plus' | 'under_18' | 'not_stated';
  onlyJoinable: boolean;
  ageBand: AgeBand | null;
  sort: 'soonest' | 'best_fit' | 'closing' | 'nearest' | 'newest';
}

export type FitLabel = 'strong' | 'possible' | 'not_eligible' | null;

export interface FitResult {
  label: FitLabel;
  reasons: string[];
}

export type ParticipationDecision = 'auth_required' | 'can_join' | 'cannot_join' | 'check_rule' | 'needs_consent' | 'not_open_yet' | 'closed';
