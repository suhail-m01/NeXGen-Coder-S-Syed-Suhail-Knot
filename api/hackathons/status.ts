import { createHackathonsStatusHandler } from '../../agents/hackathon/apiHandlers';

export const config = { maxDuration: 15 };

export default createHackathonsStatusHandler();
