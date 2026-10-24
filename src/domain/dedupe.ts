import type { EventListing, KnotEvent } from './types';

export const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, '');
  }
};

export const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function duplicateCandidates(event: KnotEvent, events: KnotEvent[]) {
  return events.filter((candidate) => {
    if (candidate.id === event.id) return false;
    const sameSourceId = event.listings.some((listing) => candidate.listings.some((other) =>
      listing.source === other.source && listing.externalId && listing.externalId === other.externalId));
    if (sameSourceId) return true;
    const sameUrl = event.listings.some((listing) => candidate.listings.some((other) =>
      normalizeUrl(listing.originalUrl) === normalizeUrl(other.originalUrl)));
    if (sameUrl) return true;
    const sameDay = candidate.startAt.slice(0, 10) === event.startAt.slice(0, 10);
    const sameCity = (candidate.venue?.city ?? 'Online') === (event.venue?.city ?? 'Online');
    return sameDay && sameCity && normalizeTitle(candidate.title) === normalizeTitle(event.title);
  });
}

export function hasListing(event: KnotEvent, listing: EventListing) {
  return event.listings.some((existing) => existing.source === listing.source &&
    ((existing.externalId && existing.externalId === listing.externalId) ||
      normalizeUrl(existing.originalUrl) === normalizeUrl(listing.originalUrl)));
}
