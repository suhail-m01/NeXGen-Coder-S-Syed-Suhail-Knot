# Knot application audit

**Audit date:** 5 November 2026  
**Branch:** `feature/knot-hackathon-agent`  
**Base:** `origin/main` at `181a9b9bf4b563caf2b38ffe05d606d0054f8a48`  
**Method:** read-only architecture review, production-build Lighthouse measurements, domain tests, four existing Chromium workflows, and a 16-route client smoke pass. No database migration or live-source ingestion was performed during the audit.

## Severity scale

- **Critical:** active data loss, unauthorized access, secret exposure, or a broken core production path requiring immediate containment.
- **High:** a verified WCAG A/AA failure, a core workflow/security/SEO defect, or a deployment condition that materially misrepresents the product environment.
- **Medium:** a meaningful reliability, performance, accessibility, or maintainability limitation with a workaround or limited blast radius.
- **Low:** hardening, diagnostics, or polish that does not block a core flow.

## 1. Architecture map

| Area | Verified implementation |
|---|---|
| Framework | React 19.3.1, TypeScript 5.9, Vite 7.3.7 (`package.json`) |
| Routing | React Router 7; all routes are declared in `src/App.tsx:22-38` |
| Rendering | Client-rendered SPA. `index.html` contains a generic title/description and an empty root; no SSR, pre-rendering, route metadata, or OG generation was found. |
| Database / ORM | Supabase Postgres through SQL migrations and Supabase JS/PostgREST/RPC. No ORM is configured. Existing canonical cloud event table: `public.knot_events`. |
| Auth | Local-mode browser accounts in `AppContext`; production Supabase Auth in `src/data/supabase/auth.ts`. Cloud client selection is in `src/data/supabase/client.ts:3-8`. |
| State | `AppContext` plus localStorage/IndexedDB in local mode; authorized Supabase snapshots and Realtime in cloud mode. |
| HTTP APIs | No `/api` directory or Next.js handlers. Existing server operations are Supabase SQL RPCs and Deno Edge Functions. |
| Deployment | Vite SPA on Vercel (`vercel.json`) with Netlify fallback config (`netlify.toml`). No current API/cron entries. |
| Event model | `KnotEvent` in `src/domain/types.ts:137-196`; public/private cloud separation in `supabase/migrations/20261024160000_knot_identity_events_transactions.sql:112-219`. |
| Design system | CSS tokens and shared controls in `src/styles.css:1-126`; deep theme `#211a3d`, primary `#6750c7`, accent `#f59a73`. |

There is no existing Python agent to reuse. The owner’s placement rule therefore makes **TypeScript under `agents/hackathon/` with Vercel functions** the smallest repository-native implementation choice; no Next.js or Python runtime will be fabricated.

## 2. Verified working behavior

### Automated before-feature baseline

- Production build and TypeScript project check passed.
- The initial domain run was **67/68** because Participation Fit read the real clock while its fixture used 24 October 2026. A minimal optional-clock fix was committed separately as `6368030`; the domain suite is now **68/68**.
- Existing Chromium workflows: **85 + 42 + 9 + 30 = 166/166 passed**.
- Route smoke: **16/16** existing route patterns returned the SPA document and rendered non-empty content.
- Explicit missing-event, unknown-route/404, and empty-search states rendered correctly.
- No unexpected page errors occurred in the route smoke or the four complete existing browser suites.

The 166 checks cover guest home/search/map, sign-up/sign-in, external and native participation, profile/plan, Quick Post, organizer operations, review queues, waitlists, QR/check-in, communications, team/community flows, Minor Mode gates, media, referral records, series drafts, mobile overflow, and browser console errors. They certify local-mode behavior; they do not certify hosted Supabase connectivity.

### Security positives verified

- No secrets were found in source during the architecture review; `.env.local` is ignored.
- `npm ci` reported **0 vulnerabilities** in the installed dependency tree.
- Existing external anchors use `noreferrer`; asynchronous external handoffs clear `window.opener` before navigation (`src/state/AppContext.tsx:511-529,540-545`).
- Existing cloud policies separate public event data, private participation data, and administrative functions. The new feature must not weaken these boundaries.
- Existing public URL ingestion rejects local/private-network targets (`src/domain/inputAdapters.ts`; domain test 60).

## 3. Findings

### Critical

No Critical source-code issue was confirmed by this audit. This does not change the previously verified operational concern that the hosted deployment remains in local mode; that is ranked High below because fresh-browser shared persistence is unavailable.

### High

| ID | Finding and evidence | Disposition |
|---|---|---|
| H1 | **Icon-only mobile Sign in has no accessible name.** `src/components/AppShell.tsx:57` relies on visible text, but `src/styles.css:840` hides that text on mobile. Lighthouse reported `link-name` with serious WCAG impact on both tested pages. | **Fixed** in `5125c10` with an explicit accessible name. |
| H2 | **Verified WCAG AA contrast failures.** `src/styles.css:287` step numbers are 1.42:1; organizer CTA eyebrow at `:288-294` is 2.77:1; event venue text at `:384-388`, freshness at `:391`, participation footnote at `:435`, and mobile bottom navigation at `:843` also fail their required ratios. | **Fixed** in `bf39951` with small token/scoped color corrections. |
| H3 | **Client-only rendering prevents event-specific link previews and reliable search metadata.** `index.html:5-11` has one generic title/description; `src/App.tsx:22-38` only establishes client routes. No OG image, sitemap, canonical URL, or route JSON-LD was found. | Phase 4 pre-rendering/metadata addition. A full SSR migration would be a breaking architectural rewrite and is not being performed implicitly. |
| H4 | **`/robots.txt` is missing and the SPA fallback serves HTML.** Lighthouse parses the returned HTML as invalid robots directives on both tested pages. | **Fixed** in `cf3a794`; a sitemap reference will be added only with a real sitemap. |
| H5 | **Hosted environment remains operationally local in the latest hosted evidence.** The existing `artifacts/live-e2e/POST_ENV_RECHECK_REPORT.md` recorded the local-product banner, zero Supabase requests, and fresh-browser Event not found/no session. | Requires correct Vercel Production env and redeployment by the owner; no code secret or destructive change will be introduced to disguise it. |

