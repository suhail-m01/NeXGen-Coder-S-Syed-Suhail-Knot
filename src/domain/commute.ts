import type { CommuteMode, CommuteSquad, CommuteSquadMember } from './types';

export const COMMUTE_TRANSIT_HUBS = [
  'Indiranagar Metro (Purple Line) · Gate B',
  'Silk Board Junction · Bus Bay Hub',
  'HSR Layout BDA Complex · Main Entrance',
  'MG Road Metro Station · Trinity Concourse',
  'Kengeri Bus Terminal / Metro Station',
  'Baiyappanahalli Metro Interchange',
  'Jayadeva Metro / BTM Udupi Garden',
  'Whitefield ITPL Metro Station · Gate 1',
  'Koramangala Sony World Junction',
  'Hebbal Flyover / Manyata Tech Park Hub',
] as const;

export const COMMUTE_MODE_CONFIG: Record<CommuteMode, { label: string; icon: string; defaultCapacity: number; description: string }> = {
  metro_squad: {
    label: 'Metro Squad',
    icon: '🚇',
    defaultCapacity: 10,
    description: 'Assemble at the ticket counter / platform gate and take the Namma Metro together.',
  },
  cab_pool: {
    label: 'Cab / Auto Pool',
    icon: '🚗',
    defaultCapacity: 4,
    description: 'Split an Uber XL or Ola Prime from the transit anchor directly to the venue.',
  },
  bike_convoy: {
    label: 'Two-Wheeler Convoy',
    icon: '🏍️',
    defaultCapacity: 6,
    description: 'Ride together in a convoy or offer pillion seats to fellow attendees.',
  },
};

const STORAGE_KEY = 'knot_commute_squads_v2';
const LEGACY_STORAGE_KEY = 'knot_commute_squads_v1';
const inMemoryFallback: Record<string, CommuteSquad[]> = {};

function isLocalStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function seedDefaultSquads(eventId: string): CommuteSquad[] {
  const sampleMember = (id: string, name: string, pickupHub: string): CommuteSquadMember => ({
    userId: id,
    name,
    pickupHub,
    joinedAt: '2026-11-06T00:00:00.000Z',
  });
  return [
    {
      id: `squad-${eventId}-metro-1`,
      eventId,
      pickupHub: 'Indiranagar Metro (Purple Line) · Gate B',
      mode: 'metro_squad',
      departureTime: '8:30 AM',
      targetArrival: '9:15 AM',
      organizerName: 'Sample host',
      organizerContact: '',
      capacity: 10,
      members: [
        sampleMember('sample-commute-1', 'Sample host', 'Indiranagar Metro (Purple Line) · Gate B'),
        sampleMember('sample-commute-2', 'Sample member 1', 'Indiranagar Metro (Purple Line) · Gate B'),
      ],
      notes: 'Fictional local planning example; no live group or booking exists.',
      isSample: true,
    },
    {
      id: `squad-${eventId}-cab-1`,
      eventId,
      pickupHub: 'Silk Board Junction · Bus Bay Hub',
      mode: 'cab_pool',
      departureTime: '8:45 AM',
      targetArrival: '9:20 AM',
      organizerName: 'Sample host',
      organizerContact: '',
      capacity: 4,
      members: [sampleMember('sample-commute-3', 'Sample host', 'Silk Board Junction · Bus Bay Hub')],
      notes: 'Fictional cab-pool example; no fare, booking, or seat reservation exists.',
      isSample: true,
    },
    {
      id: `squad-${eventId}-bike-1`,
      eventId,
      pickupHub: 'HSR Layout BDA Complex · Main Entrance',
      mode: 'bike_convoy',
      departureTime: '8:40 AM',
      targetArrival: '9:10 AM',
      organizerName: 'Sample host',
      organizerContact: '',
      capacity: 6,
      members: [sampleMember('sample-commute-4', 'Sample host', 'HSR Layout BDA Complex · Main Entrance')],
      notes: 'Fictional planning example. Arrange helmets and lawful transport independently.',
      isSample: true,
    },
  ];
}

function readStoredSquads(): Record<string, CommuteSquad[]> {
  if (!isLocalStorageAvailable()) return inMemoryFallback;
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return JSON.parse(current) as Record<string, CommuteSquad[]>;
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return {};
    const parsed = JSON.parse(legacy) as Record<string, CommuteSquad[]>;
    // Drop the old fictional named/contact-bearing seed squads. Custom local
    // plans used different member IDs and are retained during the v2 upgrade.
    return Object.fromEntries(Object.entries(parsed).map(([eventId, squads]) => [
      eventId,
      squads.filter((squad) => !squad.members.some((member) => member.userId.startsWith('u-commute-'))),
    ]));
  } catch {
    return {};
  }
}

export function getCommuteSquadsForEvent(eventId: string): CommuteSquad[] {
  if (!isLocalStorageAvailable()) {
    if (!inMemoryFallback[eventId] || inMemoryFallback[eventId].length === 0) {
      inMemoryFallback[eventId] = seedDefaultSquads(eventId);
    }
    return inMemoryFallback[eventId];
  }

  try {
    const all = readStoredSquads();
    if (!all[eventId] || all[eventId].length === 0) {
      all[eventId] = seedDefaultSquads(eventId);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    return all[eventId];
  } catch {
    return seedDefaultSquads(eventId);
  }
}

export function saveCommuteSquadsForEvent(eventId: string, squads: CommuteSquad[]): void {
  if (!isLocalStorageAvailable()) {
    inMemoryFallback[eventId] = squads;
    return;
  }

  try {
    const all = readStoredSquads();
    all[eventId] = squads;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    inMemoryFallback[eventId] = squads;
  }
}

export function joinSquad(eventId: string, squadId: string, member: CommuteSquadMember): CommuteSquad[] {
  const current = getCommuteSquadsForEvent(eventId);
  const updated = current.map((s) => {
    if (s.id !== squadId) return s;
    if (s.members.some((m) => m.userId === member.userId)) return s;
    if (s.members.length >= s.capacity) return s;
    return {
      ...s,
      members: [...s.members, member],
    };
  });
  saveCommuteSquadsForEvent(eventId, updated);
  return updated;
}

export function leaveSquad(eventId: string, squadId: string, userId: string): CommuteSquad[] {
  const current = getCommuteSquadsForEvent(eventId);
  const updated = current.map((s) => {
    if (s.id !== squadId) return s;
    return {
      ...s,
      members: s.members.filter((m) => m.userId !== userId),
    };
  });
  saveCommuteSquadsForEvent(eventId, updated);
  return updated;
}

export function addSquad(eventId: string, squad: CommuteSquad): CommuteSquad[] {
  const current = getCommuteSquadsForEvent(eventId);
  const updated = [squad, ...current];
  saveCommuteSquadsForEvent(eventId, updated);
  return updated;
}
