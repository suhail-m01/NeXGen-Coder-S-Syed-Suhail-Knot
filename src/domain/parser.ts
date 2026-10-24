import { defaultAgeRule } from './defaults';
import type { AgeRule, Confidence, EventMode, EventType, ExtractedField, ExtractionDraft, Price } from './types';

const field = <T,>(value: T, confidence: Confidence, evidence = ''): ExtractedField<T> => ({ value, confidence, evidence });
const eventTypes: [EventType, RegExp][] = [
  ['hackathon', /hackathon|hack\s*day/i], ['workshop', /workshop|bootcamp/i],
  ['meetup', /meetup|meet-up/i], ['conference', /conference/i], ['summit', /summit/i],
  ['competition', /competition|contest|challenge/i], ['webinar', /webinar/i],
  ['community_session', /community|session|meetup/i],
];
const skillList = ['Python', 'React', 'JavaScript', 'TypeScript', 'AI/ML', 'Design', 'Figma', 'Cloud', 'Cybersecurity', 'Data', 'Mobile', 'Hardware/IoT', 'Open Source'];

function findEventType(text: string) {
  return eventTypes.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function parseDate(text: string, now: Date) {
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  let day: number, month: number, year: number, confidence: Confidence, evidence: string;
  if (numeric) {
    day = Number(numeric[1]); month = Number(numeric[2]);
    if (numeric[3]) {
      year = Number(numeric[3]);
      if (year < 100) year += 2000;
      confidence = 'high';
    } else {
      year = now.getFullYear();
      confidence = 'medium';
    }
    evidence = numeric[0];
  } else {
    const monthName = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*,?\s*(\d{4})?\b/i);
    if (!monthName) return null;
    day = Number(monthName[1]);
    month = new Date(`${monthName[2]} 1, 2020`).getMonth() + 1;
    year = monthName[3] ? Number(monthName[3]) : now.getFullYear();
    confidence = monthName[3] ? 'high' : 'medium';
    evidence = monthName[0];
  }
  let candidate = new Date(year, month - 1, day, 18, 0, 0);
  if (Number.isNaN(candidate.getTime()) || candidate.getMonth() !== month - 1) return null;
  if (!numeric?.[3] && candidate.getTime() < now.getTime()) {
    candidate = new Date(year + 1, month - 1, day, 18, 0, 0);
  }
  const time = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (time) {
    let hour = Number(time[1]) % 12;
    if (time[3].toUpperCase() === 'PM') hour += 12;
    candidate.setHours(hour, Number(time[2] ?? 0), 0, 0);
  }
  return { value: candidate.toISOString(), confidence, evidence: `${evidence}${time ? ` ${time[0]}` : ''}` };
}

function parseAgeRule(text: string): ExtractedField<AgeRule> {
  const range = text.match(/\b(?:ages?\s*)?(\d{1,2})\s*[–-]\s*(\d{1,2})\s*(?:years?|yrs?)?\b/i);
  if (range && Number(range[1]) >= 5 && Number(range[2]) <= 100) {
    return field({ ...defaultAgeRule(), mode: 'age_range', minAge: Number(range[1]), maxAge: Number(range[2]), source: 'extracted_from_source', confidence: 'high', ruleText: range[0] }, 'high', range[0]);
  }
  const minimum = text.match(/\b(?:ages?\s*)?(\d{1,2})\s*\+/i);
  if (minimum) {
    const age = Number(minimum[1]);
    return field({ ...defaultAgeRule(), mode: age === 18 ? 'adults_only' : 'min_age', minAge: age, source: 'extracted_from_source', confidence: 'high', ruleText: minimum[0] }, 'high', minimum[0]);
  }
  if (/class\s+\d|grade\s+\d|school students|college students|freshers/i.test(text)) {
    return field({ ...defaultAgeRule(), ruleText: text.match(/class\s+\d[^.\n]*|grade\s+\d[^.\n]*|school students|college students|freshers/i)?.[0] ?? '' }, 'low', 'Age cannot be inferred from class, grade or student wording');
  }
  return field(defaultAgeRule(), 'missing');
}

