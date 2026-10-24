# Verification report

**Date:** 24 October 2026  
**Application:** Fresh Knot product on Vite/React/TypeScript  
**Result:** Passing for the documented browser-local implementation

## Commands and results

| Check | Command | Result |
|---|---|---|
| Domain regressions | `npm test` | **46 passed, 0 failed** |
| TypeScript + production bundle | `npm run build` | **Passed**; 2,113 modules transformed; no chunk-size warning |
| Core Chromium flows | `npm run test:e2e` | **84 passed, 0 failed** |
| Expansion Chromium flows | `npm run test:e2e:expansion` | **42 passed, 0 failed** |
| Instant Add adapter flows | `npm run test:e2e:adapters` | **9 passed, 0 failed** |
| Combined browser gate | `npm run test:e2e:all` | **135 checks** across the three suites |
| Dependency audit | `npm audit --audit-level=high` | **0 vulnerabilities** |
| Whitespace/conflict check | `git diff --check` | **Passed** |
| Browser runtime | Console and `pageerror` listeners | **0 unexpected captured errors** in final suites |
| Responsive smoke | 1440 px desktop and 390 px mobile | No horizontal overflow in tested home/search/admin/communications/studio/event views |

The final production build emitted a **377.97 kB main chunk** (113.33 kB gzip), a 334.64 kB secondary application chunk, a 51.20 kB React vendor chunk, route-level lazy chunks and 97.28 kB CSS (18.47 kB gzip). OCR runtime assets are served locally from generated `public/ocr/` files and are not part of the JavaScript main chunk.

## Domain coverage

The 46 tests cover:

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
