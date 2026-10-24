import { organizerAgeRule } from './defaults';
import { localities } from './localities';
import type { AgeRule, EventMode, EventType, KnotEvent, Price, RegistrationConfig, TeamRule } from './types';

const future = (now: Date, days: number, hour = 10) => {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour - 5, 30, 0, 0);
  return date.toISOString();
};

const solo: TeamRule = { mode: 'solo', minSize: 1, maxSize: 1, formationDeadline: null };
const team = (min: number, max: number): TeamRule => ({ mode: 'team', minSize: min, maxSize: max, formationDeadline: null });
const free: Price = { kind: 'free', amountInr: 0, note: 'Sample event marked free' };
const unknownPrice: Price = { kind: 'unknown', amountInr: null, note: '' };

type SampleInput = {
  id: string;
  title: string;
  type: EventType;
  mode?: EventMode;
  locality?: string;
  days: number;
  hour?: number;
  durationHours?: number;
  deadlineDays?: number | null;
  organizer: string;
  interests: string[];
  skills: string[];
  ageRule?: AgeRule;
  registration?: RegistrationConfig;
  price?: Price;
  team?: TeamRule;
  eligibilityKnown?: boolean;
  eligibility?: string;
  summary: string;
  prizes?: string[];
  learningOutcomes?: string[];
};

