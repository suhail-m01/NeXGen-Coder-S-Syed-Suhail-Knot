export const HACKATHON_MODES = ['online', 'offline', 'hybrid'] as const;
export type HackathonMode = (typeof HACKATHON_MODES)[number];
export type HackathonStatus = 'upcoming' | 'ongoing' | 'ended';
export type ExtractionMethod = 'json-ld' | 'opengraph' | 'css' | 'llm' | 'api';
export type ApprovedMethod = 'api' | 'rss' | 'sitemap' | 'html';

export interface RawHackathon {
  title: string | null;
  description: string | null;
  organizer: string | null;
  mode: HackathonMode | null;
  city: string | null;
  area: string | null;
  state: string | null;
  country: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  timezone: string | null;
  isFree: boolean | null;
  priceAmount: number | null;
  currency: string | null;
  prizePool: string | null;
  tags: string[];
  eligibility: string | null;
  teamSize: string | null;
  imageUrl: string | null;
  officialUrl: string | null;
  sourceUrl: string;
  sourcePlatform: string;
}

export interface SourceListing {
  platform: string;
  url: string;
  firstSeenAt: string;
  lastCheckedAt: string;
  extractionMethod: ExtractionMethod;
}

export interface NormalizedHackathon extends Omit<RawHackathon, 'title' | 'startDate' | 'officialUrl'> {
  id?: string;
  dedupeKey: string;
  title: string;
  startDate: string;
  endDate: string | null;
  officialUrl: string;
  officialUrlVerified: boolean;
  locationPrecision: 'exact' | 'approximate' | 'city' | 'none';
  startTimeKnown: boolean;
  endTimeKnown: boolean;
  status: HackathonStatus;
  sources: SourceListing[];
  extractionMethod: ExtractionMethod;
}

export interface HttpResponse {
  status: number;
  url: string;
  finalUrl: string;
  body: string;
  contentType: string;
  headers: Headers;
  fromCache: boolean;
}

export interface HttpRequestOptions {
  accept?: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
  checkRobots?: boolean;
  allowPrivateHosts?: boolean;
}

export interface HttpClient {
  request(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
  get(url: string, options?: HttpRequestOptions): Promise<HttpResponse>;
}

export interface SourceConfig {
  id: string;
  platform: string;
  baseUrl: string;
  enabled: boolean;
  permissionEvidence: string | null;
  approvedMethods: ApprovedMethod[];
  discoveryUrls: string[];
  apiKeyEnv?: string;
  selectors?: {
    item?: string;
    title?: string;
    date?: string;
    location?: string;
    organizer?: string;
    description?: string;
  };
}

export interface SourceDocument {
  url: string;
  finalUrl: string;
  body: string;
  contentType: string;
  sourcePlatform: string;
}

export interface DiscoveryContext {
  config: SourceConfig;
  http: HttpClient;
  queries: string[];
  now: Date;
  maxDocuments: number;
  maxDetailPages: number;
  apiKey: string | null;
  authorizedSourceHosts: string[];
}

export interface ParsedHackathon {
  data: RawHackathon;
  extractionMethod: ExtractionMethod;
  document: SourceDocument;
}

export interface SourceConnector {
  discover(context: DiscoveryContext): Promise<SourceDocument[]>;
  parse(documents: SourceDocument[], context: DiscoveryContext): Promise<ParsedHackathon[]>;
}

export interface AgentCaps {
  maxSources: number;
  maxQueries: number;
  maxDocumentsPerSource: number;
  maxDetailPagesPerSource: number;
  maxItemsPerRun: number;
  maxResponseBytes: number;
  concurrency: number;
}

export interface AgentConfig {
  publicUrl: string;
  userAgent: string;
  requestTimeoutMs: number;
  retries: number;
  domainDelayMs: number;
  sources: SourceConfig[];
  caps: AgentCaps;
  searchProvider: 'tavily' | 'brave' | 'serpapi' | null;
  searchApiKey: string | null;
  anthropicApiKey: string | null;
  anthropicModel: string;
  enableLlmFallback: boolean;
}

export interface SourceRunStat {
  source: string;
  discovered: number;
  parsed: number;
  skipped: boolean;
  error: string | null;
}

export interface AgentRunResult {
  runId: string | null;
  status: 'completed' | 'completed_with_errors' | 'failed';
  itemsFound: number;
  itemsSaved: number;
  sources: SourceRunStat[];
  errors: string[];
  startedAt: string;
  finishedAt: string;
}
