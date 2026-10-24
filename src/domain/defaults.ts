import type { AgeRule, EventFilters } from './types';
import { DEFAULT_LOCALITY_ID } from './localities';

export const defaultAgeRule = (): AgeRule => ({
  mode: 'not_stated',
  minAge: null,
  maxAge: null,
  guardianConsentRequired: 'not_stated',
  guardianPresentRequired: 'not_stated',
  ruleText: '',
  source: 'unknown',
  confidence: 'missing',
});

export const organizerAgeRule = (mode: AgeRule['mode'], minAge: number | null = null, maxAge: number | null = null): AgeRule => ({
  mode,
  minAge,
  maxAge,
  guardianConsentRequired: 'not_stated',
  guardianPresentRequired: 'not_stated',
  ruleText: '',
  source: 'organizer_set',
  confidence: 'high',
});

export const defaultFilters = (): EventFilters => ({
  query: '',
  eventType: 'all',
  mode: 'all',
  time: 'any',
  localityId: DEFAULT_LOCALITY_ID,
  radiusKm: 10,
  interest: '',
  skill: '',
  ageRule: 'all',
  onlyJoinable: false,
  ageBand: null,
  sort: 'soonest',
});
