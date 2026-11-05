import { rawHackathonSchema } from './schemas';
import { htmlToText } from './extract';
import type { RawHackathon, SourceDocument } from './types';

interface LlmOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function extractWithLlm(document: SourceDocument, options: LlmOptions): Promise<RawHackathon | null> {
  const sourceText = htmlToText(document.body).replace(/\s+/g, ' ').trim().slice(0, 60_000);
  if (!sourceText) return null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: options.model, max_tokens: 2400, temperature: 0,
          system: 'Extract hackathon facts only when explicitly supported by the supplied source. Never guess, infer a favourable value, or complete missing details. Return one strict JSON object with every requested key. Unknown scalar values are null and unknown tags are []. Dates must retain any source timezone/offset. officialUrl must be a source-supported organizer or listing URL.',
          messages: [{ role: 'user', content: `Source URL: ${document.finalUrl}\nSource platform: ${document.sourcePlatform}\nRequired keys: title, description, organizer, mode (online|offline|hybrid|null), city, area, state, country, venue, latitude, longitude, startDate, endDate, registrationDeadline, timezone, isFree, priceAmount, currency, prizePool, tags, eligibility, teamSize, imageUrl, officialUrl, sourceUrl, sourcePlatform.\n\nSOURCE TEXT:\n${sourceText}` }],
        }),
        signal: controller.signal,
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (!response.ok) return null;
      const payload = await response.json() as { content?: { type: string; text?: string }[] };
      const content = payload.content?.find((item) => item.type === 'text')?.text?.trim();
      if (!content) return null;
      const json = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const parsed: unknown = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return rawHackathonSchema.parse({ ...parsed, sourceUrl: document.finalUrl, sourcePlatform: document.sourcePlatform });
    } catch {
      if (attempt === 2) return null;
      await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
