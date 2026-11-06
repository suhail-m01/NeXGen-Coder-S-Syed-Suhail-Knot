import type { SourceConfig } from './types';

export interface ReviewedSourceConfig extends Partial<SourceConfig> {
  reviewedAt?: string;
  notes?: string;
}

/**
 * Reviewed source candidates, not a runtime authorization by themselves.
 * HACKATHON_ENABLED_SOURCES must explicitly opt in at deployment time.
 * This TypeScript module avoids serverless JSON-import compatibility failures.
 */
export const REVIEWED_SOURCE_CONFIG: ReviewedSourceConfig[] = [
  {
    "id": "devfolio",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://api.devfolio.co/api/hackathons?page=1&limit=20"
    ],
    "permissionEvidence": "https://devfolio.co/terms",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Public discovery API powering Devfolio explore listings; approved for read-only aggregation with direct organizer redirection."
  },
  {
    "id": "unstop",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons"
    ],
    "permissionEvidence": "https://unstop.com/terms-of-use",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Public opportunities API; approved for read-only index linking."
  },
  {
    "id": "mlh",
    "enabled": true,
    "approvedMethods": [
      "html"
    ],
    "discoveryUrls": [
      "https://mlh.io/seasons/2025/events"
    ],
    "permissionEvidence": "https://mlh.io/robots.txt",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Public season event schedule allowed by robots.txt for indexation."
  },
  {
    "id": "eventbrite",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://www.eventbrite.com/d/online/hackathon/"
    ],
    "permissionEvidence": "https://www.eventbrite.com/platform/api/",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Official Eventbrite API; requires EVENTBRITE_API_KEY."
  },
  {
    "id": "meetup",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://www.meetup.com/find/?keywords=hackathon"
    ],
    "permissionEvidence": "https://www.meetup.com/api/",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Official Meetup API; requires MEETUP_API_KEY."
  },
  {
    "id": "tavily",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://api.tavily.com/search"
    ],
    "permissionEvidence": "https://docs.tavily.com/",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Official Tavily Search API; requires SEARCH_API_KEY and SEARCH_API_PROVIDER=tavily."
  },
  {
    "id": "brave",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://api.search.brave.com/res/v1/web/search"
    ],
    "permissionEvidence": "https://brave.com/search/api/",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Official Brave Search API; requires SEARCH_API_KEY and SEARCH_API_PROVIDER=brave."
  },
  {
    "id": "serpapi",
    "enabled": true,
    "approvedMethods": [
      "api"
    ],
    "discoveryUrls": [
      "https://serpapi.com/search.json"
    ],
    "permissionEvidence": "https://serpapi.com/google-events-api",
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Official SerpAPI service; requires SEARCH_API_KEY and SEARCH_API_PROVIDER=serpapi."
  },
  {
    "id": "devpost",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://devpost.com/hackathons"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Devpost terms prohibit scraping without written authorization or official partner API key."
  },
  {
    "id": "hackerearth",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://www.hackerearth.com/challenges/hackathon/"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "HackerEarth Terms require developer API partnership for aggregation."
  },
  {
    "id": "hack2skill",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://hack2skill.com/hackathons"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "No public developer API; web scraping restricted by terms."
  },
  {
    "id": "dorahacks",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://dorahacks.io/hackathon"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Requires formal developer API agreement."
  },
  {
    "id": "luma",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://lu.ma/explore"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Luma Terms prohibit unauthorized automated data harvesting."
  },
  {
    "id": "townscript",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://www.townscript.com/in/india/hackathons"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Townscript does not offer an open public hackathon feed."
  },
  {
    "id": "insider",
    "enabled": false,
    "approvedMethods": [],
    "discoveryUrls": [
      "https://insider.in/all-events-in-india/hackathons"
    ],
    "permissionEvidence": null,
    "reviewedAt": "2026-11-05T21:00:00Z",
    "notes": "Paytm Insider terms restrict commercial aggregation without partner agreement."
  }
];

export default REVIEWED_SOURCE_CONFIG;
