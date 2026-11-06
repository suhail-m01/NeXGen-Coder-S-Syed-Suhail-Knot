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

const STORAGE_KEY = 'knot_commute_squads_v1';
const inMemoryFallback: Record<string, CommuteSquad[]> = {};

function isLocalStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function seedDefaultSquads(eventId: string): CommuteSquad[] {
  return [
    {
      id: `squad-${eventId}-metro-1`,
      eventId,
      pickupHub: 'Indiranagar Metro (Purple Line) · Gate B',
      mode: 'metro_squad',
      departureTime: '8:30 AM',
      targetArrival: '9:15 AM',
      organizerName: 'Rohit K.',
      organizerContact: '+91 98450 12345',
      capacity: 10,
      members: [
        { userId: 'u-commute-1', name: 'Rohit K.', pickupHub: 'Indiranagar Metro (Purple Line) · Gate B', joinedAt: '2026-11-05T10:00:00.000Z' },
        { userId: 'u-commute-2', name: 'Ananya S.', pickupHub: 'Indiranagar Metro (Purple Line) · Gate B', joinedAt: '2026-11-05T11:20:00.000Z' },
        { userId: 'u-commute-3', name: 'Syed M.', pickupHub: 'Indiranagar Metro (Purple Line) · Gate B', joinedAt: '2026-11-05T14:15:00.000Z' },
      ],
      notes: 'Meeting near the automated AFC gates. We take train towards Whitefield/Kengeri together!',
    },
    {
      id: `squad-${eventId}-cab-1`,
      eventId,
      pickupHub: 'Silk Board Junction · Bus Bay Hub',
      mode: 'cab_pool',
      departureTime: '8:45 AM',
      targetArrival: '9:20 AM',
      organizerName: 'Priya Verma',
      organizerContact: '+91 97412 88990',
      capacity: 4,
      members: [
        { userId: 'u-commute-4', name: 'Priya Verma', pickupHub: 'Silk Board Junction · Bus Bay Hub', joinedAt: '2026-11-05T09:30:00.000Z' },
        { userId: 'u-commute-5', name: 'Aditya Rao', pickupHub: 'Silk Board Junction · Bus Bay Hub', joinedAt: '2026-11-05T12:00:00.000Z' },
      ],
      notes: 'Uber XL booked. Splitting 4 ways (~₹85 each). 2 seats remaining!',
    },
    {
      id: `squad-${eventId}-bike-1`,
      eventId,
      pickupHub: 'HSR Layout BDA Complex · Main Entrance',
      mode: 'bike_convoy',
      departureTime: '8:40 AM',
      targetArrival: '9:10 AM',
      organizerName: 'Vikram Joshi',
      organizerContact: '+91 99001 54321',
      capacity: 6,
      members: [
        { userId: 'u-commute-6', name: 'Vikram Joshi', pickupHub: 'HSR Layout BDA Complex · Main Entrance', joinedAt: '2026-11-05T08:15:00.000Z' },
      ],
      notes: 'Morning convoy through ORR. Have an extra helmet if someone needs a pillion ride!',
    },
  ];
}

export function getCommuteSquadsForEvent(eventId: string): CommuteSquad[] {
  if (!isLocalStorageAvailable()) {
    if (!inMemoryFallback[eventId] || inMemoryFallback[eventId].length === 0) {
      inMemoryFallback[eventId] = seedDefaultSquads(eventId);
    }
    return inMemoryFallback[eventId];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all: Record<string, CommuteSquad[]> = raw ? JSON.parse(raw) : {};
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all: Record<string, CommuteSquad[]> = raw ? JSON.parse(raw) : {};
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
