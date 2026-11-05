import { load } from 'cheerio';
import { emptyRawHackathon, validateRawHackathon } from './schemas';
import type { ExtractionMethod, RawHackathon, SourceConfig, SourceDocument } from './types';

type JsonRecord = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const cleaned = String(value).replace(/\s+/g, ' ').trim();
    return cleaned || null;
  }
  if (Array.isArray(value)) return text(value[0]);
  if (value && typeof value === 'object') {
    const record = value as JsonRecord;
    return text(record.name ?? record['@value'] ?? record.value ?? record.url ?? record.label ?? null);
  }
  return null;
}

function number(value: unknown): number | null {
  const raw = typeof value === 'string' ? value.replace(/[^0-9.-]/g, '') : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function absolute(value: unknown, base: string): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(strings);
  const raw = text(value);
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

export function normalizeMode(value: string | null): RawHackathon['mode'] {
  if (!value) return null;
  const mode = value.toLowerCase();
  if (/hybrid|mixed/.test(mode)) return 'hybrid';
  if (/online|virtual|remote/.test(mode)) return 'online';
  if (/offline|in.?person|physical|on.?site/.test(mode)) return 'offline';
  return null;
}

export function detectPrice(input: { isFree?: boolean | null; priceAmount?: number | null; currency?: string | null; text?: string | null }): Pick<RawHackathon, 'isFree' | 'priceAmount' | 'currency'> {
  let isFree = input.isFree ?? null;
  let priceAmount = input.priceAmount ?? null;
  const body = input.text ?? '';
  if (priceAmount === null) {
    const match = body.match(/(?:₹|\bINR\b|\bRs\.?\s*)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
    if (match) priceAmount = Number(match[1].replace(/,/g, ''));
  }
  const explicitFree = /(?:free\s+(?:registration|entry|admission|to\s+attend)|(?:registration|entry|admission)\s+(?:is\s+)?free|free\s+for\s+everyone|no\s+registration\s+fee)/i.test(body)
    && !/(?:not\s+free|free\s+for\s+(?:members|students)\s+only)/i.test(body);
  if (explicitFree && priceAmount === null && isFree === null) isFree = true;
  if (priceAmount !== null) {
    const conflicts = isFree === true && priceAmount > 0 || isFree === false && priceAmount === 0;
    isFree = conflicts ? null : priceAmount === 0;
  }
  return { isFree, priceAmount, currency: input.currency?.toUpperCase() ?? (priceAmount !== null && /₹|\bINR\b|\bRs\.?/i.test(body) ? 'INR' : null) };
}

function eventRecords(value: unknown, output: JsonRecord[] = [], depth = 0): JsonRecord[] {
  if (depth > 10 || output.length >= 100 || !value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) eventRecords(item, output, depth + 1);
    return output;
  }
  const record = value as JsonRecord;
  const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
  if (types.some((type) => type === 'Event' || type === 'Hackathon')) output.push(record);
  for (const nested of Object.values(record)) eventRecords(nested, output, depth + 1);
  return output;
}

function fromSchemaEvent(event: JsonRecord, document: SourceDocument): RawHackathon {
  const candidate = emptyRawHackathon(document.finalUrl, document.sourcePlatform);
  const locations = Array.isArray(event.location) ? event.location : event.location ? [event.location] : [];
  const place = locations.find((location) => location && typeof location === 'object' && text((location as JsonRecord)['@type']) !== 'VirtualLocation') as JsonRecord | undefined;
  const virtual = locations.some((location) => location && typeof location === 'object' && text((location as JsonRecord)['@type']) === 'VirtualLocation');
  const address = place?.address && typeof place.address === 'object' ? place.address as JsonRecord : {};
  const geo = place?.geo && typeof place.geo === 'object' ? place.geo as JsonRecord : {};
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  const offer = offers && typeof offers === 'object' ? offers as JsonRecord : {};
  const priceValue = offer.price ?? (offer.priceSpecification && typeof offer.priceSpecification === 'object' ? (offer.priceSpecification as JsonRecord).price : null);
  const price = detectPrice({ priceAmount: number(priceValue), currency: text(offer.priceCurrency), text: text(event.description) });
  candidate.title = text(event.name);
  candidate.description = text(event.description);
  candidate.organizer = text(event.organizer);
  candidate.mode = normalizeMode(text(event.eventAttendanceMode)) ?? (virtual && place ? 'hybrid' : virtual ? 'online' : place ? 'offline' : null);
  candidate.city = text(address.addressLocality);
  candidate.area = text(address.addressArea ?? address.neighborhood ?? address.neighbourhood);
  candidate.state = text(address.addressRegion);
  candidate.country = text(address.addressCountry);
  candidate.venue = text(place);
  candidate.latitude = number(geo.latitude);
  candidate.longitude = number(geo.longitude);
  candidate.startDate = text(event.startDate);
  candidate.endDate = text(event.endDate);
  candidate.registrationDeadline = text(event.registrationDeadline ?? event.registration_deadline);
  candidate.timezone = text(event.timezone ?? event.timeZone);
  candidate.isFree = price.isFree;
  candidate.priceAmount = price.priceAmount;
  candidate.currency = price.currency;
  candidate.prizePool = text(event.prizePool ?? event.prize ?? event.award);
  candidate.tags = strings(event.keywords).slice(0, 30);
  candidate.eligibility = text(event.eligibility ?? (event.audience && typeof event.audience === 'object' ? (event.audience as JsonRecord).audienceType : null));
  candidate.teamSize = text(event.teamSize ?? event.team_size);
  candidate.imageUrl = absolute(event.image, document.finalUrl);
  candidate.officialUrl = absolute(event.url ?? offer.url ?? event.mainEntityOfPage, document.finalUrl);
  return candidate;
}

function extractJsonLd(document: SourceDocument): RawHackathon[] {
  const $ = load(document.body);
  const candidates: RawHackathon[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const body = $(element).text().trim();
    if (!body) return;
    try {
      const events = eventRecords(JSON.parse(body));
      for (const event of events) candidates.push(fromSchemaEvent(event, document));
    } catch {
      // Invalid JSON-LD is ignored; OpenGraph and CSS remain available.
    }
  });
  return candidates;
}

