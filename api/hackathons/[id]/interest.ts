import { createInterestHandler } from '../../../agents/hackathon/apiHandlers';

const baseHandler = createInterestHandler();

export default async function handler(req: any, res: any) {
  try {
    return await baseHandler(req, res);
  } catch (error) {
    console.error('Unhandled API error in /api/hackathons/[id]/interest:', error);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Interest could not be recorded. Please retry.' });
    }
  }
}
