import type { AgeRule, EventMode, EventType } from './types';

export interface QuickPostInput {
  title: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  mode: EventMode;
  venueName: string;
  localityId: string;
  address: string;
  registrationKind: 'external' | 'native';
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
