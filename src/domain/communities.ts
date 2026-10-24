import type { KnotEvent } from './types';

export interface CommunityProfile {
  id: string;
  name: string;
  description: string;
  interests: string[];
  localityId: string | null;
  isSample: boolean;
  events: KnotEvent[];
}

export function communitiesFromEvents(events: KnotEvent[]): CommunityProfile[] {
  const groups = new Map<string, KnotEvent[]>();
  events.forEach((event) => groups.set(event.communityId, [...(groups.get(event.communityId) ?? []), event]));
  return Array.from(groups.entries()).map(([id, communityEvents]) => {
    const first = communityEvents[0];
    if (!first) throw new Error('A community requires at least one event.');
    const futureEvents = communityEvents.filter((event) => new Date(event.endAt ?? event.startAt).getTime() >= Date.now());
    const isSample = communityEvents.every((event) => event.isSample);
    return {
      id,
      name: first.organizerName,
      description: `${isSample ? 'Sample community profile' : 'Organizer community'} for people interested in ${Array.from(new Set(communityEvents.flatMap((event) => event.interests))).slice(0, 3).join(', ') || 'local participation'}. ${futureEvents.length} upcoming event${futureEvents.length === 1 ? '' : 's'} in this workspace.`,
      interests: Array.from(new Set(communityEvents.flatMap((event) => event.interests))),
      localityId: communityEvents.find((event) => event.venue?.localityId)?.venue?.localityId ?? null,
      isSample,
      events: communityEvents.sort((a, b) => a.startAt.localeCompare(b.startAt)),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