function mergeMissing(base: RawHackathon, addition: RawHackathon): RawHackathon {
  const merged = { ...base };
  for (const [key, value] of Object.entries(addition) as [keyof RawHackathon, RawHackathon[keyof RawHackathon]][]) {
    if (key === 'tags') {
      merged.tags = [...new Set([...base.tags, ...addition.tags])];
    } else if ((merged[key] === null || merged[key] === undefined) && value !== null && value !== undefined) {
      Object.assign(merged, { [key]: value });
    }
  }
  return merged;
}

function openGraph(document: SourceDocument): RawHackathon {
  const $ = load(document.body);
  const candidate = emptyRawHackathon(document.finalUrl, document.sourcePlatform);
  const meta = (name: string) => $(`meta[property="${name}"], meta[name="${name}"]`).attr('content') ?? null;
  candidate.title = text(meta('og:title'));
  candidate.description = text(meta('og:description') ?? meta('description'));
  candidate.imageUrl = absolute(meta('og:image'), document.finalUrl);
  candidate.officialUrl = absolute(meta('og:url'), document.finalUrl);
  candidate.startDate = text(meta('event:start_time') ?? meta('event:startDate'));
  candidate.endDate = text(meta('event:end_time') ?? meta('event:endDate'));
  return candidate;
}

function cssFallback(document: SourceDocument, selectors?: SourceConfig['selectors']): RawHackathon {
  const $ = load(document.body);
  const candidate = emptyRawHackathon(document.finalUrl, document.sourcePlatform);
  const selected = (selector: string | undefined, fallback: string) => text($(selector ?? fallback).first().text());
  candidate.title = selected(selectors?.title, 'h1');
  candidate.description = selected(selectors?.description, 'main p');
  candidate.startDate = text($(selectors?.date ?? 'time[datetime]').first().attr('datetime') ?? $(selectors?.date ?? 'time[datetime]').first().text());
  candidate.venue = selected(selectors?.location, '[itemprop="location"], [class*="location" i], [class*="venue" i]');
  candidate.organizer = selected(selectors?.organizer, '[itemprop="organizer"], [class*="organizer" i], [class*="host" i]');
  candidate.officialUrl = absolute($('link[rel="canonical"]').attr('href'), document.finalUrl);
  return candidate;
}

export function extractDocument(document: SourceDocument, selectors?: SourceConfig['selectors']): { data: RawHackathon; method: ExtractionMethod } {
  const jsonLd = extractJsonLd(document);
  if (jsonLd.length > 1) {
    const first = jsonLd[0]!;
    const chosen = jsonLd.find((candidate) => /hackathon|datathon|buildathon/i.test(`${candidate.title ?? ''} ${candidate.description ?? ''}`)) ?? first;
    return { data: validateRawHackathon(chosen), method: 'json-ld' };
  }
  let candidate = jsonLd[0] ?? emptyRawHackathon(document.finalUrl, document.sourcePlatform);
  let method: ExtractionMethod = jsonLd.length ? 'json-ld' : 'opengraph';
  candidate = mergeMissing(candidate, openGraph(document));
  candidate = mergeMissing(candidate, cssFallback(document, selectors));
  if (!jsonLd.length && !candidate.title) method = 'css';
  const $ = load(document.body);
  const price = detectPrice({ isFree: candidate.isFree, priceAmount: candidate.priceAmount, currency: candidate.currency, text: $.root().text().slice(0, 200_000) });
  candidate = { ...candidate, ...price };
  candidate.sourceUrl = document.finalUrl;
  candidate.sourcePlatform = document.sourcePlatform;
  return { data: validateRawHackathon(candidate), method };
}

export function htmlToText(html: string, cap = 60_000): string {
  const $ = load(html);
  $('script, style, noscript, svg, nav, footer, form').remove();
  return ($('main').text() || $('body').text() || $.root().text()).slice(0, cap);
}
