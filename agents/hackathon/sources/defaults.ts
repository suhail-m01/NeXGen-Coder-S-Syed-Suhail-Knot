import type { SourceConfig } from '../types';

const source = (id: string, platform: string, baseUrl: string, methods: SourceConfig['approvedMethods'], discoveryUrls: string[] = [], apiKeyEnv?: string): SourceConfig => ({
  id, platform, baseUrl, enabled: false, permissionEvidence: null, approvedMethods: methods, discoveryUrls, ...(apiKeyEnv ? { apiKeyEnv } : {}),
});

export const DEFAULT_SOURCES: SourceConfig[] = [
  source('devpost', 'Devpost', 'https://devpost.com', ['api', 'rss', 'sitemap', 'html'], ['https://devpost.com/hackathons']),
  source('mlh', 'Major League Hacking', 'https://mlh.io', ['api', 'rss', 'sitemap', 'html'], ['https://mlh.io/seasons/2025/events']),
  source('devfolio', 'Devfolio', 'https://devfolio.co', ['api', 'rss', 'sitemap', 'html'], ['https://api.devfolio.co/api/hackathons?page=1&limit=20']),
  source('unstop', 'Unstop', 'https://unstop.com', ['api', 'rss', 'sitemap', 'html'], ['https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons']),
  source('hackerearth', 'HackerEarth', 'https://www.hackerearth.com', ['api', 'rss', 'sitemap', 'html'], ['https://www.hackerearth.com/challenges/hackathon/']),
  source('hack2skill', 'Hack2Skill', 'https://hack2skill.com', ['api', 'rss', 'sitemap', 'html'], ['https://hack2skill.com/hackathons']),
  source('dorahacks', 'DoraHacks', 'https://dorahacks.io', ['api', 'rss', 'sitemap', 'html'], ['https://dorahacks.io/hackathon']),
  source('eventbrite', 'Eventbrite', 'https://www.eventbrite.com', ['api', 'rss', 'sitemap', 'html'], ['https://www.eventbrite.com/d/online/hackathon/'], 'EVENTBRITE_API_KEY'),
  source('luma', 'Luma', 'https://lu.ma', ['api', 'rss', 'sitemap', 'html'], ['https://lu.ma/explore']),
  source('meetup', 'Meetup', 'https://www.meetup.com', ['api', 'rss', 'sitemap', 'html'], ['https://www.meetup.com/find/?keywords=hackathon'], 'MEETUP_API_KEY'),
  source('townscript', 'Townscript', 'https://www.townscript.com', ['api', 'rss', 'sitemap', 'html'], ['https://www.townscript.com/in/india/hackathons']),
  source('insider', 'Insider', 'https://insider.in', ['api', 'rss', 'sitemap', 'html'], ['https://insider.in/all-events-in-india/hackathons']),
  source('tavily', 'Tavily Search', 'https://tavily.com', ['api'], ['https://api.tavily.com/search'], 'SEARCH_API_KEY'),
  source('brave', 'Brave Search', 'https://brave.com', ['api'], ['https://api.search.brave.com/res/v1/web/search'], 'SEARCH_API_KEY'),
  source('serpapi', 'SerpAPI', 'https://serpapi.com', ['api'], ['https://serpapi.com/search.json'], 'SEARCH_API_KEY'),
];
