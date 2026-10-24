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

export interface RegistrationQuestion {
  id: string;
  label: string;
  kind: 'short_text' | 'long_text' | 'single_choice';
  required: boolean;
  options: string[];
}

export interface RegistrationConfig {
  kind: RegistrationKind;
  externalUrl: string | null;
  capacity: number | null;
  approval: 'none' | 'manual';
  waitlistEnabled: boolean;
  questions?: RegistrationQuestion[];
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

export interface EventFaq {
  id: string;
  question: string;
  answer: string;
  visibility: 'public' | 'participant_only';
}

export interface EventResource {
  id: string;
  title: string;
  url: string;
  kind: 'guide' | 'dataset' | 'api' | 'code_of_conduct' | 'other';
  visibility: 'public' | 'participant_only';
}

export interface EventRound {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  submissionDeadline: string | null;
}

export interface EventSession {
  id: string;
  title: string;
  speaker: string;
  location: string;
  startAt: string;
  endAt: string;
}

export interface EventCollaborator {
  id: string;
  userId: string;
  role: 'co_organizer' | 'volunteer' | 'judge';
  addedAt: string;
}

export interface EventSafetyChecklist {
  safeguardingContact: boolean;
  codeOfConduct: boolean;
  supervisedEnvironment: boolean;
  dataMinimization: boolean;
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
  safetyChecklist?: EventSafetyChecklist;
  visibility?: 'public' | 'unlisted' | 'private';
  seriesId?: string | null;
  accessibilityNotes?: string;
  codeOfConduct?: string;
  faqs?: EventFaq[];
  resources?: EventResource[];
  rounds?: EventRound[];
  sessions?: EventSession[];
  collaborators?: EventCollaborator[];
  recap?: string;
  showcaseEnabled?: boolean;
  isSample: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  firstDiscoveredAt: string;
  lastCheckedAt: string;
  listings: EventListing[];
  revisions: EventRevision[];
}

export interface EventOperationsPatch {
  registrationQuestions?: RegistrationQuestion[];
  safetyChecklist?: EventSafetyChecklist;
  visibility?: 'public' | 'unlisted' | 'private';
  seriesId?: string | null;
  accessibilityNotes?: string;
  codeOfConduct?: string;
  faqs?: EventFaq[];
  resources?: EventResource[];
  rounds?: EventRound[];
  sessions?: EventSession[];
  collaborators?: EventCollaborator[];
  recap?: string;
  showcaseEnabled?: boolean;
  tagline?: string;
  description?: string;
  submissionDeadline?: string | null;
  team?: TeamRule;
  prizes?: string[];
  price?: Price;
  experienceLevel?: KnotEvent['experienceLevel'];
  eligibilityText?: string;
  eligibilityKnown?: boolean;
  interests?: string[];
  skills?: string[];
  learningOutcomes?: string[];
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserRole;
  /** Local adult-workspace bootstrap only; production admin assignment belongs on the server. */
  workspaceAdmin?: boolean;
  /** Opts out of organizer announcements, not critical material-change/safety records. */
  announcementOptOut?: boolean;
  ageBand: AgeBand;
  ageBandConfirmedOn: string;
  guardianConsent: 'not_required' | 'pending' | 'complete' | 'withdrawn';
  areaLocalityId: string | null;
  radiusKm: number;
  interests: string[];
  skills: string[];
  learningGoals: string[];
  accountStatus?: 'active' | 'restricted' | 'closed';
  guardianEmail?: string | null;
  personalizationConsent?: boolean;
  learnedInterests?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'not_stated';
  education?: string;
  availability?: string;
  maxPriceInr?: number | null;
  teamStatus?: 'solo' | 'open_to_team' | 'has_team' | 'not_stated';
  quietHoursStart?: string;
  quietHoursEnd?: string;
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
  /** Random participant pass token; never derived from email, user ID or registration ID. */
  checkInToken?: string;
  /** Private operational answers keyed by event registration-question ID. */
  answers?: Record<string, string>;
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

export type AnnouncementKind = 'general' | 'logistics' | 'deadline' | 'post_event';
export type AnnouncementAudience = 'all_native' | 'confirmed' | 'pending' | 'waitlisted' | 'attended';

export interface Announcement {
  id: string;
  eventId: string;
  authorId: string;
  kind: AnnouncementKind;
  audience: AnnouncementAudience;
  subject: string;
  body: string;
  channel: 'in_app';
  status: 'scheduled' | 'sent';
  scheduledFor?: string | null;
  sentAt?: string | null;
  audienceCount: number;
  recipientCount: number;
  optedOutCount: number;
  createdAt: string;
}

export interface AnnouncementInput {
  kind: AnnouncementKind;
  audience: AnnouncementAudience;
  subject: string;
  body: string;
  scheduledFor?: string | null;
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
  /** Future in-app visibility time for scheduling/quiet hours; not an external delivery claim. */
  deliverAt?: string;
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

export type IngestionMethod = 'native' | 'manual' | 'link_only' | 'api' | 'open_web';
export type SourcePermission = 'owned' | 'sample_only' | 'review_required' | 'approved' | 'blocked';

export interface SourceRecord {
  id: string;
  name: string;
  kind: 'native' | 'community' | 'sample' | 'platform' | 'open_web';
  baseUrl: string | null;
  permission: SourcePermission;
  approvedMethods: IngestionMethod[];
  active: boolean;
  evidenceUrl: string | null;
  notes: string;
  lastReviewedAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SubmissionReview {
  reviewerId: string;
  action: 'approved' | 'rejected' | 'needs_info' | 'merged';
  note: string;
  at: string;
}

export interface Submission {
  id: string;
  submitterId: string;
  inputType: 'text' | 'url';
  rawText: string;
  status: 'draft' | 'pending_review' | 'needs_info' | 'published' | 'merged' | 'rejected';
  draft: ExtractionDraft;
  canonicalEventId: string | null;
  review: SubmissionReview | null;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: EventFilters;
  alertEnabled: boolean;
  lastCheckedAt: string;
  createdAt: string;
}

export interface TopicFollow {
  userId: string;
  topic: string;
  createdAt: string;
}

export interface GoingRecord {
  userId: string;
  eventId: string;
  createdAt: string;
}

export interface AttendeeQuestion {
  id: string;
  eventId: string;
  askerId: string;
  body: string;
  visibility: 'public' | 'participant_only';
  status: 'open' | 'answered' | 'hidden';
  answer: string | null;
  answeredBy: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface ProjectSubmission {
  id: string;
  eventId: string;
  roundId: string | null;
  userId: string;
  title: string;
  description: string;
  repositoryUrl: string;
  videoUrl: string;
  documentUrl: string;
  status: 'submitted' | 'shortlisted' | 'winner' | 'not_selected';
  /** Explicit author opt-in; public showcase additionally excludes minor identities. */
  showcase?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScore {
  id: string;
  submissionId: string;
  judgeId: string;
  innovation: number;
  execution: number;
  impact: number;
  feedback: string;
  createdAt: string;
}

export interface TrustReport {
  id: string;
  reporterId: string | null;
  eventId: string | null;
  targetType: 'event' | 'user' | 'source' | 'listing';
  reason: string;
  details: string;
  priority: 'standard' | 'minor_safety';
  status: 'open' | 'resolved' | 'dismissed';
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface OrganizerClaim {
  id: string;
  eventId: string;
  userId: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewerId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface GuardianConsentRecord {
  id: string;
  userId: string;
  guardianEmail: string;
  status: 'pending' | 'complete' | 'withdrawn';
  method: 'local_guardian_attestation';
  createdAt: string;
  updatedAt: string;
}

export interface ParticipationCertificate {
  id: string;
  eventId: string;
  userId: string;
  verificationCode: string;
  issuedAt: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface EventSeries {
  id: string;
  organizerId: string;
  title: string;
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
  announcements: Announcement[];
  submissions: Submission[];
  sources: SourceRecord[];
  feedback: EventFeedback[];
  teamPosts: TeamPost[];
  teamRequests: TeamRequest[];
  savedSearches: SavedSearch[];
  topicFollows: TopicFollow[];
  going: GoingRecord[];
  questions: AttendeeQuestion[];
  projectSubmissions: ProjectSubmission[];
  projectScores: ProjectScore[];
  reports: TrustReport[];
  claims: OrganizerClaim[];
  consentRecords: GuardianConsentRecord[];
  certificates: ParticipationCertificate[];
  auditRecords: AuditRecord[];
  series: EventSeries[];
}

export interface EventFilters {
  query: string;
  eventType: 'all' | EventType;
  mode: 'all' | EventMode;
  time: 'any' | 'today' | 'tonight' | 'tomorrow' | 'weekend' | 'next7' | 'custom';
  customFrom?: string;
  customTo?: string;
  price?: 'all' | 'free' | 'paid' | 'unknown';
  source?: string;
  team?: 'all' | 'solo' | 'team' | 'solo_or_team' | 'not_stated';
  maxTravelMinutes?: number | null;
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