function makeSample(now: Date, input: SampleInput): KnotEvent {
  const locality = localities.find((item) => item.id === (input.locality ?? 'koramangala')) ?? localities[0];
  const online = input.mode === 'online';
  const startAt = future(now, input.days, input.hour ?? 10);
  const endAt = new Date(new Date(startAt).getTime() + (input.durationHours ?? 3) * 3_600_000).toISOString();
  const createdAt = new Date(now.getTime() - 5 * 86_400_000).toISOString();
  const registration = input.registration ?? {
    kind: 'external',
    externalUrl: `https://example.com/register/${input.id}`,
    capacity: null,
    approval: 'none',
    waitlistEnabled: false,
  } satisfies RegistrationConfig;
  const source = registration.kind === 'native' ? 'Knot sample native listing' : 'Sample external catalog';
  const originalUrl = `https://example.com/events/${input.id}`;
  return {
    id: input.id,
    slug: input.id,
    title: input.title,
    tagline: input.summary,
    summary: input.summary,
    description: `${input.summary} This is clearly labelled sample data used to exercise the product experience. Replace it with approved source or organizer data for production use.`,
    eventType: input.type,
    organizerId: `org-${input.id}`,
    organizerName: input.organizer,
    communityId: `community-${input.organizer.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    mode: input.mode ?? 'in_person',
    startAt,
    endAt,
    timezone: 'Asia/Kolkata',
    registrationOpensAt: null,
    registrationDeadline: input.deadlineDays === null ? null : future(now, input.deadlineDays ?? Math.max(0, input.days - 1), 22),
    submissionDeadline: null,
    status: 'published',
    venue: online ? null : {
      id: `venue-${input.id}`,
      name: `Sample venue · ${locality.name}`,
      address: `Sample address in ${locality.name}, Bengaluru`,
      localityId: locality.id,
      city: 'Bengaluru',
      latitude: locality.latitude,
      longitude: locality.longitude,
      locationPrecision: 'locality',
      confirmedBy: 'unknown',
    },
    onlineJoinUrl: null,
    registration,
    ageRule: input.ageRule ?? organizerAgeRule('all_ages'),
    interests: input.interests,
    skills: input.skills,
    learningOutcomes: input.learningOutcomes ?? input.skills,
    eligibilityText: input.eligibility ?? (input.eligibilityKnown === false ? '' : 'Sample eligibility stated for this event'),
    eligibilityKnown: input.eligibilityKnown ?? true,
    experienceLevel: 'all',
    team: input.team ?? solo,
    price: input.price ?? free,
    prizes: input.prizes ?? [],
    nativeSafetyChecklistComplete: false,
    isSample: true,
    createdById: null,
    createdAt,
    updatedAt: createdAt,
    firstDiscoveredAt: createdAt,
    lastCheckedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
    listings: [{
      id: `listing-${input.id}`,
      source,
      externalId: input.id,
      originalUrl,
      registrationUrl: registration.externalUrl,
      firstDiscoveredAt: createdAt,
      lastCheckedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      lastMeaningfulChangeAt: null,
      confidence: 'high',
      status: 'fresh',
      isPrimary: true,
    }],
    revisions: [],
  };
}

export function buildSampleEvents(now = new Date()): KnotEvent[] {
  return [
    makeSample(now, {
      id: 'sample-ai-builders', title: 'Bengaluru AI Builders Hackathon', type: 'hackathon', days: 5,
      deadlineDays: 2, organizer: 'Sample AI Collective', interests: ['AI/ML', 'Startups'], skills: ['Python', 'React'],
      ageRule: organizerAgeRule('adults_only'), team: team(2, 4), prizes: ['Sample cash track', 'Sample mentor sessions'],
      summary: 'A weekend build sprint for AI prototypes, product thinking and demo-ready teams.',
    }),
    makeSample(now, {
      id: 'sample-design-systems', title: 'Design Systems for Everyone', type: 'workshop', locality: 'indiranagar', days: 2,
      deadlineDays: 1, organizer: 'Sample Design Community', interests: ['Design', 'Web development'], skills: ['Design', 'Figma'],
      registration: { kind: 'native', externalUrl: null, capacity: 60, approval: 'none', waitlistEnabled: true },
      summary: 'A beginner-friendly, hands-on introduction to reusable components and accessible UI systems.',
    }),
    makeSample(now, {
      id: 'sample-founders-coffee', title: 'Founders & Coffee Meetup', type: 'meetup', locality: 'hsr-layout', days: 1, hour: 18,
      deadlineDays: 0, organizer: 'Sample Startup Circle', interests: ['Startups', 'Careers'], skills: [],
      ageRule: organizerAgeRule('adults_only'), registration: { kind: 'native', externalUrl: null, capacity: 40, approval: 'none', waitlistEnabled: true },
      summary: 'An informal evening for founders, operators and curious builders to exchange practical lessons.',
    }),
    makeSample(now, {
      id: 'sample-open-source', title: 'Open Source Contribution Sprint', type: 'community_session', mode: 'online', days: 3,
      deadlineDays: 2, organizer: 'Sample Open Source Network', interests: ['Open Source', 'Web development'], skills: ['Open Source', 'React'],
      ageRule: organizerAgeRule('min_age', 13), summary: 'A guided online sprint to find an issue, make a useful contribution and learn review etiquette.',
    }),
    makeSample(now, {
      id: 'sample-cyber-conference', title: 'Cybersecurity Career Conference', type: 'conference', locality: 'whitefield', days: 8,
      deadlineDays: 6, organizer: 'Sample Security Forum', interests: ['Cybersecurity', 'Careers'], skills: ['Cybersecurity', 'Cloud'],
      ageRule: organizerAgeRule('adults_only'), price: { kind: 'paid', amountInr: 499, note: 'Sample registration fee' },
      summary: 'Practical sessions on security careers, cloud defence and the skills behind modern security teams.',
    }),
    makeSample(now, {
      id: 'sample-hardware-jam', title: 'Weekend Hardware Jam', type: 'workshop', locality: 'electronic-city', days: 6,
      deadlineDays: 4, organizer: 'Sample Hardware Lab', interests: ['Hardware/IoT', 'Design'], skills: ['Hardware/IoT'],
      ageRule: organizerAgeRule('age_range', 13, 17), team: team(2, 3), summary: 'A supervised sample youth build session for learning sensors, circuits and collaborative prototyping.',
    }),
    makeSample(now, {
      id: 'sample-cloud-summit', title: 'Women in Cloud Summit', type: 'summit', mode: 'online', days: 10,
      deadlineDays: 7, organizer: 'Sample Cloud Community', interests: ['Cloud', 'Careers'], skills: ['Cloud', 'Data'],
      summary: 'An online summit featuring engineering journeys, architecture discussions and community mentoring.',
    }),
    makeSample(now, {
      id: 'sample-data-storytelling', title: 'Data Storytelling Workshop', type: 'workshop', locality: 'jayanagar', days: 4,
      deadlineDays: 2, organizer: 'Sample Data Society', interests: ['Data', 'Design'], skills: ['Data', 'Python'],
      registration: { kind: 'native', externalUrl: null, capacity: 45, approval: 'none', waitlistEnabled: true },
      summary: 'Learn to turn analysis into a clear narrative with purposeful charts and a concise presentation.',
    }),
    makeSample(now, {
      id: 'sample-product-evening', title: 'Product & No-Code Community Evening', type: 'meetup', locality: 'mg-road', days: 0, hour: 18,
      deadlineDays: 0, organizer: 'Sample Product Club', interests: ['Startups', 'Design'], skills: ['Design'],
      ageRule: organizerAgeRule('adults_only'), registration: { kind: 'native', externalUrl: null, capacity: 50, approval: 'none', waitlistEnabled: true },
      summary: 'A local evening of product demos, no-code experiments and thoughtful feedback from fellow builders.',
    }),
    makeSample(now, {
      id: 'sample-robotics', title: 'Student Robotics Challenge', type: 'competition', locality: 'malleshwaram', days: 12,
      deadlineDays: 8, organizer: 'Sample Robotics League', interests: ['Hardware/IoT', 'AI/ML'], skills: ['Hardware/IoT', 'Python'],
      ageRule: organizerAgeRule('age_range', 13, 17), team: team(2, 5), prizes: ['Sample finalist certificates'],
      summary: 'A sample youth robotics challenge with team problem-solving and a final demonstration round.',
    }),
    makeSample(now, {
      id: 'sample-startup-legal', title: 'Startup Legal Basics Webinar', type: 'webinar', mode: 'online', days: 7,
      deadlineDays: 5, organizer: 'Sample Founder School', interests: ['Startups', 'Careers'], skills: [],
      ageRule: organizerAgeRule('adults_only'), registration: { kind: 'native', externalUrl: null, capacity: null, approval: 'none', waitlistEnabled: false },
      summary: 'A plain-language introduction to founder agreements, intellectual property and early compliance.',
    }),
    makeSample(now, {
      id: 'sample-research-circle', title: 'Applied Research Reading Circle', type: 'community_session', locality: 'btm-layout', days: 9,
      deadlineDays: null, organizer: 'Sample Research Circle', interests: ['AI/ML', 'Data'], skills: ['Python'],
      eligibilityKnown: false, price: unknownPrice, summary: 'A small reading circle for discussing applied research papers and their practical limitations.',
    }),
  ];
}
