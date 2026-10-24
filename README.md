# Knot

**Find events that fit your life—and turn participation into a community you return to.**

Knot is an India-first event discovery and participation product with Bengaluru neighbourhood coverage. It connects source-linked discovery, age/eligibility decisions, external and native registration, Instant Add, team formation, full organizer operations and post-event return loops.

This is a **fresh implementation**, not an extension of the rejected prototype. The governing references are [`docs/KNOT_FINAL_PRODUCT_BASELINE.md`](docs/KNOT_FINAL_PRODUCT_BASELINE.md) and [`docs/KNOT_MASTER_PRODUCT_BLUEPRINT_v4.md`](docs/KNOT_MASTER_PRODUCT_BLUEPRINT_v4.md); baseline corrections govern older blueprint wording.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the Vite URL on port **5174**. `npm install` also prepares local OCR worker, WebAssembly and English language assets; recognition does not require a CDN or remote OCR service.

## Verify

```bash
npm test                 # 57 domain/cloud-mapping regressions
npm run build            # TypeScript + optimized production bundle
npm run dev              # required in another terminal for browser tests

npx playwright install chromium
npx playwright install-deps chromium  # only if Linux libraries are missing
npm run test:e2e         # 84 core multi-account checks
npm run test:e2e:expansion # 42 organizer/minor/trust/federation checks
npm run test:e2e:adapters  # 9 real public-URL and local-OCR checks
npm run test:e2e:final     # 30 referral/team/media/series/cohort/map checks
npm run test:e2e:all       # all 165 Chromium checks
```

Set `E2E_BASE_URL` to target another running deployment.

## Current verification

- **57/57 domain and cloud-mapping tests passing**
- **165/165 Chromium checks passing** across four fresh-state suites
- **Clean TypeScript and production build**: 2,122 modules, route-level lazy chunks, no chunk-size warning
- Real QR-image decoding and real local poster OCR are exercised; neither is mocked
- Desktop and 390 px mobile flows checked; tested expanded views have no horizontal page overflow
- Zero captured browser runtime/console errors in the final suites
- `npm audit --audit-level=high`: **0 vulnerabilities**

See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for exact coverage and [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) for the implementation boundary.

## Working product areas

### Discovery, provenance and Instant Add

- Guest home, search, map, event and community browsing without an account.
- Locality/radius, custom dates, event type/mode, interest, skill, price, age, team, source and estimated-travel filters; shareable filter URLs and saved searches.
- Forty Bengaluru localities with stored Nominatim geocode provenance plus thirteen explicitly approximate Indian city-centre anchors.
- Pan/zoom map viewports, bounded grid clustering, Search this area and accessible loaded-event list parity.
- Canonical events with multiple listings, confidence, freshness, revisions, merges and conflict-preserving source records.
- Instant Add from pasted text, user-given public HTML/text pages and local English poster/screenshot OCR. URL imports reject private-network targets, use no credentials, have time/size limits and do not bypass CORS.
- Structured title/ISO-date/registration extraction, conservative price/age reading, duplicate prompts, private original evidence and mandatory human review before publication.
- Permissioned JSON-feed adapter for approved Source Records; imports are bounded and enter pending review, never auto-publish.

### Accounts, fit and participation

- Local accounts with salted PBKDF2 password hashes, explicit action gates and post-authentication return paths.
- Self-declared age bands, conservative eligibility decisions and adult-only publishing/team formation.
- Restrictive Minor Mode for 13–17 accounts: local guardian attestation, pending/active/withdrawn states, explicit-only personalization, withdrawal/deletion and no behavioural learning.
- Native minor participation requires age eligibility, active guardian consent and all four organizer minors-welcome declarations. Under-13 individual accounts remain closed.
- External registration occurs on the original platform after Knot checks. Opening, self-confirmation, native registration and organizer attendance remain separate states.
- Native free registration with custom private questions, finite/open capacity, manual approval, deterministic waitlists/promotion and controlled joining-link visibility.
- Participation Fit, full optional preferences, saved events/searches, organizer/topic follows, self-declared going, schedule conflicts, deadline reminders, ICS export and private participation history.

### Full organizer and participant operations

