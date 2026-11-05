import { z } from 'zod';
import { HACKATHON_MODES, type RawHackathon } from './types';

const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable();
const nullableUrl = z.string().url().max(2048).nullable();
const nullableDate = z.string().trim().min(4).max(80).nullable();

export const rawHackathonSchema = z.strictObject({
  title: nullableText(240),
  description: nullableText(20_000),
  organizer: nullableText(240),
  mode: z.enum(HACKATHON_MODES).nullable(),
  city: nullableText(120),
  area: nullableText(120),
  state: nullableText(120),
  country: nullableText(120),
  venue: nullableText(300),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
  startDate: nullableDate,
  endDate: nullableDate,
  registrationDeadline: nullableDate,
  timezone: nullableText(80),
  isFree: z.boolean().nullable(),
  priceAmount: z.number().finite().nonnegative().nullable(),
  currency: z.string().trim().length(3).nullable(),
  prizePool: nullableText(160),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  eligibility: nullableText(5000),
  teamSize: nullableText(120),
  imageUrl: nullableUrl,
  officialUrl: nullableUrl,
  sourceUrl: z.string().url().max(2048),
  sourcePlatform: z.string().trim().min(1).max(80),
}).strict();

export const emptyRawHackathon = (sourceUrl: string, sourcePlatform: string): RawHackathon => ({
  title: null,
  description: null,
  organizer: null,
  mode: null,
  city: null,
  area: null,
  state: null,
  country: null,
  venue: null,
  latitude: null,
  longitude: null,
  startDate: null,
  endDate: null,
  registrationDeadline: null,
  timezone: null,
  isFree: null,
  priceAmount: null,
  currency: null,
  prizePool: null,
  tags: [],
  eligibility: null,
  teamSize: null,
  imageUrl: null,
  officialUrl: null,
  sourceUrl,
  sourcePlatform,
});

export function validateRawHackathon(value: unknown): RawHackathon {
  return rawHackathonSchema.parse(value);
}