export function parseInstantText(rawText: string, now = new Date()): ExtractionDraft {
  const text = rawText.trim();
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const titleLine = lines.find((line) => line.length >= 5 && line.length <= 120 && !/^(date|time|venue|location|register|eligibility)\b/i.test(line)) ?? null;
  const date = parseDate(text, now);
  const venueLine = lines.find((line) => /^(venue|location)\s*[:\-]/i.test(line));
  const venueValue = venueLine?.replace(/^(venue|location)\s*[:\-]\s*/i, '') ?? null;
  const url = text.match(/https?:\/\/[^\s)\]]+/i)?.[0] ?? null;
  const mode: EventMode = /hybrid/i.test(text) ? 'hybrid' : /online|zoom|google meet|virtual|webinar/i.test(text) ? 'online' : venueValue ? 'in_person' : 'in_person';
  const freeForSome = /free\s+for\s+(members|students|women|college|early)/i.test(text);
  const price: Price = freeForSome ? { kind: 'unknown', amountInr: null, note: text.match(/free\s+for\s+[^.\n]+/i)?.[0] ?? 'Conditional price wording' } :
    /\bfree\b/i.test(text) ? { kind: 'free', amountInr: 0, note: 'Stated free in source' } :
    /[₹]\s*\d+/.test(text) ? { kind: 'paid', amountInr: Number(text.match(/[₹]\s*(\d+)/)?.[1] ?? 0) || null, note: 'Price extracted from source' } :
    { kind: 'unknown', amountInr: null, note: '' };
  const eligibility = lines.find((line) => /eligib|open to|students only|who can join/i.test(line)) ?? null;
  const skills = skillList.filter((skill) => text.toLowerCase().includes(skill.toLowerCase()));
  const team = text.match(/team(?:\s+size)?\s*(?:of|:)?\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  const eventType = findEventType(text);
  const summaryType = eventType ? eventType.replace('_', ' ') : 'event';
  const summaryPlace = venueValue ? ` at ${venueValue}` : mode === 'online' ? ' online' : '';
  return {
    title: field(titleLine, titleLine ? 'high' : 'missing', titleLine ?? ''),
    eventType: field(eventType, eventType ? 'high' : 'missing'),
    organizer: field(lines.find((line) => /^(organizer|organised by|organized by|hosted by)\s*[:\-]/i.test(line))?.replace(/^[^:\-]+[:\-]\s*/, '') ?? null, 'missing'),
    startDatetime: field(date?.value ?? null, date?.confidence ?? 'missing', date?.evidence ?? ''),
    endDatetime: field(null, 'missing'),
    registrationDeadline: field(null, 'missing'),
    mode: field(mode, venueValue || /online|hybrid|virtual|webinar/i.test(text) ? 'high' : 'low'),
    venueName: field(venueValue, venueValue ? 'high' : 'missing', venueLine ?? ''),
    addressOrLocality: field(venueValue, venueValue ? 'medium' : 'missing', venueLine ?? ''),
    city: field(/bengaluru|bangalore/i.test(text) ? 'Bengaluru' : null, /bengaluru|bangalore/i.test(text) ? 'high' : 'missing'),
    registrationUrl: field(url, url ? 'high' : 'missing', url ?? ''),
    price: field(price, price.kind === 'unknown' ? 'missing' : 'high', freeForSome ? 'Conditional free wording is not free for everyone' : ''),
    eligibilityText: field(eligibility, eligibility ? 'high' : 'missing', eligibility ?? ''),
    ageRule: parseAgeRule(text),
    skills: field(skills, skills.length ? 'high' : 'missing'),
    teamSize: field({ min: team ? Number(team[1]) : null, max: team?.[2] ? Number(team[2]) : team ? Number(team[1]) : null }, team ? 'high' : 'missing', team?.[0] ?? ''),
    summary: field(`A ${summaryType}${summaryPlace}. Review the source details, eligibility and registration information before publishing.`, 'high'),
  };
}