- Quick Post plus the full event studio at `/organizer/events/:eventId`.
- Description, eligibility, experience, interests/skills, team rules, price/prizes, visibility, accessibility/conduct and adult collaborator roles.
- FAQs, public/participant resources, rounds, agendas/speakers, recaps and consented project showcases.
- Weekly/monthly series automation creates bounded private drafts on workspace open; joining links, safety declarations and participant outcomes reset before human publication.
- Persistent IndexedDB event/recap/sponsor images with WebP normalization, alt text, consent-basis records, draft/publication/takedown and sponsor linking.
- Referral channels with share URLs, QR/share-card downloads and aggregate session-open/native-conversion reporting.
- Attendee search and CSV export, custom registration answers, minor-safety controls and volunteer-limited check-in.
- Random-token participant QR passes; camera/image/manual organizer scanning with event/time/eligibility checks and duplicate protection.
- Structured attendee question inbox, organizer answers, reusable FAQ conversion and asker-notification loop without public minor identity.
- Repository/video/document project submissions, independent showcase consent, rubric scoring, feedback, shortlist/winner states and judge/co-organizer permissions.
- Targeted in-app announcements with recipient preview/deduplication, opt-out, scheduling, quiet-hour visibility and an honest local delivery ledger.
- Participant-critical studio changes require explicit confirmation, create revisions/audit records and immediately notify affected participants/savers.
- Certificates only after organizer-recorded native attendance and event end; they make no skill or winner claim.

### Communities, trust and data controls

- Community pages, event series, next-event modules and adult team posts/requests/acceptance with post-acceptance contact handoff.
- Adult in-app team invitations with expiry, shared request/invitation capacity, complementary-skill readiness and explicit team-continuity opt-in.
- Adult-only, explicit-opt-in 60-day return cohorts using verified native attendance, mature windows and suppressed small-group counts.
- Guest problem/minor-safety reports with local rate limits; privileged report resolution, organizer claims and sensitive-action audit history.
- Aggregate operational/reach reporting with small-group suppression; unknown attendance, external clicks and organizer claims never become favourable proof.
- JSON data export without password hashes, account deletion with organizer-offboarding protection and full workspace reset.

## Important boundaries

**This is a browser-local product implementation, not a production cloud deployment or proof of internet-scale coverage.**

- Structured data persists in `localStorage` under `knot.product.data.v1`; optimized media blobs use IndexedDB. Supabase is not connected; there is no multi-device sync or production server authorization.
- The first eligible adult local account bootstraps workspace review access. This is local tooling, not a production admin model.
- Source Records do not themselves activate APIs, scraping or crawling. Unstop, Devfolio, Devpost and open-web records start disabled; the included federation path accepts reviewed JSON only after permission activation.
- Guardian attestation is an honest local workflow, not production-verifiable parental consent. Production minor activation requires verified consent, safeguarding, retention and legal review.
- “Sent” means local in-app records were written. No email/SMS/WhatsApp delivery or proof of reading is claimed. Critical material-change notices bypass optional quiet hours.
- Local capacity/waitlist transitions are deterministic, not concurrent server transactions.
- QR tests decode real generated images; physical camera/hardware permission testing remains separate.
- Local media, referral, series and cohort features do not become cloud storage, external campaign attribution, server schedulers or validated real-world pilot outcomes. Internet-scale open-web discovery and automated external email remain unactivated.
- Paid ticketing, live video hosting, WhatsApp automation and guardian-managed dependent profiles remain separately gated.
- No unknown value becomes favourable evidence; no self-report becomes verified attendance; no organizer/source claim becomes safety verification.

## Architecture

```text
src/
├── components/       Shell, cards, filters, maps, QR and participant engagement
├── data/             Versioned local repository, IndexedDB media and PBKDF2 auth
├── domain/           Types, age, geo, discovery, parsing/OCR adapters,
│                     registration, federation, operations and trust rules
├── pages/            Public, account, planner, organizer studio and admin routes
├── state/            Guarded application actions and scheduled notifications
├── App.tsx           Lazy route table
└── styles.css        Responsive design system

tests/
├── domain.test.ts
├── e2e.mjs
├── expansion-e2e.mjs
├── input-adapters-e2e.mjs
└── final-expansion-e2e.mjs

scripts/
├── geocode-localities.ts
└── prepare-ocr.mjs
```

The domain layer is independent of React. A production repository adapter must enforce permissions and transactions on the server rather than copying browser state into cloud tables.

## Useful routes

| Route | Purpose |
|---|---|
| `/` | Public/personalized discovery |
| `/search` | Filters, saved searches and locality map |
| `/events/:eventId` | Details, participation, resources, projects and trust actions |
| `/auth` | Adult/minor account flows |
| `/publish` | Quick Post / Host on Knot |
| `/add` | Instant Add text, public URL and poster OCR |
| `/plan` | Schedule, deadlines, going and participation history |
| `/organizer` | Owned-event dashboard |
| `/organizer/events/:eventId` | Full event operations studio |
| `/admin` | Review, Source Records, trust/claims and audit queues |
| `/communities` | Community directory and team formation |
| `/profile` | Preferences, consent, privacy and data controls |

## Delivery artifacts

- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — timestamped two-minute demonstration path
- `deliverables/Knot_Product.pdf` — exactly five slides
- `deliverables/Knot_Demo.mp4` — captioned two-minute local product demonstration

The validated source archive is generated only after the documented verification gates pass. GitHub push history and any remaining delivery blocker are recorded in [`docs/DELIVERY.md`](docs/DELIVERY.md).
