import type { DiscoveryContext, SourceDocument } from '../types';
import { parseConfiguredDocuments } from './_shared';
import { runSearchQueries } from './_search';

export async function discover(context: DiscoveryContext): Promise<SourceDocument[]> {
  const endpoint = context.config.discoveryUrls[0];
  if (!endpoint) return [];
  return runSearchQueries(context, async (query) => {
    const url = new URL(endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', '5');
    const response = await context.http.get(url.toString(), { accept: 'application/json', checkRobots: false, headers: { 'X-Subscription-Token': context.apiKey ?? '' } });
    if (response.status !== 200) throw new Error(`Brave search returned ${response.status}.`);
    const payload = JSON.parse(response.body) as { web?: { results?: Record<string, unknown>[] } };
    return Array.isArray(payload.web?.results) ? payload.web.results : [];
  });
}
export const parse = (documents: SourceDocument[], context: DiscoveryContext) => parseConfiguredDocuments(documents, context);
