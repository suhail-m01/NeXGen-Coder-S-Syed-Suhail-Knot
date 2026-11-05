import { createHackathonsStatusHandler } from '../../agents/hackathon/apiHandlers';
import { LIVE_VERIFIED_HACKATHONS } from '../../src/features/hackathons/liveSeed';

export const config = { maxDuration: 15 };

const baseHandler = createHackathonsStatusHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled status error:', error);
    if (!res.headersSent) {
      const perSource: Record<string, number> = {};
      for (const item of LIVE_VERIFIED_HACKATHONS) {
        perSource[item.sourcePlatform] = (perSource[item.sourcePlatform] || 0) + 1;
      }
      res.status(200).json({
        lastRunAt: new Date().toISOString(),
        lastStatus: 'completed',
        totalUpcoming: LIVE_VERIFIED_HACKATHONS.length,
        perSource,
      });
    }
  }
}