### Medium

| ID | Finding and evidence | Recommended phase |
|---|---|---|
| M1 | **Mobile legibility needs broader design-token review.** Lighthouse’s `font-size` audit reported many sub-12px declarations; examples include `src/styles.css:435` (`.61rem`) and `:843` (`.57rem`). Changing all of them at once would be a broad visual rewrite. | Incremental `a11y:`/UX pass; new Hackathons UI must use legible sizes from the outset. |
| M2 | **No route-level React error boundary.** `src/main.tsx:1-17` mounts the app directly, so an unexpected render exception can blank the entire root. | Isolated Phase 4 reliability addition with tests. |
| M3 | **Main client bundle remains substantial.** Before-feature build output includes an approximately 410 kB raw / 123 kB gzip main chunk; mobile Lighthouse TBT was 340 ms on Home. Map and several pages are already lazy-loaded. | Preserve code splitting; lazy-load Hackathons UI and measure after integration. |
| M4 | **Cloud durability is incomplete for secondary workflows.** `src/data/supabase/repository.ts` returns empty arrays for several organizer/community/media collections even though local implementations exist. | Outside the additive Hackathons scope; must not be represented as fully cloud-backed. |
| M5 | **No configured lint script.** `package.json:7-25` includes build/test/browser commands but no lint or standalone type-check script. TypeScript is covered by `tsc -b`. | Document accurately; do not claim lint passed. |
| M6 | **Security headers lack an explicit Content-Security-Policy.** `vercel.json` and `netlify.toml` set several useful headers but no CSP. A CSP must account for Supabase, maps, OCR WASM/workers and media before deployment. | Test separately as hardening; do not add a policy that breaks existing providers. |

### Low

| ID | Finding and evidence | Disposition |
|---|---|---|
| L1 | **Missing favicon causes a 404 console resource error.** Lighthouse `errors-in-console` on both pages; `index.html` has no icon declaration and `public/` has no favicon. | **Fixed** in `cf3a794` with a brand SVG and explicit icon link. |
| L2 | **SPA fallback returns HTTP 200 for unknown client routes.** The client correctly renders its 404 page, but crawlers receive a soft 404. | Resolve for public pre-rendered routes in Phase 4 where possible; no existing client route will be renamed. |
| L3 | **No dedicated `test:build` script exists.** This is not a failing product test; build and browser coverage are provided by separate configured commands. | Document only. |

## 4. Lighthouse before-fix evidence

Mobile/default Lighthouse runs against the production preview (`npm run preview`):

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 91 | 92 | 96 | 91 | 1.7 s | 0 | 340 ms |
| `/events/sample-ai-builders` | 90 | 93 | 93 | 92 | 3.0 s | 0 | 160 ms |

Primary deductions: contrast, missing mobile link name, invalid robots.txt, favicon 404, and mobile font-size legibility. Local Lighthouse scores are evidence for this build/environment, not a guarantee of hosted field performance. Full JSON reports are retained locally under `artifacts/hackathon-agent/before/`.

## 5. Phase 1 remediation verification

After the safe fixes, the project again passed build, TypeScript, **68/68 domain tests, 166/166 existing Chromium checks, and 16/16 route smoke checks**. `npm audit --audit-level=high` reported zero vulnerabilities.

| Page | Performance | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 94 | 100 | 100 | 100 |
| `/events/sample-ai-builders` (three runs) | 88 / 90 / 89 | 100 | 96 | 100 |

The event page remains LCP-sensitive (3.1–3.2 seconds in the repeat runs), so Phase 4 must retain a performance target above 90 rather than treating the accessibility/SEO gains as proof of performance. No old behavior regressed in the full browser rerun.

## 6. Missing feature areas relevant to the requested roadmap

1. Approved, permissioned live hackathon source connectors and a durable three-table Hackathons catalog.
2. Cached public Hackathons read API and anonymous/authenticated interest-handoff API with validation and rate limits.
3. Feature-flagged `/hackathons`, navigation, and home discovery UI.
4. Route-specific pre-rendering/metadata, OG images, sitemap, and schema.org Event output.
5. Hackathon-specific My Interests, calendar/reminder options, relevance and similar-event additions.
6. Route error boundaries and measured API abuse controls.

## 7. Audit constraints and non-claims

- Existing browser tests are comprehensive for local mode but are not Firefox, Safari, physical-device, or hosted-cloud certification.
- No unauthorized scraping was performed. No source was treated as approved merely because a public page exists.
- No real payment, email/WhatsApp, LiveKit, third-party registration completion, or approved live-feed activation was tested.
- No existing route, table, component, env var, or design-system section was renamed or deleted during the audit.
