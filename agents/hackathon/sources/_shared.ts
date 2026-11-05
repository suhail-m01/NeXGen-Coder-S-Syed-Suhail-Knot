import { load } from 'cheerio';
import { extractDocument, normalizeMode } from '../extract';
import { emptyRawHackathon, validateRawHackathon } from '../schemas';
import type { ApprovedMethod, DiscoveryContext, ParsedHackathon, RawHackathon, SourceDocument } from '../types';

const DETAIL_LINK = /hackathon|event|competition|challenge|datathon|buildathon/i;
const EVENT_DATE_KEYS = ['startDate', 'start_date', 'startAt', 'start_at', 'start', 'starts_at', 'date'];

function authorizedMethod(config: DiscoveryContext['config'], method: ApprovedMethod): boolean {
  return config.approvedMethods.includes(method);
}

function requestHeaders(context: DiscoveryContext, url: string): Record<string, string> | undefined {
  if (!context.apiKey) return undefined;
  const host = new URL(url).hostname;
  if (context.config.id === 'eventbrite' && host === 'www.eventbriteapi.com') return { Authorization: `Bearer ${context.apiKey}` };
  if (context.config.id === 'meetup' && host === 'api.meetup.com') return { Authorization: `Bearer ${context.apiKey}` };
  return undefined;
}

async function responseDocument(url: string, context: DiscoveryContext): Promise<SourceDocument | null> {
  const response = await context.http.get(url, { headers: requestHeaders(context, url) });
  if (response.status !== 200 || !response.body) return null;
  return { url, finalUrl: response.finalUrl, body: response.body, contentType: response.contentType, sourcePlatform: context.config.platform };
}

function sameSourceHost(url: URL, context: DiscoveryContext): boolean {
  const baseHost = new URL(context.config.baseUrl).hostname;
  return url.hostname === baseHost || url.hostname.endsWith(`.${baseHost}`);
}

