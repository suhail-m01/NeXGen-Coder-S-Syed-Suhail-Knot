import { createHackathonsHandler } from '../../agents/hackathon/apiHandlers';

const baseHandler = createHackathonsHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled API error in /api/hackathons:', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Hackathon discovery is temporarily unavailable. Please retry.' });
    }
  }
}
