import { loadAgentConfig, sourceIsAuthorized } from './config';
import { dedupeHackathons } from './dedupe';
import { createHttpClient } from './httpClient';
import { extractWithLlm } from './llm';
import { buildDiscoveryQueries } from './queries';
import { normalizeHackathon } from './normalize';
import { CONNECTORS } from './sources';
import { consumeRequestedCities, createAgentRun, finishAgentRun, saveHackathons } from './store';
import type { AgentConfig, AgentRunResult, HttpClient, NormalizedHackathon, SourceRunStat } from './types';
import { verifyHackathonUrl } from './verify';

interface AgentStore {
  createRun(trigger: 'manual' | 'cron' | 'local', sources: string[]): Promise<string>;
  finishRun(runId: string, result: AgentRunResult): Promise<void>;
  consumeCities(runId: string): Promise<string[]>;
  save(items: NormalizedHackathon[]): Promise<{ saved: number; items: NormalizedHackathon[]; errors: string[] }>;
}

const defaultStore: AgentStore = {
  createRun: createAgentRun,
  finishRun: finishAgentRun,
  consumeCities: consumeRequestedCities,
  save: saveHackathons,
};

const dryRunStore: AgentStore = {
  createRun: async () => `dry-run-${Date.now()}`,
  finishRun: async () => {},
  consumeCities: async () => [],
  save: async (items: NormalizedHackathon[]) => ({ saved: items.length, items, errors: [] }),
};

export interface RunAgentOptions {
  config?: AgentConfig;
  http?: HttpClient;
  store?: AgentStore;
  trigger?: 'manual' | 'cron' | 'local';
  now?: Date;
  dryRun?: boolean;
  shard?: { index: number; total: number };
  sourceIds?: string[];
}

export async function runHackathonAgent(options: RunAgentOptions = {}): Promise<AgentRunResult> {
  const config = options.config ?? loadAgentConfig();
  const http = options.http ?? createHttpClient(config);
  const store = options.store ?? (options.dryRun ? dryRunStore : defaultStore);
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const sourceStats: SourceRunStat[] = [];
  const errors: string[] = [];
  let runId: string | null = null;
  let itemsFound = 0;
  let itemsSaved = 0;
  try {
    runId = await store.createRun(options.trigger ?? 'manual', config.sources.map((source) => source.id));
    const requestedCities = await store.consumeCities(runId);
    let queries = buildDiscoveryQueries(now, requestedCities, config.caps.maxQueries);
    const authorizedHosts = config.sources.filter(sourceIsAuthorized).map((source) => new URL(source.baseUrl).hostname);
    let activeSources = config.sources.slice(0, config.caps.maxSources);

    if (options.sourceIds && options.sourceIds.length > 0) {
      const allowed = new Set(options.sourceIds.map((s) => s.trim().toLowerCase()));
      activeSources = activeSources.filter((s) => allowed.has(s.id.toLowerCase()));
    }
    if (options.shard && options.shard.total > 1) {
      const { index, total } = options.shard;
      activeSources = activeSources.filter((_, idx) => idx % total === index);
      queries = queries.filter((_, idx) => idx % total === index);
    }

    const collected: NormalizedHackathon[] = [];
    let llmCalls = 0;
    let cursor = 0;

    async function worker(): Promise<void> {
      while (cursor < activeSources.length) {
        const source = activeSources[cursor];
        cursor += 1;
        const connector = CONNECTORS[source.id];
        const stat: SourceRunStat = { source: source.id, discovered: 0, parsed: 0, skipped: false, error: null };
        sourceStats.push(stat);
        if (!connector || !sourceIsAuthorized(source)) {
          stat.skipped = true;
          stat.error = 'Disabled until approved methods and permission evidence are configured.';
          continue;
        }
        const apiKey = source.apiKeyEnv === 'SEARCH_API_KEY' ? config.searchApiKey : source.apiKeyEnv ? process.env[source.apiKeyEnv]?.trim() || null : null;
        if (source.apiKeyEnv && !apiKey) {
          stat.skipped = true;
          stat.error = `${source.apiKeyEnv} is not configured.`;
          continue;
        }
        try {
          const context = {
            config: source, http, queries, now, maxDocuments: config.caps.maxDocumentsPerSource,
            maxDetailPages: config.caps.maxDetailPagesPerSource, apiKey, authorizedSourceHosts: authorizedHosts,
          };
          const documents = await connector.discover(context);
          stat.discovered = documents.length;
          const parsed = await connector.parse(documents, context);
          for (const candidate of parsed) {
            try {
              let data = candidate.data;
              let method = candidate.extractionMethod;
              if ((!data.title || !data.startDate) && config.enableLlmFallback && config.anthropicApiKey && llmCalls < 5) {
                llmCalls += 1;
                const fallback = await extractWithLlm(candidate.document, {
                  apiKey: config.anthropicApiKey, model: config.anthropicModel, timeoutMs: config.requestTimeoutMs,
                });
                if (fallback) {
                  data = fallback;
                  method = 'llm';
                }
              }
              if (collected.length >= config.caps.maxItemsPerRun) break;
              const normalized = normalizeHackathon(data, { now, extractionMethod: method });
              const verified = await verifyHackathonUrl(data, http);
              if (!verified) continue;
              normalized.officialUrl = verified.officialUrl;
              normalized.officialUrlVerified = verified.officialUrlVerified;
              collected.push(normalized);
              stat.parsed += 1;
            } catch (error) {
              errors.push(`${source.id} item: ${error instanceof Error ? error.message : 'normalization failed'}`);
            }
          }
        } catch (error) {
          stat.error = error instanceof Error ? error.message : 'Source failed.';
          errors.push(`${source.id}: ${stat.error}`);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(config.caps.concurrency, activeSources.length) }, () => worker()));
    const deduped = dedupeHackathons(collected).slice(0, config.caps.maxItemsPerRun);
    itemsFound = deduped.length;
    const persisted = await store.save(deduped);
    itemsSaved = persisted.saved;
    errors.push(...persisted.errors);
    const status = errors.length ? 'completed_with_errors' : 'completed';
    const result: AgentRunResult = {
      runId, status, itemsFound, itemsSaved, sources: sourceStats, errors,
      startedAt, finishedAt: new Date().toISOString(),
    };
    await store.finishRun(runId, result);
    return result;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Agent run failed.');
    const result: AgentRunResult = {
      runId, status: 'failed', itemsFound, itemsSaved, sources: sourceStats, errors,
      startedAt, finishedAt: new Date().toISOString(),
    };
    if (runId) await store.finishRun(runId, result).catch(() => undefined);
    return result;
  }
}
