# Knot production implementation brief

**Date:** 24 October 2026  
**Target:** Existing Supabase project `knot-hackathon` (`fedjvzgcowvksafnvyuz`)  
**Approved direction:** Preserve and migrate existing records; Resend/Razorpay/Meta WhatsApp/LiveKit provider track; approved JSON/RSS feeds only; adults-only production participation until safeguarding/legal/provider activation.

## Non-negotiable evidence rules

- No remote legacy record is overwritten or discarded during migration.
- Existing demo write policies are not treated as production authorization.
- Unknown event values remain unknown. Legacy rows require review before becoming production Knot events.
- No official connector is claimed without an approved feed/API and evidence.
- No payment, message, video room or consent status becomes successful from a client request alone.
- Minor participation remains unavailable in the production launch profile. Local Minor Mode is not represented as verified consent.
- Real-world pilot outcomes and formal certification remain external evidence milestones, not software toggles.

## Implementation areas

### 1. Database, identity and transactions

Prefixed production tables preserve the legacy schema. Supabase Auth owns passwords/sessions. Server-triggered profiles prohibit self-assigned administration and require the adult launch band. RLS separates public event reads, owner/organizer access and privileged review. Registration RPCs lock event rows, derive capacity/waitlist states and prevent client-selected attendance.

### 2. Cloud application adapter

The browser receives a cloud repository only when explicitly configured. Public event payloads exclude joining links and participant-only material. User records are scoped to the authenticated identity. Security-sensitive transitions call RPCs rather than writing tables directly. Local mode remains an explicit demonstration/test adapter, not a fallback after cloud failure.

### 3. Media, scheduling and attribution

Private Supabase Storage holds normalized media. Published state is required before public signed retrieval; takedown revokes access and deletes the object. A server scheduler processes bounded series drafts without participant/consent data. Referral opens remain aggregate and session-deduplicated; account conversion is recorded only through an eligible native registration and the referral token presented in that flow.

### 4. Approved ingestion

A server-side connector accepts only active, approved JSON/RSS Source Records with permission evidence. It enforces HTTP(S), redirect/IP/SSRF checks, time and size bounds, parses defensively and creates private human-review submissions. It never auto-publishes or treats an open-web page as an official API.

### 5. External providers

Edge Functions hold provider secrets only in Supabase secret storage. Resend, Razorpay, Meta WhatsApp Cloud API and LiveKit adapters use durable outbox/job records, idempotency keys and signed webhook verification. UI states distinguish requested, processing, confirmed, failed and cancelled. Sandbox/mock tests are labelled and never become live delivery evidence.

### 6. Safety and launch controls

Production profiles are adults-only at this milestone. Consent verification tables support provider reference, status, evidence hashes, expiry, withdrawal and audit without storing unnecessary identity documents. Minor activation requires a later reviewed migration and provider/safeguarding/legal approval.

### 7. Assurance and operations

Automated checks cover RLS, concurrent registration, webhook signatures/replay, SSRF/redirect blocking, cloud media authorization, scheduler idempotency, accessibility and Chromium/Firefox/WebKit. Load tests use disposable test data and explicit limits. Independent security/accessibility review and actual 60-day pilots remain separately evidenced.

## External activation requirements

Live provider operation still requires accounts, secrets, verified domains/sender identities, payment KYC, WhatsApp business/template approval, LiveKit credentials and public HTTPS webhook URLs. Approved feed URLs and permission evidence are also required. These must be supplied through secure secret storage, not chat or committed files.
