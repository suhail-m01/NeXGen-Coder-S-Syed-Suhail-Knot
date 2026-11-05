import type { SourceConfig } from '../types';

const source = (id: string, platform: string, baseUrl: string, methods: SourceConfig['approvedMethods'], discoveryUrls: string[] = [], apiKeyEnv?: string): SourceConfig => ({
  id, platform, baseUrl, enabled: false, permissionEvidence: null, approvedMethods: methods, discoveryUrls, ...(apiKeyEnv ? { apiKeyEnv } : {}),
});

export const DEFAULT_SOURCES: SourceConfig[] = [
  source('devpost', 'Devpost', 'https://devpost.com', ['api', 'rss', 'sitemap', 'html']),
  source('mlh', 'Major League Hacking', 'https://mlh.io', ['api', 'rss', 'sitemap', 'html']),
  source('devfolio', 'Devfolio', 'https://devfolio.co', ['api', 'rss', 'sitemap', 'html']),
  source('unstop', 'Unstop', 'https://unstop.com', ['api', 'rss', 'sitemap', 'html']),
  source('hackerearth', 'HackerEarth', 'https://www.hackerearth.com', ['api', 'rss', 'sitemap', 'html']),
  source('hack2skill', 'Hack2Skill', 'https://hack2skill.com', ['api', 'rss', 'sitemap', 'html']),
  source('dorahacks', 'DoraHacks', 'https://dorahacks.io', ['api', 'rss', 'sitemap', 'html']),
  source('eventbrite', 'Eventbrite', 'https://www.eventbrite.com', ['api', 'rss', 'sitemap', 'html'], [], 'EVENTBRITE_API_KEY'),
  source('luma', 'Luma', 'https://lu.ma', ['api', 'rss', 'sitemap', 'html']),
  source('meetup', 'Meetup', 'https://www.meetup.com', ['api', 'rss', 'sitemap', 'html'], [], 'MEETUP_API_KEY'),
  source('townscript', 'Townscript', 'https://www.townscript.com', ['api', 'rss', 'sitemap', 'html']),
  source('insider', 'Insider', 'https://insider.in', ['api', 'rss', 'sitemap', 'html']),
  source('tavily', 'Tavily Search', 'https://tavily.com', ['api'], ['https://api.tavily.com/search'], 'SEARCH_API_KEY'),
  source('brave', 'Brave Search', 'https://brave.com', ['api'], ['https://api.search.brave.com/res/v1/web/search'], 'SEARCH_API_KEY'),
  source('serpapi', 'SerpAPI', 'https://serpapi.com', ['api'], ['https://serpapi.com/search.json'], 'SEARCH_API_KEY'),
];
