import type { DiscoveryContext, SourceDocument } from '../types';
import { parseConfiguredDocuments } from './_shared';
import { runSearchQueries } from './_search';

export async function discover(context: DiscoveryContext): Promise<SourceDocument[]> {
  const endpoint = context.config.discoveryUrls[0];
  if (!endpoint) return [];
  return runSearchQueries(context, async (query) => {
    const url = new URL(endpoint);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('num', '5');
    url.searchParams.set('api_key', context.apiKey ?? '');
    const response = await context.http.get(url.toString(), { accept: 'application/json', checkRobots: false });
    if (response.status !== 200) throw new Error(`SerpAPI search returned ${response.status}.`);
    const payload = JSON.parse(response.body) as { organic_results?: Record<string, unknown>[] };
    return Array.isArray(payload.organic_results) ? payload.organic_results : [];
  });
}
export const parse = (documents: SourceDocument[], context: DiscoveryContext) => parseConfiguredDocuments(documents, context);
