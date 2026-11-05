import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import robotsParser from 'robots-parser';
import type { AgentConfig, HttpClient, HttpRequestOptions, HttpResponse } from './types';

const DEFAULT_ACCEPT = 'application/ld+json, application/json, application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.1';
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'HttpError';
  }
}

function displayUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return 'invalid URL';
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized.includes(':')) {
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
  }
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224
    || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 192 && parts[1] === 0) || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19));
}

export async function assertPublicHttpUrl(value: string, allowPrivateHosts = false): Promise<URL> {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new HttpError('Only credential-free HTTP(S) URLs are accepted.');
  if (url.protocol !== 'https:' && !allowPrivateHosts) throw new HttpError('HTTPS is required for live source collection.');
  const hostname = url.hostname.toLowerCase();
  if (!allowPrivateHosts) {
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw new HttpError('Private hostnames are not collected.');
    if (isIP(hostname) && isPrivateAddress(hostname)) throw new HttpError('Private network addresses are not collected.');
    if (!isIP(hostname)) {
      let addresses;
      try {
        addresses = await lookup(hostname, { all: true, verbatim: true });
      } catch {
        throw new HttpError(`Could not resolve ${displayUrl(value)}.`);
      }
      if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new HttpError('A public DNS result is required; private or mixed DNS answers are rejected.');
    }
  }
  return url;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(`Response exceeded the ${maxBytes}-byte cap.`);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function retryDelay(response: Response | null, attempt: number): number {
  const header = response?.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    const date = Date.parse(header);
    if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1000));
    if (Number.isFinite(date)) return Math.min(30_000, Math.max(0, date - Date.now()));
  }
  return Math.min(10_000, 500 * 2 ** attempt + Math.floor(Math.random() * 200));
}

export function createHttpClient(config: AgentConfig): HttpClient {
  const cache = new Map<string, Promise<HttpResponse>>();
  const robotsCache = new Map<string, Promise<ReturnType<typeof robotsParser> | null>>();
  const domainChains = new Map<string, Promise<void>>();
  const domainLastRequest = new Map<string, number>();

  async function withDomainSlot<T>(hostname: string, task: () => Promise<T>): Promise<T> {
    const previous = domainChains.get(hostname) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const chain = previous.then(() => current);
    domainChains.set(hostname, chain);
    await previous;
    try {
      const elapsed = Date.now() - (domainLastRequest.get(hostname) ?? 0);
      if (elapsed < config.domainDelayMs) await sleep(config.domainDelayMs - elapsed);
      domainLastRequest.set(hostname, Date.now());
      return await task();
    } finally {
      release();
      if (domainChains.get(hostname) === chain) domainChains.delete(hostname);
    }
  }

  async function fetchOnce(url: URL, options: HttpRequestOptions): Promise<HttpResponse> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= config.retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      try {
        const response = await fetch(url, {
          method: options.method ?? 'GET',
          headers: {
            'User-Agent': config.userAgent,
            Accept: options.accept ?? DEFAULT_ACCEPT,
            'Accept-Language': 'en-IN,en;q=0.9',
            ...options.headers,
          },
          body: options.body,
          redirect: 'manual',
          signal: controller.signal,
        });
        if ((response.status === 429 || response.status >= 500) && attempt < config.retries) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        const body = response.status >= 300 && response.status < 400 ? '' : await readLimitedBody(response, config.caps.maxResponseBytes);
        return {
          status: response.status,
          url: url.toString(),
          finalUrl: url.toString(),
          body,
          contentType: response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '',
          headers: response.headers,
          fromCache: false,
        };
      } catch (error) {
        lastError = error;
        if (attempt < config.retries) await sleep(retryDelay(null, attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new HttpError(`Request failed for ${displayUrl(url.toString())}: ${lastError instanceof Error ? lastError.message : 'unknown network error'}`);
  }

  async function robotsFor(url: URL, allowPrivateHosts: boolean): Promise<ReturnType<typeof robotsParser> | null> {
    const robotsUrl = `${url.origin}/robots.txt`;
    let pending = robotsCache.get(robotsUrl);
    if (!pending) {
      pending = (async () => {
        const response = await request(robotsUrl, { checkRobots: false, accept: 'text/plain', allowPrivateHosts });
        if ([404, 410].includes(response.status)) return null;
        if ([401, 403].includes(response.status)) throw new HttpError(`Robots access is denied at ${displayUrl(robotsUrl)}; collection is skipped.`);
        if (response.status !== 200) throw new HttpError(`Robots could not be verified at ${displayUrl(robotsUrl)} (${response.status}); collection is skipped.`);
        return robotsParser(robotsUrl, response.body);
      })();
      robotsCache.set(robotsUrl, pending);
    }
    return pending;
  }

  async function assertRobotsAllowed(url: URL, allowPrivateHosts: boolean): Promise<void> {
    const robots = await robotsFor(url, allowPrivateHosts);
    if (!robots) return;
    if (!robots.isAllowed(url.toString(), 'KnotBot')) throw new HttpError(`Robots.txt disallows ${displayUrl(url.toString())}.`);
    const crawlDelay = robots.getCrawlDelay('KnotBot');
    if (crawlDelay && crawlDelay * 1000 > config.domainDelayMs) await sleep(Math.min(30_000, crawlDelay * 1000 - config.domainDelayMs));
  }

  async function fetchWithRedirects(startUrl: URL, options: HttpRequestOptions): Promise<HttpResponse> {
    let current = startUrl;
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      await assertPublicHttpUrl(current.toString(), options.allowPrivateHosts);
      if (options.checkRobots !== false) await assertRobotsAllowed(current, Boolean(options.allowPrivateHosts));
      const response = await withDomainSlot(current.hostname, () => fetchOnce(current, options));
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get('location');
      if (!location || redirects === 5) throw new HttpError(`Redirect limit or Location failure at ${displayUrl(current.toString())}.`);
      current = new URL(location, current);
      if (response.status === 303) options = { ...options, method: 'GET', body: undefined };
    }
    throw new HttpError('Unreachable redirect state.');
  }

  async function request(value: string, options: HttpRequestOptions = {}): Promise<HttpResponse> {
    const headerKey = Object.entries(options.headers ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key.toLowerCase()}:${value}`).join('|');
    const key = `${options.method ?? 'GET'}:${options.allowPrivateHosts ? 'private' : 'public'}:${options.checkRobots === false ? 'no-robots' : 'robots'}:${value}:${options.accept ?? DEFAULT_ACCEPT}:${options.body ?? ''}:${headerKey}`;
    const cached = cache.get(key);
    if (cached && (options.method ?? 'GET') === 'GET') {
      const response = await cached;
      return { ...response, fromCache: true };
    }
    const pending = fetchWithRedirects(new URL(value), options).then((response) => ({ ...response, finalUrl: response.url }));
    if ((options.method ?? 'GET') === 'GET') cache.set(key, pending);
    try {
      return await pending;
    } catch (error) {
      cache.delete(key);
      throw error;
    }
  }

  return {
    request,
    get: (url, options) => request(url, { ...options, method: 'GET' }),
  };
}
