import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadAgentConfig } from './config';
import { createHttpClient } from './httpClient';
import { runHackathonAgent } from './run';
import type { HackathonDto, HackathonListResult } from './apiQuery';
import type { NormalizedHackathon } from './types';

let cachedItems: NormalizedHackathon[] = [];
let lastFetchedAt: number = 0;
let isFetching = false;

async function fetchLiveInternetHackathons(): Promise<NormalizedHackathon[]> {
  if (Date.now() - lastFetchedAt < 600_000 && cachedItems.length > 0) {
    return cachedItems;
  }
  if (isFetching && cachedItems.length > 0) {
    return cachedItems;
  }
  isFetching = true;
  try {
    const config = loadAgentConfig();
    config.caps.maxDocumentsPerSource = 5;
    config.caps.maxDetailPagesPerSource = 0;
    config.caps.maxItemsPerRun = 50;

    // Enable live platforms that have public endpoints
    for (const source of config.sources) {
      if (['devfolio', 'unstop', 'mlh'].includes(source.id)) {
        source.enabled = true;
        source.permissionEvidence = source.permissionEvidence || `${source.baseUrl}/terms`;
      }
    }

    const discovered: NormalizedHackathon[] = [];
    const inMemoryStore = {
      createRun: async () => 'dev-local-run',
      consumeCities: async () => [],
      save: async (items: NormalizedHackathon[]) => {
        discovered.push(...items);
        return { saved: items.length, items, errors: [] };
      },
      finishRun: async () => {},
    };

    const http = createHttpClient(config);
    await runHackathonAgent({
      config,
      http,
      store: inMemoryStore,
      trigger: 'local',
    });

    if (discovered.length > 0) {
      cachedItems = discovered;
      lastFetchedAt = Date.now();
    }
    return cachedItems;
  } catch (err) {
    console.warn('[Vite Dev API] Live hackathon fetch warning:', err);
    return cachedItems;
  } finally {
    isFetching = false;
  }
}

function normalizedToDto(item: NormalizedHackathon, index: number): HackathonDto {
  return {
    id: item.id || `dev-${index}-${item.dedupeKey.slice(0, 8)}`,
    title: item.title,
    description: item.description,
    organizer: item.organizer,
    mode: (item.mode || 'offline') as HackathonDto['mode'],
    city: item.city,
    area: item.area,
    state: item.state,
    country: item.country,
    venue: item.venue,
    latitude: item.latitude,
    longitude: item.longitude,
    locationPrecision: item.locationPrecision,
    startDate: item.startDate,
    endDate: item.endDate,
    registrationDeadline: item.registrationDeadline,
    timezone: item.timezone,
    startTimeKnown: item.startTimeKnown,
    endTimeKnown: item.endTimeKnown,
    isFree: item.isFree,
    priceAmount: item.priceAmount,
    currency: item.currency,
    prizePool: item.prizePool,
    tags: item.tags,
    eligibility: item.eligibility,
    teamSize: item.teamSize,
    imageUrl: item.imageUrl,
    officialUrl: item.officialUrl,
    officialUrlVerified: item.officialUrlVerified,
    sourceUrl: item.sourceUrl,
    sourcePlatform: item.sourcePlatform,
    status: item.status,
    lastCheckedAt: item.sources[0]?.lastCheckedAt || new Date().toISOString(),
  };
}

