# Knot — Final Product and Build Baseline

**Status:** Final product understanding and scope for the next build stage. This is a real, full-product implementation, not a demo-only project. Implementation will still proceed through tested milestones rather than one unverified release.

**Document authority:** This baseline records the latest project-owner decisions. Use the uploaded v4 blueprint for detailed feature specifications, subject to the corrections and overrides below. Where earlier documents say “Demo Build,” restrict accounts to adults, allow guest registration handoff, or treat committed features as optional demo cuts, this baseline governs.

---

## 1. Confirmed product decisions

1. **Corrected v4 is the feature basis.** Its valuable additions are retained, while internal contradictions, unsafe analytics wording, public/private viewing ambiguity, test conflicts and process inconsistencies are corrected.
2. **Build the whole core product.** All committed Tier 1, Tier 2 and Tier 3 capabilities remain in scope across phases. “FROZEN” now means dependency/sequencing only, not removal from the product.
3. **This is an actual product.** Production-quality architecture, security, privacy, accessibility, testing, data provenance and honest analytics are required. It is not merely a hackathon demo.
4. **Under-18 accounts are included.** Guardian consent, Minor Mode, withdrawal/deletion, restrictive visibility and minor-safe analytics are committed product capabilities.
5. **Native minor participation is gated.** The organizer minors-welcome checklist and all related safety tests must pass before a minor can participate in a Knot-native event. Until that gate is active, adults alone can use Knot-native participation.
6. **Guests may browse without an account.** Public discovery is not login-gated.
7. **Participation and organizer actions require authentication.** Clicking Register, Join, Publish or Host opens the sign-in/account-creation flow. Save, Follow, “I'm going,” Team Finder, native feedback and other account-based actions also require authentication.
8. **External Register also requires Knot authentication.** After sign-in and the applicable age/rule check, Knot opens the original source page. The outbound click is still not proof of registration.
9. **Guest analytics are aggregate-only.** No persistent behavioural profile is created for anonymous visitors. Per-user behavioural analytics is limited to self-declared adult accounts under applicable consent rules. Essential security and service logs are separate and purpose-limited.
10. **Fresh rebuild.** Do not extend the old prototype. Preserve it only as reference. Build a new application architecture and UI against this baseline.
11. **Conditional items remain gated.** Paid ticketing, live video hosting, WhatsApp automation/bots and guardian-managed dependent profiles are not silently included in the committed build. Each needs explicit product approval plus its relevant legal, safety or integration gate.
12. **Delivery is phased, but the destination is the full core product.** A phase is a verification boundary, not a demo cut line.

---

## 2. Final problem-statement understanding

Knot addresses three connected failures:

1. **Discovery failure:** hackathons, workshops, meetups, conferences, summits and other events are scattered across platforms, websites, posters and forwarded messages.
2. **Participation failure:** people cannot easily tell whether an event is nearby, current, relevant, age-appropriate, eligible, affordable, schedulable or team-compatible.
3. **Organizer/community failure:** organizers struggle to publish quickly, reach the right audience, communicate changes, understand outcomes and bring participants back.

Knot therefore combines:

- A federated and open-web event catalog
- Hyperlocal and online discovery
- Participation and age/eligibility intelligence
- External and native registration paths
- Organizer publishing and full event operations
- Teams, communities and post-event return loops
- Source provenance, freshness, privacy, safeguarding and measurable outcomes

Aggregation alone is not the differentiator. The differentiator is trustworthy participation from discovery through return engagement.

---

## 3. Complete committed feature map

### A. Catalog and source intelligence

- Canonical Event plus multiple Event Listings
- Knot-native events, Instant Add and approved external sources
- Unstop, Devfolio, Devpost and other sources subject to Source Records
- Community, college and meetup-style sources
- Open-web discovery at scale in the later expansion phase
- Normalization, validation and field-level confidence
- Deduplication with all listings preserved
- Source-specific deadlines, capacity, age rules and registration routes
- Living Source Ledger: first seen, last checked, revisions, stale state, conflicts and cancellations
- Link-only/manual fallback when automated collection is not approved
- User missing-event submission and problem reports
- Admin source health and review queues

### B. Hyperlocal and online discovery

- Bengaluru neighbourhood-level launch coverage
- India-wide in-person expansion
- Online events, including global events accessible to the target users where relevant
- Locality, radius and Near Me
- Exact, approximate, locality, city and unknown location precision
- List/Map parity, clustering and Search This Area
- Distance bands and later travel-time ranges
- Today, Tonight, Tomorrow, Weekend, Next 7 Days and custom dates
- Home sections for nearby, closing soon, interests, new and online
- Keyword, type, interest, skill, price, eligibility, team, age and source filters
- Shareable filter URLs and useful empty/error/stale/offline states

