import { createInterestHandler } from '../../../agents/hackathon/apiHandlers';
import { LIVE_VERIFIED_HACKATHONS } from '../../../src/features/hackathons/liveSeed';

const baseHandler = createInterestHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled API error in /api/hackathons/[id]/interest:', error);
    if (!res.headersSent) {
      const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
      const seed = LIVE_VERIFIED_HACKATHONS.find((h) => h.id === id);
      if (seed) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Fallback-Source', 'live-seed-interest');
        res.status(200).json({
          interestId: `fallback-interest-${Math.random().toString(36).slice(2, 9)}`,
          officialUrl: seed.officialUrl,
          officialUrlVerified: seed.officialUrlVerified,
          saved: false,
        });
        return;
      }
      res.status(503).json({ error: 'Interest could not be recorded. Please retry.' });
    }
  }
}