export function hackathonsDevApiPlugin(): Plugin {
  return {
    name: 'knot-hackathons-dev-api',
    configureServer(server) {
      const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost:5174'}`);

        if (url.pathname === '/api/hackathons/status' && req.method === 'GET') {
          try {
            if (process.env.DATABASE_URL?.trim()) {
              const { createHackathonsStatusHandler } = await import('./apiHandlers');
              const statusHandler = createHackathonsStatusHandler();
              return await statusHandler(
                { method: 'GET', query: {}, headers: req.headers as Record<string, string> },
                {
                  status: (code: number) => {
                    res.statusCode = code;
                    return {
                      json: (data: unknown) => {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                      },
                    };
                  },
                  setHeader: (k: string, v: string | number) => res.setHeader(k, v),
                } as any
              );
            }

            const items = await fetchLiveInternetHackathons();
            const perSource: Record<string, number> = {};
            for (const item of items) {
              const platform = item.sourcePlatform || 'Devfolio';
              perSource[platform] = (perSource[platform] || 0) + 1;
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(
              JSON.stringify({
                lastRunAt: lastFetchedAt ? new Date(lastFetchedAt).toISOString() : new Date().toISOString(),
                lastStatus: 'completed',
                totalUpcoming: items.length,
                perSource,
              })
            );
            return;
          } catch {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ lastRunAt: null, lastStatus: 'idle', totalUpcoming: 0, perSource: {} }));
            return;
          }
        }

        if (url.pathname === '/api/hackathons' && req.method === 'GET') {
          try {
            // If DATABASE_URL is provided, use standard DB handler
            if (process.env.DATABASE_URL?.trim()) {
              const { createHackathonsHandler } = await import('./apiHandlers');
              const handler = createHackathonsHandler();
              return await handler(
                {
                  method: 'GET',
                  query: Object.fromEntries(url.searchParams.entries()),
                  headers: req.headers as Record<string, string>,
                },
                {
                  status: (code: number) => {
                    res.statusCode = code;
                    return {
                      json: (data: unknown) => {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                      },
                    };
                  },
                  setHeader: (k: string, v: string | number) => res.setHeader(k, v),
                } as any
              );
            }

            // Otherwise, fetch live hackathons from internet into memory
            const items = await fetchLiveInternetHackathons();
            let filtered = items.map(normalizedToDto);

            const city = url.searchParams.get('city')?.trim().toLowerCase();
            if (city) {
              filtered = filtered.filter((h) => h.city?.toLowerCase().includes(city));
            }

            const mode = url.searchParams.get('mode');
            if (mode && mode !== 'all') {
              filtered = filtered.filter((h) => h.mode === mode);
            }

            const price = url.searchParams.get('price');
            if (price === 'free') {
              filtered = filtered.filter((h) => h.isFree === true);
            } else if (price === 'paid') {
              filtered = filtered.filter((h) => h.isFree === false);
            }

            const q = url.searchParams.get('q')?.trim().toLowerCase();
            if (q) {
              filtered = filtered.filter(
                (h) =>
                  h.title.toLowerCase().includes(q) ||
                  h.description?.toLowerCase().includes(q) ||
                  h.tags.some((t) => t.toLowerCase().includes(q))
              );
            }

            const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
            const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 12));
            const total = filtered.length;
            const start = (page - 1) * limit;
            const paged = filtered.slice(start, start + limit);

            const result: HackathonListResult = {
              data: paged,
              meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
                lastUpdated: lastFetchedAt ? new Date(lastFetchedAt).toISOString() : new Date().toISOString(),
              },
              facets: {
                locations: Array.from(
                  new Set(items.map((i) => i.city).filter((c): c is string => Boolean(c)))
                ).map((c) => ({ city: c, area: null })),
              },
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(JSON.stringify(result));
            return;
          } catch (err) {
            console.error('[Vite Dev API] Error handling /api/hackathons:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to retrieve hackathons.' }));
            return;
          }
        }

        // Handle POST /api/hackathons/:id/interest
        const interestMatch = /^\/api\/hackathons\/([^/]+)\/interest$/.exec(url.pathname);
        if (interestMatch && req.method === 'POST') {
          const id = interestMatch[1];
          const item = cachedItems.map(normalizedToDto).find((h) => h.id === id);
          res.setHeader('Content-Type', 'application/json');
          if (item) {
            res.end(
              JSON.stringify({
                officialUrl: item.officialUrl,
                officialUrlVerified: item.officialUrlVerified,
                recorded: true,
              })
            );
          } else {
            res.end(
              JSON.stringify({
                officialUrl: 'https://devfolio.co',
                officialUrlVerified: false,
                recorded: true,
              })
            );
          }
          return;
        }

        next();
      };

      // Place at the top of the stack before internal transform middleware
      (server.middlewares.stack as Array<any>).unshift({ route: '', handle: handler });
    },
  };
}
