import type { AgeBand, AgeRule, KnotEvent, ParticipationDecision, UserAccount } from './types';

export const ageBandLabel = (band: AgeBand) => ({
  under_13: 'Under 13',
  '13_15': '13–15',
  '16_17': '16–17',
  '18_plus': '18 and over',
})[band];

export const ageRuleLabel = (rule: AgeRule) => {
  switch (rule.mode) {
    case 'all_ages': return 'All ages';
    case 'min_age': return `${rule.minAge}+`;
    case 'age_range': return `${rule.minAge}–${rule.maxAge}`;
    case 'adults_only': return '18+';
    case 'under_18_only': return 'Under 18 only';
    case 'not_stated': return 'Age rule not stated';
  }
};

const bandRange = (band: AgeBand): { min: number; max: number | null } => ({
  under_13: { min: 0, max: 12 },
  '13_15': { min: 13, max: 15 },
  '16_17': { min: 16, max: 17 },
  '18_plus': { min: 18, max: null },
})[band];

const ruleRange = (rule: AgeRule): { min: number; max: number | null } | null => {
  switch (rule.mode) {
    case 'all_ages': return { min: 0, max: null };
    case 'min_age': return rule.minAge === null ? null : { min: rule.minAge, max: null };
    case 'age_range':
      return rule.minAge === null || rule.maxAge === null ? null : { min: rule.minAge, max: rule.maxAge };
    case 'adults_only': return { min: 18, max: null };
    case 'under_18_only': return { min: 0, max: 17 };
    case 'not_stated': return null;
  }
};

export function checkAgeBand(band: AgeBand | null, rule: AgeRule): 'can_join' | 'cannot_join' | 'check_rule' {
  const allowed = ruleRange(rule);
  if (!allowed || !band) return 'check_rule';
  const person = bandRange(band);
  if (person.min > (allowed.max ?? Number.POSITIVE_INFINITY)) return 'cannot_join';
  if ((person.max ?? Number.POSITIVE_INFINITY) < allowed.min) return 'cannot_join';
  const wholeBandInside = person.min >= allowed.min &&
    (allowed.max === null || (person.max !== null && person.max <= allowed.max));
  return wholeBandInside ? 'can_join' : 'check_rule';
}

export function isMinorBand(band: AgeBand) {
  return band !== '18_plus';
}

export function participationDecision(
  user: UserAccount | null,
  event: KnotEvent,
  now = new Date(),
): ParticipationDecision {
  if (!['published', 'changed', 'stale'].includes(event.status)) return 'closed';
  if (new Date(event.startAt).getTime() <= now.getTime()) return 'closed';
  if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < now.getTime()) return 'closed';
  if (event.registrationOpensAt && new Date(event.registrationOpensAt).getTime() > now.getTime()) return 'not_open_yet';
  if (!user) return 'auth_required';

  const ageResult = checkAgeBand(user.ageBand, event.ageRule);
  if (ageResult === 'cannot_join') return 'cannot_join';

  if (user.accountStatus === 'closed') return 'closed';
  if (isMinorBand(user.ageBand)) {
    if (user.guardianConsent !== 'complete' || user.accountStatus === 'restricted') return 'needs_consent';
    if (event.registration.kind === 'native' && !event.nativeSafetyChecklistComplete) return 'not_open_yet';
  }

  return ageResult;
}

export function canPublish(user: UserAccount | null) {
  return Boolean(user && user.ageBand === '18_plus' && user.accountStatus !== 'restricted' && user.accountStatus !== 'closed');
}
