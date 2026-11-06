import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  filterLiveSeedHackathons,
  LIVE_VERIFIED_HACKATHONS,
} from '../../src/features/hackathons/liveSeed';

// Development browsing is intentionally network-inactive. Explicit agent CLI runs
// are the only path that should make source requests.

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function adapter(res: ServerResponse): any {
  return {
    status(code: number) {
      res.statusCode = code;
      return {
        json: (body: unknown) => json(res, code, body),
      };
    },
    setHeader: (name: string, value: string | number) => res.setHeader(name, value),
  };
}

export function hackathonsDevApiPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url || !req.url.startsWith('/api/hackathons')) return next();
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:5174'}`);
    const query = Object.fromEntries(url.searchParams.entries());

    if (url.pathname === '/api/hackathons/status' && req.method === 'GET') {
      try {
        if (process.env.DATABASE_URL?.trim()) {
          const { createHackathonsStatusHandler } = await import('./apiHandlers');
          return await createHackathonsStatusHandler()(
            { method: 'GET', query: {}, headers: req.headers as Record<string, string>, socket: req.socket },
            adapter(res),
          );
        }
        res.setHeader('Cache-Control', 'no-store');
        return json(res, 200, {
          lastRunAt: null,
          lastStatus: 'unconfigured',
          totalUpcoming: 0,
          perSource: {},
        });
      } catch (error) {
        console.warn('[Vite Dev API] Status unavailable:', error);
        return json(res, 503, { lastRunAt: null, lastStatus: 'unavailable', totalUpcoming: 0, perSource: {} });
      }
    }

    if (url.pathname === '/api/hackathons' && req.method === 'GET') {
      try {
        if (process.env.DATABASE_URL?.trim()) {
          const { createHackathonsHandler } = await import('./apiHandlers');
          return await createHackathonsHandler()(
            { method: 'GET', query, headers: req.headers as Record<string, string>, socket: req.socket },
            adapter(res),
          );
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Fallback-Source', 'curated-snapshot');
        return json(res, 200, filterLiveSeedHackathons(query));
      } catch (error) {
        console.warn('[Vite Dev API] Hackathon list unavailable:', error);
        return json(res, 503, { error: 'Hackathon discovery is temporarily unavailable.' });
      }
    }

    const interestMatch = /^\/api\/hackathons\/([^/]+)\/interest$/.exec(url.pathname);
    if (interestMatch && req.method === 'POST') {
      const id = interestMatch[1];
      const item = LIVE_VERIFIED_HACKATHONS.find((candidate) => candidate.id === id);
      if (!item) return json(res, 404, { error: 'Hackathon not found in the curated snapshot.' });
      return json(res, 200, {
        interestId: `curated-handoff-${item.id}`,
        officialUrl: item.officialUrl,
        officialUrlVerified: item.officialUrlVerified,
        saved: false,
        recorded: false,
      });
    }

    next();
  };

  return {
    name: 'knot-hackathons-dev-api',
    configureServer(server) {
      (server.middlewares.stack as Array<any>).unshift({ route: '', handle: handler });
    },
    configurePreviewServer(server) {
      (server.middlewares.stack as Array<any>).unshift({ route: '', handle: handler });
    },
  };
}
