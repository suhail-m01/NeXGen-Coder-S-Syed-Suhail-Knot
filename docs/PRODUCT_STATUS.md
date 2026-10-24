# Knot product status

**Verified on:** 24 October 2026  
**Implementation:** Fresh `/knot-product` application  
**Mode:** Browser-local repository; cloud not connected

This file separates working software from the full committed destination. It is not a claim that every v4 capability is production-complete.

## Baseline phase coverage

| Baseline phase | Current state | Working now | Remaining before phase completion / production |
|---|---|---|---|
| **Phase 0 — Architecture and trust foundations** | Substantial local foundation | Fresh typed architecture, responsive design system, canonical models, age decisions, permissions in application actions, privacy-separated operational states, 40 geocoded localities, tests | Production backend authorization, identity, RLS, secrets management, abuse protection, observability, accessibility audit and legal/privacy activation review |
| **Phase 1 — Catalog, discovery, posting and registration** | Broad local implementation | Public catalog/list/map/details, source ledger, Quick Post, native basics, pasted-text Instant Add draft/review submission, authenticated external handoff, native registration, fit, saves, calendar and material-change alerts | Privileged admin review UI, approved live sources, Source Records/Permission Gate service, ingestion conflict operations, custom dates/saved searches, production notification delivery and baseline cloud analytics |
| **Phase 2 — Participation and communities** | Initial working slice | Fuller profile preferences, adult team posts/requests/acceptance, community pages/follows, operational organizer counts, check-in and feedback foundations | Organizer claims, FAQs/question inbox, approval/waitlist workflows, targeted communication, QR check-in, reach estimates, badges/history/return prompts, topic follows and travel-time ranges |
| **Phase 3 — Minor accounts and full organizer operations** | Gated; not activated | Domain consent/native-safety guards, minor-gate explanation, restrictive adult-only publishing/team formation | Guardian consent, Minor Mode, withdrawal/deletion service, minors-welcome checklist, native minor participation, rounds/submissions/judging/resources, certificates/showcases/recaps |
| **Phase 4 — Scale and federation** | Not started | Local canonical/dedupe foundations that can support later adapters | Permissioned federation, open-web scale, India-wide expansion, additional official integrations, series automation, coverage/quality/performance hardening |

## Conditional capabilities

Paid ticketing/payments, live video hosting, WhatsApp automation and guardian-managed dependent profiles are **not implemented or implied**. They require separate product approval and their relevant legal, safety or integration gates.

## Data and evidence rules currently enforced

1. Sample events and sample community profiles are labelled.
2. Unknown price remains `unknown`; conditional free wording is preserved.
3. Class, grade and student wording does not become an invented numeric age.
4. Unknown eligibility prevents a Strong Fit label.
5. Public browsing does not require an account; participation and organizer actions do.
6. External registration happens on the original platform after the Knot gate.
7. A blocked external tab does not create a handoff record.
8. External opening, self-confirmation, native registration and organizer check-in are separate records.
9. Pending registrations cannot be checked in; check-in has an event-time window.
10. Feedback is post-event and retains its attendance basis.
11. Native online joining links appear only for eligible native registration states.
12. Material venue changes create revisions and participant/saver notifications.
13. Original Instant Add text is shown only as private review evidence in the submitter workflow; it is not published automatically.
14. Guest discovery uses a selected locality, not a saved live-location history.

## Cloud decision

A new Supabase project could not be created because the available organization reached its free-project limit. No existing project was modified, paused, deleted or reused without authorization. The application therefore continues in local mode until the owner explicitly chooses a cloud path.

## Next production milestone

1. Select and authorize a cloud/backend path.
2. Add production identity, server-side permissions, RLS and repository adapters.
3. Add the privileged Instant Add/admin review workflow and source-permission records.
4. Complete approval/waitlist, organizer communication and QR check-in operations.
5. Run accessibility, security, privacy and safeguarding reviews before activating minor accounts or live source ingestion.
