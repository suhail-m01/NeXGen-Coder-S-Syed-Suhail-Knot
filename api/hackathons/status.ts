import { createHackathonsStatusHandler } from '../../agents/hackathon/apiHandlers';

export const config = { maxDuration: 15 };

const baseHandler = createHackathonsStatusHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled status error:', error);
    if (!res.headersSent) {
      res.status(503).json({
        lastRunAt: null,
        lastStatus: 'unavailable',
        totalUpcoming: 0,
        perSource: {},
      });
    }
  }
}
