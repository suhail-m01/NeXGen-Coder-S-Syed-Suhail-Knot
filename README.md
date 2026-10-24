# Knot

**Find events that fit your life—and turn participation into a community you return to.**

Knot is an India-first event discovery and participation product, launching with Bengaluru neighbourhood coverage. It combines source-linked event details, hyperlocal and online discovery, age/eligibility decisions, external and native registration, Instant Add, team formation, organizer operations and post-event feedback.

This repository is a **fresh implementation**, not an extension of the earlier prototype. The governing references are included in [`docs/KNOT_FINAL_PRODUCT_BASELINE.md`](docs/KNOT_FINAL_PRODUCT_BASELINE.md) and [`docs/KNOT_MASTER_PRODUCT_BLUEPRINT_v4.md`](docs/KNOT_MASTER_PRODUCT_BLUEPRINT_v4.md); the final baseline’s corrections govern the older blueprint wording.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the Vite URL on port **5174**. The server binds to `0.0.0.0` and allows the workspace preview host.

```bash
npm run build       # TypeScript + production bundle
npm test            # Domain regression suite
```

Browser tests require the dev server and Playwright Chromium:

```bash
npx playwright install chromium
# If Linux system libraries are missing:
npx playwright install-deps chromium

# With npm run dev already running:
npm run test:e2e
```

## Current verification

- **22/22 domain tests passing**
- **38/38 Chromium browser checks passing**
- **Clean TypeScript and production build**
- Desktop and 390 px mobile flows checked; no horizontal page overflow in tested views
- Zero captured browser runtime/console errors in the end-to-end flow

See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for coverage and [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) for the honest implementation boundary.

## What works in this milestone

### Public discovery

- Browse home, search, map, event and community pages without an account.
- Filter by locality/radius, time, event type, mode, interest, skill and age rule.
- Sort by soonest, best fit, deadline, distance or freshness.
- Explore 40 Bengaluru localities with stored Nominatim geocode provenance.
- Read canonical events connected to original listings, confidence, freshness and revision history.
- Sample records are visibly labelled; they are not presented as real announcements.

### Accounts and participation

- Local account creation and sign-in with salted PBKDF2 password hashes.
- Authentication gates for Register, Join, Publish, Host, Save and Follow.
- Self-declared age bands, conservative age-rule decisions and adult-only publishing/team posting.
- External registration on the original website after Knot authentication/rule checks.
- External handoff, self-confirmed external registration, native registration and organizer check-in remain different states.
- Native free registration, capacity checks, registration timing and controlled joining-link visibility.
- Participation Fit explains interest, skill, learning, age and distance reasons; unknown eligibility cannot produce Strong Fit.
- Saves, follows, My Plan, ICS calendar export, sharing and post-event feedback.

### Publishing and organizer operations

- Quick Post with required title, type, date, mode, venue/route, registration and age-rule groups.
- Online events support external registration now with joining details later; native online registration requires a joining link.
- Instant Add parses pasted text into an evidence/confidence review draft and then a pending-review queue item.
- Organizer dashboard for owned events, native registration operations and CSV export.
- Venue revisions, cancellation/reopening, material-change notifications and organizer check-in windows.
- Operational counts distinguish native registrations, external openings, self-confirmation, check-ins and feedback denominators.

### Communities and data controls

- Community pages derived from canonical organizer/event relationships.
- Adult team posts, join requests, capacity-aware acceptance and post-acceptance contact handoff.
- Profile area, radius, interests, skills and learning goals.
- JSON data export without password hashes, local account deletion and full workspace reset.

## Important boundaries

**This is currently a local product repository, not a production cloud deployment.**

- Data persists in browser `localStorage` under `knot.product.data.v1`.
- The included `@supabase/supabase-js` dependency does **not** mean Supabase is connected. No cloud project, authentication service or multi-device sync is active.
- Browser PBKDF2 storage is appropriate for this local milestone, not a substitute for production identity, server-side authorization, RLS and security review.
- Instant Add currently reads pasted text. Public-URL fetching and poster OCR are not faked.
- Instant Add submissions become pending-review records; the privileged admin review interface is a remaining Phase 1 item.
- Minor accounts, guardian consent activation, Minor Mode and native minor participation remain gated. Public browsing works, and adult-only actions are enforced.
- Paid ticketing, live video hosting, WhatsApp automation and guardian-managed dependent profiles remain separately gated.
- No external click is counted as a registration, no unknown price becomes Free, no self-reported attendance becomes verified attendance, and no source/organizer claim becomes safety verification.

## Architecture

```text
src/
├── components/       Shell, navigation, cards, filters, map and shared UI
├── data/             Versioned local repository and PBKDF2 browser auth
├── domain/           Types, age decisions, geo, filtering, fit, parser,
│                     dedupe, Quick Post validation, samples and localities
├── pages/            Public, account, participation and organizer routes
├── state/            Application context, permissions and operational actions
├── App.tsx           Route table
└── styles.css        Responsive design system

tests/
├── domain.test.ts    Safety, honesty and domain regressions
└── e2e.mjs           Multi-account Chromium product flows

scripts/
└── geocode-localities.ts
```

The domain layer is deliberately independent of React. The current repository adapter is local; a production adapter must add server-enforced permissions rather than merely copying browser state to a cloud table.

## Useful routes

| Route | Purpose |
|---|---|
| `/` | Personalized/public home discovery |
| `/search` | Filterable list and locality map |
| `/events/:eventId` | Event details, participation and source ledger |
| `/auth` | Sign-in, adult account creation and minor gate explanation |
| `/publish` | Quick Post / Host on Knot |
| `/add` | Instant Add pasted-text workflow |
| `/plan` | Schedule, saved events and follows |
| `/organizer` | Owned-event operations and insight |
| `/communities` | Community directory |
| `/communities/:communityId` | Community events and team formation |
| `/profile` | Preferences, privacy and data controls |

## Product basis

The destination remains the complete corrected-v4 core product across Phases 0–4. This milestone does not discard later committed features; it establishes a tested foundation for them. Conditional features stay gated until separately approved.
