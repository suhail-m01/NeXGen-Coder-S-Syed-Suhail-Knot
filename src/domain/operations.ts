import type {
  EventSafetyChecklist,
  EventOperationsPatch,
  EventSeries,
  KnotEvent,
  ProjectSubmission,
  Registration,
  RegistrationQuestion,
  UserAccount,
} from './types';
import { distanceForEvent } from './geo';
import type { Locality } from './types';
import { validWebUrl } from './validation';
import { localityById } from './localities';

export const emptySafetyChecklist = (): EventSafetyChecklist => ({
  safeguardingContact: false,
  codeOfConduct: false,
  supervisedEnvironment: false,
  dataMinimization: false,
});

export function safetyChecklistComplete(checklist: EventSafetyChecklist | undefined) {
  return Boolean(checklist && Object.values(checklist).every(Boolean));
}

export function validateRegistrationQuestions(questions: RegistrationQuestion[]) {
  if (questions.length > 12) return 'Use no more than 12 registration questions.';
  const ids = new Set<string>();
  for (const question of questions) {
    if (!question.id || ids.has(question.id)) return 'Each registration question needs a unique identifier.';
    ids.add(question.id);
    if (question.label.trim().length < 3 || question.label.trim().length > 160) return 'Each question needs a label between 3 and 160 characters.';
    if (/password|aadhaar|government[ -]?id|passport|date of birth|birth date|precise (live )?location/i.test(question.label)) return `“${question.label}” requests sensitive or unnecessary data and cannot be added.`;
    if (question.kind === 'single_choice' && question.options.filter((option) => option.trim()).length < 2) return `Add at least two choices for “${question.label}”.`;
  }
  return null;
}

export function registrationAnswerErrors(questions: RegistrationQuestion[], answers: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const question of questions) {
    const answer = (answers[question.id] ?? '').trim();
    if (question.required && !answer) errors[question.id] = 'This answer is required.';
    if (answer.length > 1000) errors[question.id] = 'Keep each answer under 1,000 characters.';
    if (answer && question.kind === 'single_choice' && !question.options.includes(answer)) errors[question.id] = 'Choose one of the available options.';
  }
  return errors;
}

export function canManageEvent(user: UserAccount | null, event: KnotEvent) {
  if (!user || user.ageBand !== '18_plus' || user.accountStatus === 'closed') return false;
  return event.organizerId === user.id || user.role === 'admin' || Boolean(event.collaborators?.some((person) => person.userId === user.id && person.role === 'co_organizer'));
}

export function canCheckInEvent(user: UserAccount | null, event: KnotEvent) {
  return canManageEvent(user, event) || Boolean(user && user.ageBand === '18_plus' && event.collaborators?.some((person) => person.userId === user.id && person.role === 'volunteer'));
}

export function canJudgeEvent(user: UserAccount | null, event: KnotEvent) {
  return canManageEvent(user, event) || Boolean(user && user.ageBand === '18_plus' && event.collaborators?.some((person) => person.userId === user.id && person.role === 'judge'));
}

export function eventsOverlap(first: Pick<KnotEvent, 'startAt' | 'endAt'>, second: Pick<KnotEvent, 'startAt' | 'endAt'>) {
  const firstStart = new Date(first.startAt).getTime();
  const secondStart = new Date(second.startAt).getTime();
  const firstEnd = new Date(first.endAt ?? first.startAt).getTime();
  const secondEnd = new Date(second.endAt ?? second.startAt).getTime();
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function estimatedTravelMinutes(event: KnotEvent, origin: Locality | null) {
  const distance = distanceForEvent(event, origin, localityById(event.venue?.localityId));
  if (distance === null || event.mode === 'online') return null;
  // Deliberately labelled as a rough estimate: 25 km/h plus a 10-minute access allowance, no live traffic claim.
  return Math.round((distance / 25) * 60 + 10);
}

export function estimateReach(event: KnotEvent, users: UserAccount[]) {
  const eligible = users.filter((user) => user.ageBand === '18_plus' && user.accountStatus !== 'closed' && user.accountStatus !== 'restricted' && user.interests.some((interest) => event.interests.includes(interest)));
  const count = eligible.length;
  if (count < 5) return { label: 'Fewer than 5 eligible adult accounts · exact reach suppressed', count: null, suppressed: true };
  if (count <= 49) return { label: '5–49 eligible adult accounts', count: null, suppressed: false };
  if (count <= 199) return { label: '50–199 eligible adult accounts', count: null, suppressed: false };
  return { label: '200+ eligible adult accounts', count: null, suppressed: false };
}

export function validateProjectSubmission(input: Pick<ProjectSubmission, 'title' | 'description' | 'repositoryUrl' | 'videoUrl' | 'documentUrl'>) {
  if (input.title.trim().length < 3 || input.title.trim().length > 140) return 'Use a project title between 3 and 140 characters.';
  if (input.description.trim().length < 10 || input.description.trim().length > 3000) return 'Use a project description between 10 and 3,000 characters.';
  const urls = [input.repositoryUrl, input.videoUrl, input.documentUrl].map((url) => url.trim()).filter(Boolean);
  if (!urls.length) return 'Add at least one repository, video or document link.';
  if (urls.some((url) => !validWebUrl(url))) return 'Project links must be valid HTTP or HTTPS URLs.';
  return null;
}

export function certificateEligible(registration: Registration | undefined, event: KnotEvent, now = new Date()) {
  return Boolean(registration && registration.kind === 'native' && registration.status === 'attended' && new Date(event.endAt ?? event.startAt).getTime() <= now.getTime());
}

export function materialEventChangeFields(event: KnotEvent, patch: EventOperationsPatch) {
  const fields: string[] = [];
  if (patch.submissionDeadline !== undefined && (patch.submissionDeadline ?? null) !== (event.submissionDeadline ?? null)) fields.push('submissionDeadline');
  if (patch.eligibilityText !== undefined && patch.eligibilityText !== event.eligibilityText) fields.push('eligibilityText');
  if (patch.eligibilityKnown !== undefined && patch.eligibilityKnown !== event.eligibilityKnown) fields.push('eligibilityKnown');
  for (const key of ['team', 'price', 'rounds', 'sessions'] as const) {
    const current = key === 'rounds' || key === 'sessions' ? (event[key] ?? []) : event[key];
    if (patch[key] !== undefined && JSON.stringify(patch[key]) !== JSON.stringify(current)) fields.push(key);
  }
  return fields;
}

export function seriesForOrganizer(series: EventSeries[], organizerId: string) {
  return series.filter((item) => item.organizerId === organizerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
