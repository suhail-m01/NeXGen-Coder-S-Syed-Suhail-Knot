# Hackathon Discovery Agent — Phase 1 audit

> **Superseded integration note:** the final owner prompt renamed the branch to `feature/knot-hackathon-agent` and clarified that the simplest repository-native language should be selected when no Python agent exists. TypeScript/Vercel was therefore selected; the Python runtime options discussed below were not implemented. The complete application audit is in `docs/AUDIT.md`.

**Audit date:** 5 November 2026 (Asia/Kolkata)  
**Branch:** `feature/knot-hackathon-agent`  
**Feature base:** `origin/main` at `181a9b9bf4b563caf2b38ffe05d606d0054f8a48`  
**Status:** audit and before-feature regression baseline complete; feature implementation has not started.

## 1. Repository and framework

- The application is **React 19 + TypeScript + Vite 7**, with React Router 7 and Supabase JS. It is not Next.js and has no `app/` directory, Next.js route handlers, ORM, or existing `/api` server layer.
- `npm run build` runs `tsc -b && vite build`.
- There is no configured lint script and no configured `test:build` script. TypeScript is checked through the build and `npx tsc -b --pretty false`.
- Existing browser tests use Playwright/Chromium against the Vite app on port 5174.
- The local Git metadata had lost its remote configuration. The public `origin` URL was restored and `origin/main` was fetched. The working files matched the current remote; the separate untracked presentation was preserved and not added to any commit.
- `feature/hackathon-agent` was created from the actual current `origin/main`, not the stale local commit initially referenced by the checkout.

## 2. Routing and UI integration boundaries

- `src/App.tsx` declares all React Router routes. `/hackathons` does not exist yet. A new page requires an additive import and route entry here; Next.js file-based page conventions cannot be used.
- `src/components/AppShell.tsx` owns desktop and mobile navigation. A Hackathons item can be added without changing existing destinations.
- `src/pages/HomePage.tsx` owns the home layout. A separately authored, feature-flagged Hackathons component can be inserted without rewriting the existing sections.
- `src/styles.css` contains the shared tokens (`--ink`, `--muted`, `--line`, `--surface`, `--primary`, `--accent`, spacing/radius/shadow tokens and common controls). New feature CSS can import/reuse these tokens without editing or replacing the global stylesheet.
- Existing auth boundaries are in `src/state/AppContext.tsx` and `src/data/supabase/auth.ts`. The browser client is created in `src/data/supabase/client.ts`; the feature can import these helpers rather than introduce another auth system.

## 3. Environment and feature flag

- Vite exposes client variables with `VITE_*` by default. The requested `NEXT_PUBLIC_ENABLE_HACKATHONS=true` is therefore not automatically available to browser code.
- A minimal Vite `envPrefix` addition can expose the specifically public `NEXT_PUBLIC_*` namespace while retaining existing `VITE_*` behavior. This requires a small additive `vite.config.ts` change and an `.env.example` entry.
- Service-role keys, Anthropic keys, GitHub dispatch tokens and trigger secrets must remain server/runner-only. They must never use either browser-exposed prefix.
- The current hosted deployment was previously verified to remain in local mode; this audit does not claim that its Supabase browser configuration has been repaired.

## 4. Database, Event model and RLS

- The canonical event is `KnotEvent` in `src/domain/types.ts`; the current cloud table is `public.knot_events` with related private and participation tables. The feature must not alter this model merely to accommodate aggregation.
- Existing migrations already contain ingestion/source concepts, but the requested feature is constrained to exactly three new tables: `hackathons`, `hackathon_interests`, and `agent_runs`.
- Existing tables, policies, functions, records and migrations must remain intact. No migration has been authored or applied during Phase 1.
- Existing RLS patterns use anonymous/authenticated public reads only for publishable catalog data, server-managed writes, and explicit least-privilege grants. The new catalog can follow that pattern; interest records must not become a public behavioral dataset.
- External clicks, registrations and attendance must remain distinct. Unknown price, age, location or eligibility values must remain unknown rather than favourable.

