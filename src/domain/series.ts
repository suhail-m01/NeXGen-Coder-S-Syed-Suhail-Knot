import type { EventSeries, KnotEvent } from './types';

export function nextSeriesDate(value: string, frequency: 'weekly' | 'monthly') {
  const date = new Date(value);
  if (frequency === 'weekly') return new Date(date.getTime() + 7 * 86_400_000).toISOString();
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next.toISOString();
}

const shift = (value: string | null, milliseconds: number) => value ? new Date(new Date(value).getTime() + milliseconds).toISOString() : null;

/** Clone operational content only. Participant data never lives on this copied record. */
export function cloneEventForSeries(
  template: KnotEvent,
  scheduledFor: string,
  cloneId: string,
  now: string,
  idFactory: (prefix: string) => string,
): KnotEvent {
  if (!template.organizerId) throw new Error('Series automation requires an owned template; unowned sample events cannot be cloned.');
  const organizerId = template.organizerId;
  const offset = new Date(scheduledFor).getTime() - new Date(template.startAt).getTime();
  const clone: KnotEvent = {
    ...template,
    id: cloneId,
    slug: `${template.slug}-${cloneId.slice(-6)}`,
    startAt: new Date(scheduledFor).toISOString(),
    endAt: shift(template.endAt, offset),
    registrationOpensAt: shift(template.registrationOpensAt, offset),
    registrationDeadline: shift(template.registrationDeadline, offset),
    submissionDeadline: shift(template.submissionDeadline, offset),
    status: 'draft',
    visibility: 'private',
    onlineJoinUrl: null,
    registration: {
      ...template.registration,
      questions: (template.registration.questions ?? []).map((question) => ({ ...question, options: [...question.options] })),
    },
    nativeSafetyChecklistComplete: false,
    safetyChecklist: { safeguardingContact: false, codeOfConduct: false, supervisedEnvironment: false, dataMinimization: false },
    sponsors: (template.sponsors ?? []).map((sponsor) => ({ ...sponsor, id: idFactory('sponsor'), logoAssetId: null })),
    faqs: (template.faqs ?? []).map((item) => ({ ...item })),
    resources: (template.resources ?? []).map((item) => ({ ...item })),
    rounds: (template.rounds ?? []).map((round) => ({
      ...round,
      startAt: new Date(new Date(round.startAt).getTime() + offset).toISOString(),
      endAt: new Date(new Date(round.endAt).getTime() + offset).toISOString(),
      submissionDeadline: shift(round.submissionDeadline, offset),
    })),
    sessions: (template.sessions ?? []).map((session) => ({
      ...session,
      startAt: new Date(new Date(session.startAt).getTime() + offset).toISOString(),
      endAt: new Date(new Date(session.endAt).getTime() + offset).toISOString(),
    })),
    team: { ...template.team, formationDeadline: shift(template.team.formationDeadline, offset) },
    recap: '',
    showcaseEnabled: false,
    isSample: false,
    createdAt: now,
    updatedAt: now,
    firstDiscoveredAt: now,
    lastCheckedAt: now,
    listings: [{
      id: idFactory('listing'), source: 'Knot', externalId: cloneId,
      originalUrl: `/events/${cloneId}`, registrationUrl: null,
      firstDiscoveredAt: now, lastCheckedAt: now, lastMeaningfulChangeAt: null,
      confidence: 'high', status: 'fresh', isPrimary: true,
    }],
    revisions: [{
      id: idFactory('revision'), at: now, changedBy: organizerId,
      fields: ['seriesAutomation'], summary: `Draft cloned from ${template.title}; participant records and safety declarations were not copied.`,
    }],
  };
  return clone;
}

export function automationDue(series: EventSeries, now = new Date()) {
  return Boolean(series.automation?.active && new Date(series.automation.nextAt).getTime() <= now.getTime());
}
