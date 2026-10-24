import type { KnotEvent, PersonalizationAction, PersonalizationSignal, UserAccount } from './types';

export const PERSONALIZATION_RETENTION_DAYS = 90;
export const PERSONALIZATION_HALF_LIFE_DAYS = 30;
export const MAX_LEARNED_INTERESTS = 12;

const weights: Record<PersonalizationAction, number> = {
  view: 1,
  share: 2,
  save: 3,
  participation: 4,
};

export function canLearnFromAccount(user: UserAccount | null | undefined) {
  return Boolean(user && user.ageBand === '18_plus' && (user.accountStatus ?? 'active') === 'active' && user.personalizationConsent === true);
}

export function signalWeight(action: PersonalizationAction) {
  return weights[action];
}

export function newPersonalizationSignal(
  user: UserAccount, event: KnotEvent, action: PersonalizationAction, id: string, now = new Date(),
): PersonalizationSignal | null {
  if (!canLearnFromAccount(user)) return null;
  const interests = [...new Set(event.interests)].filter((interest) => interest.trim().length > 0).slice(0, 20);
  if (!interests.length) return null;
  return {
    id, userId: user.id, eventId: event.id, action, interests,
    occurredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PERSONALIZATION_RETENTION_DAYS * 86_400_000).toISOString(),
  };
}

export function sameSignalDay(left: PersonalizationSignal, right: PersonalizationSignal) {
  return left.userId === right.userId && left.eventId === right.eventId && left.action === right.action
    && left.occurredAt.slice(0, 10) === right.occurredAt.slice(0, 10);
}

export function learnedInterestScores(signals: PersonalizationSignal[], userId: string, now = new Date()) {
  const scores = new Map<string, number>();
  for (const signal of signals) {
    if (signal.userId !== userId || new Date(signal.expiresAt).getTime() <= now.getTime()) continue;
    const ageDays = Math.max(0, now.getTime() - new Date(signal.occurredAt).getTime()) / 86_400_000;
    const decay = 2 ** (-ageDays / PERSONALIZATION_HALF_LIFE_DAYS);
    const value = signalWeight(signal.action) * decay / Math.max(1, signal.interests.length);
    for (const interest of signal.interests) scores.set(interest, (scores.get(interest) ?? 0) + value);
  }
  return [...scores.entries()].map(([interest, score]) => ({ interest, score }))
    .sort((left, right) => right.score - left.score || left.interest.localeCompare(right.interest));
}

export function deriveLearnedInterests(signals: PersonalizationSignal[], userId: string, now = new Date()) {
  return learnedInterestScores(signals, userId, now).slice(0, MAX_LEARNED_INTERESTS).map((item) => item.interest);
}

/** Adds one signal per user/event/action/day and derives the visible preference list atomically. */
export function appendPersonalizationSignal(
  signals: PersonalizationSignal[], candidate: PersonalizationSignal, now = new Date(),
) {
  const active = signals.filter((signal) => new Date(signal.expiresAt).getTime() > now.getTime());
  if (active.some((signal) => sameSignalDay(signal, candidate))) {
    return { signals: active, learnedInterests: deriveLearnedInterests(active, candidate.userId, now), added: false };
  }
  const next = [...active, candidate];
  return { signals: next, learnedInterests: deriveLearnedInterests(next, candidate.userId, now), added: true };
}
