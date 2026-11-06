# Fixed full-project ZIP — implementation and verification record

**Date:** November 6, 2026  
**Branch:** `feature/knot-hackathon-agent`  
**Baseline:** latest `main` product tree integrated in `28401ce` while preserving both lineages. No commit was made directly to `main`.

## Delivered correction scope

### Truthful catalog, freshness, and agent status

- Removed silent production API fallbacks, fabricated run/status timestamps, and curated-only server-interest persistence.
- Curated records have fixed sample/stale provenance and do not claim independent URL verification.
- The home agent panel consumes real status responses or reports unavailable/not-configured states; it does not simulate scanning, latency, discovery, or verification.
- Sample listings no longer use “verified listing” source labels or a live indicator.
- Empty filters remain empty; a city search may queue an aggregate request but does not start or guarantee an agent run.
- A run with no runnable authorized source fails closed. Runtime opt-in, permission evidence, approved methods, discovery URLs, and provider keys are all checked.

### Registration and participation boundaries

- External curated events do not expose native Squad Apply, ticket, or team-dashboard paths, including through a `teamCode` URL.
- Hackathon cards use neutral **View details**, account-based **Save**, and **Interested — official site** wording. The explicitly labelled Interested handoff permits guest outbound continuation; it is not registration or attendance.
- Other external-event registration authentication and age/rule boundaries remain unchanged.
- Native and external participation records remain distinct.

### Conservative WhatsApp/flyer import

- Replaced immediate native publication with the existing private-evidence, human-review pipeline.
- Extraction is rule-based with local OCR; it does not claim remote AI understanding or instant discovery.
- Source dates and full venue strings are preserved. Unknown mode, price, and locality remain unresolved. Prize pools are not ticket prices, and paid amounts require fee evidence.
- Online drafts require a registration/joining link. In-person/hybrid drafts require venue and reviewed locality.
- Valid imports create `pending_review` submissions only. They do not create a public event or native registration, and success copy says so.
- Review no longer defaults an unknown location to Koramangala.

### Privacy and local-only tools

- Minor names are not inserted into the public event/team planning view.
- Team Synergy is an empty-by-default browser-local role planner with anonymous local labels, fictional sample roles, transparent coverage, and no invitation-delivery or outcome-prediction claims.
- Commute entries are explicitly browser-only/sample-scoped; legacy real-looking seed hosts are removed by the local storage migration.
- Passport, concierge, invitation, and check-in copy distinguishes local drafts, provider delivery, organizer-recorded outcomes, and rule-based search.
- The role planner now stacks and wraps at narrow viewports without horizontal page overflow.

### Runtime, migrations, and deployment

- Repository-native **TypeScript** is retained because it shares the app's validation, domain types, API runtime, and test tooling; no separate reusable Python agent exists.
- Hackathon tables remain limited to additive `hackathons`, `hackathon_interests`, and `agent_runs` migrations with RLS. Existing Event tables/routes/components are not reshaped or renamed.
- The interest wrapper no longer manufactures fallback IDs; database failures return an explicit unavailable response.
- `.env.example` documents every Hackathon runtime/public-flag variable, including the honest bot identity and legacy shutoff alias.
- `npm run agent:doctor` exits nonzero when production configuration is incomplete and never treats local readiness as deployed execution evidence.
- `npm run check:hackathon-deployment` statically checks required files, additive/RLS migration properties, cron authentication wiring, environment documentation, and fallback removal.
- `vercel.json` declares a daily cron; this is configuration only, not evidence of a deployed or successful scheduled run.

## Fresh verification results

| Check | Result |
|---|---:|
| Unit/domain/cloud-mapping/agent/importer tests (`npm test`) | **114/114 passed** |
| TypeScript + Vite production build (`npm run build`) | **Passed** |
| Static deployment checks | **60/60 passed** |
| Original core browser suite | **85/85 passed** |
| Original expansion browser suite | **42/42 passed** |
| URL/local-OCR adapter browser suite | **9/9 passed** |
| Original final-expansion browser suite | **30/30 passed** |
| Mocked Hackathon API/browser suite | **42/42 passed** |
| Trust-boundary browser suite | **15/15 passed** |
| Conservative-importer browser suite | **11/11 passed** |
| Feature-flag shutoff browser suite | **7/7 passed** |
| **Total fresh browser checks** | **241/241 passed** |

The browser runs completed with the suites' no-uncaught-exception/no-unexpected-console-error assertions passing. The build retains the existing non-blocking large-chunk and empty local-provider vendor-chunk warnings. There is no separate lint script; `npm run build` performs `tsc -b` before Vite compilation.

The deliberately unconfigured doctor run exited **1** and reported **Production configuration: NOT READY** and **Deployed activation: NOT VERIFIED**, which is the expected safety behavior.

## Archive contents and exclusions

The delivery archive is constructed from committed files at the final branch HEAD. It includes source, tests, package lockfile, migrations, setup/deployment documentation, and tracked static deliverables. It excludes:

- `.git/` and Git metadata
- `node_modules/`, `dist/`, caches, and generated OCR assets
- `.env`, `.env.local`, and other local secret-bearing environment files
- Playwright artifacts, logs, screenshots, and test output
- the separately delivered PowerPoint files and the ZIP itself

After extraction, use `npm ci`, then `npm test` and `npm run build`. See `README.md` and `docs/HACKATHON_DEPLOYMENT.md` for local/cloud setup and repeatable browser commands.

## Explicit non-claims and remaining activation work

- This source package does **not** apply migrations, configure private Vercel/Supabase/provider credentials, activate a source, or prove a deployed cron/run.
- No Resend, Razorpay, Meta WhatsApp Cloud API, or LiveKit Cloud live activation is claimed without configured services and end-to-end evidence.
- Historical cloud checks are not represented as fresh post-fix remote certification. A disposable configured project is still required before production cloud certification.
- Live ingestion remains limited to reviewed/permissioned sources and must not bypass logins, CAPTCHA, paywalls, robots rules, or rate limits.
- Interim production remains adults-only. Local Minor Mode/guardian-attestation reference flows are not production-verifiable parental consent.
- Seed/pilot values remain targets or labelled samples, not achieved traction.

## Implementation commits

| Commit | Scope |
|---|---|
| `28401ce` | Latest-main product baseline with preserved branch histories |
| `4e9d70c` | Real Hackathon API availability/status behavior |
| `c7dba47` | Sample, external-registration, privacy, and local-tool boundaries |
| `9ed01a9` | Conservative importer through pending human review |
| `7430ea4` | Fail-closed agent runtime and deployment checks/documentation |
| `f15653a` | Truthful sample sources and mobile-safe event tools |
| `1ab4d2f` | Repeatable feature-flag shutoff regression |
