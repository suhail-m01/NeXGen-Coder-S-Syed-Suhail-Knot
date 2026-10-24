# Verification report

**Date:** 24 October 2026
**Application:** Fresh Knot product on Vite/React/TypeScript
**Result:** Passing for the documented browser-local implementation

## Commands and results

| Check | Command | Result |
|---|---|---|
| Domain regressions | `npm test` | **53 passed, 0 failed** |
| TypeScript + production bundle | `npm run build` | **Passed**; 2,122 modules transformed; no chunk-size warning |
| Core Chromium flows | `npm run test:e2e` | **84 passed, 0 failed** |
| Expansion Chromium flows | `npm run test:e2e:expansion` | **42 passed, 0 failed** |
| Instant Add adapter flows | `npm run test:e2e:adapters` | **9 passed, 0 failed** |
| Final growth/media/team/series/map flows | `npm run test:e2e:final` | **30 passed, 0 failed** |
| Combined browser gate | `npm run test:e2e:all` | **165 checks** across four suites |
| Dependency audit | `npm audit --audit-level=high` | **0 vulnerabilities** |
| Whitespace/conflict check | `git diff --check` | **Passed** |
| Browser runtime | Console and `pageerror` listeners | **0 unexpected captured errors** in final suites |
| Responsive smoke | 1440 px desktop and 390 px mobile | No horizontal overflow in tested home/search/admin/communications/studio/event views |

The final production build emitted a **404.12 kB main chunk** (120.65 kB gzip), a 334.64 kB secondary application chunk, a 51.31 kB React vendor chunk, route-level lazy chunks and 103.24 kB CSS (19.37 kB gzip). OCR runtime assets are served locally from generated `public/ocr/` files and are not part of the JavaScript main chunk.

## Domain coverage

The 53 tests cover:

- Age-band overlap, exclusion, uncertainty, guardian consent and native minor-safety gates.
- Adult publishing/review permissions and closed/restricted account behavior.
- Past, cancelled, deadline and registration-opening states.
- Interest, skill, online, joinable, custom-date and unknown-price filtering.
- Participation Fit reasons and unknown-eligibility behavior.
- Quick Post timing, venue, age, price, capacity and online-link validation.
- Web URL validation and non-web scheme rejection.
- Conservative Instant Add price/age extraction, explicit evidence, year-less rollover, structured titles, ISO start/end dates and registration URLs.
- Timezone offsets not becoming age rules; source URLs not becoming event titles.
- URL/title normalization, dedupe, canonical review and private-evidence exclusion.
- ICS escaping/UTC timestamps, geodesic distance and community derivation.
- Source activation, approved-method and evidence gates.
- Registration capacity, approval, waitlist and deterministic promotion branches.
- Random check-in tokens, payload round-trips and malformed-token rejection.
- Announcement segmentation, deduplication, opt-out and message validation.
- Sensitive registration-question rejection and required/choice answers.
- Schedule overlap and project-link validation.
- Certificate attendance/event-end requirements.
- Adult reach suppression and minor/restricted/closed exclusion.
- Permissioned federation parsing and pending-review creation.
- Overnight/daytime quiet-hour delivery behavior.
- Material versus cosmetic studio changes.
- Public URL credential/private-network rejection.
- Team invitation expiry, shared membership/capacity and complementary-skill readiness.
- Referral session deduplication and native-conversion/external-handoff separation.
- Adult opt-in return-cohort maturity, exclusions and null-count small-group suppression.
- Safe series recurrence/cloning, viewport/grid clustering and honest city-anchor precision.

## Core browser suite — 84 checks

The original multi-account flow verifies guest discovery, external handoff, native registration, Quick Post, organizer registration operations, material venue changes, Instant Add review/merge/outcomes, adult team formation, export/deletion foundations, finite capacity/manual approval/waitlists, real QR generation and organizer-side image decoding, duplicate/wrong-event/malformed scan handling, targeted announcements/opt-out, responsive navigation and zero unexpected runtime errors.

## Expansion browser suite — 42 checks

A separate fresh-state scenario verifies:

1. Under-13 account closure with public browsing preserved.
2. Guest minor-safety reporting without authentication.
3. All-ages native hackathon publication.
4. Required custom registration questions.
5. Series, FAQ, resource, round and agenda persistence.
6. Minor blocking before guardian attestation and before organizer safety completion.
7. Local guardian attestation without production-verification claims.
8. All four minors-welcome declarations and successful gated minor registration.
9. Public resources/FAQs, separate going, attendee questions and project consent.
10. Organizer answers, FAQ deduplication, rubric scoring and participant feedback.
11. Participant-critical change confirmation and affected-user notification.
12. Full-studio scheduled announcement and subsequent participant delivery.
13. Saved-search creation/new-match checks and explicit topic follows.
14. Organizer claim submission, privileged approval and resulting studio access.
15. Prioritized guest report resolution and audit note.
16. Source method/evidence activation, reviewed JSON import and non-auto-publication.
17. Guardian withdrawal, account restriction, local deletion and public-event preservation.
18. Mobile studio/event overflow checks and zero unexpected browser errors.

