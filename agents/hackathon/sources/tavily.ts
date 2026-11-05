import type { DiscoveryContext, SourceDocument } from '../types';
import { parseConfiguredDocuments } from './_shared';
import { runSearchQueries } from './_search';

export async function discover(context: DiscoveryContext): Promise<SourceDocument[]> {
  const endpoint = context.config.discoveryUrls[0];
  if (!endpoint) return [];
  return runSearchQueries(context, async (query) => {
    const response = await context.http.request(endpoint, {
      method: 'POST', accept: 'application/json', checkRobots: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: context.apiKey, query, max_results: 5, include_answer: false }),
    });
    if (response.status !== 200) throw new Error(`Tavily search returned ${response.status}.`);
    const payload = JSON.parse(response.body) as { results?: Record<string, unknown>[] };
    return Array.isArray(payload.results) ? payload.results : [];
  });
}
export const parse = (documents: SourceDocument[], context: DiscoveryContext) => parseConfiguredDocuments(documents, context);
