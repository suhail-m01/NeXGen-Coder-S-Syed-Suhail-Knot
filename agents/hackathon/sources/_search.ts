import type { DiscoveryContext, SourceDocument } from '../types';
import { searchResultDocuments } from './_shared';

export async function runSearchQueries(
  context: DiscoveryContext,
  search: (query: string) => Promise<Record<string, unknown>[]>,
): Promise<SourceDocument[]> {
  if (!context.apiKey) return [];
  const documents: SourceDocument[] = [];
  const errors: unknown[] = [];
  for (const query of context.queries) {
    try {
      const results = await search(query);
      const remaining = context.maxDocuments - documents.length;
      documents.push(...await searchResultDocuments(results, { ...context, maxDocuments: remaining }));
    } catch (error) { errors.push(error); }
    if (documents.length >= context.maxDocuments) break;
  }
  if (!documents.length && errors.length) throw errors[0];
  return documents.slice(0, context.maxDocuments);
}
