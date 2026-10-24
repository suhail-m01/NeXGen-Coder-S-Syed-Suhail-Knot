import type { AgeRule, EventMode, EventType, GeocodedLocation } from './types';

export interface QuickPostInput {
  title: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  mode: EventMode;
  venueName: string;
  localityId: string;
  address: string;
  geocode?: GeocodedLocation | null;
  registrationKind: 'external' | 'native';
  capacity: number | null;
  approval: 'none' | 'manual';
  waitlistEnabled: boolean;
  registrationUrl: string;
  onlineJoinUrl: string;
  ageRule: AgeRule;
  description: string;
  eligibilityText: string;
  interests: string[];
  skills: string[];
  priceKind: 'free' | 'paid' | 'unknown';
  priceAmount: number | null;
  registrationDeadline: string;
}

export function validWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateQuickPost(input: QuickPostInput, now = new Date()) {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < 5 || input.title.trim().length > 120) errors.title = 'Use a title between 5 and 120 characters.';
  if (!input.startAt || new Date(input.startAt).getTime() <= now.getTime()) errors.startAt = 'Choose a future start date and time.';
  if (input.endAt && new Date(input.endAt).getTime() <= new Date(input.startAt).getTime()) errors.endAt = 'End time must be after the start.';
  if (input.registrationDeadline && new Date(input.registrationDeadline).getTime() > new Date(input.startAt).getTime()) errors.registrationDeadline = 'Registration deadline must be before the event starts.';
  if (input.mode !== 'online' && !input.venueName.trim()) errors.venueName = 'Add a venue for an in-person or hybrid event.';
  if (input.mode !== 'online' && !input.localityId) errors.localityId = 'Choose a locality.';
  if (input.geocode && (!Number.isFinite(input.geocode.latitude) || !Number.isFinite(input.geocode.longitude) || Math.abs(input.geocode.latitude) > 90 || Math.abs(input.geocode.longitude) > 180 || !input.geocode.displayName.trim())) errors.address = 'The reviewed map candidate is invalid. Look it up again or use the locality-area marker.';
  if (input.registrationKind === 'native' && input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100_000)) errors.capacity = 'Use a whole-number capacity from 1 to 100,000, or leave it blank for unlimited.';
  if (input.registrationUrl && !validWebUrl(input.registrationUrl)) errors.registrationUrl = 'Add a valid external registration link.';
  if (input.registrationKind === 'external' && input.mode !== 'online' && !validWebUrl(input.registrationUrl)) errors.registrationUrl = 'Add a valid external registration link.';
  if (input.onlineJoinUrl && !validWebUrl(input.onlineJoinUrl)) errors.onlineJoinUrl = 'Use a valid joining link or leave it blank.';
  if (input.mode === 'online' && input.registrationKind === 'native' && !validWebUrl(input.onlineJoinUrl)) {
    errors.onlineJoinUrl = 'Add a joining link for an online event using Knot registration.';
  }
  if (input.mode === 'online' && input.registrationKind === 'external' && !validWebUrl(input.registrationUrl) && !validWebUrl(input.onlineJoinUrl)) {
    errors.registrationUrl = 'An online event needs a registration or joining link.';
  }
  if (input.ageRule.mode === 'not_stated') errors.ageRule = 'Choose who can join.';
  if (input.ageRule.mode === 'min_age' && (!input.ageRule.minAge || input.ageRule.minAge < 1)) errors.ageRule = 'Enter a valid minimum age.';
  if (input.ageRule.mode === 'age_range' && (!input.ageRule.minAge || !input.ageRule.maxAge || input.ageRule.minAge > input.ageRule.maxAge)) errors.ageRule = 'Enter a valid age range.';
  if (input.priceKind === 'paid' && (!input.priceAmount || input.priceAmount <= 0)) errors.price = 'Enter the price or choose “Price not stated”.';
  return errors;
}
