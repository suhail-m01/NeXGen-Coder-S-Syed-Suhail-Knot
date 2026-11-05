import type { HttpClient, RawHackathon } from './types';

const TRACKERS = new Set(['fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid', 'ref_src', 'spm']);
const AGGREGATOR_HOSTS = [
  'devpost.com', 'mlh.io', 'devfolio.co', 'unstop.com', 'hackerearth.com',
  'hack2skill.com', 'dorahacks.io', 'eventbrite.com', 'lu.ma', 'meetup.com',
  'townscript.com', 'insider.in',
];
const SPAM_CONTENT = /(?:domain\s+(?:is\s+)?for\s+sale|buy\s+this\s+domain|casino|online\s+betting|pornographic)/i;

export function stripTrackingUrl(value: string): string {
  const url = new URL(value);
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.hash = '';
  return url.toString();
}

export function hostMatches(hostname: string, domain: string): boolean {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  return host === normalized || host.endsWith(`.${normalized}`);
}

export function isAggregatorUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return AGGREGATOR_HOSTS.some((domain) => hostMatches(hostname, domain));
  } catch { return false; }
}

export interface VerifiedUrl {
  officialUrl: string;
  officialUrlVerified: boolean;
}

export async function verifyOfficialUrl(value: string, http: HttpClient): Promise<VerifiedUrl | null> {
  try {
    const candidate = stripTrackingUrl(value);
    const response = await http.get(candidate, { accept: 'text/html,application/xhtml+xml;q=0.9' });
    if (response.status !== 200) return null;
    if (response.contentType && !/text\/html|application\/xhtml\+xml/.test(response.contentType)) return null;
    if (SPAM_CONTENT.test(response.finalUrl) || SPAM_CONTENT.test(response.body.slice(0, 100_000))) return null;
    const officialUrl = stripTrackingUrl(response.finalUrl);
    return { officialUrl, officialUrlVerified: !isAggregatorUrl(officialUrl) };
  } catch {
    return null;
  }
}

export async function verifyHackathonUrl(raw: RawHackathon, http: HttpClient): Promise<VerifiedUrl | null> {
  const candidates = [...new Set([raw.officialUrl, raw.sourceUrl].filter((url): url is string => Boolean(url)))]
    .sort((a, b) => Number(isAggregatorUrl(a)) - Number(isAggregatorUrl(b)));
  for (const candidate of candidates) {
    const verified = await verifyOfficialUrl(candidate, http);
    if (verified) return verified;
  }
  return null;
}
