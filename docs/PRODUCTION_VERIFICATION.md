# Production foundation verification

**Date:** 24 October 2026  
**Project:** `knot-hackathon` / `fedjvzgcowvksafnvyuz`  
**Scope:** Remote schema/RLS/transaction milestone; not a full production-completion claim

## Applied migrations

1. `knot_prepare_legacy_for_production`
2. `knot_identity_events_transactions`
3. `knot_engagement_media_providers`
4. `knot_media_domain_alignment`
5. `knot_server_jobs`

Repository copies are under `supabase/migrations/`.

## Remote state verified

- 24 prefixed production tables and 31 RLS policies.
- Private `knot-media` Storage bucket with a 2 MiB WebP limit.
- One active `knot-series-drafts` cron job and service-role-only outbox claiming.
- Legacy records preserved: 8 events, 14 source rows and 2 updates.
- Legacy anonymous insert policies removed; existing read policies retained.
- No production auth users existed before the disposable test.
- Test cleanup confirmed zero remaining test events and zero remaining test auth users.

## Ten remote checks passed

`KNOT_RUN_CLOUD_TESTS=1 npm run test:cloud` exercised the real publishable-key client against disposable records:

1. Production trigger rejects a minor signup under the adults-only launch gate.
2. Four adult signups receive server-managed profiles.
3. A client cannot self-assign administrator fields.
4. Anonymous event reads do not expose the private joining link.
5. A client cannot directly insert a registration/attendance record.
6. Three concurrent registrations against one capacity produce exactly one confirmed registration and two waitlisted records.
7. Cancelling a waitlisted record does not promote anyone or overbook the event.
8. Cancelling the confirmed seat promotes exactly one remaining waitlisted record.
9. A non-organizer cannot overwrite the event.
10. An ordinary participant cannot execute the server series scheduler.

## Server scheduler verification

A due disposable series was processed through the real SQL scheduler. It created one private draft, copied zero registrations, retained a null joining link, reset the safety declaration, reduced occurrences from two to one and advanced the next occurrence into the future. The cron job was present after cleanup.

## Test safety

Email auto-confirmation was enabled only for disposable test account creation and restored to `false` afterward. Test identities used reserved `example.com` addresses and explicit `[TEST]` event labels. Only `event-cloud-test-*`, `knot-cloud-test-*@example.com` and their related audit records were deleted. No legacy or user record was removed.

The harness requires Node WebSocket support through the development-only `ws` dependency. Pipeline exit status is preserved during verification.

## Local gates at this milestone

- 57/57 domain and cloud-mapping tests.
- 2,122-module production build.
- 0 dependency-audit vulnerabilities.

## Deployed guarded Edge Functions

- `knot-provider-worker` version 1, JWT required. No-auth returned 401; a publishable key reached the function and was still rejected with `SERVICE_AUTHORIZATION_REQUIRED` because service authorization is separately enforced.
- `knot-razorpay-webhook` version 1, public provider endpoint with mandatory HMAC validation. With no webhook secret it returned 503 `WEBHOOK_NOT_CONFIGURED` rather than accepting an event.
- `knot-approved-feed` version 1, JWT required. No-auth returned 401. The worker additionally requires an active review administrator, approved/owned Source Record, evidence URL and approved method.

The provider and feed implementations are deployed, but no provider secrets or approved feed URLs are configured. No live provider acceptance, payment capture, message delivery, room creation or real feed item is claimed.

## Still outside this milestone

The complete React workflow adapter, Realtime subscription lifecycle, approved-feed worker, live provider credentials/end-to-end provider tests, full cloud media UI, cross-browser/load/accessibility assurance and production deployment are not claimed by these nine checks. Formal reviews and real-world pilot evidence remain external milestones.