## Instant Add adapter suite — 9 checks

A third fresh-state scenario uses real browser inputs:

- A CORS-permitted public HTML page with JSON-LD is fetched without credentials and converted into private evidence.
- Structured title/start/registration data produces a reviewable draft; nothing becomes public automatically.
- A poster PNG is generated in Chromium and processed by the actual local Tesseract WebAssembly worker and English trained data. The test asserts extracted Bengaluru/date/URL evidence; OCR output is not mocked.
- OCR text enters the same private review flow and requires explicit submission.
- A private-network URL is rejected before fetching.
- No unexpected runtime/console errors are captured.

## Final expansion browser suite — 30 checks

A fourth fresh-state, multi-account scenario verifies:

1. Native event publication with team rules and series assignment.
2. Referral URL/QR generation, honest empty state, guest aggregate open and atomic session deduplication.
3. Referral preservation through account creation and native registration, with organizer conversion reporting.
4. Adult return-analytics consent controls.
5. In-app adult team invitation, acceptance, complementary-skill readiness, continuity and contact boundaries.
6. Real PNG normalization to WebP, private draft, explicit publication and sponsor-logo association.
7. Published image rendering after reload from IndexedDB, followed by public takedown and actual blob deletion.
8. Controlled due-time series automation, private safe clone and human publication.
9. A controlled five-adult mature attendance fixture producing a 40% verified 60-day return cohort; this is test data, not pilot evidence.
10. Map viewport search, accessible results, approximate Mumbai city-anchor labelling, 390 px media-studio overflow and zero unexpected browser errors.

## Defects found and fixed during expansion verification

- Closed an incomplete EventEngagement JSX container and removed unused studio imports.
- Corrected guardian wording and blocked unsupported adult-to-minor self-service transitions.
- Rejected sensitive registration questions and tightened restricted/minor/closed participation guards.
- Excluded private/unlisted events from public community aggregation.
- Removed duplicate FAQ rendering after question-to-FAQ conversion.
- Fixed a controlled/native disclosure conflict that kept the report form closed.
- Added guest reporting instead of incorrectly forcing authentication for public safety reports.
- Re-resolved scheduled audiences at processing time and hid future quiet-hour notifications until visible.
- Added action-level material-change confirmation rather than relying only on a dialog.
- Fixed structured URL extraction so `Source URL` is not a title/registration link, ISO dates are read and timezone offsets are not age rules.
- Restored route-level code splitting after expanded pages increased the main bundle.
- Fixed floating-point grid-cell assignment that could split nearby map markers incorrectly.
- Moved referral deduplication into the atomic repository update after a double-effect race created duplicate visits.
- Suppressed exact cohort counts in the domain result itself, not only in the table rendering.

## Reproduce

```bash
npm install
npm test
npm run build
npm run dev
```

In another terminal:

```bash
npx playwright install chromium
npx playwright install-deps chromium  # if required on minimal Linux
npm run test:e2e:all
```

Set `E2E_BASE_URL` to test another running deployment. Screenshots are generated into ignored `artifacts/` directories. `npm install` runs `scripts/prepare-ocr.mjs` to recreate local OCR assets.

## Verification limits

- Tests cover the local repository, not a production backend, RLS, server authorization or multi-device sync.
- Capacity/promotion tests are deterministic local tests, not concurrent multi-user transaction certification.
- Source tests cover configuration and reviewed JSON adapters, not live Unstop/Devfolio/Devpost/open-web connectors.
- External registration uses labelled sample destinations; no real platform conversion is claimed.
- Chromium tests are not cross-browser or assistive-technology certification.
- QR tests decode actual generated PNGs, not physical camera hardware or permission prompts.
- OCR tests use a clear generated English poster; accuracy across low-quality posters, other languages and handwritten text is not certified.
- Scheduled communication tests verify local in-app records, not email/SMS/WhatsApp delivery or reading.
- Sample events are product fixtures, not real coverage, pilot traction or impact evidence.
- Media tests verify IndexedDB persistence and takedown in Chromium, not cloud object storage or every browser quota policy.
- Series tests use a controlled due date and on-open processing, not a server scheduler while the browser is closed.
- Return-cohort tests use controlled attendance fixtures, not real longitudinal pilot data or multi-device identity attribution.
