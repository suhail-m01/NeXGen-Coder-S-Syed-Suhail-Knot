import { checkAgeBand } from './age';
import { eventSearchScore, queryRelevanceCompare } from './discovery';
import { distanceForEvent } from './geo';
import { localityById } from './localities';
import type { EventFilters, FitResult, KnotEvent, Locality, UserAccount } from './types';

export const eventTypeLabel = (type: KnotEvent['eventType']) => ({
  hackathon: 'Hackathon', workshop: 'Workshop', meetup: 'Meetup', conference: 'Conference',
  summit: 'Summit', competition: 'Competition', webinar: 'Webinar',
  community_session: 'Community session', other: 'Event',
})[type];

export const eventModeLabel = (mode: KnotEvent['mode']) => ({
  in_person: 'In person', online: 'Online', hybrid: 'Hybrid',
})[mode];

export const priceLabel = (event: KnotEvent) => {
  if (event.price.kind === 'free') return 'Free';
  if (event.price.kind === 'paid') return event.price.amountInr ? `₹${event.price.amountInr.toLocaleString('en-IN')}` : 'Paid';
  return 'Price not stated';
};

export const formatEventDate = (iso: string, includeYear = false) => new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}),
  hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
}).format(new Date(iso));

export const formatShortDate = (iso: string) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
}).format(new Date(iso));