### C. Instant Add

- Pasted messages, public URLs, posters and screenshots
- Private original evidence
- Structured field extraction with confidence and evidence
- Human review before publication
- Duplicate prompts
- Conservative date, price, eligibility and age-rule reading
- No private-chat ingestion or social account login on a user's behalf
- Personal-contact and poster-publication protections
- Accuracy smoke test and post-publication review of early auto-published items
- Rate limits, spam controls and review fallback

### D. Participation Fit and personal planning

- Passport Lite: area and interests first
- Full optional passport: skills, learning goals, experience, education, availability, price and team status
- Existing-skill and learning-goal matching
- Strong fit, Possible fit, Not currently eligible or no label, always with honest reasons
- No Strong Fit when important eligibility is unknown
- Saved events and searches
- Deduplicated new-event and material-change alerts
- Registration, event and submission deadline separation
- `.ics` export and calendar plans
- Schedule-conflict detection
- Adult-account learned interests that are visible, editable and removable
- Explicit-only personalization for minors; no behavioural learning

### E. Age-based viewing and participation

- Public browsing for everyone
- Self-declared age bands: under 13, 13–15, 16–17 and 18+
- No “age verified” claim
- Structured age rules on events and communities
- All ages, minimum age, range, adults only, under 18 only and not stated
- Guardian consent/presence fields where applicable
- Age badges and optional Events I Can Join filter
- Five rule outcomes: can join, cannot join, check rule, needs consent and not open yet
- Adult, minor and guardian consent states
- Annual age-band reconfirmation and minor-to-adult transition
- Source-specific age-rule conflict handling

### F. Authentication and action gating

- Guest browsing of public pages without login
- Login/account-creation prompt on Register, Join, Publish or Host
- The same authentication requirement for external and native registration actions
- Post-authentication age, consent and event/community rule checks
- Adult-only event publishing/hosting
- Session and permission enforcement on both UI and API
- No protected action available by bypassing the screen through a direct URL or API call

### G. Registration and participation

- External handoff to the original platform after Knot authentication and rule checks
- External states: opened externally, self-confirmed registration, calendar added and self-marked attendance
- Native states: registered, pending, approved, waitlisted, rejected, cancelled, checked in and attended
- Free native registration in the core product
- Capacity, approval, waitlist and custom questions
- Attendee search, review and CSV export
- QR check-in and duplicate-scan handling
- Checked-in versus self-reported attendance kept distinct
- No external registration/attendance claims without evidence

### H. Organizer product

- List on Knot with external registration
- Publish on Knot with native registration
- Organize on Knot with the full event lifecycle
- Quick Post with seven required field groups, including Who Can Join
- Full event-type-aware creation studio
- Basics, description, media, categories, skills and contacts
- Timeline, multiple rounds, submissions and results
- Venue, map, logistics, accessibility and joining-link visibility
- Eligibility, education, geography, age and team rules
- Structured prizes and non-cash rewards
- Registration setup and consent requirements
- FAQs, resources, sponsors and code of conduct
- Plain readiness warnings; no arbitrary readiness grade
- Participant and audience-fit previews
- Draft, preview, schedule, public/unlisted/private visibility
- Material-change confirmation and revision history
- Organizer roles, claims and approved-edit protection
- Reach estimates with privacy thresholds
- Aggregate referral and native conversion analytics
- Share cards, QR codes and distribution tools

### I. FAQ, communication and support

- Public and participant-only FAQs
- Reusable question templates
- Attendee question inbox
- Convert an organizer answer into a reusable FAQ
- Human approval for policy-sensitive suggested answers
- General, logistics, deadline, round, material-change and post-event announcements
- Audience segmentation
- Scheduling, preview, delivery state and templates
- In-app and email channels with caps, quiet hours and opt-outs
- Critical safety/time/place messages handled separately from marketing notifications

### J. Teams and communities

- Cross-platform Team Finder
- Skill/role requirements and complementary-skill suggestions
- Team creation, joining, invitations and readiness
- Team-size and team-formation deadline rules
- No implication that a Knot team is registered externally
- Community/organizer pages and college links
- Follows, next-event modules and event series
- “I'm going” as self-declared interest, never registration
- Participation history and badges with attendance-trust rules
- External community-group links with age and moderation labels
- Topic follows and focused community interactions
- No unrestricted private messaging in the core safety baseline

### K. Full event operations

