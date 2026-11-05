import { localities } from '../../src/domain/localities';
import { makeDedupeKey } from './dedupe';
import type { ExtractionMethod, HackathonStatus, NormalizedHackathon, RawHackathon } from './types';
import { stripTrackingUrl } from './verify';

const CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru', bengaluru: 'Bengaluru', 'new delhi': 'Delhi NCR', delhi: 'Delhi NCR',
  'delhi ncr': 'Delhi NCR', ncr: 'Delhi NCR', bombay: 'Mumbai', madras: 'Chennai',
  calcutta: 'Kolkata', cochin: 'Kochi', trivandrum: 'Thiruvananthapuram', vizag: 'Visakhapatnam',
  gurgaon: 'Gurugram', poona: 'Pune', online: 'Online', virtual: 'Online',
};

export function canonicalCity(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  const alias = CITY_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;
  const locality = localities.find((item) => item.name.toLowerCase() === cleaned.toLowerCase() || item.city.toLowerCase() === cleaned.toLowerCase());
  return locality?.city ?? cleaned;
}

export function normalizeLocation(cityValue: string | null, areaValue: string | null): { city: string | null; area: string | null } {
  const area = areaValue?.trim() || null;
  const areaLocality = area ? localities.find((item) => item.name.toLowerCase() === area.toLowerCase()) : undefined;
  const city = canonicalCity(cityValue ?? areaLocality?.city ?? null);
  return { city, area: areaLocality?.name ?? area };
}

export function cityAnchor(city: string | null, area: string | null): { latitude: number; longitude: number } | null {
  if (area) {
    const match = localities.find((item) => item.name.toLowerCase() === area.toLowerCase());
    if (match) return { latitude: match.latitude, longitude: match.longitude };
  }
  if (!city) return null;
  const match = localities.find((item) => canonicalCity(item.city) === canonicalCity(city) && item.geocode.resultType === 'city')
    ?? localities.find((item) => canonicalCity(item.city) === canonicalCity(city));
  return match ? { latitude: match.latitude, longitude: match.longitude } : null;
}

function validTimezone(value: string | null): string | null {
  if (!value) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return value;
  } catch { return null; }
}

function zonedLocalToUtc(value: string, timezone: string): { date: Date; timeKnown: boolean } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const timeKnown = hour !== undefined;
  const guess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0), Number(second ?? 0));
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const result = new Date(guess - (represented - guess));
  return Number.isFinite(result.getTime()) ? { date: result, timeKnown } : null;
}

export function normalizeDate(value: string | null, timezoneHint: string | null): { iso: string; timezone: string | null; timeKnown: boolean } | null {
  if (!value) return null;
  const trimmed = value.trim();
  const timezone = validTimezone(timezoneHint);
  if (/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(trimmed) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    if (!timezone) return null;
    const local = zonedLocalToUtc(trimmed, timezone);
    return local ? { iso: local.date.toISOString(), timezone, timeKnown: local.timeKnown } : null;
  }
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return { iso: parsed.toISOString(), timezone, timeKnown: !/^\d{4}-\d{2}-\d{2}$/.test(trimmed) };
}

export function normalizeHackathon(raw: RawHackathon, options: { now?: Date; extractionMethod: ExtractionMethod }): NormalizedHackathon {
  const title = raw.title?.trim();
  if (!title || title.length < 3) throw new Error('A source-supported title is required.');
  const location = normalizeLocation(raw.city, raw.area);
  const timezone = validTimezone(raw.timezone) ?? (raw.country?.toLowerCase() === 'india' || location.city && cityAnchor(location.city, location.area) ? 'Asia/Kolkata' : null);
  const start = normalizeDate(raw.startDate, timezone);
  if (!start) throw new Error('A valid start date with an explicit or city-supported timezone is required.');
  const end = normalizeDate(raw.endDate, start.timezone);
  if (end && end.iso < start.iso) throw new Error('End date is before the start date.');
  const deadline = normalizeDate(raw.registrationDeadline, start.timezone);
  const now = options.now ?? new Date();
  const startAt = new Date(start.iso).getTime();
  const endAt = end ? new Date(end.iso).getTime() : null;
  const effectiveEnd = endAt ?? (!start.timeKnown ? startAt + 86_399_999 : startAt);
  const status: HackathonStatus = effectiveEnd < now.getTime() ? 'ended' : startAt <= now.getTime() ? 'ongoing' : 'upcoming';
  const mode = raw.mode ?? (location.city?.toLowerCase() === 'online' ? 'online' : 'offline');
  const anchor = mode === 'online' ? null : cityAnchor(location.city, location.area);
  const hasExactCoordinates = raw.latitude !== null && raw.longitude !== null;
  const priceConflict = raw.isFree === true && raw.priceAmount !== null && raw.priceAmount > 0
    || raw.isFree === false && raw.priceAmount === 0;
  const isFree = priceConflict ? null : raw.isFree ?? (raw.priceAmount === null ? null : raw.priceAmount === 0);
  const officialUrl = stripTrackingUrl(raw.officialUrl ?? raw.sourceUrl);
  const sourceUrl = stripTrackingUrl(raw.sourceUrl);
  const city = mode === 'online' && location.city?.toLowerCase() === 'online' ? null : location.city;
  return {
    dedupeKey: makeDedupeKey(title, start.iso, mode === 'online' ? null : city), title,
    description: raw.description, organizer: raw.organizer, mode, city, area: location.area, state: raw.state, country: raw.country,
    venue: raw.venue, latitude: hasExactCoordinates ? raw.latitude : anchor?.latitude ?? null,
    longitude: hasExactCoordinates ? raw.longitude : anchor?.longitude ?? null,
    locationPrecision: hasExactCoordinates ? 'exact' : anchor ? 'city' : 'none',
    startDate: start.iso, endDate: end?.iso ?? null, registrationDeadline: deadline?.iso ?? null,
    timezone: start.timezone, startTimeKnown: start.timeKnown, endTimeKnown: end?.timeKnown ?? false,
    isFree, priceAmount: raw.priceAmount, currency: raw.currency?.toUpperCase() ?? null, prizePool: raw.prizePool,
    tags: [...new Map(raw.tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => [tag.toLowerCase(), tag])).values()].slice(0, 30),
    eligibility: raw.eligibility, teamSize: raw.teamSize, imageUrl: raw.imageUrl,
    officialUrl, officialUrlVerified: false, sourceUrl, sourcePlatform: raw.sourcePlatform,
    sources: [{ platform: raw.sourcePlatform, url: sourceUrl, firstSeenAt: now.toISOString(), lastCheckedAt: now.toISOString(), extractionMethod: options.extractionMethod }],
    extractionMethod: options.extractionMethod, status,
  };
}