## 5. Server, scheduling and deployment

- `vercel.json` currently contains Vite SPA rewrites and security headers only. There are no API functions or cron entries.
- Supabase Edge Functions exist for providers, approved feeds, geocoding and webhooks, but they are Deno/TypeScript functions and cannot honestly be described as a Python 3.11 agent runtime.
- Current Vercel documentation lists Python **3.12 (default), 3.13 and 3.14**; Python 3.11 is not a supported Vercel Python runtime. See:
  - https://vercel.com/docs/functions/runtimes/python
  - https://vercel.com/docs/functions/runtimes/python/python-version
- Vercel cron can invoke an endpoint every six hours and can send `CRON_SECRET` as a Bearer token, but a Vercel endpoint must not pretend to execute an unsupported Python 3.11 runtime. See https://vercel.com/docs/cron-jobs/manage-cron-jobs.
- The runtime choice therefore needs explicit resolution before implementation: an exact Python 3.11 external/GitHub Actions runner with a secure dispatch endpoint, or owner approval to use a newer Vercel Python runtime.

## 6. Source and extraction constraints

- No approved live hackathon API credentials or source-specific permission grants were found in the repository.
- Live connectors must be activated only for explicitly approved/permissioned APIs, feeds, sitemaps or HTML collection. Connector availability must not be represented as proof of source permission.
- The implementation must identify KnotBot honestly, enforce robots.txt and source terms, use bounded concurrency and caps, cache responses, isolate failures, and never bypass authentication, CAPTCHA, paywalls or rate limits.
- Structured extraction must precede any optional Anthropic fallback. Unknown fields remain null/empty, source provenance is retained, and no organizer claim becomes independent verification.

## 7. Before-feature verification

The untouched code was checked first. Detailed logs are in the ignored local directory `artifacts/hackathon-agent/before/`.

| Check | Initial result | Current before-feature result |
|---|---:|---:|
| `npm run build` | Passed | Passed after the separate safe fix |
| `npx tsc -b --pretty false` | Passed | Passed |
| `npm test` | **67/68** | **68/68** after the separate safe fix |
| `npm run test:e2e` | Environment dependencies restored | **85/85** |
| `npm run test:e2e:expansion` | Environment dependencies restored | **42/42** |
| `npm run test:e2e:adapters` | Environment dependencies restored | **9/9** |
| `npm run test:e2e:final` | Environment dependencies restored | **30/30** |
| Browser total | Not initially runnable until dependencies were restored | **166/166** |

No lint or `test:build` script is configured. The first Chromium launch also showed that sandbox system libraries had been evicted; Playwright Chromium and its Linux dependencies were restored before the successful run. This was an environment repair, not a product change.

### Separate Phase 1 `fix:` commit

Commit `6368030` — `fix: make participation fit time deterministic`.

The pre-existing Participation Fit test constructed events relative to 24 October 2026 while `participationFit()` independently read the real clock. As real time moved beyond the fixture registration window, the expected `strong` result became `possible`. The minimal fix adds an optional clock parameter whose production default remains `new Date()`, passes it to the existing registration-open helper, and supplies the fixed fixture clock in the test. No feature code was included in this commit.

## 8. Decisions required before feature coding

1. **Python runtime/deployment:** preserve exact Python 3.11 with a GitHub Actions or other external runner, or explicitly approve a supported newer Vercel Python runtime.
2. **Minimal Vite wiring:** approve the additive `src/App.tsx` route entry and `vite.config.ts` public env-prefix entry in addition to the already permitted nav/home/env/cron integration points. No existing route, component, table or style will be removed or rewritten.

Until those two points are resolved, claiming either a Next.js implementation or a Python 3.11 Vercel deployment would be inaccurate.