export async function discoverConfigured(context: DiscoveryContext): Promise<SourceDocument[]> {
  const documents: SourceDocument[] = [];
  const failures: unknown[] = [];
  const pending = [...context.config.discoveryUrls];
  const visited = new Set<string>();
  const enqueue = (value: string, base: string) => {
    try {
      const target = new URL(value, base);
      if ((sameSourceHost(target, context) || hostIsAuthorized(target.toString(), context)) && pending.length < context.maxDocuments * 4) pending.push(target.toString());
    } catch {
      // Ignore malformed pagination links.
    }
  };
  while (pending.length && documents.length < context.maxDocuments && visited.size < context.maxDocuments * 3) {
    const url = pending.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    try {
      const document = await responseDocument(url, context);
      if (!document) continue;
      const xml = /xml|rss|atom|sitemap/i.test(document.contentType) || /<\?xml|<rss|<feed|<urlset|<sitemapindex/i.test(document.body.slice(0, 300));
      if (xml) {
        const $ = load(document.body, { xmlMode: true });
        const links = [...$('loc').map((_, element) => $(element).text().trim()).get(), ...$('item > link, entry > link').map((_, element) => ($(element).attr('href') || $(element).text()).trim()).get()]
          .filter(Boolean);
        const method: ApprovedMethod = $('urlset, sitemapindex').length > 0 ? 'sitemap' : 'rss';
        if (!authorizedMethod(context.config, method)) continue;
        for (const link of links.filter((item) => /sitemap|\.xml(?:$|\?)/i.test(item))) enqueue(link, document.finalUrl);
        const detailLinks = links.filter((link) => !/sitemap|\.xml(?:$|\?)/i.test(link) && (DETAIL_LINK.test(link) || !$('urlset, sitemapindex').length));
        for (const link of detailLinks.slice(0, context.maxDetailPages)) {
          try {
            const detail = await responseDocument(new URL(link, document.finalUrl).toString(), context);
            if (detail) documents.push(detail);
          } catch (error) { failures.push(error); }
          if (documents.length >= context.maxDocuments) break;
        }
        continue;
      }
      if (!authorizedMethod(context.config, /json/i.test(document.contentType) ? 'api' : 'html')) continue;
      documents.push(document);
      if (/json/i.test(document.contentType)) {
        try {
          const payload = JSON.parse(document.body) as Record<string, unknown>;
          const pagination = payload.pagination && typeof payload.pagination === 'object' ? payload.pagination as Record<string, unknown> : {};
          const links = payload.links && typeof payload.links === 'object' ? payload.links as Record<string, unknown> : {};
          const next = textValue(payload.next ?? payload.next_page ?? payload.nextPage ?? pagination.next ?? links.next);
          if (next) enqueue(next, document.finalUrl);
        } catch {
          // The parser will report malformed JSON without following pagination.
        }
      } else {
        const $ = load(document.body);
        const next = $('link[rel="next"], a[rel="next"]').first().attr('href');
        if (next) enqueue(next, document.finalUrl);
      }
      if (context.maxDetailPages > 0 && !/json/i.test(document.contentType) && !/<script[^>]+application\/ld\+json[^>]*>[\s\S]*?"@type"\s*:\s*"(?:Event|Hackathon)/i.test(document.body)) {
        const $ = load(document.body);
        const links = $('a[href]').map((_, element) => {
          const href = $(element).attr('href');
          if (!href || !DETAIL_LINK.test(`${href} ${$(element).text()}`)) return null;
          try {
            const target = new URL(href, document.finalUrl);
            return sameSourceHost(target, context) ? target.toString() : null;
          } catch { return null; }
        }).get().filter((link): link is string => Boolean(link));
        for (const link of [...new Set(links)].slice(0, context.maxDetailPages)) {
          try {
            const detail = await responseDocument(link, context);
            if (detail) documents.push(detail);
          } catch (error) { failures.push(error); }
          if (documents.length >= context.maxDocuments) break;
        }
      }
    } catch (error) { failures.push(error); }
    if (documents.length >= context.maxDocuments) break;
  }
  if (!documents.length && failures.length) throw failures[0];
  return documents.slice(0, context.maxDocuments);
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key];
  return null;
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.text ?? record.name ?? record.value ?? record.url ?? record.label ?? record.utc ?? null);
  }
  return null;
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function absolute(value: unknown, base: string): string | null {
  const text = textValue(value);
  if (!text) return null;
  try {
    const url = new URL(text, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function collectApiRecords(value: unknown, output: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 8 || output.length >= 500 || !value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectApiRecords(item, output, depth + 1);
    return output;
  }
  const record = value as Record<string, unknown>;
  const hasTitle = firstValue(record, ['title', 'name', 'event_name']);
  const hasStart = firstValue(record, EVENT_DATE_KEYS);
  if (hasTitle && hasStart) output.push(record);
  else for (const nested of Object.values(record)) collectApiRecords(nested, output, depth + 1);
  return output;
}

export function mapApiRecord(record: Record<string, unknown>, document: SourceDocument): RawHackathon {
  const candidate = emptyRawHackathon(document.finalUrl, document.sourcePlatform);
  const location = firstValue(record, ['location', 'venue', 'place']);
  const locationRecord = location && typeof location === 'object' ? location as Record<string, unknown> : {};
  const address = locationRecord.address && typeof locationRecord.address === 'object' ? locationRecord.address as Record<string, unknown> : {};
  const geo = locationRecord.geo && typeof locationRecord.geo === 'object' ? locationRecord.geo as Record<string, unknown> : record;
  const price = firstValue(record, ['priceAmount', 'price_amount', 'price', 'fee', 'cost']);
  const explicitFree = firstValue(record, ['isFree', 'is_free', 'free']);
  candidate.title = textValue(firstValue(record, ['title', 'name', 'event_name']));
  candidate.description = textValue(firstValue(record, ['description', 'summary', 'details', 'content']));
  candidate.organizer = textValue(firstValue(record, ['organizer', 'organizer_name', 'host', 'group']));
  candidate.mode = normalizeMode(textValue(firstValue(record, ['mode', 'attendanceMode', 'eventAttendanceMode', 'format'])));
  candidate.city = textValue(firstValue(record, ['city', 'city_name'])) ?? textValue(address.addressLocality ?? locationRecord.city);
  candidate.area = textValue(firstValue(record, ['area', 'locality', 'neighbourhood', 'neighborhood']));
  candidate.state = textValue(firstValue(record, ['state', 'region'])) ?? textValue(address.addressRegion ?? locationRecord.state);
  candidate.country = textValue(firstValue(record, ['country', 'country_name'])) ?? textValue(address.addressCountry ?? locationRecord.country);
  candidate.venue = textValue(location) ?? textValue(firstValue(record, ['venue_name', 'venueName']));
  candidate.latitude = numberValue(firstValue(record, ['latitude', 'lat']) ?? geo.latitude ?? geo.lat);
  candidate.longitude = numberValue(firstValue(record, ['longitude', 'lng', 'lon']) ?? geo.longitude ?? geo.lng ?? geo.lon);
  candidate.startDate = textValue(firstValue(record, EVENT_DATE_KEYS));
  candidate.endDate = textValue(firstValue(record, ['endDate', 'end_date', 'endAt', 'end_at', 'end', 'ends_at']));
  candidate.registrationDeadline = textValue(firstValue(record, ['registrationDeadline', 'registration_deadline', 'deadline', 'registration_closes_at']));
  candidate.timezone = textValue(firstValue(record, ['timezone', 'timeZone', 'time_zone']));
  candidate.isFree = typeof explicitFree === 'boolean' ? explicitFree : null;
  candidate.priceAmount = numberValue(price);
  if (candidate.isFree === null && candidate.priceAmount !== null) candidate.isFree = candidate.priceAmount === 0;
  candidate.currency = textValue(firstValue(record, ['currency', 'priceCurrency', 'price_currency']))?.toUpperCase() ?? null;
  candidate.prizePool = textValue(firstValue(record, ['prizePool', 'prize_pool', 'prize', 'award', 'awards']));
  const tags = firstValue(record, ['tags', 'keywords', 'themes', 'categories']);
  candidate.tags = Array.isArray(tags) ? tags.map(textValue).filter((tag): tag is string => Boolean(tag)) : textValue(tags)?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
  candidate.eligibility = textValue(firstValue(record, ['eligibility', 'who_can_join', 'whoCanJoin', 'audience']));
  candidate.teamSize = textValue(firstValue(record, ['teamSize', 'team_size', 'team']));
  candidate.imageUrl = absolute(firstValue(record, ['imageUrl', 'image_url', 'image', 'banner', 'logo', 'cover_img', 'thumbnail_url', 'banner_image']), document.finalUrl);
  let officialCandidate = firstValue(record, ['officialUrl', 'official_url', 'registrationUrl', 'registration_url', 'apply_url', 'website', 'website_url', 'event_url', 'url', 'link']);
  let sourceCandidate = firstValue(record, ['sourceUrl', 'source_url', 'public_url', 'url', 'link']);
  if (!officialCandidate && record.slug && typeof record.slug === 'string') {
    if (document.sourcePlatform === 'Devfolio') officialCandidate = `https://${record.slug}.devfolio.co`;
  }
  if (!officialCandidate && record.public_url && typeof record.public_url === 'string') {
    if (document.sourcePlatform === 'Unstop') officialCandidate = `https://unstop.com/${record.public_url}`;
  }
  if (sourceCandidate && typeof sourceCandidate === 'string' && !/^https?:\/\//i.test(sourceCandidate)) {
    if (document.sourcePlatform === 'Unstop') sourceCandidate = `https://unstop.com/${sourceCandidate}`;
  }
  if (!sourceCandidate && record.slug && typeof record.slug === 'string') {
    if (document.sourcePlatform === 'Devfolio') sourceCandidate = `https://devfolio.co/hackathons/${record.slug}`;
  }
  candidate.officialUrl = absolute(officialCandidate, document.finalUrl);
  candidate.sourceUrl = absolute(sourceCandidate, document.finalUrl) ?? document.finalUrl;
  return validateRawHackathon(candidate);
}

export function platformForUrl(value: string, fallback: string): string {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    if (host.includes('devpost')) return 'Devpost';
    if (host.includes('devfolio')) return 'Devfolio';
    if (host.includes('unstop')) return 'Unstop';
    if (host.includes('mlh')) return 'Major League Hacking';
    if (host.includes('hackerearth')) return 'HackerEarth';
    if (host.includes('hack2skill')) return 'Hack2Skill';
    if (host.includes('dorahacks')) return 'DoraHacks';
    if (host.includes('eventbrite')) return 'Eventbrite';
    if (host.includes('lu.ma')) return 'Luma';
    if (host.includes('meetup')) return 'Meetup';
    if (host.includes('townscript')) return 'Townscript';
    if (host.includes('insider')) return 'Insider';
    return host;
  } catch { return fallback; }
}

export async function parseConfiguredDocuments(documents: SourceDocument[], context: DiscoveryContext): Promise<ParsedHackathon[]> {
  const parsed: ParsedHackathon[] = [];
  for (const document of documents) {
    try {
      if (/json/i.test(document.contentType) || /^[\s]*[\[{]/.test(document.body)) {
        const records = collectApiRecords(JSON.parse(document.body));
        for (const record of records) parsed.push({ data: mapApiRecord(record, document), extractionMethod: 'api', document });
      } else {
        const extracted = extractDocument(document, context.config.selectors);
        parsed.push({ data: extracted.data, extractionMethod: extracted.method, document });
      }
    } catch {
      // A malformed document does not prevent other documents or sources from being parsed.
    }
  }
  return parsed;
}

export function hostIsAuthorized(url: string, context: DiscoveryContext): boolean {
  try {
    const host = new URL(url).hostname;
    return context.authorizedSourceHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch { return false; }
}

export async function searchResultDocuments(results: Record<string, unknown>[], context: DiscoveryContext): Promise<SourceDocument[]> {
  const documents: SourceDocument[] = [];
  for (const result of results.slice(0, context.maxDocuments)) {
    const url = textValue(result.url ?? result.link);
    if (!url) continue;
    const platform = platformForUrl(url, context.config.platform);
    const snippet: Record<string, unknown> = {
      title: result.title ?? null,
      description: result.description ?? result.content ?? result.snippet ?? null,
      url,
      startDate: result.startDate ?? result.start_date ?? null,
    };
    documents.push({ url, finalUrl: url, body: JSON.stringify([snippet]), contentType: 'application/json', sourcePlatform: platform });
    if (context.maxDetailPages > 0 && hostIsAuthorized(url, context)) {
      try {
        const detail = await responseDocument(url, context);
        if (detail) documents.push({ ...detail, sourcePlatform: platform });
      } catch {
        // Search snippets remain available; an unresponsive detail page is isolated.
      }
    }
    if (documents.length >= context.maxDocuments) break;
  }
  return documents.slice(0, context.maxDocuments);
}