- Tracks, themes and problem statements
- Rules, starter resources, datasets and API links
- Team approval and round shortlisting
- Repository, video and document submissions
- Mentor/judge profiles and assignments
- Rubric scoring, feedback and results
- Agenda, sessions and speaker/mentor directories
- Participant resource centre and help desk
- Volunteer-limited check-in access
- Event-day announcements and issue reporting
- Room/table allocation only when needed by the event type

### L. Post-event and return engagement

- Results and winner publication
- Project showcases
- Photos/recaps with minor-photo consent rules
- Certificates
- Feedback with privacy thresholds
- Attendance and engagement exports
- Next-event announcement
- Community follow and relevant recommendations
- Team continuity where participants choose it
- Measured 60-day return behaviour for eligible adult analytics cohorts

### M. Minor Mode and safeguarding

- Guardian consent before required minor-account processing
- Pending, active, withdrawn, closed and deleted account states
- Age-appropriate notices and guardian-assisted withdrawal/deletion
- Minimum age data; no unnecessary birth date
- No public name, college, “going” identity or public badges for minors
- No behaviour-derived interest learning or behavioural profiling
- No fit-based promotional pushes, digests or targeted ads
- Only essential service/consent/registration/safety/audit records
- Event-level anonymous analytics rather than minor behavioural cohorts
- Organizer access limited to justified registration fields
- Minor registration retention defaults shorter than adult defaults, subject to legal review
- Team Finder disabled for minors until a separate safety design passes
- Organizer minors-welcome checklist before native minor participation
- Four-hour handling target for minor-safety reports

### N. Administration, trust and quality

- Source Record Permission Gate and dated evidence
- Review queues for submissions, duplicates, locations, reports, claims and source failures
- Named reviewers and queue-backlog controls
- Organizer verification/claim states without blanket safety claims
- Audit history for sensitive actions
- Reports, takedowns, corrections and appeals
- Data export, deletion, consent and retention controls
- Real/sample-data separation; never invent events, users, organizers or impact
- Mobile accessibility, plain wording, security and performance targets

---

## 4. Corrections applied to v4

1. “Everyone can view” means **public listings and public details only**. Private resources, participant data, evidence, admin material and protected joining links remain access-controlled.
2. Quick Post has **seven required field groups**, not six, after Who Can Join was added.
3. The minors-welcome checklist has one consistent status: it is mandatory before native minor participation is enabled; it is not described as simultaneously required, inactive and optional.
4. Guest analytics are aggregate-only because unknown-age guests cannot be separated reliably into adult and minor tracking cohorts.
5. Essential operational records are not mislabelled as behavioural analytics. Consent, registration, safety, deletion and audit records may exist for minors under stricter purpose and retention rules.
6. Cross-listing age rules remain listing-specific. `not_stated` never erases a known rule; explicit conflicts show “Age rules differ by listing” and enter review. The least restrictive rule is never chosen silently.
7. Pilot reach buckets use a broad small-population range such as `5–49 adult accounts`, with no small-group breakdown or identity export.
8. Instant Add post-publication review applies to every auto-published event up to the first 100; switch-off logic can be tested with simulated cases. A small real sample is not hidden.
9. The Source Record worksheet says no **external** source is approved until checked; Knot-native and Instant Add are internal flows.
10. “Nothing stored” for a blocked minor sign-up means no application account, age profile or analytics profile. Necessary infrastructure/security logs have separate limited retention.
11. Agent architecture and technical design may be completed before implementation approval; only coding requires entering the build stage.
12. Registration state transitions branch correctly from pending/review to approved, waitlisted or rejected.
13. Legal dates and obligations must be checked against official current texts and qualified advice before production activation; blueprint commentary is not treated as legal sign-off.
14. The two-minute demonstration uses a focused path. Age-aware screens are an optional alternate segment rather than four mandatory extra steps.

---

## 5. Final end-to-end process flows

### 5.1 Public discovery to external registration

```text
Visitor opens Knot without login
  ↓
Browses public home/search/map/event/community pages
  ↓
Optionally uses device-only preferences for browsing assistance
  ↓
Clicks Register on an external event
  ↓
Knot opens sign-in/account creation
  ↓
Age band and account/consent state established
  ↓
Event's listing-specific age/eligibility rule checked
  ↓
Allowed → original platform registration page opens
Blocked → reason shown; no handoff
Unclear → self-declaration/check-rule notice where allowed
  ↓
Knot records only an outbound handoff for the authorized account
  ↓
User may later self-confirm registration; never automatic proof
```

### 5.2 Public discovery to native participation

