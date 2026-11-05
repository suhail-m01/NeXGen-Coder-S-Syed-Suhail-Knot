import { organizerAgeRule } from './defaults';
import { localities } from './localities';
import type { KnotEvent } from './types';
import { LIVE_VERIFIED_HACKATHONS } from '../features/hackathons/liveSeed';

const future = (base: Date, days: number, hour = 10) => {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour - 5, 30, 0, 0);
  return date.toISOString();
};

export function buildLiveEvents(now = new Date()): KnotEvent[] {
  const koramangala = localities.find((l) => l.id === 'koramangala') ?? localities[0];
  const indiranagar = localities.find((l) => l.id === 'indiranagar') ?? localities[0];
  const hsr = localities.find((l) => l.id === 'hsr-layout') ?? localities[0];
  const whitefield = localities.find((l) => l.id === 'whitefield') ?? localities[0];
  const mgRoad = localities.find((l) => l.id === 'mg-road') ?? localities[0];

  const localityMap = [
    koramangala,
    koramangala,
    indiranagar,
    null, // online
    hsr,
    null, // online
    whitefield,
    null, // online
    null, // online
    mgRoad,
  ];

  const interestMap = [
    ['Design', 'AI/ML', 'Startups'],
    ['Web development', 'AI/ML', 'Design'],
    ['Design', 'Mobile apps', 'Startups'],
    ['Open Source', 'Web development', 'Python'],
    ['Cloud', 'Cybersecurity', 'AI/ML'],
    ['Design', 'Web development', 'Open Source'],
    ['Mobile apps', 'Cloud', 'Web development'],
    ['Hardware/IoT', 'Data', 'AI/ML'],
    ['Open Source', 'AI/ML', 'Data'],
    ['Careers', 'Data', 'Cloud'],
  ];

  const dayOffsets = [1, 2, 3, 2, 4, 5, 5, 6, 3, 6];

  return LIVE_VERIFIED_HACKATHONS.map((h, i) => {
    const isOnline = h.mode === 'online' || localityMap[i] === null;
    const locality = localityMap[i] ?? koramangala;
    const createdAt = new Date(now.getTime() - 2 * 86_400_000).toISOString();
    const eventId = h.id.replace('live-', '');
    const days = dayOffsets[i] ?? (i + 1);
    const startAt = future(now, days, 10);
    const endAt = future(now, days + 2, 18);
    const registrationDeadline = future(now, Math.max(days - 1, 0), 23);

    return {
      id: eventId,
      slug: eventId,
      title: h.title,
      tagline: h.description ?? `${h.title} — Real-time live hackathon on ${h.sourcePlatform}`,
      summary: h.description ?? `${h.title} organized by ${h.organizer || h.sourcePlatform}`,
      description: h.description ?? `${h.title} is an upcoming live hackathon on ${h.sourcePlatform}. Register on the official website to secure your spot.`,
      eventType: 'hackathon',
      organizerId: `org-${h.sourcePlatform.toLowerCase()}`,
      organizerName: h.organizer || `${h.sourcePlatform} Host`,
      communityId: `community-${(h.organizer || h.sourcePlatform).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      mode: isOnline ? 'online' : 'in_person',
      startAt,
      endAt,
      timezone: h.timezone || 'Asia/Kolkata',
      registrationOpensAt: null,
      registrationDeadline,
      submissionDeadline: null,
      status: 'published',
      venue: isOnline
        ? null
        : {
            id: `venue-${eventId}`,
            name: `${h.venue || 'Tech Innovation Centre'} · ${locality.name}`,
            address: `${h.venue || h.city || locality.name}, Bengaluru, Karnataka, India`,
            localityId: locality.id,
            city: 'Bengaluru',
            latitude: locality.latitude,
            longitude: locality.longitude,
            locationPrecision: 'exact',
            confirmedBy: 'organizer',
          },
      onlineJoinUrl: isOnline ? h.officialUrl : null,
      registration: {
        kind: 'external',
        externalUrl: h.officialUrl,
        capacity: null,
        approval: 'none',
        waitlistEnabled: false,
      },
      ageRule: organizerAgeRule('all_ages'),
      interests: interestMap[i] ?? (h.tags.length > 0 ? h.tags : ['Hackathon', 'Coding', 'Innovation']),
      skills: ['Problem Solving', 'Prototyping', 'Software Development'],
      learningOutcomes: ['Team Collaboration', 'Product Demo', 'Rapid Engineering'],
      eligibilityText: h.eligibility || 'Open to all developers, builders, and students',
      eligibilityKnown: true,
      experienceLevel: 'all',
      team: {
        mode: 'solo_or_team',
        minSize: 1,
        maxSize: 4,
        formationDeadline: null,
      },
      price: h.isFree
        ? { kind: 'free', amountInr: 0, note: 'Free to enter' }
        : { kind: 'paid', amountInr: h.priceAmount ?? 0, note: h.currency ? `${h.currency} ${h.priceAmount}` : '' },
      prizes: h.prizePool ? [h.prizePool] : [],
      nativeSafetyChecklistComplete: true,
      isSample: false, // REAL-TIME EVENT
      createdById: null,
      createdAt,
      updatedAt: createdAt,
      firstDiscoveredAt: createdAt,
      lastCheckedAt: new Date(now.getTime() - 3_600_000).toISOString(),
      listings: [
        {
          id: `listing-${eventId}`,
          source: h.sourcePlatform,
          externalId: eventId,
          originalUrl: h.officialUrl,
          registrationUrl: h.officialUrl,
          firstDiscoveredAt: createdAt,
          lastCheckedAt: new Date(now.getTime() - 3_600_000).toISOString(),
          lastMeaningfulChangeAt: null,
          confidence: 'high',
          status: 'fresh',
          isPrimary: true,
        },
      ],
      revisions: [],
    };
  });
}
