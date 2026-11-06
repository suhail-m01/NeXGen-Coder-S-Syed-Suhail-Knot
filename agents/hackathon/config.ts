import approvedSources from './sources.approved';
import { DEFAULT_SOURCES } from './sources/defaults';
import type { AgentCaps, AgentConfig, SourceConfig } from './types';

const boundedNumber = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
};

function loadSourceOverrides(env: NodeJS.ProcessEnv): Partial<SourceConfig>[] {
  const raw = env.HACKATHON_SOURCE_CONFIG?.trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('HACKATHON_SOURCE_CONFIG must be a JSON array.');
    return parsed as Partial<SourceConfig>[];
  } catch (error) {
    throw new Error(`Invalid HACKATHON_SOURCE_CONFIG: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

export function loadSourceConfig(env: NodeJS.ProcessEnv = process.env): SourceConfig[] {
  const overrides = loadSourceOverrides(env);
  const enabled = new Set((env.HACKATHON_ENABLED_SOURCES ?? '').split(',').map((id) => id.trim().toLowerCase()).filter(Boolean));
  const approvedList = Array.isArray(approvedSources) ? approvedSources : [];

  return DEFAULT_SOURCES.map((base) => {
    const approved = approvedList.find((candidate) => candidate.id === base.id) ?? {};
    const override = overrides.find((candidate) => candidate.id === base.id) ?? {};
    const merged = { ...base, ...approved, ...override, id: base.id, platform: base.platform };
    // Committed review records never activate ingestion by themselves.
    // Runtime opt-in is required; sourceIsAuthorized still checks evidence and methods.
    merged.enabled = enabled.has(base.id);
    merged.discoveryUrls = Array.isArray(merged.discoveryUrls) ? merged.discoveryUrls.slice(0, 100) : [];
    merged.approvedMethods = Array.isArray(merged.approvedMethods) ? merged.approvedMethods : [];
    return merged;
  });
}

export function sourceIsAuthorized(config: SourceConfig): boolean {
  return config.enabled && Boolean(config.permissionEvidence && /^https:\/\//.test(config.permissionEvidence)) && config.approvedMethods.length > 0;
}

/** Configuration readiness only; a successful source response still needs runtime evidence. */
export function sourceReadinessError(
  source: SourceConfig,
  config: Pick<AgentConfig, 'searchProvider' | 'searchApiKey'>,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!source.enabled) return 'Runtime source opt-in is not enabled.';
  if (!source.permissionEvidence || !/^https:\/\//.test(source.permissionEvidence)) return 'Valid HTTPS permission evidence is missing.';
  if (!source.approvedMethods.length) return 'No approved collection method is configured.';
  if (!source.discoveryUrls.length) return 'No reviewed discovery URL is configured.';
  if (['tavily', 'brave', 'serpapi'].includes(source.id) && config.searchProvider !== source.id) {
    return `SEARCH_API_PROVIDER must be ${source.id}.`;
  }
  if (source.apiKeyEnv) {
    const key = source.apiKeyEnv === 'SEARCH_API_KEY' ? config.searchApiKey : env[source.apiKeyEnv]?.trim() || null;
    if (!key) return `${source.apiKeyEnv} is not configured.`;
  }
  return null;
}

export function loadAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const publicUrl = (env.KNOT_PUBLIC_URL?.trim() || 'https://ne-x-gen-coder-s-syed-suhail-knot.vercel.app').replace(/\/$/, '');
  const caps: AgentCaps = {
    maxSources: boundedNumber(env.HACKATHON_MAX_SOURCES, 15, 1, 15),
    maxQueries: boundedNumber(env.HACKATHON_MAX_QUERIES, 72, 1, 200),
    maxDocumentsPerSource: boundedNumber(env.HACKATHON_MAX_DOCUMENTS, 24, 1, 100),
    maxDetailPagesPerSource: boundedNumber(env.HACKATHON_MAX_DETAIL_PAGES, 12, 0, 50),
    maxItemsPerRun: boundedNumber(env.HACKATHON_MAX_ITEMS, 500, 1, 5000),
    maxResponseBytes: boundedNumber(env.HACKATHON_MAX_RESPONSE_BYTES, 2_000_000, 10_000, 10_000_000),
    concurrency: boundedNumber(env.HACKATHON_CONCURRENCY, 3, 1, 6),
  };
  const provider = env.SEARCH_API_PROVIDER?.trim().toLowerCase();
  return {
    publicUrl,
    userAgent: env.HACKATHON_USER_AGENT?.trim() || `Mozilla/5.0 (compatible; KnotBot/1.0; +${publicUrl}/bot)`,
    requestTimeoutMs: boundedNumber(env.HACKATHON_HTTP_TIMEOUT_MS, 12_000, 1000, 30_000),
    retries: boundedNumber(env.HACKATHON_HTTP_RETRIES, 2, 0, 4),
    domainDelayMs: boundedNumber(env.HACKATHON_DOMAIN_DELAY_MS, 1500, 250, 10_000),
    sources: loadSourceConfig(env),
    caps,
    searchProvider: provider === 'tavily' || provider === 'brave' || provider === 'serpapi' ? provider : null,
    searchApiKey: env.SEARCH_API_KEY?.trim() || null,
    anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || null,
    anthropicModel: env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-latest',
    enableLlmFallback: env.HACKATHON_ENABLE_LLM_FALLBACK === 'true',
  };
}
