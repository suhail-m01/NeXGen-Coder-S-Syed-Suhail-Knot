# Verification report

**Date:** 24 October 2026  
**Application:** Fresh Knot product on Vite/React/TypeScript  
**Result:** Passing for the documented local milestone

## Commands and results

| Check | Command | Result |
|---|---|---|
| Domain regressions | `npm test` | **22 passed, 0 failed** |
| TypeScript + production bundle | `npm run build` | **Passed**; 1,993 modules transformed |
| Chromium product flows | `npm run test:e2e` against port 5174 | **38 passed, 0 failed** |
| Dependency audit | `npm audit --audit-level=high` | **0 reported vulnerabilities** |
| Browser runtime | Console and `pageerror` listeners | **0 captured errors** in the tested desktop flow |
| Responsive smoke | 1440 px desktop and 390 px mobile | Tested home/search had no horizontal page overflow; mobile navigation visible |

The production bundle generated in the final run was approximately 454 kB JavaScript and 70 kB CSS before gzip. Bundle-size optimization is a later performance task, not a correctness failure.

## Domain coverage

The 22 tests cover:

- Age-band overlap, exclusion and self-declaration uncertainty
- Guest authentication requirements
- Guardian-consent and native minor-safety gates
- Adult publishing permission
- Past, cancelled, pending-review, deadline and registration-opening states
- Ended/cancelled catalog exclusion
- Combined interest, skill, online and joinable filters
- Participation Fit reasons and unknown-eligibility behavior
- Quick Post timing, venue, age and price validation
- Online external-registration versus joining-link requirements
- Native online joining-link requirement
- Web URL validation and non-web scheme rejection
- Conservative Instant Add price and age extraction
- Explicit date, time, age, team and URL evidence
- Year-less date rollover
- URL/title normalization and duplicate candidates
- ICS escaping and UTC timestamps
- Geodesic locality distance
- Community derivation from canonical event relationships
- Sample-data and source-link labelling

## Browser coverage

The 38 checks exercise:

1. Guest home and public search without login
2. Interest filters and geocoded map pins
3. Event source ledger and sample labelling
4. Authentication on external Register
5. Account creation and return to the original event
6. Actual external tab opening and handoff-only status
7. Self-confirmed external registration
8. Native Knot registration and saving
9. My Plan status separation
10. Quick Post publication and native source listing
11. Owned-event organizer dashboard
12. A second account registering for the new event
13. Operational registration visibility to the organizer
14. Disabled future-event check-in
15. Venue update, public revision and affected-user notification
16. Instant Add draft, human-review submission and non-public pending status
17. Adult team post, request, acceptance and post-acceptance contact handoff
18. JSON account-data export
19. Mobile navigation and horizontal-overflow checks
20. Console/runtime error capture

## Defects found and fixed during browser verification

- **Auth-guard race on sign-out:** clearing a profile session redirected back to sign-in. Session persistence and clean navigation were corrected.
- **Venue success message cleared itself:** an effect dependent on venue values reset the message after a successful update. The effect now resets only when selecting another event.
- **Online Quick Post rule mismatch:** validation now permits an external registration link with joining details later and requires a joining link for native online registration.
- **Edge-state hardening:** pending registrations cannot be checked in, feedback is post-event, blocked external pop-ups do not become handoffs, and unpublished events cannot be joined through a direct URL.

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
# On a minimal Linux environment, if required:
npx playwright install-deps chromium
npm run test:e2e
```

Set `E2E_BASE_URL` to test another running deployment. Browser screenshots are generated into the ignored `artifacts/` directory.

## Verification limits

- Tests cover the local repository, not a production Supabase/backend deployment.
- External registration uses labelled `example.com` sample destinations; no real platform conversion is claimed.
- Browser tests are Chromium-based, not a completed cross-browser or assistive-technology certification.
- Sample events exercise product behavior but are not real event coverage or pilot traction.
- No Seed Pack, pilot conversion, attendance or impact target is reported as achieved.
