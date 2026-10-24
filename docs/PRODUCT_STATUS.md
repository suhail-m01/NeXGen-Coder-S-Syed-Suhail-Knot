# Knot product status

**Verified on:** 24 October 2026
**Implementation:** Fresh `/knot-product` application
**Mode:** Browser-local application by default; production Supabase foundation deployed, full cloud workflow migration in progress

This file distinguishes working local software from production activation and internet-scale destination scope.

## Delivered local product

### Discovery, ingestion and provenance

- Public list/map/details/community pages, custom dates, saved searches, explicit follows, estimated travel and joinable filters.
- Forty geocoded Bengaluru localities plus thirteen clearly labelled approximate Indian city-centre anchors.
- Map pan/zoom, bounded grid clustering, loaded-event viewport search and accessible event-list parity.
- Canonical events/listings, source freshness/conflicts/revisions, permissioned bounded JSON federation and human review.
- Instant Add pasted text, restricted public HTML/JSON-LD retrieval and real local English poster OCR through private evidence drafts.

### Participation, Minor Mode and planning

- Authentication-gated external handoff and native registration; external opens never become registrations.
- Custom private questions, approvals, finite/open capacity, deterministic waitlists, random-token QR passes and guarded check-in.
- Full preferences, fit reasons, going/history, deadline/conflict planning, ICS export, topic/organizer follows and saved-search alerts.
- Restrictive 13–17 accounts with local guardian attestation, withdrawal/deletion, explicit-only personalization and the four-part organizer safety gate.

### Organizer operations and community return

- Full event basics, access/collaborator roles, material-change confirmation, FAQs/Q&A, resources, rounds, agendas, submissions, judging and certificates.
- Targeted scheduled in-app announcements with opt-out, quiet hours, due-time audience resolution and delivery ledgers.
- Adult team posts/requests plus in-app invitations, expiry, shared capacity, complementary-skill readiness and per-member continuity opt-in.
- Persistent local event/recap/sponsor media using IndexedDB; PNG/JPEG/WebP validation, WebP normalization, dimension/size caps, alt text, consent-basis metadata, explicit publication and blob-deleting takedown.
- Sponsor names/links and event-owned published logo association.
- Referral channels with real event URLs, QR/share-card downloads, atomic session-deduplicated aggregate opens and separate native conversion/external handoff metrics.
- Weekly/monthly series automation with bounded on-open catch-up. Clones start as private drafts and reset joining links, safety declarations, recaps and showcases; participant records are never copied.
- Adult-only, explicit-opt-in 60-day same-organizer return cohorts using verified native attendance. Small-group counts are suppressed and immature windows have no rate.

### Trust and data controls

- Guest reports, prioritized minor-safety queues, organizer claims, audits, source permissions and conservative unknown-value handling.
- Operational/reach aggregates with privacy thresholds; no invented impact, conversion or attendance.
- Expanded JSON account export without password hashes, organizer-offboarding deletion protection and workspace/media reset.

## Baseline phase coverage

| Baseline phase | Local implementation | Remaining before destination/production completion |
|---|---|---|
| **0 — Architecture and trust foundations** | Typed domain architecture, responsive UI, canonical models, guarded actions, additive migrations, IndexedDB media and four browser suites | Production identity/backend authorization, RLS, secrets/abuse controls, observability, formal accessibility/security/privacy reviews |
| **1 — Catalog, discovery, posting and registration** | Public discovery, viewport map, source ledger, Quick Post, full registration states, Instant Add and material-change alerts | Approved live connectors, server-enforced roles, large-scale freshness/conflict operations and cloud analytics |
| **2 — Participation and communities** | Full preferences, team invitations/readiness/continuity, referral attribution, reach/cohort reporting, QR/check-in and targeted communications | Production notification channels, real campaign attribution across devices and validated real-world return outcomes |
| **3 — Minor accounts and full organizer operations** | Minor Mode, full studio, media/sponsor library, series automation, rounds/submissions/judging/resources, recaps/certificates/showcases | Production-verifiable guardian/photo consent, minor retention/legal activation and formal safeguarding review |
| **4 — Scale and federation** | Source Permission Gate, reviewed JSON adapter, local OCR/media, city anchors, code splitting and canonical foundations | Internet-scale open-web discovery, official live integrations, server-side series jobs and production scale/quality operations |

## Honest feature boundaries

The following are **not represented as complete**: automated email/SMS/WhatsApp delivery, official live source connectors, internet-scale crawling/federation, production cloud media/storage, server-side scheduling, multi-device referral identity, production concurrency and real-world 60-day pilot validation. Local implementations must not be read as evidence that these production capabilities exist.

Paid ticketing/payments, live video hosting, WhatsApp automation and guardian-managed dependent profiles remain separately gated and are not implemented or implied.

## Data and evidence rules enforced

1. Sample events are labelled and never presented as live coverage or traction.
2. Unknown price/eligibility stays unknown; missing rules never become favourable evidence.
3. Guests browse public pages; protected participation/organizer actions require authentication.
4. External registration completes on the original platform. Opens, self-confirmation and verified attendance are distinct.
5. Pending/waitlisted/rejected/cancelled records do not consume confirmed capacity or receive confirmed-only passes.
6. Minor participation requires age eligibility, guardian consent, active account state and the organizer safety checklist.
7. Minor identity is excluded from public showcases/going identity and behavioural learning.
8. Original Instant Add evidence remains private; blocked URLs and unreadable posters produce errors, not fabricated fields.
9. Federated imports require source permission, approved method and evidence, then enter pending review.
10. Material studio changes require confirmation when participants/savers are affected and generate revision/audit/notification records.
11. Scheduled optional announcements re-resolve recipients at delivery time and respect opt-out/quiet hours; critical notices remain separate.
12. Certificates require native organizer attendance after event end and make no skill/winner claim.
13. Public project display requires organizer publication, showcase enablement, adult authorship and explicit project consent.
14. Referral visits contain no account identifier and are deduplicated atomically per browser session. External handoffs are reported separately from native conversion.
15. Team invitations and requests share one membership/capacity derivation. Continuity is per-member opt-in and creates no private messaging channel.
16. Media starts as a private draft; public rendering requires explicit publication. Organizer consent declarations are not independent verification. Takedown removes public metadata and requests blob deletion.
17. Series clones never include registrations, passes, submissions, scores or consent records. They require human publication.
18. Return cohorts exclude minors, guests, restricted/closed accounts, non-opted-in adults and external self-reports. Groups under five return null counts.
19. “Sent” means local in-app delivery, never email/SMS/WhatsApp or reading.
20. City anchors are approximate city-level references, not invented neighbourhood geocodes or live event coverage.

## Cloud and production activation

The existing `knot-hackathon` project now contains the applied production schema, RLS policies, private Storage bucket and transactional registration RPCs and bounded server series scheduling. Ten disposable remote checks plus scheduler verification passed and test records were removed. Existing legacy records were preserved. See `PRODUCTION_VERIFICATION.md`.

This is a backend milestone, not full application completion. The React app remains explicitly local by default until its complete cloud workflow adapter is ready. Guarded provider/feed Edge Functions are deployed. Live provider credentials and end-to-end provider tests, approved feed URLs, the complete browser cloud adapter, production hosting and external assurance remain outstanding.

Production activation still requires an authorized backend, server-side permissions/RLS, transactional capacity/waitlists, managed reviewer roles, reviewed source connectors, verified guardian consent, safeguarding/legal/privacy/accessibility reviews, notification providers, abuse controls, observability, backup/deletion pipelines and device/cross-browser testing. Seed Pack and pilot outcomes remain targets, not reported achievements.
