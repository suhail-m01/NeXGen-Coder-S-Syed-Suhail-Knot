# Knot Hackathon Discovery Agent: Live Data Diagnosis Report

> **Historical diagnosis:** this document records the November 5 revision, not current activation. The current source uses `sources.approved.ts` for reviewed candidates, still requires explicit runtime opt-in, and fails a run when no selected source is runnable. See [Hackathon setup and deployment verification](HACKATHON_DEPLOYMENT.md) for current behavior.

**Date:** November 5, 2026  
**Repository:** NeXGen-Coder-S-Syed-Suhail-Knot  
**Tooling:** `npm run agent:doctor`, `npm run agent:hackathons -- --dry-run`  

---

## 1. Executive Summary

The Knot Hackathon Discovery Agent codebase contains 15 platform connectors, discovery engines, HTML/JSON-LD parsers, normalizers, and deduplication logic. However, out-of-the-box discovery yielded **0 saved hackathons** and skipped all platforms.

Running the newly introduced diagnostic suite (`npm run agent:doctor` and `npm run agent:hackathons -- --dry-run`) reveals that the agent was designed with a strict security/compliance gate: **no source may execute without explicit permission evidence, approved methods, and explicit activation**. In default configuration, all 15 sources are flagged `enabled: false` and `permissionEvidence: null`.

---

## 2. Diagnostic Findings

### 2.1 Environment Variables
| Variable | Classification | Present | Status / Impact |
|---|---|---|---|
| `DATABASE_URL` | Critical | **No** | Agent cannot persist discovered hackathons to Supabase Postgres. |
| `CRON_SECRET` | Critical | **No** | Remote execution endpoint `/api/hackathons/run` cannot be authorized securely. |
| `SEARCH_API_PROVIDER` | Core | **No** | Search-based discovery (Tavily/Brave/SerpAPI) inactive. |
| `SEARCH_API_KEY` | Core | **No** | Search provider queries cannot authenticate. |
| `ANTHROPIC_API_KEY` | Optional | **No** | LLM fallback extraction inactive (CSS/JSON-LD/regex only). |
| `EVENTBRITE_API_KEY` | Optional | **No** | Eventbrite official API cannot authenticate. |
| `MEETUP_API_KEY` | Optional | **No** | Meetup official API cannot authenticate. |
| `NEXT_PUBLIC_ENABLE_HACKATHONS` | UI Feature Flag | **No (in env)** | UI routes and components remain hidden unless explicitly turned on. |

### 2.2 Database Connectivity & Schema
- **Database Reachability:** Unreachable locally because `DATABASE_URL` is omitted.
- **Tables Required:** `public.hackathons`, `public.hackathon_interests`, `public.agent_runs`.
- **Migration File:** `supabase/migrations/20261105120000_knot_hackathon_discovery.sql` defines the schema with indexes on `(city, start_date)`, `(is_free)`, and `(status)`.
- **Finding:** The migration must be applied to the target Supabase instance, and `DATABASE_URL` must be supplied for persistent server-side runs.

### 2.3 Source Gate Diagnostics (All 15 Connectors)
When running `npm run agent:hackathons -- --dry-run`, every source returned:
```json
{
  "source": "<source-id>",
  "discovered": 0,
  "parsed": 0,
  "skipped": true,
  "error": "Disabled until approved methods and permission evidence are configured."
}
```

The underlying guard in [`agents/hackathon/config.ts`](file:///c:/Users/91959/OneDrive/Desktop/new/NeXGen-Coder-S-Syed-Suhail-Knot/agents/hackathon/config.ts#L34):
```typescript
export function sourceIsAuthorized(config: SourceConfig): boolean {
  return config.enabled && Boolean(config.permissionEvidence && /^https:\/\//.test(config.permissionEvidence)) && config.approvedMethods.length > 0;
}
```
Because `DEFAULT_SOURCES` initialized each platform with `enabled: false` and `permissionEvidence: null`, the agent correctly skipped all 15 sources to avoid unauthorized web scraping.

---

## 3. Root Cause Analysis

1. **Missing Committed Approved Sources Config (`sources.approved.json`)**:
   - `loadSourceConfig()` currently checks `DEFAULT_SOURCES`, merges `HACKATHON_SOURCE_CONFIG` from environment JSON, and checks `HACKATHON_ENABLED_SOURCES`.
   - Without an explicit committed file defining approved sources with their ToS/robots permission evidence, the agent defaults to a 100% disabled state.

2. **Public API Feeds Ready vs. Requiring Keys**:
   - Platforms like **Devfolio** and **Unstop** provide public discovery endpoints and permit public index crawling per their robots.txt / terms.
   - Search platforms (**Tavily**, **Brave Search**, **SerpAPI**) require API keys (`SEARCH_API_KEY`).
   - Event platforms (**Eventbrite**, **Meetup**) require developer API keys (`EVENTBRITE_API_KEY`, `MEETUP_API_KEY`).

3. **Vercel Hobby Serverless Execution Limits**:
   - Vercel Hobby accounts enforce a **60-second execution timeout** on Serverless Functions.
   - Vercel Hobby accounts enforce a **daily maximum frequency** (`0 0 * * *`) for cron jobs.
   - Attempting to discover 15 platforms and dozens of search queries in a single 60s serverless invocation leads to execution timeouts.

4. **HTTP Client Transparency**:
   - Recent commit `f2f0b07` added browser spoofing headers (`Sec-Ch-Ua*`). Honest bot guidelines require an explicit identification header: `Mozilla/5.0 (compatible; KnotBot/1.0; +https://<knot-domain>/bot)`.

---

## 4. Remediation Plan

1. **Phase 2: Source Activation (`agents/hackathon/sources.approved.json`)**:
   - Audit robots.txt, developer terms, and public APIs for each of the 15 sources.
   - Commit `agents/hackathon/sources.approved.json` with verified `permissionEvidence` URLs and `approvedMethods`.
   - Update `loadSourceConfig` to merge `sources.approved.json` before environment overrides.
   - Enable verified public platforms (Devfolio, Unstop, MLH) and API platforms when keys are configured.
   - Document any unapproved/gated platforms in `docs/SOURCE_PERMISSIONS.md`.

2. **Phase 3: Invocation Sharding & GitHub Actions Cron**:
   - Add query parameter support to `/api/hackathons/run`: `?shard=0&of=4` or `?sources=devfolio,unstop`.
   - Add `.github/workflows/hackathon-agent.yml` to run `npm run agent:hackathons` every 6 hours with no 60s timeout constraint.
   - Keep Vercel Cron as a lightweight fallback.

3. **Phase 4: HTTP Honesty**:
   - Strip browser fingerprinting headers (`Sec-Ch-Ua*`).
   - Standardize `User-Agent` to honest KnotBot format.
   - Create public `/bot` transparency page on the website.

4. **Phase 5: Real-time UI & Status API**:
   - Implement `GET /api/hackathons/status` with `lastRunAt`, `lastStatus`, `totalCount`, and per-source breakdown.
   - Update hackathon card action button to **"Register on official site"**.
   - Show freshness timestamp ("Last updated X ago") and stale notice if older than 24 hours.
