import { createHackathonsHandler } from '../../agents/hackathon/apiHandlers';
import { filterLiveSeedHackathons } from '../../src/features/hackathons/liveSeed';

const baseHandler = createHackathonsHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled API error in /api/hackathons:', error);
    if (!res.headersSent) {
      try {
        const fallback = filterLiveSeedHackathons(req.query || {});
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        res.setHeader('X-Fallback-Source', 'live-seed-unhandled');
        res.status(200).json(fallback);
      } catch {
        res.status(503).json({ error: 'Hackathon discovery is temporarily unavailable. Please retry.' });
      }
    }
  }
}
