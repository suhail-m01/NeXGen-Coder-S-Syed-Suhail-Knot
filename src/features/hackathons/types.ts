export type HackathonMode = 'online' | 'offline' | 'hybrid';
export type HackathonPriceFilter = 'all' | 'free' | 'paid';
export type HackathonSort = 'soonest' | 'relevance' | 'latest';
export type InterestContext = 'web' | 'home' | 'my_interests';

export interface Hackathon {
  id: string;
  title: string;
  description: string | null;
  organizer: string | null;
  mode: HackathonMode;
  city: string | null;
  area: string | null;
  state: string | null;
  country: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: 'exact' | 'approximate' | 'city' | 'none';
  startDate: string;
  endDate: string | null;
  registrationDeadline: string | null;
  timezone: string | null;
  startTimeKnown: boolean;
  endTimeKnown: boolean;
  isFree: boolean | null;
  priceAmount: number | null;
  currency: string | null;
  prizePool: string | null;
  tags: string[];
  eligibility: string | null;
  teamSize: string | null;
  imageUrl: string | null;
  officialUrl: string;
  officialUrlVerified: boolean;
  sourceUrl: string;
  sourcePlatform: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  lastCheckedAt: string;
}

export interface HackathonFilters {
  city: string;
  area: string;
  mode: 'all' | HackathonMode;
  from: string;
  to: string;
  price: HackathonPriceFilter;
  q: string;
  sort: HackathonSort;
  page: number;
  limit: number;
}

export interface HackathonListResponse {
  data: Hackathon[];
  meta: { page: number; limit: number; total: number; totalPages: number; lastUpdated: string | null };
  facets: { locations: { city: string | null; area: string | null }[] };
}

export interface InterestResponse {
  interestId: string;
  officialUrl: string;
  officialUrlVerified: boolean;
  saved: boolean;
}

export const defaultHackathonFilters: HackathonFilters = {
  city: '', area: '', mode: 'all', from: '', to: '', price: 'all', q: '', sort: 'soonest', page: 1, limit: 12,
};
