# Knot Hackathon Discovery Agent: Source Permissions Registry

**Last Reviewed:** November 5, 2026  
**Security & Compliance Standard:** KnotBot Safe & Permissioned Discovery Standard  
**Configuration File:** [`agents/hackathon/sources.approved.json`](file:///c:/Users/91959/OneDrive/Desktop/new/NeXGen-Coder-S-Syed-Suhail-Knot/agents/hackathon/sources.approved.json)  

---

## Overview

Knot respects site Terms of Service, `robots.txt` access directives, and intellectual property. The Hackathon Discovery Agent enforces a strict runtime barrier: **sources are never scraped or queried unless an approved method, valid HTTPS permission evidence, and active authorization are present**.

Every source is categorized below:

---

## 1. Enabled Public Sources (No Secret Required)

### 1. Devfolio (`devfolio`)
- **Base URL:** `https://devfolio.co`
- **Discovery Endpoint:** `https://api.devfolio.co/api/hackathons?page=1&limit=20`
- **Status:** **`ENABLED`**
- **Approved Methods:** `api`
- **Permission Evidence:** `https://devfolio.co/terms`
- **Notes:** Public JSON discovery endpoint that powers Devfolio's open hackathon explore page. Used solely to index titles, dates, locations, and link users directly to the official hackathon organizer landing page.

### 2. Unstop (`unstop`)
- **Base URL:** `https://unstop.com`
- **Discovery Endpoint:** `https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons`
- **Status:** **`ENABLED`**
- **Approved Methods:** `api`
- **Permission Evidence:** `https://unstop.com/terms-of-use`
- **Notes:** Public opportunities endpoint published for open listing search. Handled in read-only mode to direct users to the official fest/event page.

### 3. Major League Hacking (`mlh`)
- **Base URL:** `https://mlh.io`
- **Discovery Endpoint:** `https://mlh.io/seasons/2025/events`
- **Status:** **`ENABLED`**
- **Approved Methods:** `html`
- **Permission Evidence:** `https://mlh.io/robots.txt`
- **Notes:** MLH publishes season calendars openly, and `robots.txt` explicitly allows public event calendar indexing without bypassing logins.

---

## 2. Enabled API Sources (Require Partner / Developer API Keys)

### 4. Tavily Search (`tavily`)
- **Base URL:** `https://tavily.com`
- **Discovery Endpoint:** `https://api.tavily.com/search`
- **Status:** **`ENABLED`** (Active when `SEARCH_API_KEY` is provided with `SEARCH_API_PROVIDER=tavily`)
- **Approved Methods:** `api`
- **Permission Evidence:** `https://docs.tavily.com/`
- **Notes:** Official developer web search API intended for agentic retrieval.

### 5. Brave Search (`brave`)
- **Base URL:** `https://brave.com`
- **Discovery Endpoint:** `https://api.search.brave.com/res/v1/web/search`
- **Status:** **`ENABLED`** (Active when `SEARCH_API_KEY` is provided with `SEARCH_API_PROVIDER=brave`)
- **Approved Methods:** `api`
- **Permission Evidence:** `https://brave.com/search/api/`
- **Notes:** Official privacy-preserving web search API with documented commercial query terms.

### 6. SerpAPI (`serpapi`)
- **Base URL:** `https://serpapi.com`
- **Discovery Endpoint:** `https://serpapi.com/search.json`
- **Status:** **`ENABLED`** (Active when `SEARCH_API_KEY` is provided with `SEARCH_API_PROVIDER=serpapi`)
- **Approved Methods:** `api`
- **Permission Evidence:** `https://serpapi.com/google-events-api`
- **Notes:** Structured Google Events API engine with explicit developer licensing.

### 7. Eventbrite (`eventbrite`)
- **Base URL:** `https://www.eventbrite.com`
- **Discovery Endpoint:** `https://www.eventbrite.com/platform/api/`
- **Status:** **`ENABLED`** (Active when `EVENTBRITE_API_KEY` is provided)
- **Approved Methods:** `api`
- **Permission Evidence:** `https://www.eventbrite.com/platform/api/`
- **Notes:** Official Eventbrite Developer Platform API.

### 8. Meetup (`meetup`)
- **Base URL:** `https://www.meetup.com`
- **Discovery Endpoint:** `https://www.meetup.com/api/`
- **Status:** **`ENABLED`** (Active when `MEETUP_API_KEY` is provided)
- **Approved Methods:** `api`
- **Permission Evidence:** `https://www.meetup.com/api/`
- **Notes:** Official Meetup GraphQL API for developer access.

---

## 3. Disabled Sources (Awaiting Explicit Permission / Partner Keys)

The following platforms have connectors implemented in `/agents/hackathon/sources/` but remain **`enabled: false`** until explicit written authorization or developer partner credentials are confirmed:

### 9. Devpost (`devpost`)
- **Reason:** Devpost Terms of Service Section 7 prohibits unauthorized automated harvesting of hackathon data without written authorization or partner API arrangement.
- **Evidence:** `https://devpost.com/terms`

### 10. HackerEarth (`hackerearth`)
- **Reason:** HackerEarth API access is restricted to enterprise hackathon organizers; public challenge scraping is prohibited by Terms of Service.
- **Evidence:** `https://www.hackerearth.com/terms-of-service/`

### 11. Hack2Skill (`hack2skill`)
- **Reason:** No documented public developer API or open RSS feed; automated crawling restricted by Terms & Conditions.
- **Evidence:** `https://hack2skill.com/terms-and-conditions`

### 12. DoraHacks (`dorahacks`)
- **Reason:** DoraHacks Web3 bounties and grants require official developer agreement for external feed distribution.
- **Evidence:** `https://dorahacks.io/terms-of-service`

### 13. Luma (`luma`)
- **Reason:** Lu.ma Terms of Service expressly prohibit unauthorized web scraping of calendars and event directories.
- **Evidence:** `https://lu.ma/tos`

### 14. Townscript (`townscript`)
- **Reason:** Townscript does not publish an open public hackathon RSS/API feed for third-party indexers.
- **Evidence:** `https://www.townscript.com/terms`

### 15. Paytm Insider (`insider`)
- **Reason:** Paytm Insider terms prohibit third-party commercial aggregation without partner contract.
- **Evidence:** `https://insider.in/terms-and-conditions`

---

## Summary Matrix

| ID | Platform | Enabled | Methods | Required Secret | Permission Evidence |
|---|---|---|---|---|---|
| `devfolio` | Devfolio | **Yes** | `api` | None | `https://devfolio.co/terms` |
| `unstop` | Unstop | **Yes** | `api` | None | `https://unstop.com/terms-of-use` |
| `mlh` | Major League Hacking | **Yes** | `html` | None | `https://mlh.io/robots.txt` |
| `eventbrite` | Eventbrite | **Yes** | `api` | `EVENTBRITE_API_KEY` | `https://www.eventbrite.com/platform/api/` |
| `meetup` | Meetup | **Yes** | `api` | `MEETUP_API_KEY` | `https://www.meetup.com/api/` |
| `tavily` | Tavily Search | **Yes** | `api` | `SEARCH_API_KEY` | `https://docs.tavily.com/` |
| `brave` | Brave Search | **Yes** | `api` | `SEARCH_API_KEY` | `https://brave.com/search/api/` |
| `serpapi` | SerpAPI | **Yes** | `api` | `SEARCH_API_KEY` | `https://serpapi.com/google-events-api` |
| `devpost` | Devpost | **No** | None | Partner Agreement | None (`null`) |
| `hackerearth` | HackerEarth | **No** | None | Partner Agreement | None (`null`) |
| `hack2skill` | Hack2Skill | **No** | None | Partner Agreement | None (`null`) |
| `dorahacks` | DoraHacks | **No** | None | Partner Agreement | None (`null`) |
| `luma` | Luma | **No** | None | Partner Agreement | None (`null`) |
| `townscript` | Townscript | **No** | None | Partner Agreement | None (`null`) |
| `insider` | Insider | **No** | None | Partner Agreement | None (`null`) |
