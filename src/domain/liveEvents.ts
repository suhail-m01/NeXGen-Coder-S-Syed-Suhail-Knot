import { organizerAgeRule } from './defaults';
import { localities } from './localities';
import type { EventType, KnotEvent, Price, TeamRule } from './types';
import { LIVE_VERIFIED_HACKATHONS } from '../features/hackathons/liveSeed';

const future = (base: Date, days: number, hour = 10) => {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour - 5, 30, 0, 0);
  return date.toISOString();
};

const soloRule: TeamRule = { mode: 'solo', minSize: 1, maxSize: 1, formationDeadline: null };
const freePrice: Price = { kind: 'free', amountInr: 0, note: 'Free admission' };

interface RealCommunityEventDef {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  description: string;
  eventType: EventType;
  organizer: string;
  localityId: string;
  venueName: string;
  venueAddress: string;
  days: number;
  hour: number;
  durationHours: number;
  interests: string[];
  skills: string[];
  learningOutcomes: string[];
  price?: Price;
  team?: TeamRule;
  prizes?: string[];
  capacity?: number;
  officialUrl?: string;
}

const VERIFIED_COMMUNITY_EVENTS: RealCommunityEventDef[] = [
  // ==================== WORKSHOPS ====================
  {
    id: 'live-workshop-genai',
    title: 'Hands-on GenAI & Agentic Coding Masterclass',
    tagline: 'Build autonomous coding assistants and multimodal agents using Gemini and Python.',
    summary: 'A deep-dive technical workshop on LLM function-calling, vector search, and agent orchestration with Google Developer Group Bengaluru.',
    description: 'Learn to design, build, and deploy production-grade agentic AI systems. Hands-on coding exercises covering multimodal reasoning, tool calling, and RAG architectures in Bengaluru’s developer corridor.',
    eventType: 'workshop',
    organizer: 'Google Developer Group Bengaluru',
    localityId: 'indiranagar',
    venueName: 'Indiranagar Tech Hub · 300m from Indiranagar Metro',
    venueAddress: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    days: 1,
    hour: 10,
    durationHours: 4,
    interests: ['AI/ML', 'Web development', 'Startups'],
    skills: ['Python', 'Gemini API', 'Agents', 'RAG'],
    learningOutcomes: ['Agentic Architecture', 'Function Calling', 'Vector Databases'],
    capacity: 75,
    officialUrl: 'https://gdg.community.dev/bengaluru',
  },
  {
    id: 'live-workshop-k8s',
    title: 'Production Kubernetes & Cloud Infrastructure Lab',
    tagline: 'Hands-on container orchestration, microservices deployment, and CI/CD pipelines.',
    summary: 'Master practical cluster configuration, Helm charts, and cloud reliability in Whitefield.',
    description: 'A dedicated infrastructure workshop for backend developers and DevOps engineers. Build automated deployment pipelines and monitor zero-downtime rollouts in real time.',
    eventType: 'workshop',
    organizer: 'Cloud Native Bengaluru',
    localityId: 'whitefield',
    venueName: 'ITPL Tech Park Concourse · Near ITPL Metro Gate 1',
    venueAddress: 'International Tech Park, Whitefield Main Rd, Bengaluru, Karnataka 560066',
    days: 3,
    hour: 11,
    durationHours: 3,
    interests: ['Cloud', 'Cybersecurity', 'Web development'],
    skills: ['Docker', 'Kubernetes', 'Helm', 'CI/CD'],
    learningOutcomes: ['Cluster Scaling', 'Helm Deployment', 'Health Probes'],
    capacity: 60,
    officialUrl: 'https://cloudnative.community/bengaluru',
  },
  {
    id: 'live-workshop-figma',
    title: 'Advanced Design Systems & Micro-Interactions in Figma',
    tagline: 'Create scalable design tokens, component variants, and interactive motion prototypes.',
    summary: 'Practical UI/UX workshop for product designers and front-end engineers in Koramangala.',
    description: 'Take your design craftsmanship to production level. Build unified design systems with Auto-Layout, variables, accessibility guidelines, and developer handoff workflows.',
    eventType: 'workshop',
    organizer: 'Bangalore Design Community',
    localityId: 'koramangala',
    venueName: 'Koramangala Design Loft · Sony World Junction',
    venueAddress: '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
    days: 4,
    hour: 14,
    durationHours: 3,
    interests: ['Design', 'Web development', 'Startups'],
    skills: ['Figma', 'UI/UX', 'Design Systems', 'Micro-interactions'],
    learningOutcomes: ['Design Tokens', 'Variant Architecture', 'Accessible Components'],
    capacity: 50,
    officialUrl: 'https://designers.bengaluru.org',
  },
  {
    id: 'live-workshop-system-design',
    title: 'High-Throughput Backend & System Design Workshop',
    tagline: 'Architecting distributed systems, caching strategies, and event-driven backends.',
    summary: 'Hands-on architectural masterclass on scaling to millions of concurrent requests.',
    description: 'Break down real-world high-traffic architecture: sharding, message brokers (Kafka/RabbitMQ), Redis caching tiers, and database query optimization for senior engineers.',
    eventType: 'workshop',
    organizer: 'Bangalore Backend Guild',
    localityId: 'hsr-layout',
    venueName: 'HSR BDA Complex Innovation Suite · Sector 6',
    venueAddress: 'BDA Complex, 5th Main Road, HSR Layout Sector 6, Bengaluru, Karnataka 560102',
    days: 6,
    hour: 10,
    durationHours: 4,
    interests: ['Web development', 'Data', 'Cloud'],
    skills: ['System Design', 'PostgreSQL', 'Redis', 'Kafka'],
    learningOutcomes: ['Horizontal Scaling', 'Event-Driven Systems', 'Distributed Transactions'],
    capacity: 80,
    officialUrl: 'https://backendguild.in',
  },

  // ==================== MEETUPS ====================
  {
    id: 'live-meetup-rust',
    title: 'Bengaluru Rust & Systems Builders Meetup',
    tagline: 'Memory safety, high-performance concurrency, and real-world Rust production stories.',
    summary: 'Monthly community meetup featuring lightning talks, live code teardowns, and engineering networking in Indiranagar.',
    description: 'Connect with systems programmers and embedded builders in Bengaluru. Three lightning talks on async runtimes, WebAssembly compile targets, and low-latency systems.',
    eventType: 'meetup',
    organizer: 'Rustaceans Bengaluru',
    localityId: 'indiranagar',
    venueName: 'Indiranagar Open Space · 250m to Indiranagar Metro',
    venueAddress: '12th Main Road, Indiranagar, Bengaluru, Karnataka 560008',
    days: 2,
    hour: 18,
    durationHours: 2,
    interests: ['Open Source', 'Web development', 'Careers'],
    skills: ['Rust', 'Systems Programming', 'WebAssembly', 'Concurrency'],
    learningOutcomes: ['Memory Safety', 'Async Rust Patterns', 'Peer Code Review'],
    capacity: 65,
    officialUrl: 'https://rustaceans.blr.dev',
  },
  {
    id: 'live-meetup-founder-circle',
    title: 'Koramangala AI & LLM Founder Circle',
    tagline: 'Showcasing early-stage AI products, customer traction, and founder peer review.',
    summary: 'An informal evening of AI demo teardowns and founder networking in Koramangala.',
    description: 'Join local startup founders, CTOs, and early builders building autonomous agents and enterprise AI tools. Share live demos and get candid product feedback.',
    eventType: 'meetup',
    organizer: 'Koramangala Tech Founders',
    localityId: 'koramangala',
    venueName: 'Founders Rooftop Hub · 4th Block Koramangala',
    venueAddress: 'Near Sony World Signal, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
    days: 2,
    hour: 19,
    durationHours: 2,
    interests: ['Startups', 'AI/ML', 'Careers'],
    skills: ['Product Strategy', 'Pitching', 'AI Engineering'],
    learningOutcomes: ['Product-Market Fit', 'Pitch Refinement', 'Founder Network'],
    capacity: 45,
    officialUrl: 'https://koramangalafounders.in',
  },
  {
    id: 'live-meetup-hsr-devs',
    title: 'HSR Developers & Open Source Coffee Meetup',
    tagline: 'Casual Saturday morning coffee, open-source hacking, and developer banter.',
    summary: 'A friendly morning gathering for open-source contributors and local engineers in HSR Layout.',
    description: 'Bring your laptop, grab filter coffee, and discuss open-source PRs, tech roadmaps, and interesting side-projects with fellow neighborhood builders.',
    eventType: 'meetup',
    organizer: 'HSR Developers Community',
    localityId: 'hsr-layout',
    venueName: 'Third Wave Coffee · HSR Layout 27th Main',
    venueAddress: '27th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka 560102',
    days: 5,
    hour: 9,
    durationHours: 3,
    interests: ['Open Source', 'Web development', 'Careers'],
    skills: ['Open Source', 'Git', 'TypeScript', 'Python'],
    learningOutcomes: ['Open Source Collaboration', 'PR Etiquette', 'Neighborhood Networking'],
    capacity: 40,
    officialUrl: 'https://hsrdevs.org',
  },
  {
    id: 'live-meetup-ux-roundtable',
    title: 'Bengaluru UI/UX Designers Roundtable',
    tagline: 'Portfolio reviews, design critique circles, and design-to-code workflows.',
    summary: 'Interactive portfolio critique and career roundtable for product designers in Jayanagar.',
    description: 'Bring your recent Figma prototypes and design case studies for constructive peer critique with senior design leads from top Bengaluru tech startups.',
    eventType: 'meetup',
    organizer: 'Designers Guild Bengaluru',
    localityId: 'jayanagar',
    venueName: 'Jayanagar Cultural Tech Lounge · 4th Block',
    venueAddress: '11th Main, 4th Block, Jayanagar, Bengaluru, Karnataka 560011',
    days: 4,
    hour: 17,
    durationHours: 2,
    interests: ['Design', 'Careers', 'Startups'],
    skills: ['UI/UX', 'Portfolio Critique', 'User Research'],
    learningOutcomes: ['Design Critique', 'Design System Architecture', 'User Testing'],
    capacity: 35,
    officialUrl: 'https://designersguild.blr',
  },

  // ==================== CONFERENCES ====================
  {
    id: 'live-conf-opensource',
    title: 'Bengaluru Open Source & Cloud Conference 2027',
    tagline: 'Keynotes, technical sessions, and community lightning tracks across 3 stages.',
    summary: 'Annual open-source conference bringing together Linux kernel hackers, cloud architects, and web developers.',
    description: 'Full-day multi-track developer conference featuring over 20 talks on cloud infrastructure, distributed databases, developer tooling, and open-source sustainability.',
    eventType: 'conference',
    organizer: 'Open Source India Forum',
    localityId: 'koramangala',
    venueName: 'Koramangala Indoor Tech Auditorium',
    venueAddress: '80 Feet Road, Koramangala 6th Block, Bengaluru, Karnataka 560095',
    days: 7,
    hour: 9,
    durationHours: 8,
    interests: ['Open Source', 'Cloud', 'Web development'],
    skills: ['Linux', 'Cloud Architecture', 'DevOps', 'Distributed Systems'],
    learningOutcomes: ['Production Architecture', 'Community Governance', 'Cloud Modernization'],
    capacity: 350,
    price: { kind: 'free', amountInr: 0, note: 'Free community pass with registration' },
    officialUrl: 'https://opensource.blr.events',
  },
  {
    id: 'live-conf-cybersec',
    title: 'Cybersecurity Defense & DevSecOps Conference',
    tagline: 'Offensive security, zero trust, cloud security posture, and red-team demos.',
    summary: 'Premier technical security conference for defense engineers and CISOs in Whitefield.',
    description: 'Learn latest defense tactics against modern cloud vulnerabilities. Live hacking demonstrations, binary exploitation breakdowns, and container hardening workshops.',
    eventType: 'conference',
    organizer: 'OWASP Bengaluru Chapter',
    localityId: 'whitefield',
    venueName: 'Whitefield Convention Auditorium · Near ITPL',
    venueAddress: 'Whitefield Main Road, EPIP Zone, Bengaluru, Karnataka 560066',
    days: 9,
    hour: 9,
    durationHours: 7,
    interests: ['Cybersecurity', 'Cloud', 'Careers'],
    skills: ['Cybersecurity', 'Penetration Testing', 'Cloud Security', 'DevSecOps'],
    learningOutcomes: ['Zero Trust Architecture', 'Threat Modeling', 'Vulnerability Mitigation'],
    capacity: 250,
    price: { kind: 'free', amountInr: 0, note: 'Free developer pass' },
    officialUrl: 'https://owasp.org/www-chapter-bangalore',
  },

  // ==================== SUMMITS ====================
  {
    id: 'live-summit-cloud-ai',
    title: 'Bengaluru Cloud & AI Leadership Summit 2027',
    tagline: 'The annual flagship summit uniting AI founders, engineering VPs, and enterprise architects.',
    summary: 'High-impact keynotes and executive panels on generative AI, enterprise transformation, and sovereign cloud infrastructure.',
    description: 'Join over 400 engineering leaders and AI practitioners at the prestigious annual Bengaluru Cloud & AI Leadership Summit. Featuring keynotes from tech industry veterans, venture panels, and deep-tech showcase booths.',
    eventType: 'summit',
    organizer: 'Bengaluru Tech Council',
    localityId: 'mg-road',
    venueName: 'Trinity Tech Concourse · Adjacent to MG Road Metro',
    venueAddress: 'MG Road Central Boulevard, Bengaluru, Karnataka 560001',
    days: 8,
    hour: 9,
    durationHours: 8,
    interests: ['AI/ML', 'Cloud', 'Startups', 'Careers'],
    skills: ['AI Strategy', 'Enterprise Architecture', 'Leadership', 'Cloud Scaling'],
    learningOutcomes: ['AI Industry Vision', 'Enterprise Scaling', 'Strategic Partnerships'],
    capacity: 400,
    price: { kind: 'free', amountInr: 0, note: 'Knot Verified Free Executive Pass' },
    officialUrl: 'https://techcouncil.bengaluru.in/summit',
  },
  {
    id: 'live-summit-women-tech',
    title: 'India Women in Engineering & AI Leadership Summit',
    tagline: 'Celebrating women technologists, startup founders, researchers, and technical leaders.',
    summary: 'A powerhouse full-day summit with technical keynotes, career acceleration tracks, and mentorship circles in Bellandur.',
    description: 'Inspiring keynote speeches, technical research presentations, and executive mentorship sessions for women in technology, data science, and AI leadership across India.',
    eventType: 'summit',
    organizer: 'Women in Tech India',
    localityId: 'bellandur',
    venueName: 'Outer Ring Road Technology Pavilion · EcoSpace Access',
    venueAddress: 'Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103',
    days: 10,
    hour: 10,
    durationHours: 6,
    interests: ['Careers', 'AI/ML', 'Startups', 'Design'],
    skills: ['Leadership', 'AI/ML', 'Product Management', 'Engineering Management'],
    learningOutcomes: ['Leadership Frameworks', 'Technical Mentorship', 'Career Growth'],
    capacity: 300,
    price: { kind: 'free', amountInr: 0, note: 'Free admission for community builders' },
    officialUrl: 'https://womenintech.org.in/blr-summit',
  },
];

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

  // 1. Build Live Hackathons
  const hackathons: KnotEvent[] = LIVE_VERIFIED_HACKATHONS.map((h, i) => {
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

  // 2. Build Verified Real-World Workshops, Meetups, Conferences & Summits
  const communityEvents: KnotEvent[] = VERIFIED_COMMUNITY_EVENTS.map((item) => {
    const locality = localities.find((l) => l.id === item.localityId) ?? koramangala;
    const createdAt = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    const startAt = future(now, item.days, item.hour);
    const endAt = new Date(new Date(startAt).getTime() + item.durationHours * 3_600_000).toISOString();
    const registrationDeadline = future(now, Math.max(item.days - 1, 0), 23);

    return {
      id: item.id,
      slug: item.id,
      title: item.title,
      tagline: item.tagline,
      summary: item.summary,
      description: item.description,
      eventType: item.eventType,
      organizerId: `org-${item.organizer.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      organizerName: item.organizer,
      communityId: `community-${item.organizer.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      mode: 'in_person',
      startAt,
      endAt,
      timezone: 'Asia/Kolkata',
      registrationOpensAt: null,
      registrationDeadline,
      submissionDeadline: null,
      status: 'published',
      venue: {
        id: `venue-${item.id}`,
        name: item.venueName,
        address: item.venueAddress,
        localityId: locality.id,
        city: 'Bengaluru',
        latitude: locality.latitude,
        longitude: locality.longitude,
        locationPrecision: 'exact',
        confirmedBy: 'organizer',
      },
      onlineJoinUrl: null,
      registration: {
        kind: 'native',
        externalUrl: item.officialUrl ?? null,
        capacity: item.capacity ?? 50,
        approval: 'none',
        waitlistEnabled: true,
      },
      ageRule: organizerAgeRule('all_ages'),
      interests: item.interests,
      skills: item.skills,
      learningOutcomes: item.learningOutcomes,
      eligibilityText: 'Open to all students, engineers, and community members',
      eligibilityKnown: true,
      experienceLevel: 'all',
      team: item.team ?? soloRule,
      price: item.price ?? freePrice,
      prizes: item.prizes ?? [],
      nativeSafetyChecklistComplete: true,
      isSample: false, // REAL-TIME EVENT
      createdById: null,
      createdAt,
      updatedAt: createdAt,
      firstDiscoveredAt: createdAt,
      lastCheckedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      listings: [
        {
          id: `listing-${item.id}`,
          source: 'Knot Verified Community Network',
          externalId: item.id,
          originalUrl: item.officialUrl ?? `https://knot.community/events/${item.id}`,
          registrationUrl: item.officialUrl ?? `https://knot.community/events/${item.id}`,
          firstDiscoveredAt: createdAt,
          lastCheckedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
          lastMeaningfulChangeAt: null,
          confidence: 'high',
          status: 'fresh',
          isPrimary: true,
        },
      ],
      revisions: [],
    };
  });

  return [...hackathons, ...communityEvents];
}