export function relativeDay(iso: string, now = new Date()) {
  const start = new Date(iso).getTime();
  const days = Math.ceil((start - now.getTime()) / 86_400_000);
  if (days <= 0) return 'Happening now';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days} days`;
  return formatShortDate(iso);
}

export function isRegistrationOpen(event: KnotEvent, now = new Date()) {
  if (!['published', 'changed'].includes(event.status)) return false;
  const timestamp = now.getTime();
  if (event.registrationOpensAt && new Date(event.registrationOpensAt).getTime() > timestamp) return false;
  if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < timestamp) return false;
  return new Date(event.startAt).getTime() > timestamp;
}

function dateKey(iso: string, timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function shiftDateKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(key: string) {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

export function matchesTime(event: KnotEvent, filter: EventFilters['time'], now = new Date()) {
  if (filter === 'any' || filter === 'custom') return true;
  const timeZone = event.timezone || 'Asia/Kolkata';
  const today = dateKey(now.toISOString(), timeZone);
  const start = dateKey(event.startAt, timeZone);
  const end = dateKey(event.endAt ?? event.startAt, timeZone);
  const overlaps = (key: string) => start <= key && end >= key;
  if (filter === 'today') return overlaps(today);
  if (filter === 'tomorrow') return overlaps(shiftDateKey(today, 1));
  if (filter === 'next7') {
    const upper = shiftDateKey(today, 7);
    return start <= upper && end >= today;
  }
  if (filter === 'tonight') {
    if (!overlaps(today)) return false;
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', hour12: false, timeZone,
    }).format(new Date(event.startAt)));
    return hour >= 17 && hour <= 23;
  }
  const day = dayOfWeek(today);
  const saturdayOffset = day === 0 ? 6 : day === 6 ? 0 : 6 - day;
  const saturday = shiftDateKey(today, saturdayOffset);
  const sunday = shiftDateKey(saturday, 1);
  return (start <= saturday && end >= saturday) || (start <= sunday && end >= sunday);
}

export function eventDistance(event: KnotEvent, origin: Locality | null) {
  return distanceForEvent(event, origin, localityById(event.venue?.localityId));
}

function matchesAgeFilter(event: KnotEvent, filter: EventFilters['ageRule']) {
  if (filter === 'all') return true;
  const rule = event.ageRule;
  if (filter === 'not_stated') return rule.mode === 'not_stated';
  if (filter === 'all_ages') return rule.mode === 'all_ages';
  if (filter === 'under_18') return rule.mode === 'under_18_only' || (rule.mode === 'age_range' && (rule.maxAge ?? 18) < 18);
  const minimum = filter === '13_plus' ? 13 : filter === '16_plus' ? 16 : 18;
  if (rule.mode === 'adults_only') return minimum === 18;
  if (rule.mode === 'min_age') return rule.minAge === minimum;
  if (rule.mode === 'age_range') return rule.minAge === minimum;
  return false;
}

export function filterEvents(events: KnotEvent[], filters: EventFilters, now = new Date()) {
  const origin = localityById(filters.localityId);
  const query = filters.query.trim().toLowerCase();
  return events.filter((event) => {
    if (!['published', 'changed', 'stale'].includes(event.status)) return false;
    if ((event.visibility ?? 'public') !== 'public') return false;
    if (new Date(event.endAt ?? event.startAt).getTime() < now.getTime()) return false;
    if (query && eventSearchScore(event, query) === 0) return false;
    if (filters.eventType !== 'all' && event.eventType !== filters.eventType) return false;
    if (filters.mode !== 'all' && event.mode !== filters.mode) return false;
    if (filters.time === 'custom') {
      const start = dateKey(event.startAt, event.timezone || 'Asia/Kolkata');
      const end = dateKey(event.endAt ?? event.startAt, event.timezone || 'Asia/Kolkata');
      if (filters.customFrom && end < filters.customFrom) return false;
      if (filters.customTo && start > filters.customTo) return false;
    } else if (!matchesTime(event, filters.time, now)) return false;
    if (filters.price && filters.price !== 'all' && event.price.kind !== filters.price) return false;
    if (filters.source && !event.listings.some((listing) => listing.source === filters.source)) return false;
    if (filters.team && filters.team !== 'all' && event.team.mode !== filters.team) return false;
    if (filters.maxTravelMinutes && event.mode !== 'online') {
      const distance = eventDistance(event, origin);
      if (distance === null || Math.round((distance / 25) * 60 + 10) > filters.maxTravelMinutes) return false;
    }
    if (filters.interest && !event.interests.includes(filters.interest)) return false;
    if (filters.skill && !event.skills.includes(filters.skill)) return false;
    if (!matchesAgeFilter(event, filters.ageRule)) return false;
    if (filters.onlyJoinable && (!filters.ageBand || checkAgeBand(filters.ageBand, event.ageRule) === 'cannot_join')) return false;
    if (event.mode !== 'online' && origin) {
      const distance = eventDistance(event, origin);
      // Unknown coordinates are not treated as being inside a radius.
      if (distance === null || distance > filters.radiusKm) return false;
    }
    return true;
  });
}

export function participationFit(user: UserAccount | null, event: KnotEvent, origin: Locality | null): FitResult {
  if (!user) return { label: null, reasons: [] };
  const reasons: string[] = [];
  const ageResult = checkAgeBand(user.ageBand, event.ageRule);
  if (ageResult === 'cannot_join') {
    return { label: 'not_eligible', reasons: [`The event age rule does not include your self-declared age band.`] };
  }
  const interestMatch = event.interests.find((interest) => user.interests.includes(interest));
  const learnedMatch = user.personalizationConsent === true && user.ageBand === '18_plus'
    ? event.interests.find((interest) => user.learnedInterests?.includes(interest)) : undefined;
  const skillMatch = event.skills.find((skill) => user.skills.includes(skill));
  const learningMatch = event.learningOutcomes.find((skill) => user.learningGoals.includes(skill));
  if (interestMatch) reasons.push(`Matches your interest in ${interestMatch}`);
  if (learnedMatch && learnedMatch !== interestMatch) reasons.push(`Matches ${learnedMatch}, learned from your consented adult activity`);
  if (skillMatch) reasons.push(`Matches your ${skillMatch} skill`);
  if (learningMatch) reasons.push(`Matches your goal to learn ${learningMatch}`);
  const distance = eventDistance(event, origin);
  if (distance !== null) reasons.push(`About ${distance.toFixed(1)} km from your area`);
  if (event.mode === 'online') reasons.push('Online — no travel needed');
  if (!event.eligibilityKnown) reasons.push("We can't check all eligibility because the event does not state it");
  if (ageResult === 'check_rule') reasons.push('Check the event age rule before joining');
  if (event.team.mode === 'team' || event.team.mode === 'solo_or_team') reasons.push(event.team.maxSize ? `Teams up to ${event.team.maxSize} people` : 'Team participation is supported');

  const hasMatch = Boolean(interestMatch || learnedMatch || skillMatch || learningMatch);
  const locationCheckable = event.mode === 'online' || distance !== null;
  const canBeStrong = hasMatch && event.eligibilityKnown && ageResult === 'can_join' && locationCheckable && isRegistrationOpen(event);
  if (canBeStrong) return { label: 'strong', reasons };
  if (!hasMatch && reasons.length === 0) return { label: null, reasons: [] };
  return { label: 'possible', reasons: reasons.length ? reasons : ['Some event details still need to be checked'] };
}

export function sortEvents(events: KnotEvent[], filters: EventFilters, user: UserAccount | null) {
  const origin = localityById(filters.localityId);
  const fitWeight = { strong: 3, possible: 2, not_eligible: 0, null: 1 } as const;
  return [...events].sort((a, b) => {
    if (filters.sort === 'relevance') {
      const difference = queryRelevanceCompare(a, b, filters);
      if (difference) return difference;
    }
    if (filters.sort === 'best_fit') {
      const difference = fitWeight[participationFit(user, b, origin).label ?? 'null'] - fitWeight[participationFit(user, a, origin).label ?? 'null'];
      if (difference) return difference;
    }
    if (filters.sort === 'newest') return new Date(b.firstDiscoveredAt).getTime() - new Date(a.firstDiscoveredAt).getTime();
    if (filters.sort === 'closing') {
      const aTime = a.registrationDeadline ? new Date(a.registrationDeadline).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.registrationDeadline ? new Date(b.registrationDeadline).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    }
    if (filters.sort === 'nearest') {
      const aDistance = eventDistance(a, origin) ?? Number.POSITIVE_INFINITY;
      const bDistance = eventDistance(b, origin) ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    }
    const startDifference = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    if (startDifference) return startDifference;
    return (eventDistance(a, origin) ?? Number.POSITIVE_INFINITY) - (eventDistance(b, origin) ?? Number.POSITIVE_INFINITY);
  });
}

export function eventToICS(event: KnotEvent) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const location = event.mode === 'online' ? 'Online' : `${event.venue?.name ?? ''}, ${event.venue?.address ?? ''}`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Knot//Event Plan//EN', 'BEGIN:VEVENT',
    `UID:${event.id}@knot.local`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startAt)}`, `DTEND:${stamp(event.endAt ?? new Date(new Date(event.startAt).getTime() + 3600000).toISOString())}`,
    `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.summary)}`, `LOCATION:${escape(location)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