```text
Visitor clicks Register/Join
  ↓
Authentication required
  ↓
Age rule → account state → guardian consent state → organizer conditions
  ↓
Adult eligible → native registration path
Minor eligible but safety gate inactive → native minor participation not open
Minor eligible with consent + organizer checklist active → native minor path
  ↓
Registered / pending / waitlisted as configured
  ↓
Updates, calendar, team and event-day actions
  ↓
QR check-in or self-reported attendance, clearly distinguished
```

### 5.3 Publish or host

```text
User clicks Publish or Host
  ↓
Authentication required; publishing/hosting is adult-only
  ↓
Choose List, Publish or Organize
  ↓
Quick Post or full studio
  ↓
Instant Add autofill optional
  ↓
Required fields, age rule, timeline, registration and location validated
  ↓
Duplicate check and readiness warnings
  ↓
Preview and publish
  ↓
Audience discovery/reach and registrations
  ↓
Material changes versioned and affected users notified
  ↓
Check-in, operations, results/showcase and next-event return loop
```

### 5.4 Minor account and native minor participation

```text
Age-first account flow
  ↓
13–17 → approved guardian-consent process
Under 13 → no own account; dependent profiles remain conditional
  ↓
Consent complete → Minor Mode account active
Consent declined/withdrawn → restricted/closed and deletion flow
  ↓
Minor can use permitted account features with explicit-only personalization
  ↓
For native participation: event age rule + consent + organizer checklist
  ↓
All pass → participation allowed
Any fail → action blocked with a plain reason; public browsing remains available
```

### 5.5 Instant Add and external ingestion

```text
User-given content or approved source
  ↓
Private evidence/source snapshot
  ↓
Structured extraction and validation
  ↓
Normalization including location and age rules
  ↓
Duplicate candidates and source conflicts
  ↓
Publish / review / keep separate / reject
  ↓
Canonical event with original listings preserved
  ↓
Freshness checks, revisions, stale/cancelled states and user reports
```

### 5.6 Community return

```text
Event discovered → authenticated participation → reminders/updates
  ↓
Attendance/check-in → optional feedback/history/showcase
  ↓
Follow organizer/community → next relevant event
  ↓
Eligible adult return metrics measured honestly with sample sizes
```

---

## 6. Whole-product delivery phases

These phases cover the whole core product. None of the committed features is discarded merely because it is later in the sequence.

### Phase 0 — Fresh architecture and trust foundations

- New application architecture and design system
- Core entities, state machines, authentication and permissions
- Source Records and Permission Gate
- Privacy, age bands, consent records and analytics separation
- Locality/venue foundation
- Test, audit, accessibility and observability foundations

### Phase 1 — Catalog, discovery, posting and registration

- Canonical catalog and source listings
- Hyperlocal list/map/home discovery
- Event details and source ledger
- Quick Post and full native basics
- Instant Add and admin review
- Authentication-gated external handoff and native registration
- Passport Lite, fit labels, saves, calendar and material-change alerts
- Baseline analytics and data-quality reporting

### Phase 2 — Participation, organizer reach and communities

- Full passport and saved searches
- Team Finder for eligible adults
- Organizer claims, FAQs and question inbox
- Approval, waitlist, targeted communication and QR check-in
- Reach estimates and organizer analytics
- Campus/community pages, follows, going, history, badges and return prompts
- Topic follows and travel-time ranges

### Phase 3 — Minor accounts and full organizer operations

- Guardian consent, Minor Mode, withdrawal/deletion and minor-safe operations
- Organizer minors-welcome checklist and native minor participation
- Full Organize on Knot mode
- Rounds, submissions, judging, resources and event-day operations
- Certificates, showcases, recaps and richer post-event community loops

### Phase 4 — Scale and federation

- Larger-scale open-web discovery
- India-wide expansion and additional regions
- Additional approved sources and official integrations
- Event-series automation and deeper calendar/organizer integrations
- Coverage, quality, performance and operational hardening at scale

### Separately gated conditional capabilities

- Paid ticketing/payments
- Live video/virtual-event hosting
- WhatsApp bot or Business messaging automation
- Guardian-managed dependent profiles
- Any future relaxation of Minor Mode or Team Finder restrictions

---

## 7. Build readiness statement

The following are now sufficiently defined to begin technical planning and then implementation:

- PS understanding and product thesis
- Complete committed feature map
- User roles and action permissions
- Authentication gates
- Age and minor participation model
- Organizer modes and event operations
- External and native registration semantics
- Core entities and lifecycle states
- Discovery, ingestion, participation and community process flows
- Privacy, provenance and honesty constraints
- Whole-product scope and phase boundaries
- Fresh-rebuild decision

The next work is technical architecture, detailed user stories/acceptance tests, source-permission completion, UI/UX design and milestone implementation—not further expansion of the product vision.
