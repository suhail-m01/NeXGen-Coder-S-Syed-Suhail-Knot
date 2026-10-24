# Knot — Master Product Blueprint v3

**Status:** Authoritative consolidated product vision, scope and feature specification. Addendum A governs first-build priority and scope, subject to the confirmed decisions in Section 58. This remains a planning document, not approval to start building.

---

## 1. Product in one paragraph

**Knot is a participation-intelligence and community-engagement layer for events.** It aggregates event listings from supported platforms and the wider public web, combines duplicate listings into one canonical event, preserves original source and registration links, and helps users understand which events they can realistically attend based on location, interests, existing skills, learning goals, eligibility, availability and team requirements. Organizers can list an externally hosted event, publish an event with Knot registration, or organize a broader event lifecycle on Knot. Knot then supports deadlines, calendar planning, updates, team formation, check-in, post-event showcases and community return engagement.

### Simple pitch

> **Knot doesn’t just tell people what is happening. It tells them which events they can actually join, keeps details current, helps them prepare or find a team, and gives the community a reason to return.**

### Core lifecycle

```text
Discover sources → Extract and normalize → Deduplicate → Publish canonical event
→ Match to participant → Register externally or natively → Save/calendar/team
→ Notify about changes → Participate/check in → Showcase/feedback
→ Follow community → Discover the next relevant event
```

---

## 2. Problem-statement alignment

| Problem or objective | Knot’s answer |
|---|---|
| Event information is scattered across websites and social channels | Supported-source federation, open-web discovery, organizer/user URL submission and native publishing |
| The same event appears in multiple places | One canonical event linked to multiple original event listings |
| People miss relevant nearby events | Location/date/interest/skill filters, Participation Fit, saved searches and deduplicated alerts |
| Details become stale or contradictory | Freshness status, last-checked time, source conflicts, revision history and material-change alerts |
| Users do not know whether they are eligible or prepared | Eligibility, skills, schedule, price, location and team-requirement matching with visible reasons |
| Organizers need easy event posting | List, Publish or Organize modes with an event-type-aware creation studio |
| Organizers need to reach the right audience | Interest/skill/location distribution, audience-fit preview and referral analytics |
| Discovery should lead to participation | External registration handoff, native registration, calendar, reminders and team formation |
| Communities need repeat engagement | Follows, updates, event series, post-event showcases, feedback and next-event recommendations |

---

## 3. Product principles and honest boundaries

1. **Aggregation is infrastructure, not the whole differentiator.** Multi-source event aggregation and outbound registration already exist. Knot’s stronger value is participation fit, source trust, change awareness, team readiness and community continuity.
2. **Universal coverage is a North Star, not a false guarantee.** Knot can aim to index every publicly discoverable event, but private, unlisted, blocked, deleted, unindexed and newly published events make a literal “every event on the internet” guarantee impossible.
3. **Coverage must be visible.** Users should see which sources were searched, when they were checked, which sources are failing, and how to submit something missing.
4. **A canonical event is not the same as a source listing.** One real-world event can have listings on Unstop, Devfolio, Devpost, an official website and Knot. All original listings must be preserved.
5. **External registration remains external.** Clicking “Register on Devpost” opens Devpost. The click is an outbound handoff, not proof of completed registration.
6. **Provenance is not verification.** “Source-linked” means users can inspect origins. “Claimed by organizer” means ownership was checked. Neither automatically proves that an event is safe or legitimate.
7. **Unknown is not a substitute value.** Unknown price is not free; missing eligibility is not open to everyone; an AI theme is not necessarily an AI-skill prerequisite.
8. **Automation needs review and auditability.** Low-confidence extraction, deduplication and conflict cases enter review. High-confidence actions remain logged.
9. **No paid influence on fit ranking by default.** Sponsored placement, if ever added, must be labelled and separate from participation-fit ranking.
10. **No unnecessary sensitive profiling.** Participation preferences should be user-controlled and visible. Guest filtering should remain available.

---

## 4. Scope discussed

### Geographic scope

- **Bengaluru hyperlocal:** locality, distance and radius-based discovery.
- **India-wide in-person coverage:** city and region discovery across the supported event types.
- **Online events:** included alongside location-based events. The recommended default is global online events accessible to Indian users, subject to confirmation.
- The architecture should remain location-agnostic for later expansion.

### Event types

- Hackathons
- Workshops
- Meetups
- Conferences
- Summits
- Competitions
- Webinars
- Community sessions

Event-type-specific fields should appear only when relevant. A meetup must not be forced to provide prizes or judging rounds.

### Confirmed initial named platforms

- Unstop
- Devfolio
- Devpost
- Knot-native events

### Possible later sources

- MLH
- HackerEarth
- Luma
- Meetup
- Eventbrite
- Townscript
- College/university event pages
- Official organizer websites
- Public calendars, RSS/ICS feeds and structured event data
- Public social posts and posters after suitable ingestion and review workflows exist

---

## 5. The two coverage modes

### Mode A — Federated, supported sources

Each supported source has a defined scope, health status, freshness target and source-specific normalization rules.

Track:

- Last successful synchronization
- Listings discovered
- Events published, merged, rejected or awaiting review
- Extraction completeness
- Broken-link rate
- Source errors and stale records
- Last good snapshot

### Mode B — Open-web discovery

For events outside supported platforms:

- Official event/organizer websites
- College and university pages
- Public event calendars
- RSS/ICS feeds where available
- `schema.org/Event` and other structured metadata
- Public community pages
- Organizer-submitted URLs
- User-submitted missing-event URLs
- Later: public social posts and posters

Open-web records should carry confidence and review states. High-confidence events may publish automatically; uncertain or conflicting events enter review.

### Recommended coverage wording

> “Knot aims to index every publicly discoverable event and shows exactly which sources were searched, when they were checked, and what may be missing.”

---

## 6. User and operator roles

### Visitor

- Search and filter without an account
- View event details, sources and freshness
- Open original registration links
- Submit a missing event or report a problem

### Participant

Everything a visitor can do, plus:

- Participation Fit Passport
- Save events and searches
- Alerts and calendar plans
- Native registration
- Self-confirm external registration
- Team formation
- Ask organizers questions
- Follow communities
- Feedback, certificates and showcases where enabled

### Organizer

- List an external event
- Publish a native event
- Claim and correct an imported listing
- Manage registrations, communication and attendees
- Configure teams, rounds and resources
- View appropriate analytics
- Manage post-event activity

### Co-organizer, volunteer and judge

- Role-limited editing
- Check-in support
- Announcement support where permitted
- Submission review or judging where assigned
- No automatic access to sensitive participant data

### Administrator/data-quality reviewer

- Source health
- Review queues
- Duplicate and conflict resolution
- Organizer claims
- User reports and takedowns
- Taxonomy management
- Manual re-sync and audit history

---

## 7. Core product entities

### Canonical Event

The actual real-world event, independent of where it is listed.

### Event Listing

A platform-specific representation of that event. A canonical event can have many listings.

Each listing should retain:

- Platform and external event ID
- Original and registration URLs
- First-discovered and last-checked timestamps
- Last meaningful change
- Extraction confidence
- Source-specific deadline, capacity and status
- Original snapshot or audit reference
- Whether it is the primary registration listing

### Organizer/Community

Identity, profile, contact details, verification/claim state, followers, event series and public updates.

### Event Revision/Change

A field-level record of changes such as date, venue, deadline, price, eligibility, mode or cancellation.

### Participation Fit Passport

User-controlled preferences and constraints used for matching.

### Saved Search and Alert Rule

A stored combination of filters and fit requirements, with deduplicated notification state.

### Plan/Calendar Item

A saved event, registration deadline, event session or personal attendance plan.

### External Handoff or Native Registration

Separate models so an external click is never confused with a native confirmed registration.

### Team and Team Membership

Event-specific team formation, roles, skills, invitations and readiness state.

### Claim, Interaction and Report

Organizer ownership claims; views/saves/clickouts/follows; incorrect, duplicate, cancelled or unsafe event reports.

---

## 8. External ingestion and publication workflow

Agent implementation is intentionally left for the next design phase. At product level, the expected workflow is:

```text
Source registered
  ↓
Listings or event pages discovered
  ↓
Original snapshot captured
  ↓
Fields extracted
  ↓
Required fields validated
  ↓
Data normalized
  ↓
Location, interests, skills and eligibility enriched
  ↓
Duplicate candidates generated
  ↓
Auto-merge / human review / keep separate
  ↓
Canonical event published
  ↓
Original listings preserved
  ↓
Scheduled re-checking and change detection
```

### Minimum useful publication fields

- Title
- Original URL and source
- Organizer/community where available
- Event type
- Start date or explicit date-TBD state
- Online/in-person/hybrid mode
- Location for physical events
- Last-checked timestamp

Events with inadequate information should be labelled “Details pending” or enter review rather than appearing as complete listings.

### Source lifecycle states

`discovered → extracted → normalized → needs_review/published → refreshed → changed/stale/cancelled/expired`

If a source fails, the last good data may remain visible with a stale warning. Knot must not silently present it as current or delete it without evidence.

---

## 9. Normalized event information

### Basic information

- Title and tagline
- Concise normalized summary
- Full organizer-provided description where reuse is appropriate
- Banner/poster and alternative text
- Event type and categories
- Language and experience level
- Organizer/community and support contact

### Time information

- Timezone
- Registration opening and closing
- Event start and end
- Submission deadline
- Results date
- Multiple rounds and sessions

### Location and logistics

- Online/in-person/hybrid mode
- Venue, address, locality, city and coordinates
- Transport, parking and landmark
- Check-in instructions
- Accessibility, food and accommodation
- What participants should bring
- Online joining-instruction visibility

### Participation requirements

- Open/restricted eligibility
- Student/professional and education rules
- Age and geography restrictions
- Required and recommended skills
- Existing-experience prerequisites
- Solo/team participation
- Minimum/maximum team size
- Team-formation deadline

### Rewards

- Cash amount, pool and currency
- Rank/track/sponsor breakdown
- Certificates, goodies and credits
- Internship/interview/mentorship/incubation opportunities
- Prize TBD or explicitly no prize

### Sources and trust

- Original listings and registration links
- First seen, last checked and last changed
- Extraction confidence and review status
- Source conflicts and revision history
- Organizer claim state

---

## 10. Deduplication and source-conflict policy

### Candidate signals

- Exact source event ID
- Canonicalized URL
- Shared official registration URL
- Similar title
- Same or overlapping dates
- Organizer identity
- Venue/city
- Description similarity
- Image/poster similarity later

### Decision policy

- Very high confidence: merge with an audit log
- Medium confidence: human review
- Low confidence: keep separate
- Same title on another date: possible recurring edition, not an automatic duplicate

### Preserve differences

Merged events retain every original listing because registration forms, capacity, deadlines and rules may differ.

### Primary registration priority

1. Organizer-selected canonical registration link
2. Verified official event website
3. Original hosting-platform listing
4. Most complete/recently updated public listing

Alternative official links remain visible under “Also listed on.” Conflicting material fields produce a warning rather than a silent arbitrary choice.

---

## 11. Discovery, filters and sorting

### General filters

- Keyword
- City, locality and radius
- Online/in-person/hybrid
- Event date range
- Registration-open state
- Registration-deadline range
- Event type
- Interests
- Skills
- Experience level
- Free/paid/known price
- Source and organizer

### Participation-specific filters

- Student/professional/open eligibility
- Solo participation
- Team-size requirements
- Beginner-friendly
- Submission deadline
- Prize/reward type when reliable
- Skills the user already has
- Skills the user wants to learn

### Sorting

- Best participation fit
- Registration closing soon
- Event starting soon
- Nearest
- Recently discovered
- Recently updated

Filter state should be shareable through a URL. Expired/closed events are hidden by default but remain searchable when the user chooses.

---

## 12. Participation Fit Passport

### Optional user-provided information

- Location and travel radius
- Interests
- Current skills
- Skills the user wants to learn
- Experience level
- Education/graduation information when relevant
- Availability
- Mode and price preferences
- Team status

### Two kinds of skill relevance

1. **Existing-skill match:** eligibility and team contribution.
2. **Learning-goal match:** workshops, beginner opportunities and personal development.

### Hard gates or warnings

- Registration closed
- Clear eligibility mismatch
- Schedule conflict
- Impractical location/mode
- Team-size/readiness conflict
- Clear experience prerequisite mismatch

### Soft ranking signals

- Interest match
- Existing-skill match
- Learning-goal match
- Distance and availability
- Community relevance
- Deadline urgency

### Explanation-first output

Prefer “Strong fit,” “Possible fit,” or “Not currently eligible” with reasons over an unexplained numerical score.

Example:

- Python and React match your skills
- Open to third-year students
- Within your selected travel radius
- Registration closes in 14 hours
- Team of 2–4 required; you still need teammates

Guest users can still use ordinary filters without creating a passport.

---

## 13. Event detail experience

Each canonical event page can contain:

- Title, organizer and summary
- Date/time/timezone and rounds
- Registration and submission deadlines
- Mode, venue and location
- Price/rewards
- Eligibility and team rules
- Required/preferred skills and learning outcomes
- Participation-fit explanation
- Source badges, last checked and change history
- “Also listed on” links
- Primary registration action
- Save, share and calendar actions
- FAQs and organizer contact
- Team Finder entry
- Report incorrect/duplicate/cancelled/unsafe event

Factual metadata and concise summaries should be normalized with attribution. Full source content should not automatically be republished without considering reuse permissions.

---

## 14. Registration and participation states

### External events

1. User selects “Register on [source].”
2. Knot records an outbound click.
3. The original page opens in a new tab.
4. Registration, payment, approval and submissions happen there unless an official integration says otherwise.
5. Knot does not automatically mark the user as registered.
6. The user may self-confirm registration later, clearly labelled as self-reported.

External states include: not clicked, opened externally, self-confirmed registration, added to calendar, and self-marked attendance.

### Knot-native events

Possible states: registered, pending, approved, waitlisted, rejected, cancelled and attended.

Native functionality can include capacity, approval, waitlist, custom questions, cancellation, export and check-in.

---

## 15. Saved events, saved searches, alerts and calendar

### Saved events

- Bookmark and share
- Calendar export
- Deadline reminders
- Material-change alerts

### Saved searches

Example: “Free AI hackathons in Bengaluru, open to third-year students, weekends, solo or teams up to three.”

Notify only when:

- A genuinely new canonical event matches
- A closed event reopens
- A material detail changes
- A deadline approaches

A duplicate listing on another platform must not trigger another new-event alert.

### Calendar and schedule guard

- Individual `.ics` export
- Calendar subscription for saved plans
- Separate registration-deadline and event-date items
- Conflict detection between Knot plans
- Updates when event details change
- External calendar conflict detection only with later permissioned integrations

Recommended notification order: in-app and email first; WhatsApp/push later with consent.

---

## 16. Cross-platform team formation

Team formation can support both external and native events.

### Participant features

- “I need a team”
- “I am looking for teammates”
- “Our team needs a designer/backend developer”
- Skill, role and commitment profiles
- Create/join a team
- Private invitation links
- Complementary-skill suggestions
- Team readiness checklist
- Report/block controls and consent before contact disclosure

### Organizer features

- Enable/disable Team Finder
- Team-size and role requirements
- Team-formation deadline
- See aggregate team-readiness and skill-gap information

Forming a team on Knot does not register that team on an external platform. Each participant still completes the source platform’s registration unless an official integration exists.

---

## 17. Organizer modes and event-creation studio

### Mode 1 — List on Knot

Create or import a listing; registration occurs externally.

### Mode 2 — Publish on Knot

Create the event page and collect registrations through Knot.

### Mode 3 — Organize on Knot

Manage a broader lifecycle: registration, teams, updates, rounds, resources, check-in and post-event activities. The exact inclusion of submissions/judging and live virtual hosting remains a scope decision.

### Creation step 1 — Type and mode

Choose event type, publishing mode, draft, duplicate-from-template or recurring edition.

### Creation step 2 — Basics

Required: title, tagline, type, description, organizer, contact and mode.

Recommended: banner, categories, skills, level, language, target audience, accessibility, code of conduct and social links.

### Creation step 3 — Timeline and rounds

Registration open/close, event start/end, submission and results. Optional rounds for screening, qualifiers, shortlisting, finals, presentations and judging. Each round may have its own time, mode, location and instructions.

Validation should detect invalid time order, overlaps, missing timezone and late-registration behavior.

### Creation step 4 — Location and logistics

Venue/address/map, transport/parking, check-in, accessibility, food/accommodation, required items and online joining-instruction visibility.

### Creation step 5 — Eligibility and teams

Education, age, geography, experience, skills, solo/team rules, team size, cross-organization rules and Team Finder settings.

### Creation step 6 — Prize and reward builder

Cash/rank/track/sponsor prizes, certificates, goodies, credits, internships, mentorship, incubation, scholarship, TBD or no-prize states.

### Creation step 7 — Registration

External URL or Knot registration; capacity, approval, waitlist, custom questions, required consents, cancellation/edit policy and team registration settings.

### Creation step 8 — FAQs, resources and publication

Public/participant-only FAQs, rulebook, schedule, problem statements, starter resources, sponsor/partner information, preview and publishing controls.

---

## 18. FAQ and organizer Q&A system

### Public FAQ builder

- Question and answer
- Category and order
- Public or participant-only visibility
- Related round
- Links or attachments

Reusable templates include eligibility, fees, teams, beginner suitability, required items, food, certificates, accommodation, selection, recording and support contact.

### Attendee question inbox

```text
Participant asks a question
  ↓
Existing FAQs checked
  ↓
Unresolved question enters organizer inbox
  ↓
Organizer answers privately or publicly
  ↓
Answer can become a reusable FAQ
```

This reduces repetitive support work. Future automation may draft answers from confirmed event details, but the organizer must approve answers about prizes, eligibility, refunds, accommodation and policies.

---

## 19. Event Readiness Report and organizer previews

### Readiness checks

- Missing/invalid timeline
- Missing registration link or instructions
- Unclear eligibility or team rules
- Missing support contact
- Missing venue/joining instructions
- Inconsistent prize details
- Missing common FAQs
- Missing accessibility information
- Duplicate-event suspicion
- Unreachable external link

The score represents completeness and clarity, not event quality or expected impact.

### Participant preview

Desktop/mobile, public/registered, beginner, team-seeking and online-participant views.

### Audience-fit preview

Show how organizer-provided rules affect discovery:

- Matching interests and skills
- Geographic/filter inclusion
- Beginner and solo-participant warnings
- Deadline-based visibility
- Potentially unclear or overly restrictive requirements

---

## 20. Publishing, distribution and organizer collaboration

### Publishing controls

- Draft/autosave
- Preview
- Immediate or scheduled publication
- Public, unlisted or invite-only visibility
- Duplicate for a new edition
- Recurring events
- Postpone/cancel with participant notice
- Shareable link, QR code and website widget
- Copy-ready descriptions for other platforms

Automatic cross-platform updates should only be claimed where official integrations permit them. Otherwise, Knot shows linked external listings that may require manual updates.

### Collaboration roles

Owner, admin, editor, volunteer and judge with appropriate permissions, co-organizer invitations and audit history for sensitive actions.

---

## 21. Attendee management and communication centre

### Registration configuration

Free registration initially, capacity, automatic/manual approval, waitlist, custom questions, consent, team/individual registration and cancellation rules.

### Attendee dashboard

- Registered/pending/approved/waitlisted/rejected/cancelled states
- Search/filter and CSV export
- Review answers and internal notes
- Individual/bulk approval
- Waitlist promotion
- Team-readiness visibility
- Attendance/check-in state

### Announcement types

General updates, logistics, material changes, deadline reminders, round instructions, team reminders and post-event follow-up.

### Audience segments

All registrations, pending, approved, waitlisted, teamless, specific teams, checked-in, saved-not-registered and community followers.

### Communication controls

Schedule, preview, delivery state, templates, in-app/email, critical-update acknowledgement and opt-out handling for non-essential communication.

---

## 22. Hackathon/competition operations pack

Optional for relevant event types:

- Tracks, themes and problem statements
- Rules and required technologies
- Starter resources, datasets and API links
- Team approval and round shortlisting
- Repository/video/document submissions
- Submission deadline and late state
- Mentor/judge profiles and assignments
- Rubric-based scoring and feedback
- Results and winner showcase

This module should not be imposed on workshops or meetups.

---

## 23. Event-day operations

- QR check-in and volunteer access
- Attendance count
- Agenda and sessions
- Speaker/mentor directory
- Participant resource centre
- Help desk/Q&A queue
- Emergency announcements
- Team roster
- Room/table allocation where needed
- Session reminders and issue reporting

Sensitive joining links and logistics can be limited to approved participants.

---

## 24. Post-event and community return loop

### Organizer

Complete event, publish results/winners, showcase projects, upload recap/photos, collect feedback, export analytics, issue certificates and announce the next event.

### Participant

Save participation records/certificates, showcase projects, view recaps, provide feedback, follow the organizer, join the community, discover another event and potentially retain the same team.

### Return loop

`Event ends → showcase/certificate → feedback → community follow → next-event recommendation`

### Community features

- Community/organizer pages
- Follows and updates
- Event series
- Team boards
- Post-event recaps and feedback
- Suggestions for future events
- Next-event recommendations

A general-purpose unrestricted chat feed is not recommended initially; updates, teams and event-series interaction are more focused and easier to moderate.

---

## 25. Organizer claim, analytics and trust

### Claim and correction

Organizers can submit URLs, claim imported listings, verify ownership, choose primary registration, correct enriched fields and link duplicate listings. Approved organizer edits should not be blindly overwritten by later imports.

### Reliable analytics

- Listing and detail views
- Saves and calendar adds
- Participation-fit views
- Outbound registration clicks
- Native registrations and check-ins
- Community follows
- Aggregate team-readiness trends

External completed registrations or attendance must not be claimed without an integration or clearly labelled self-reporting.

### Trust and safety

- Organizer/listing claim states
- Report incorrect, duplicate, cancelled or unsafe events
- Moderation and takedown
- Code-of-conduct support
- Consent and privacy controls
- Participant-data export/deletion and retention settings
- Audit history for sensitive actions

---

## 26. Missing-event and data-quality workflows

Users can submit a missing URL, report stale information, suggest a duplicate merge, report cancellation or request removal.

Administrators receive queues for:

- Source failures
- Low extraction confidence
- Duplicate candidates
- Source conflicts
- Broken links
- User reports
- Organizer claims
- Taxonomy changes
- Manual re-sync

This human/data-quality layer is essential for trustworthy large-scale aggregation.

---

## 27. Principal differentiators

1. **Universal Event Graph:** one real-world event connected to every original listing.
2. **Participation Fit:** eligibility, skills, learning goals, schedule, location and team readiness—not just interests.
3. **Living Source Ledger:** freshness, provenance, revisions, conflicts and cancellations.
4. **Deadline and Schedule Guard:** separate registration/event/submission dates with deduplicated alerts and calendar conflict checks.
5. **Cross-Platform Team Readiness:** team formation and skill-gap discovery independent of where registration occurs.
6. **Event Readiness and Audience-Fit Preview:** better organizer data before publication.
7. **Question Inbox to FAQ:** turn repeated attendee questions into reusable event knowledge.
8. **Post-Event Community Return:** certificates, showcases, feedback, event series and next-event recommendations.

### Competitive reminder

Basic aggregation and original-site registration already exist. Brabble describes a multi-source index with registration on organizer platforms [3](https://brabble.ai/); Jamao provides original-platform registration and listing claims [15](https://jamao.in/hackathons); EventLayer describes unified multi-platform discovery [2](https://github.com/RudraMalvankar/EventLayer); HackHunt lists skill and source filters [9](https://github.com/prem22k/Hack-Hunt). Knot’s pitch must therefore emphasize participation intelligence and trust rather than merely aggregation.

---

## 28. Recommended implementation sequence

The complete vision remains intact, but features should be sequenced.

### Foundation — trustworthy catalog and native basics

- Unstop, Devfolio, Devpost and Knot-native sources
- Canonical Event/Event Listing model
- Normalization, validation and deduplication
- Source provenance, freshness and basic change history
- Location/date/interest/skill/mode filters
- Event details and external registration handoff
- Native event creation and basic registration
- Saved events and calendar
- Basic Participation Fit
- Source-health/admin console
- Organizer basics, FAQs and announcements

### Winning participation layer

- Full Participation Fit Passport
- Saved searches and deduplicated alerts
- Material-change notifications
- Cross-platform Team Finder
- Organizer claim and referral analytics
- Event Readiness and Audience-Fit Preview
- Attendee question inbox to FAQ
- Advanced registration, waitlist and approval
- Targeted communication and QR check-in

### Advanced hosting, open web and retention

- Automatic open-web discovery at larger scale
- Submissions and judging for relevant events
- Certificates and project showcase
- Post-event feedback and community event series
- Additional platforms and regions
- Official cross-platform integrations
- Paid registration if required later
- Live virtual-event hosting only if explicitly chosen
- Deeper calendar and organizer integrations

---

## 29. Demonstration storyline

1. One hackathon is discovered on Unstop, Devfolio, Devpost and Knot.
2. Knot shows one canonical event with four source listings and clear freshness.
3. A participant passport specifies third-year student, Python/React, Bengaluru, weekend availability and no team.
4. Knot explains eligibility, skill match, travel feasibility, deadline and team requirement.
5. The participant finds a complementary teammate.
6. A source changes its deadline; Knot records the change and notifies saved users.
7. External registration opens the original platform; a native event uses Knot registration instead.
8. The organizer posts an update, answers a question and publishes it as an FAQ.
9. After the event, a project is showcased and participants are offered a relevant next community event.

This demonstrates catalog trust, participation fit, organizer value and repeat engagement in one story.

---

## 30. Measurement and validation

### Catalog quality

- Source success and freshness rates
- Required-field completeness
- Duplicate precision and recall
- Broken-link and stale-listing rates
- Time to detect source changes
- Coverage by source, geography and event type

### Participant value

- Search-to-detail and detail-to-registration-handoff rates
- Time to find an eligible event
- Saved-search usefulness and alert opt-out rates
- Calendar adoption
- Self-reported registration and attendance, labelled appropriately
- Team-formation success
- Repeat event discovery and community follows

### Organizer value

- Listing completeness/readiness improvement
- Outbound referral clicks and native conversion
- Repeated questions avoided through FAQs
- Update reach and acknowledgement
- Check-in/attendance where native
- Community follower retention and repeat events

Do not claim real-world attendance uplift until measured with actual organizers and participants.

---

## 31. Features not to claim or prioritize blindly

- Guaranteed indexing of every event on the internet
- Automatic completed registration after an external click
- Automatic verification of event safety or legitimacy
- Automatic cross-platform updates without official integrations
- Paid influence hidden inside fit ranking
- Full general-purpose social chat at the start
- Paid ticketing, submissions, judging and live streaming as mandatory requirements for every event type
- Unvalidated AI accuracy or personalized-impact claims

---

## 32. Pending product decisions and recommended defaults

1. **Hosting depth:** Recommended definition of full hosting is registration + teams + updates + check-in + submissions/judging for relevant events; live video remains a later integration. This still needs confirmation.
2. **Paid events:** Recommended to begin native registration with free events; add payments later.
3. **Online scope:** Recommended global online events accessible to Indian users, with Bengaluru/India in-person coverage first.
4. **Team visibility:** Recommended public event-specific boards plus private invites and consent before contact sharing.
5. **Notifications:** Recommended in-app and email first; WhatsApp/push later.
6. **Community:** Recommended follows, updates, teams, event series and feedback before unrestricted chat.
7. **External content:** Recommended factual metadata, concise summaries and attribution rather than wholesale copying.
8. **Open-web publication:** Recommended automatic publication only for high-confidence records; uncertain/conflicting records enter review.
9. **Organizer claims:** Recommended “claimed by organizer,” not a blanket event-safety guarantee.
10. **Ranking:** Recommended no paid ranking initially.

---

## 33. Correct next step

Before coding, convert the agreed scope into:

1. Prioritized P0/P1 user stories
2. Measurable acceptance criteria for every user story
3. Canonical data entities and state diagrams
4. Source and organizer permission requirements
5. A focused demonstration script

Only after those are frozen should the agent architecture be designed.


---
---

# ADDENDUM A — Gap-Closing Additions (Sections 34–57)

**Added after reviewing Sections 1–33 against the problem statement.** Sections 1–33 above are unchanged. This addendum only adds.

### The problem statement this product answers

> **Title:** Hyperlocal Event Discovery & Community Engagement
> **Problem:** Hackathons, workshops, meetups, conferences and summits are hosted every day, but the information is scattered across WhatsApp groups, Instagram posts, LinkedIn, posters and individual websites. People miss relevant events and organizers struggle to reach the right audience nearby.
> **Objective:** A user-friendly platform for location-aware, interest-based, personalized event discovery; easy event posting for organizers; and meaningful community engagement. Users find relevant events quickly, organizers get more visibility, and more people attend and return.

### Why this addendum exists (gaps found in Sections 1–33)

| # | Gap in the original | Where it is closed |
|---|---|---|
| 1 | No cut line. Foundation phase is too large to finish and demo | §35 |
| 2 | "Hyperlocal" has locality and radius filters, but no map, no "near me", no travel estimate | §36 |
| 3 | The PS's real pain (WhatsApp, Instagram, posters) is pushed to the last phase | §37 |
| 4 | Source order favours hackathon sites; meetups, workshops and conferences are thin | §38 |
| 5 | No plan for an empty platform (no events, no organizers at the start) | §39 |
| 6 | Organizer posting takes 8 steps; no 60-second path | §40 |
| 7 | Organizers get analytics but no estimate of who they can reach | §41 |
| 8 | Colleges and clubs, the main event producers, are not first-class | §42 |
| 9 | Fit Passport asks for too much too early; fit labels can be empty or misleading | §43 |
| 10 | Community return loop is in the last phase and mostly one-way | §44 |
| 11 | The PS outcomes (attend, return) are not measurable for external events | §45 |
| 12 | Missing data shapes, message limits, screen specs, review staffing, privacy and legal checks | §46–§50 |
| 13 | No build order, no scaled plan, no test list, no risk list | §51–§55 |

---

## 34. Rules for the building agent (how to work and how to report)

### 34.1 How to read this document

1. Sections 1–33 stay valid. Addendum A adds to them.
2. If the two conflict on **build order, priority or scope**, Addendum A wins (it narrows the first build; it does not delete anything).
3. If they conflict on **product principles (§3) or what must not be claimed (§31)**, the original wins. Every feature in this addendum must obey those principles.
4. Anything marked **FROZEN** is delayed, not removed. Do not build it until the conditions in §35 are met.
5. Section 58 records the user's confirmed consolidation decisions. Where an earlier default conflicts with Section 58, Section 58 governs.
6. The build milestones and agent-reporting rules are future execution requirements only. They do not authorize implementation before the user explicitly approves the build phase.

### 34.2 Working rules

1. **Build one milestone at a time** (§51). Do not start the next milestone until the current one passes its exit check.
2. **Never invent data.** No fake events, fake users, fake organizers, fake counts. If demo data is needed, it must be labelled "Sample data" on screen and in the database (`is_sample = true`).
3. **Never guess missing event details.** Unknown stays unknown (Principle 7). Show "Not stated" instead of a made-up value.
4. **Do not claim what Knot cannot know.** An outbound click is not a registration. A self-marked attendance is not verified attendance (§14, §31).
5. **Do not contact real people** (email, message) unless the person running the project has switched on sending in settings. Default is "log only".
6. **Do not pull data from a site until its Source Record is approved** (§38). If permission is unclear, use link-only mode.
7. **Ask instead of assuming** when a decision changes what data means, touches legal or privacy rules, or would go beyond the cut line (§35). Use the "Decisions needed" block in §34.3.
8. **Keep changes small.** Each change should do one thing, include its tests, and be explainable in a few lines.
9. **Default stack position:** mobile-first responsive web app (works well on a phone browser). No native app in the first build. Keep the data model location-agnostic (§4). If a stack is not chosen, pick a common, well-supported one and write the choice in the change log.

### 34.3 How the agent must report after each work session

Every report uses this exact structure, in plain words:

```text
1. WHAT I DID
   - Milestone and task IDs worked on (for example: M2 / D3 near-me).
   - One line per change.

2. HOW TO RUN AND CHECK IT
   - Exact steps to see the result on a phone-sized screen.
   - Sample inputs to try.

3. TESTS
   - Table: Test ID | Result (pass / fail / not run) | Note.
   - Use the test IDs from §53.

4. WHAT IS NOT DONE OR NOT TRUE YET
   - Anything faked, hard-coded, partial, or marked as sample data.

5. DECISIONS NEEDED
   - Question | Why it matters | Recommended default | What happens if no answer.

6. NEXT STEP
   - The next task and why.
```

Rules for the report: never say "done" for a feature unless every acceptance criterion in its section passes. Never hide a failing test. Never describe sample data as real.

### 34.4 Definition of done (applies to every feature)

A feature is done only when all of these are true:

- Its acceptance criteria in this document pass.
- It has an **empty state**, a **loading state** and an **error state** (§48).
- It works at a 360 px wide screen without sideways scrolling.
- Its analytics events fire (§45.3).
- It does not show or store anything private that it should not (§50).
- It follows Principles 1–10 in §3.
- It is listed in the change log with date and test results.

### 34.5 Stop-and-ask triggers

Stop and ask before continuing if the work would: change the meaning of an existing field; send messages to real people; enable or expand under-18 data processing beyond the approved consent and safeguarding design in §50.1; scrape or call a site whose Source Record is not approved; add a feature marked FROZEN; or push the first build beyond the Tier 1 list.

---

## 35. Priority and cut line for the first build

### 35.1 The idea

The original Foundation phase (§28) is too big to finish and show. The first build is the **Demo Build**: a smaller set that works end to end for one city, proves the PS outcomes, and can be shown to real users. Nothing from Sections 1–33 is deleted. Features are put into three tiers.

### 35.2 Tier 1 — Demo Build (must work end to end)

| ID | Feature | Original section | Addendum section |
|---|---|---|---|
| D1 | Canonical Event and Event Listing, with simple duplicate checks (same source ID, same canonical URL, same title + date + city) | §7, §10 | §38 |
| D2 | Event sources: Knot-native, Instant Add, plus only the sources that pass the Permission Gate | §4, §5 | §37, §38 |
| D3 | Hyperlocal discovery: locality, near me, map, time chips, home feed | §11 | §36 |
| D4 | Event detail page with source badges, last-checked, "Also listed on", external handoff | §13, §14 | — |
| D5 | Quick Post and basic native registration (free, no approval step) | §14, §17 | §40 |
| D6 | Instant Add: paste text, link or poster, get a draft event | New | §37 |
| D7 | Passport Lite and fit labels with honest "can't check" lines | §12 | §43 |
| D8 | Saved events, `.ics` export, deadline reminders, material-change alerts | §15 | §47 |
| D9 | Reach estimate for organizers | §19 | §41 |
| D10 | Community Lite loop: follow, next event, "I'm going", attendance history and badges, share, day-after prompt | §24 | §44 |
| D11 | QR check-in for native events (the only event-day feature in Tier 1) | §23 | §44.6 |
| D12 | Admin review queue (lite) | §26 | §49 |
| D13 | Analytics events and the 3 headline metrics | §30 | §45 |
| D14 | Notifications: in-app and email with caps and quiet hours | §15, §21 | §47 |
| D15 | Report a problem and submit a missing event | §26 | §37 |

### 35.3 Tier 2 — Strengthen (build after Tier 1 passes §53)

- Saved searches and weekly digest (§15, §47)
- Basic Team Finder (§16)
- Organizer claim flow and approved-edit protection (§25)
- FAQ builder and attendee question inbox (§18) — moved here from the Foundation phase
- Waitlist and manual approval (§21)
- Topic follows (§44.8)
- College email verification (§42)
- Travel-time estimate from a routing service (§36.4)
- Announcements to audience segments (§21)

### 35.4 Tier 3 — Later (kept as written in Sections 1–33)

Open-web discovery at scale, certificates, project showcases, event series automation, additional regions, official platform integrations, paid registration, deeper calendar and organizer tools.

### 35.5 FROZEN until Tier 1 passes every test in §53

| Frozen item | Original section | Why frozen |
|---|---|---|
| Mode 3 "Organize on Knot" | §17 | Turns Knot into a hackathon-management tool. The PS does not ask for it |
| Hackathon operations pack: tracks, submissions, judging, rubrics, results | §22 | Same reason. Competes with Devfolio and Unstop on their home ground |
| Room and table allocation, help desk queue, speaker directory | §23 | Not needed to prove discovery or return |
| Website widget and copy-ready descriptions | §20 | Nice to have. Does not prove the PS outcomes |
| Recurring-event automation | §20 | Manual "edition" link in §44.7 is enough for now |
| Numeric Event Readiness score | §19 | Keep the checklist as plain warnings (§40.5). Do not show a score |
| Image-similarity duplicate checks | §10 | Needs poster data at scale first |
| WhatsApp bot or WhatsApp Business messages | §15 | Needs approvals and cost. Use share links instead (§44.5) |
| Paid registration | §32 | Already deferred in the original |

### 35.6 Rule when time is short

If the schedule slips, drop from the bottom of Tier 1 upward in this order and write each drop in the change log: D14 non-essential notification types, D10 badges, D9 reach estimate breakdown, D13 dashboard (keep the event logging), D11 QR check-in. **Never drop D3, D4, D5, D6, D7.** Without these there is no demo of the PS.

---

## 36. Hyperlocal Discovery Layer (Bengaluru first)

**Goal:** a person opens Knot and, within seconds, sees what is happening close to them, soon, that fits them. "Hyperlocal" means neighbourhood level, not city level.

### 36.1 Scope lock for the first build

- In-person events: **Bengaluru only**. India-wide in-person coverage (§4) comes after Tier 1 passes.
- Online events: shown in their own "Online" strip and filter, for any user, without needing a location.
- Events outside Bengaluru may exist in the catalog. They are hidden from the default feed and map, and appear only if the user changes the area.
- The database must still store `city` and `country` for every event so other cities can be added without redesign (§4).

### 36.2 Location data

**Locality list.** Seed at least 40 Bengaluru localities (for example Koramangala, Indiranagar, HSR Layout, Whitefield, Electronic City, Jayanagar, JP Nagar, Malleshwaram, Hebbal, Marathahalli, BTM Layout, Banashankari, Rajajinagar, MG Road, Yelahanka). Each has: name, alternate spellings, centre point (latitude, longitude), city. Get centre points from the chosen map data source. Do not type coordinates from memory.

**Venue record.** Name, address, locality, latitude, longitude, `location_precision`, and who confirmed it.

**`location_precision` values (every event must have one):**

| Value | Meaning | Shown on map? |
|---|---|---|
| `exact` | Pin matches a confirmed building or venue | Yes, exact pin |
| `approximate` | Found from an address but not confirmed | Yes, with "approximate location" label |
| `locality` | Only the neighbourhood is known | Yes, as an area marker with a "venue not stated" label |
| `city` | Only the city is known | No. List only |
| `none` | Nothing known (online or missing) | No. List only, with "Location pending" tag if it should be in-person |

**Geocoding rules.** When an event has an address but no coordinates, convert the address to a point with the chosen map service. Save the result and its confidence. If confidence is low, set `approximate` and add the event to the review queue (§49). Never place a pin at the city centre and call it exact.

### 36.3 "Near me" behaviour

1. The "Near me" button asks for browser location **only when tapped**. Never ask on page load.
2. If allowed: find the nearest known locality, show "Near you: <locality>", and sort by distance.
3. If denied or unavailable: open the locality picker. Never block browsing.
4. Remember the chosen locality (not raw GPS). Let the user change it in one tap.
5. Do not save the user's live coordinates on the server. Save only the chosen locality and radius (§50).
6. Default radius: 10 km. Quick options: 3, 5, 10, 25 km.

### 36.4 Distance and travel estimate

- **Tier 1:** straight-line distance, shown as "about 6 km away". Add a band label: under 3 km "very close", 3–8 km "nearby", 8–15 km "across town", over 15 km "far".
- **Tier 2:** travel-time **range** from a routing service, labelled "estimate, depends on traffic". Show a range, never a single exact minute count.
- If the event location is `city` or `none`, show no distance. Do not show "0 km".
- Never say "easy to reach" or "practical" without a distance or time behind it.

### 36.5 Time chips

All times use `Asia/Kolkata` unless the event states another timezone.

| Chip | Rule |
|---|---|
| Today | Event starts or is ongoing today |
| Tonight | Starts today between 17:00 and 23:59 |
| Tomorrow | Starts tomorrow |
| This weekend | Saturday or Sunday of the coming (or current) weekend |
| Next 7 days | Starts within 7 days from now |
| Custom | Date range picker |

Multi-day events appear under every chip whose date range they overlap. Events that already ended never appear under chips.

### 36.6 Map view

- A **List / Map** toggle on the search screen. Both use the same filters and the same shareable URL (§11).
- Pins are coloured by when the event happens: today, this weekend, later. Pins also carry a shape or label, not colour alone.
- Close pins group into numbered clusters. Tapping a cluster zooms in.
- Tapping a pin opens a small card: title, date and time, distance, source badge, fit label. Tapping the card opens the event page.
- A **"Search this area"** button appears after the user moves the map. It re-runs the search for the visible area.
- Events with `city` or `none` precision are not on the map. The map shows a note: "N events have no exact location. See them in the list."
- Online events never appear as pins. They appear in the "Online" strip above the list.
- Cancelled events are removed from the map. Users who saved them still see them in their plan with a "Cancelled" banner.

### 36.7 Home feed sections

When a user lands on Knot, the home screen shows these sections in order. Each shows at most 10 events, with "See all".

| Section | Rule | Sort |
|---|---|---|
| Happening soon near you | In-person, within selected radius, starts in the next 7 days | Start time, then distance |
| Closing soon | Registration closes within 72 hours, within radius or online | Closing time |
| Because you like <interest> | Matches one of the user's interests. Only shown if the user has interests | Fit, then start time |
| New this week | First discovered in the last 7 days | Newest first |
| Online | Online events from the next 14 days | Start time |

A section with no events is hidden, not shown empty. If every section is empty, show the empty state in §48.

### 36.8 Default sorting

- No passport: "Soonest near you" = start time ascending, then distance ascending.
- With passport: "Best fit" (§12, §43). The internal ranking score is never shown; only the fit label and reasons are.
- Other sorts from §11 stay available.

### 36.9 Acceptance criteria

- A first-time visitor can reach a list of events near a chosen locality in **3 taps or fewer** without an account.
- Map and list show the same events for the same filters.
- Every event on the map has `exact`, `approximate` or `locality` precision, and the label matches.
- Denying location permission never breaks the page.
- No live GPS point is stored on the server.

---

## 37. Instant Add — turn posters, messages and links into events

**Goal:** close the PS's biggest gap. Much of the event information is in WhatsApp forwards, Instagram posts and posters. Instant Add lets any person put that information into Knot in under a minute, and lets the organizer own it later.

### 37.1 What Instant Add will and will not do

**Will:**

- Accept content the **person gives Knot**: a pasted message, a public URL, or one or more images (poster or screenshot).
- Read that content and fill an event draft.
- Ask the person to check the draft before anything is published.

**Will not:**

- Read WhatsApp groups, private chats or private channels. They are private and not available to Knot.
- Log in to Instagram, LinkedIn or any other site on someone's behalf.
- Publish anything without passing the rules in §37.5.

If a public URL cannot be read (blocked or needs login), say so and ask the person to paste the text or upload a screenshot instead.

### 37.2 Entry points

- "Add event" button on the home screen and the search screen.
- "Can't find an event? Add it" on empty search results.
- "Report missing event" (§26) leads to the same flow.
- Organizers: the first step of Quick Post (§40).

### 37.3 Flow

```text
Person gives text / URL / image(s)
  ↓
Knot stores the original as evidence (private)
  ↓
Knot reads it and creates a draft with a confidence level on every field
  ↓
Knot checks for an existing matching event (§10 rules)
  ↓
Person sees ONE review screen: fields filled, low-confidence fields highlighted
  ↓
Person fixes fields and submits (and says if they are the organizer)
  ↓
Rules in §37.5 decide: published, or sent to review
```

If a likely duplicate exists, show it first: "This looks like <event>. Is it the same?" with options "Same event" (open it, optionally add this as another listing), "Different event" (continue).

### 37.4 Extraction output (what the reader must return)

Return structured data, never free text. Every field has a value, a confidence level and the exact words it came from.

```json
{
  "title":            { "value": "...", "confidence": "high|medium|low|missing", "evidence": "text snippet" },
  "event_type":       { "value": "hackathon|workshop|meetup|conference|summit|competition|webinar|community_session|other" },
  "organizer":        { "value": "...", "confidence": "..." },
  "start_datetime":   { "value": "ISO 8601 with +05:30", "confidence": "...", "evidence": "..." },
  "end_datetime":     { "value": null, "confidence": "missing" },
  "registration_deadline": { "value": null, "confidence": "missing" },
  "mode":             { "value": "in_person|online|hybrid", "confidence": "..." },
  "venue_name":       { "value": "...", "confidence": "..." },
  "address_or_locality": { "value": "...", "confidence": "..." },
  "city":             { "value": "Bengaluru", "confidence": "..." },
  "registration_url": { "value": "...", "confidence": "..." },
  "price":            { "value": "free|paid|unknown", "amount_inr": null, "note": "..." },
  "eligibility_text": { "value": "...", "confidence": "..." },
  "skills":           { "value": ["..."], "confidence": "..." },
  "team_size":        { "min": null, "max": null, "confidence": "..." },
  "contact":          { "value": "...", "visibility_ok": false },
  "summary":          { "value": "max 40 words, own words, no copied paragraphs" }
}
```

**Reading rules (must follow):**

1. **Never guess.** If a field is not in the content, return `null` and `"missing"`.
2. **Dates:** assume Indian order DD/MM/YYYY. If the year is missing, use the next future occurrence and mark confidence `medium`. Relative words ("this Saturday", "tomorrow") are converted only if the date the content was posted is known; otherwise return `low` and ask the person to pick the date.
3. **Times:** "6 PM onwards" sets a start time and no end time. "10–4" with no AM/PM is `low` confidence and must be confirmed.
4. **Price:** `free` only if the content clearly says free. "Free for students" is a note, not `free` for everyone. Missing price is `unknown`, never `free` (Principle 7).
5. **Eligibility:** copy only what is stated. Do not turn a theme (for example "AI hackathon") into a skill requirement (Principle 7).
6. **Contact numbers:** extract them as evidence, but `visibility_ok` is `false` unless the submitter says they are the organizer (see §37.7).
7. **Summary:** write in your own words, maximum 40 words. Do not copy long text (§13, Section 32 item 7).
8. **If the image is not an event** (meme, ad, unreadable), return `not_an_event` and stop.

### 37.5 Publication rules

| Situation | Result |
|---|---|
| Organizer submits, all required fields present and confirmed by the person | Published with label "Posted by organizer" |
| Community member submits, all required fields high-confidence, a registration or official link present, no duplicate found, and the extraction accuracy check in §37.8 is recorded as passed | Published with label **"Community-submitted. Not confirmed by the organizer."** |
| Any required field low or missing | Goes to review queue (§49). Not public |
| Possible duplicate not resolved by the person | Review queue |
| New account's first 3 submissions | Always review queue |
| Content flagged by spam or safety checks | Review queue, then block if confirmed |

**Required fields for publication:** title, event type, start date, mode, location (for in-person) or join/registration link (for online), and one working link or contact route. These match "minimum useful publication fields" in §8.

When an organizer later claims a community-submitted event (§25), the label changes to "Claimed by organizer" and the organizer's edits are protected from later automated overwrites.

### 37.6 Abuse controls

- Maximum 10 submissions per account per day; maximum 3 per hour.
- Block repeat submitters whose items are rejected 3 times in a row. Show a clear message and a way to appeal.
- Reject duplicates of the same image (exact file match) from the same account.
- Every published community-submitted event has "Report a problem" (§13).

### 37.7 Evidence, posters and personal data

- Store the original text or image as **private evidence** linked to the submission. Do not show it publicly unless the submitter is the organizer and confirms they have the right to use it.
- For non-organizer submissions, show a clean text card made by Knot instead of the poster.
- Do not publish personal phone numbers or personal emails from posters unless the organizer submitted them and ticked "show contact publicly".
- Delete evidence images 30 days after the event ends, unless the organizer claimed the event and chose to keep the poster as its banner. (Recommended default; see §55.)

### 37.8 Accuracy check before auto-publish is switched on

Before any community submission can be auto-published, run a test on **at least 20 real posters or messages** collected by the team (include blurry, Hindi-English mixed and multi-date examples). Record the results in the change log.

- Target: title, date, time and venue/mode are correct on **at least 85%** of the test items.
- If the target is not met, auto-publish stays OFF and every submission goes to review.
- Re-run this check after any change to the reading method.

### 37.9 Acceptance criteria

- From pasting text to a reviewed draft takes **under 60 seconds** for a person, in a test with 5 people.
- A poster with a missing year or relative date produces a visible "please confirm date" prompt, not a silent guess.
- A message with "free for members" does not set price to free for everyone.
- Submitting a poster of a non-event shows a clear "this does not look like an event" message.
- No personal phone number appears publicly from a non-organizer submission.

---

## 38. Source priority and the Permission Gate

**Goal:** collect events from where Bengaluru events actually are, without breaking anyone's rules, and without building the whole plan on a source that can be switched off.

### 38.1 Permission Gate (new rule for every source)

No source can be switched on until it has a **Source Record** that a human has approved.

```text
source_name
source_type           // platform | college_site | community_site | calendar_feed | manual
access_method         // official_api | feed_ics_rss | structured_page_data | public_page | manual_entry | link_only
terms_checked_on      // date
terms_summary         // what the site allows, in plain words
robots_policy         // allowed | disallowed | not_applicable
allowed_use           // full_metadata | facts_and_link_only | not_allowed
fetch_limits          // max requests per minute, check frequency
contact_for_permission // if any
fallback_if_blocked   // link_only | manual | remove
status                // proposed | approved | paused | rejected
approved_by
```

**Rules:**

1. If terms or robots rules disallow collection, status is `rejected`. Use `manual_entry` or `link_only` through Instant Add and organizer posting instead.
2. If terms are unclear, status stays `proposed`. Use `link_only` until someone approves.
3. Fetch no faster than `fetch_limits`. Identify Knot clearly in requests. Stop on repeated errors or blocks and mark the source `paused`.
4. Record the check date. Review each approved source's terms again every 90 days.

### 38.2 Link-only mode

When a source is not approved for full collection, Knot may keep only **facts and a link**: title, date, place, organizer name and the original URL. It shows "Listed from <source>" and sends the user to the original page. No copied description, no copied images.

### 38.3 Order in which sources are switched on (Bengaluru first)

This is the order of enabling. It does not remove any platform named in §4.

1. **Knot-native events** and **Instant Add** (no permission problem).
2. **Curated community and college pages** — a hand-made list of 15–30 Bengaluru colleges, clubs and communities, entered through Instant Add or a feed if they offer one.
3. **Meetup-style and community platforms** from §4 "Possible later sources" (Luma, Meetup, Eventbrite, Townscript) where the Source Record allows. These carry most meetups, workshops and conferences, which the PS names.
4. **Hackathon platforms:** Unstop, Devfolio, Devpost, subject to their Source Records. Check each one's local relevance. Some list mostly online or global events; those go to the "Online" strip, not the "near me" feed.

### 38.4 Source health (lite)

For the Demo Build, source health is a simple table in the admin area (§49): last successful check, number of events found, number failed, status. The fuller tracking list in §5 is Tier 2.

### 38.5 Acceptance criteria

- No automatic collection runs for any source without an approved Source Record.
- At least one non-hackathon source (community, college or meetup-style) is live before the demo.
- Turning a source to `paused` removes new collection but keeps existing events visible with the stale warning from §8.

---

## 39. Empty-platform plan: seed events and first organizers

**Problem:** nobody posts on a platform with no users and nobody joins one with no events. The original blueprint does not say how to start.

### 39.1 Seed pack (real events only)

For the demo and pilot, aim to load a **Seed Pack** of real upcoming events, entered or collected through Instant Add and approved sources. These are planning targets, not hard demo blockers; actual coverage and every shortfall must be reported honestly.

| Measure | Target |
|---|---|
| Real upcoming events in the next 30 days | 100 |
| Share that are not hackathons | 40% or more |
| Event types covered | At least 5 of the 8 in §4 |
| Bengaluru localities with at least one event | At least 10 |
| Organizer or community pages | At least 15 |

Every seeded event carries `added_by = knot_team` and the visible label **"Added by the Knot team from public information"** until an organizer claims it. Never create fake events to reach the numbers. If the numbers cannot be met honestly, say so in the report.

### 39.2 Pilot organizers

- Find **3–5 college clubs or communities** in Bengaluru that run events often.
- Offer: free listing, Quick Post (§40), reach estimate (§41), QR check-in (§44.6), a community page, and a short report after each event.
- Ask each organizer for a **baseline** before using Knot: how many people usually register and how many usually attend a similar event, and where they usually promote. Write the answers down. This is the only honest way to say anything about improvement later (§45.5).
- Get written consent (a message is fine) to use their anonymous numbers in the project report.

### 39.3 Pilot users

- Target for a meaningful test: **30 real users** (students or professionals in Bengaluru) who each get a link, set an area and interests, and are asked to find an event for the coming weekend. Any under-18 participant must use the approved consent and safeguarding flow in §50.1.
- Record, for each: time to find an event they would attend, whether they clicked through or registered, and one open comment.
- Do not offer incentives that change behaviour in a way that hides real interest; keep the test natural.

### 39.4 Pilot targets (not hard demo blockers)

The following are targets. Missing one does not by itself block the demo, but the report must state the actual result, sample size and gap.

- At least 3 organizers publish at least 1 event through Quick Post.
- At least 1 real event runs QR check-in.
- At least 30 users complete the discovery test.
- The report states every number with its sample size and with the baseline comparison where one exists.

### 39.5 Rule for users with no data

A new user with no interests and no history must still see a useful home screen: nearby, soon, closing soon, new this week. Never show an empty "recommended for you" section (§36.7).

---

## 40. Quick Post — the 60-second organizer path

**Goal:** the PS says "easy event posting". The 8-step studio in §17 stays for organizers who want it. Quick Post is the default path.

### 40.1 One screen, six required fields

| Field | Required | Rule |
|---|---|---|
| Title | Yes | 5–120 characters |
| Event type | Yes | One of §4 types. Changes which optional fields appear |
| Date and time | Yes | Start required. End optional. Timezone defaults to `Asia/Kolkata`. Past dates blocked |
| Mode | Yes | In person, online or hybrid |
| Venue (in person) or participation link (online) | Yes | Venue is searched and confirmed on the map (§36.2). An online event needs either a valid registration link or a valid joining link at publication. The joining link may be added later and must be revealed only to appropriate registered/approved participants |
| Registration | Yes | Choose "Register on another site" (link required) or "Register on Knot" (free, capacity optional) |

**Optional, shown under "Add more details":** poster, short description, registration deadline, price, eligibility, skills, team size, contact, WhatsApp or other community link, FAQs. This area opens the full §17 steps 3–8 for anyone who wants them.

### 40.2 Poster autofill

At the top of Quick Post: "Have a poster or message? Add it and we'll fill the form." This uses Instant Add (§37). The organizer sees the same one-screen form with fields filled and highlighted, and confirms.

### 40.3 Checks while typing (no separate step)

- Time order, and a warning if the start is less than 2 hours away.
- Link reachability check on the registration link. Warn, do not block, if unreachable.
- Duplicate check: "This looks like <event> already on Knot. Is it yours? Claim it instead." (§25)
- Missing common details warning (see §40.5).

### 40.4 After publishing

The success screen shows: the event link, a share card, a **WhatsApp share button** (§44.5), a QR code, and the **reach estimate** (§41). It also shows how to add a post-event check-in if the event is native.

### 40.5 Plain warnings instead of a readiness score (the score is FROZEN)

Show up to five short warnings, each with a one-tap fix. Examples: no contact given; no end time; online event with neither a registration nor a joining link; joining link still pending; price not stated; eligibility not stated. Do not show a number or grade. Warnings never block publishing, except for missing required fields.

### 40.6 Editing after publishing

Changing date, time, venue, registration link, deadline, price, eligibility or cancelling is a **material change** (§15). Show a confirmation: "This will notify N people who saved or registered." Log the change in the event revision history (§7).

### 40.7 Acceptance criteria

- With a poster, a new organizer publishes in **under 60 seconds**. Without a poster, **under 90 seconds**. Test with 5 people who have never seen Knot.
- All six required fields are on one screen.
- A material change cannot be saved without the notify confirmation.
- A past date cannot be published.

---

## 41. Reach estimate and audience push (no paid boosts)

**Goal:** an organizer can see who a listing can reach **before** and after publishing, and the right people are told — without paid influence (Principle 9).

### 41.1 Reach estimate

Shown on Quick Post and the organizer dashboard. It counts Knot users who:

- have selected an area within the event's radius, or the event is online;
- have at least one interest or skill that matches the event;
- are not excluded by clear eligibility rules;
- have not turned off event alerts.

**Privacy rules for the number:**

- Show a **range**, never an exact count: under 10 shows "Not enough data yet"; then "10–49", "50–99", "100–249", "250–499", "500+".
- Show breakdowns (by locality, by interest) only for groups of **10 or more**. Never show or export individual people.
- Show the assumption line: "Based on people on Knot who set an area and interests. It is not a promise of attendance."

### 41.2 Live audience-fit preview (concrete version of §19)

As the organizer edits fields, the reach range and the breakdown update. Show plain advice when rules shrink the audience a lot, for example: "Only students of one college can join. This limits who sees it as a strong fit." Do not suggest changing rules in ways that are unfair or misleading. The organizer decides.

### 41.3 Audience push rules

When an event is published or changes materially, Knot may notify matching users under these rules:

- The user has alerts on, has an area set, and the event is within their radius (or online and matches an interest).
- The user's weekly cap for non-essential notifications is not reached (§47).
- Notifications are grouped into the user's next digest, **except** an event starting within 48 hours, which may be sent once, immediately.
- A duplicate listing never causes a second notification (§15).
- Organizers cannot pick individual users, cannot see who was notified, and cannot pay for extra reach. They see only the aggregate numbers in §41.1 and the real results in §41.4.

### 41.4 Real results the organizer sees

Views, saves, calendar adds, outbound clicks, native registrations, check-ins, follows (§25). External completed registrations and attendance are never claimed unless self-reported and labelled (§14, §31).

### 41.5 Fairness for new listings

Every newly published event appears in "New this week" (§36.7) for 7 days regardless of the organizer's size or past performance, so small clubs are not buried.

### 41.6 Acceptance criteria

- No reach number is shown for a group under 10 people.
- No screen or export lets an organizer identify who was counted or notified.
- An event starting in 48 hours sends at most one immediate notification per user, even if edited several times.

---

## 42. Campus and community layer

**Goal:** colleges and clubs host many of the events in the PS. They need to be first-class, not just text in an "organizer" field.

### 42.1 College record

`College`: name, alternate names, city, locality, website, status. Seed the main Bengaluru colleges (aim for 20 or more) from a public list.

### 42.2 User side

- Optional: the user picks a college in Passport Lite (§43). It is private by default.
- Tier 2: verify with a college email address. A verified user gets a "Verified student of <college>" badge, and it can be shown publicly only if the user chooses.
- Do not require a college for any feature.

### 42.3 Event side

- Organizers can mark eligibility as **Open to all**, **Students of <college> only**, or **Open to all, preference for <college>**.
- "Students of <college> only" events are visible to everyone, with the rule clearly stated. A user who is not verified sees: "Restricted to <college> students." Knot does not block the original external registration, because the source decides who may join (Principle 5).
- A user whose verified college matches sees a "From your college" tag.

### 42.4 Community pages

A club or community page shows: name, college link, description, events (upcoming and past), follow button, and "claimed by" state. Pages are created when an organizer claims or posts, or by Knot admins from seed data. Past events show attendance counts **only** for native events with check-in.

### 42.5 Acceptance criteria

- A user can use Knot fully without choosing a college.
- A restricted event shows its restriction before the user clicks anything.
- A user's college is never shown to other people unless the user turns that on.

---

## 43. Passport Lite and honest fit labels

**Goal:** keep the value of the Fit Passport (§12) without making new users do homework.

### 43.1 Two-step sign-up setup

1. **Area:** "Where do you usually go for events?" Pick a locality or use "Near me". Radius defaults to 10 km.
2. **Interests:** pick 3 or more from a list of about 20 tags (for example AI/ML, web development, mobile apps, design, data, cloud, cybersecurity, startups, open source, hardware/IoT, careers). A "Skip for now" option is always visible.

Everything else in §12 (skills, learning goals, experience level, education, availability, price, team status) is optional and asked later, only when it would change a result. Example: on an event that lists required skills, show "Add your skills to check your fit" with an inline picker.

### 43.2 Learning from behaviour (visible and editable)

- Saves, outbound clicks and registrations slightly raise matching interests.
- Show these as editable chips under "Because you saved…" with a remove button. Nothing is hidden from the user.
- Behaviour signals fade after 60 days without activity.
- Never infer or store sensitive traits (religion, health, caste, relationship status, and so on) (Principle 10).
- For under-18 accounts, use only explicitly selected area and interests by default. Behaviour-derived interest learning remains off unless a minor-specific privacy and safeguarding review explicitly approves it.

### 43.3 Fit labels — rules for what Knot may say

| Label | Allowed only when |
|---|---|
| **Strong fit** | The location/time check can be made, **and** at least one interest or skill matches, **and** no important eligibility field is unknown, **and** there is no clear mismatch |
| **Possible fit** | Some checks pass but at least one important field is unknown, or only a weak match exists |
| **Not currently eligible** | A clear, stated mismatch exists (for example "final-year students only" and the user is in first year) |
| *(no label)* | There is not enough information. Show the event without a fit claim |

Each label has reason lines, in plain words, only from facts that exist on **both** sides (event data and user data). When something cannot be checked, show a neutral line such as "We can't check eligibility because the event doesn't say." Never fill that gap with a guess or a positive sounding line.

### 43.4 Internal ranking (never shown)

Sort order "Best fit" uses an internal score. Default weights, adjustable in settings: interest match 30, existing-skill match 25, distance 20, timing 15, deadline urgency 10. Unknown fields add **zero**, not a bonus and not a penalty. Hard gates from §12 (registration closed, clear eligibility mismatch, schedule conflict) push an event below all others or hide it with the "show closed" option. The score is never displayed to users or organizers. Only labels and reasons are displayed.

### 43.5 Guest mode

Guests can use all filters, the map and the home feed. They are asked to set an area only. A passport is never required to view or open an event.

### 43.6 Acceptance criteria

- A new user reaches a personalized home screen after **two** setup steps.
- An event with unknown eligibility never shows "Strong fit".
- Every fit label shows at least one reason, and each reason is true for both the event and the user's data.
- A user can see and delete every interest the system learned.

---

## 44. Community Lite loop (Tier 1)

**Goal:** the PS asks for meaningful community engagement and repeat attendance. The original return loop (§24) is in the last phase and is mostly organizer-to-user. This section brings a **small, people-friendly version** into the first build. Unrestricted chat remains not recommended (§24).

### 44.1 Follow an organizer or community

- Follow button on community pages and event pages.
- Following gives: new-event notifications (within caps, §47) and a "Following" section in the home feed.
- The organizer sees the **number** of followers only, never names, unless a follower chooses to share.

### 44.2 "Next event from this organizer"

- On every event page and on the post-event screen, show the organizer's next upcoming event.
- If none, show "Get told when <organizer> posts again" with a follow button.

### 44.3 "I'm going" (self-declared interest)

- A button on every event: "I'm going". It is labelled **self-declared** and is not proof of registration.
- Show a count when it is **3 or more**. Below that, show nothing.
- "People from your college are going" appears only when 3 or more opted-in verified users share the college.
- **Names:** off by default. A user may turn on "Show my name to others on events I'm going to". Even then show first name and college only.
- Counts must not be used to claim attendance (§31).

### 44.4 Attendance history and badges

- **Participation History** page: events the person attended or says they attended, newest first, with a label "Checked in" or "Self-reported".
- **Badges** (simple, public only if the user chooses):

| Badge | Rule |
|---|---|
| First event | First attended event |
| Explorer | Attended 3 different event types |
| Local regular | Attended events in 3 different localities |
| Community regular | Attended 3 events by the same organizer |
| On a roll | Attended in 3 consecutive calendar months |

- Only **check-in** attendance counts for "On a roll" and "Community regular". Self-reported attendance counts for "First event", "Explorer" and "Local regular". This limits gaming.
- No points that can be bought, no ranking of users against each other, no pressure messages.

### 44.5 Sharing and community links

- **Share** button creates a link plus a ready message the user can send anywhere, especially WhatsApp. Template: `<Title> — <Day, Date, Time> at <Venue or Online>. Details: <link>`.
- Organizers can add a **community group link** (WhatsApp, Telegram, Discord). It is shown on the event page as "Join the community group (external link)". Knot does not run or moderate that group and says so in a small note. Provide "Report this link".
- Share links carry a source tag so the organizer's referral counts are accurate (§25).
- No WhatsApp bot in this build (FROZEN).

### 44.6 QR check-in (the one event-day feature in Tier 1)

- For **native** events only. The organizer opens a check-in screen on a phone; a volunteer or the organizer scans the participant's QR code from their registration.
- Each registration has a unique code; one code can be used once; a second scan shows "Already checked in at <time>".
- The organizer can also search by name and tick someone in, as a fallback.
- Check-in produces the only verified attendance number in Knot. Show it to the organizer, and add it to the participant's history.
- Volunteer access is limited to check-in (§6). Volunteers cannot export participant data.

### 44.7 Edition link (manual series)

An organizer can mark "This is the Nth edition of <series>" and link past events. The event page shows "Previous editions". No automatic recurring events (FROZEN).

### 44.8 Topic follows (Tier 2)

Follow a topic in a city, such as "AI in Bengaluru". Topic followers receive items in the digest only.

### 44.9 Day-after prompt (the return loop in one tap)

The morning after an event (10:00 IST), a user who saved, registered, clicked out or said "I'm going" gets one in-app prompt (and an email if they opted in):

1. "Did you go?" — **Yes / No / Didn't register**. Mark answers as self-reported unless the user was checked in.
2. If yes: "How was it?" — 1–5 stars with an optional single line. Private to Knot and shown to the organizer **only in groups of 5 or more** responses, without names.
3. "Next up for you:" — 3 events that pass the fit rules in §43.3, including the organizer's next event.
4. "Follow <organizer>" button.

The prompt appears once. If ignored, do not repeat it.

### 44.10 Moderation and safety for this section

- All free text is short (feedback lines max 200 characters, community links only as links).
- Report buttons on community links, feedback and pages.
- Remove content within 48 hours of a valid report, and log the action (§25 audit history).
- No private messages between users in this build. Team Finder (Tier 2) uses the consent rules in §16.

### 44.11 Acceptance criteria

- A user can follow an organizer and receives a notification for that organizer's next event, within caps.
- "I'm going" never appears as "registered" anywhere.
- An organizer cannot see names of followers or "I'm going" users.
- A badge based on check-in is not given for self-reported attendance.
- The day-after prompt appears once per event per user, and respects quiet hours (§47).

---

## 45. Measuring the PS outcomes

**Problem in the original:** Section 30 lists good measures, but most external events cannot show registration or attendance. The PS's main result ("more people actually attend and return") needs a plan.

### 45.1 Three headline metrics

| Metric | Definition | Where the data comes from |
|---|---|---|
| **Time to a relevant event** | Time from the start of a session to the first "save" or "outbound click" or "register" on an event the user opened. Report the **median** and the number of sessions | Analytics events |
| **Action rate** | (Outbound clicks + native registrations) ÷ event detail views | Analytics events |
| **Return rate** | Of people with a checked-in or self-reported attendance, the share who register, click out or attend another event within **60 days** | Attendance and analytics records |

Always report the **sample size** next to each number. Never round up a small sample into a strong claim.

### 45.2 Attendance sources and trust levels

| Level | Source | May be called |
|---|---|---|
| A | QR check-in on a native event | "Attended (checked in)" |
| B | Self-reported in the day-after prompt or in history | "Attended (self-reported)" |
| C | Outbound click | "Opened the registration page" — never "registered" |

Report A and B separately. Do not add C to attendance.

### 45.3 Analytics events to record (names and properties)

Use these names exactly. Every event has: `event_name`, `timestamp`, `user_id` or `anonymous_id`, `session_id`, `surface` (home, search, map, event_page, etc.).

| Event name | Extra properties |
|---|---|
| `search_performed` | filters used, result count, view (list/map) |
| `filter_applied` | filter name, value |
| `near_me_used` | permission result (granted/denied) |
| `event_viewed` | event_id, source, locality, distance_band, fit_label |
| `event_saved` / `event_unsaved` | event_id |
| `calendar_added` | event_id |
| `outbound_click` | event_id, listing_id, source |
| `native_registered` | event_id |
| `going_marked` | event_id |
| `checked_in` | event_id |
| `follow_added` / `follow_removed` | organizer_id |
| `share_clicked` | event_id, channel |
| `instant_add_started` / `instant_add_submitted` / `instant_add_published` | input type (text/url/image), duration_seconds, fields_edited_count |
| `quick_post_published` | duration_seconds, used_poster_autofill |
| `reach_estimate_viewed` | range bucket |
| `day_after_prompt_answered` | answer, event_id |
| `feedback_submitted` | event_id, rating |
| `notification_sent` / `notification_opened` / `notification_opted_out` | type, channel |

Do not record: precise GPS, contact details, free-text content in analytics, or anything in §50.3.

### 45.4 Admin metrics page (simple)

One page showing: the three headline metrics, events by source and by type, events by locality, Instant Add counts and review outcomes, source health (§38.4), and notification opt-out rate.

### 45.5 Honest way to talk about impact

- Baseline first: use the pilot organizer answers from §39.2.
- After the pilot, compare **their own** numbers before and after, with the sample size. Example sentence: "Organizer A usually saw about N registrations for a similar event; with Knot, X came from Knot links."
- Do **not** claim "Knot increased attendance by X%" from one or two events. State what was measured, how many, and what could not be measured.
- Keep the honesty rules in §30 and §31.

### 45.6 Acceptance criteria

- Every event in §45.3 fires once per action and appears in the admin page.
- Outbound click is never counted as registration anywhere in the product or reports.
- Metrics show their sample size on screen.

---

## 46. Data model additions

New or extended records. Names are suggestions; keep meanings. All records have `id`, `created_at`, `updated_at`.

| Record | Key fields | Notes |
|---|---|---|
| **Locality** | name, aliases[], city, latitude, longitude | Seed list (§36.2) |
| **Venue** | name, address, locality_id, latitude, longitude, location_precision, confirmed_by | |
| **EventLocationFields** (on Canonical Event) | venue_id, location_precision, distance fields are computed, not stored | |
| **College** | name, aliases[], city, locality_id, website | §42 |
| **Submission** | submitter_id, input_type, original_ref (private), status (draft, pending_review, published, rejected), claimed_by_organizer (bool), label, canonical_event_id | Instant Add (§37) |
| **ExtractionDraft** | submission_id, fields (value, confidence, evidence), reading_method_version | Keep for audit and re-checks |
| **ExtractionCheckRun** | date, test_set_size, accuracy per field, passed (bool) | §37.8 |
| **SourceRecord** | all fields in §38.1 | Permission Gate |
| **SeedBatch** | name, date, count, added_by | §39 |
| **Follow** | user_id, organizer_id | §44.1 |
| **TopicFollow** | user_id, topic, city | Tier 2 |
| **GoingMarker** | user_id, event_id, show_name (bool) | §44.3 |
| **AttendanceRecord** | user_id, event_id, level (A/B), recorded_at | §45.2 |
| **BadgeAward** | user_id, badge, awarded_at, public (bool) | §44.4 |
| **Feedback** | user_id, event_id, rating, short_text, visible_to_organizer_after_n | §44.9 |
| **CheckInCode** | registration_id, code, used_at, used_by | §44.6 |
| **ReachEstimateSnapshot** | event_id, range_bucket, assumptions, calculated_at | Store the bucket only, not user IDs |
| **NotificationLog** | user_id, type, event_id, channel, dedupe_key, sent_at, opened_at | §47 |
| **NotificationPreference** | user_id, per-type on/off, email/in-app, quiet hours | §47 |
| **AnalyticsEvent** | see §45.3 | |
| **UserInterestSignal** | user_id, interest, weight, last_updated, source (chosen/learned) | Visible and deletable (§43.2) |
| **ConsentRecord** | user_id, type, version, given_at, withdrawn_at | §50 |
| **ReviewItem** | type, target_id, reason, status, assigned_to, decision, decided_at | §49 |

**Rules:**

- A change to any field in a Canonical Event creates an Event Revision (§7).
- `is_sample` must exist on events, users and organizers so demo data can never be mistaken for real data.
- User account stores `area_locality_id` and `radius_km`, not live GPS.
- User account may store the minimum age-band/minor-status data required for consent and safeguarding; avoid full birth dates unless necessary. Under-18 consent and withdrawal states belong in `ConsentRecord`.
- Deleting a user removes personal records within 30 days and keeps only anonymous counts (§50).

---

## 47. Notification rules and limits

**Channels in Tier 1:** in-app and email. No WhatsApp or push (§32 item 5).

| Type | Trigger | Who | Cap and timing | Can user turn off? |
|---|---|---|---|---|
| Material change or cancellation | A material change (§15, §40.6) | Registered and saved users | Immediate. Not capped | Saved: yes. Registered: no for cancellations and time/place changes |
| Deadline reminder | 24 hours and 3 hours before registration closes | Saved users who have not marked "registered" | Max 2 per event per user | Yes |
| Event reminder | 24 hours and 2 hours before start | Registered, saved or "going" users | Max 2 per event per user | Yes |
| New matching event | Strong or possible fit, in radius | Users with alerts on | In the weekly digest. Immediate once only if the event starts within 48 hours | Yes |
| Followed organizer posted | New event from a followed organizer | Followers | Once per event. Max 2 per day across organizers | Yes |
| Day-after prompt | 10:00 IST the day after the event | Users in §44.9 | Once per event | Yes |
| Admin and safety | Account, report outcome | The person | As needed | No |

**Global rules:**

1. **Weekly cap:** at most **3 non-essential emails per week** per user. Extra items wait for the next digest.
2. **Quiet hours:** no email between **21:00 and 08:00 IST**, except cancellation or a time/place change for an event starting within 24 hours.
3. **Dedupe key:** `canonical_event_id + notification_type + user_id`. A repeat listing on another platform never creates another message (§15).
4. Every email has a one-tap **unsubscribe** and a link to preferences.
5. Respect opt-outs immediately. Log every send in NotificationLog.
6. **Default for sending:** log-only until the project owner switches real sending on (§34.2 rule 5).
7. Email text is short and plain. First line says what changed and when. Never use pressure words such as "last chance" unless it is literally true and time-based.

---

## 48. Screens, states and quality targets

### 48.1 Screens for the Demo Build

| Screen | Purpose | Must include |
|---|---|---|
| Home | See what is near and soon | Area chip, time chips, sections from §36.7, "Add event" |
| Search | Find by filters | List/Map toggle, filters (§11), "Search this area", shareable URL |
| Event page | Decide and act | Everything in §13 that exists, fit label with reasons, "I'm going", Share, Report, organizer's next event |
| Instant Add | Create from poster, text or link | Input choice, review screen with highlighted low-confidence fields, duplicate prompt |
| Quick Post | Organizer posting | §40 one-screen form, reach estimate, success screen |
| Organizer dashboard (lite) | Run native events | Event list, registrations list with CSV export, check-in screen, §41.4 numbers |
| My plan | Saved events and calendar | Saved, going, registered, `.ics` download, conflicts |
| Profile and history | Control data | Passport Lite, learned interests (editable), Participation History, badges, privacy settings |
| Community page | Follow a club | §42.4 |
| Admin review | Keep data trustworthy | §49 |

### 48.2 States required on every screen

- **Loading:** skeleton or short message. Never a blank screen.
- **Empty:**
  - Home with no events: "Nothing nearby in the next 7 days. Try a wider radius, see online events, or add one you know about." with three buttons.
  - Search with no results: show the filters causing it and a "Clear filters" button, plus "Add the missing event".
- **Error:** plain sentence, what to do, and a retry. Never show raw error text.
- **Stale data:** show the last-checked time and the warning in §8 when a source failed.
- **Offline or slow connection:** keep the last loaded list visible with a "may be out of date" note.

### 48.3 Quality targets (measure and record)

| Area | Target |
|---|---|
| First useful content on a mid-range phone over a normal mobile connection | Under 3 seconds |
| Search or filter change shows new results | Under 1 second for the list; under 2 seconds for the map |
| Tap targets | At least 44 × 44 px |
| Text contrast | Meets WCAG AA |
| Keyboard and screen reader | All main actions reachable; images have alt text (§9) |
| Screen width | Works from 360 px with no sideways scrolling |
| Language | Plain English. Short sentences. No internal terms (for example never show "canonical", "listing ID") |

### 48.4 Plain wording rules for what users see

- Say "Register on Devpost" and "Registration opens on another site" for external handoffs (§14).
- Say "Added by the Knot team" for seeded events and "Community-submitted. Not confirmed by the organizer." for Instant Add events.
- Use "Strong fit", "Possible fit", "Not currently eligible" only as defined in §43.3.
- Never show a number that looks like a score for fit.

---

## 49. Admin review queue (lite)

**Goal:** the original relies on review queues (§3 Principle 8, §26) but does not say who runs them or how. This is the simplest version that works for a small team.

### 49.1 One queue, six item types

1. Instant Add submissions that failed §37.5
2. Duplicate candidates (medium confidence)
3. Low-confidence locations (§36.2)
4. User reports (wrong, cancelled, duplicate, unsafe)
5. Organizer claims
6. Source failures

### 49.2 Item screen

Shows: the item, its evidence (original poster or text, only to admins), the draft fields with confidence, any matching event, and the reason it is in the queue.

**Actions:** Approve; Edit and approve; Reject (reason required: not an event, spam, duplicate, unsafe, other); Merge with event; Keep separate; Need more info (sends one message to the submitter if sending is on).

Every action writes to the audit history (§25) with who, what and when.

### 49.3 Staffing and speed

- At least **2 named reviewers**, with a simple daily rota. Write the rota in the project notes.
- Target: new items reviewed within **24 hours**; reports about unsafe or cancelled events within **4 hours**.
- Show the oldest item first. Show the count of waiting items on the admin home.
- If the queue is more than 50 items or older than 48 hours, pause new auto-publish of Instant Add (everything goes to review) until the queue is cleared, and note it in the change log.

### 49.4 Acceptance criteria

- A reviewer can clear a typical item in under 30 seconds.
- Every decision is logged.
- A rejected submission tells the submitter why, in plain words.

---

## 50. Privacy, safety and legal checks

This section lists checks for the team. It is not legal advice. A qualified legal adviser should confirm it before real users are added.

### 50.1 Age and under-18 accounts

- Knot's product scope **includes under-18 student accounts**, because school and early-college students are part of the event audience. Browsing without an account remains open to everyone.
- Under-18 account creation must not be enabled in production until an age-appropriate consent, privacy and safeguarding flow has been specified, reviewed and tested. Applicable legal requirements, including parental or guardian consent where required, must be confirmed by a qualified legal adviser before launch.
- Collect the minimum age information needed to apply the correct protections, preferring an age band or minor-status indicator over a full birth date unless a full date is demonstrably necessary.
- Store consent and withdrawal states in `ConsentRecord`, including guardian consent where applicable. A minor account requiring consent stays pending or restricted until that consent is complete.
- Under-18 accounts use the most restrictive visibility defaults: no public name or college on “I'm going,” no public badges, no open direct contact, and no behaviour-derived interest learning by default. Any future relaxation requires a separate safety and privacy decision.
- Account deletion and consent withdrawal must be available through an age-appropriate flow, with guardian involvement where required.
- Events for school students may be listed normally, but listing an event never overrides the account and consent rules above.

### 50.2 Consent and notices

- Plain-language notice at sign-up: what is collected (email, chosen area, interests, activity), why, how long it is kept, how to delete.
- Separate consent for emails. Off until the user turns it on, or on with a clear opt-out at sign-up (decide in §55).
- Provide an age-appropriate privacy notice and the required parent/guardian consent flow for under-18 accounts before activation.
- Withdrawing consent and deleting the account are available in settings, in one place, with the applicable guardian flow for minors.

### 50.3 Data Knot must not collect or show

- Live GPS history, contacts, government ID, caste, religion, health, relationship details or any other sensitive trait.
- Personal phone numbers or emails from posters (§37.7).
- Names of followers or "going" users to organizers (§44.1, §44.3).

### 50.4 Data minimisation and retention

| Data | Keep for |
|---|---|
| Account details | Until deletion |
| Passport answers | Until the user changes or deletes them |
| Learned interest signals | 60 days without activity, then fade (§43.2) |
| Instant Add evidence images | 30 days after the event ends (§37.7) |
| Analytics events | 13 months, then aggregated only |
| Notification logs | 12 months |
| Registration data of native events | Organizer's retention setting, default 12 months after the event |

These are recommended defaults. Confirm them in §55.

### 50.5 Safety

- "Report" on every event, community link and feedback line.
- Takedown or correction within 48 hours of a valid report; 4 hours if it concerns safety (§49.3).
- Code of conduct link on native events (§17 step 2).
- Block and consent rules for team contact are in §16.
- Do not show sensitive joining links to users who are not approved participants (§23).
- For under-18 accounts, disable public “I'm going” identity/college display and public badges by default, and keep behavioural interest learning off unless separately approved under §50.1.

### 50.6 Source and content rules recap

- No collection without an approved Source Record (§38).
- Facts and short own-words summaries only; no copying of full descriptions or images from other sites (§13, §37.7).
- Keep source attribution on every external listing.

---

## 51. Build order for the agent

Do the milestones in order. Each has an **exit check**. Do not start the next milestone until the exit check passes (§34.2 rule 1).

| Milestone | What gets built | Exit check |
|---|---|---|
| **M0 Groundwork** | Decisions in §55 answered or defaulted. Data model (§7, §46). Locality seed (§36.2). Source Records written for every planned source (§38.1). Analytics event names set up (§45.3). Sample-data flag (§46) | Data model runs. At least 40 localities loaded. Every planned source has a Source Record with a status |
| **M1 Catalog and native posting** | Canonical Event and Listing with simple duplicate checks (D1). Event page (D4). Quick Post and basic native registration (D5). External handoff and self-confirm states (§14) | T-01 to T-06 pass. An organizer can publish and a user can open and register or hand off |
| **M2 Hyperlocal discovery** | Locality picker, near me, distance, time chips, list and map, home feed (D3) | T-07 to T-14 pass. Map and list match |
| **M3 Instant Add and review** | Instant Add flow, reading rules, draft screen, publication rules (D6, D15). Admin review queue (D12). Extraction accuracy check recorded (§37.8) | T-15 to T-22 pass. Accuracy result recorded. Auto-publish is ON only if the target is met |
| **M4 Personal layer** | Passport Lite and fit labels (D7). Saved events, `.ics`, reminders, material-change alerts (D8). Notifications with caps and quiet hours (D14) | T-23 to T-30 pass. Dedupe test passes |
| **M5 Organizer reach and community** | Reach estimate (D9). Community Lite loop: follow, next event, going, history, badges, share, day-after prompt (D10). QR check-in (D11). Analytics page (D13) | T-31 to T-41 pass |
| **M6 Pilot and demo** | Seed Pack (§39.1). Pilot with organizers and users (§39.2–39.4). Metrics report (§45). Demo Script B (§52) rehearsed | T-42 to T-45 pass. Pilot report written with sample sizes and target gaps. Seed/pilot target shortfalls alone do not block the demo |

### 51.1 Scaled plans (use the one that fits the time you have)

| If time is | Do | Cut |
|---|---|---|
| **Short** | M0, M1, M2, M3 (reading and review only, no auto-publish), a thin M4 (Passport Lite, saved events, material-change alert), then M6 demo using the Seed Pack | Reach estimate, badges, topic follows, day-after email, QR check-in. Show them as "next" on one slide |
| **Standard** | M0 to M6 as written | Everything in the FROZEN list (§35.5) and Tier 2 |
| **Extended** | M0 to M6, then Tier 2 in this order: saved searches and digest, claim flow, FAQ and question inbox, Team Finder, waitlist and approval, college verification | FROZEN list stays frozen until all Tier 1 and Tier 2 tests pass |

### 51.2 Dependencies the agent must respect

- D6 (Instant Add) needs D1 duplicate checks and D12 review queue.
- D7 (fit labels) needs event eligibility fields and honest "unknown" handling from D1.
- D9 (reach estimate) needs D7 interests and area data.
- D10 and D11 need accounts, D5 native registration and D13 logging.

---

## 52. Demonstration Script B (local-first)

This is **added** to the script in §29. Use Script B when the audience cares about the PS (finding local events, posting easily, coming back). §29 can still be used as the hackathon-focused version.

| Step | What happens on screen | What it proves |
|---|---|---|
| 1 | A new visitor opens Knot on a phone. Taps "Near me". Sees "Happening soon near you" and a map with pins in nearby localities | Hyperlocal discovery in seconds |
| 2 | Opens a **meetup or workshop**, not a hackathon. Sees date, distance, source label, "last checked" | Non-hackathon coverage; trust details |
| 3 | A user shows a **WhatsApp message or poster** from a real club. Pastes or uploads it in Instant Add. A draft appears; two fields are highlighted. The user fixes them and submits. It appears labelled "Community-submitted" | The PS's scattered-information problem solved |
| 4 | The club organizer claims the event and the label changes to "Claimed by organizer". The reach estimate shows a range of nearby matching people | Easy posting and organizer reach |
| 5 | The user sets two things (area, interests). Home now shows "Strong fit" with reasons for one event and "Possible fit" with a "we can't check eligibility" line for another | Personal fit that is honest |
| 6 | The organizer changes the venue. A confirmation says "This will notify N people". The saved user gets one alert, and one only, even though the event is also listed on another site | Change awareness without duplicate alerts |
| 7 | At a real or staged native event, the volunteer scans a QR code. Attendance is recorded as "Checked in" | The only verified attendance number |
| 8 | Next morning: "Did you go? How was it? Next up for you." The user follows the organizer and sees a badge | Return loop |
| 9 | Admin page shows the pilot numbers: time to a relevant event, action rate, return rate, each with sample size and a baseline note | Honest measurement |

**Fallback rules:** If live data fails, use the recorded snapshot and label it "Recorded snapshot". Never present sample data as live (§34.2 rule 2).

---

## 53. Acceptance test list

Mark each test pass, fail or not run in every report (§34.3).

| ID | Test | Pass condition |
|---|---|---|
| T-01 | Publish an event with Quick Post | Event appears on its page and in search |
| T-02 | Open an external event, click register | New tab opens; state is "opened externally", not "registered" |
| T-03 | Duplicate with same source ID | Merged into one event with two listings preserved |
| T-04 | Same title, different date | Not merged automatically (§10) |
| T-05 | Event with unknown price | Shows "Price not stated", not "Free" |
| T-06 | Native registration | State is "registered"; shows in organizer list; CSV export works |
| T-07 | First-time visitor reaches nearby events | 3 taps or fewer, no account |
| T-08 | Deny location permission | Page still works; locality picker opens |
| T-09 | Time chips | "This weekend" and "Tonight" return correct events in IST |
| T-10 | Map vs list | Same events for the same filters |
| T-11 | Location precision | Each pin's label matches its precision (§36.2) |
| T-12 | Event with city-only location | In list, not on map, with the note |
| T-13 | Cancelled event | Gone from map; saved users see "Cancelled" banner |
| T-14 | No live GPS stored | Database inspection shows only locality and radius |
| T-15 | Instant Add with pasted WhatsApp text | Draft with confidence levels in under 60 seconds |
| T-16 | Poster with relative date and no posting date | Date flagged "please confirm" |
| T-17 | "Free for members" text | Price is not set to free for all |
| T-18 | Non-event image | "This does not look like an event" |
| T-19 | Possible duplicate | Prompt shows the match before submission |
| T-20 | Community submission rules | Auto-publish only when §37.5 conditions all hold |
| T-21 | Personal phone number on a non-organizer poster | Not shown publicly |
| T-22 | Extraction accuracy run | Recorded; auto-publish off if under 85% |
| T-23 | Passport Lite | Personal home after two steps |
| T-24 | Unknown eligibility | Never "Strong fit" |
| T-25 | Fit reasons | Every reason is true for event and user data |
| T-26 | Learned interests | User can see and delete each one |
| T-27 | Material change alert | One alert per user; none for a duplicate listing |
| T-28 | Weekly cap and quiet hours | Respected in a simulated week |
| T-29 | `.ics` export | Opens in a calendar with correct times |
| T-30 | Unsubscribe | Takes effect immediately |
| T-31 | Reach estimate under 10 | Shows "Not enough data yet" |
| T-32 | Reach estimate privacy | No way to identify counted people |
| T-33 | Follow an organizer | New event creates one notification within caps |
| T-34 | "I'm going" | Never shown as registered; count hidden under 3 |
| T-35 | Names of going users | Hidden from organizers by default |
| T-36 | Badges | Check-in rules in §44.4 respected |
| T-37 | QR check-in | One scan works; second shows "Already checked in" |
| T-38 | Day-after prompt | Once per event; respects quiet hours |
| T-39 | Feedback to organizer | Shown only in groups of 5 or more |
| T-40 | Share link | WhatsApp message template correct; source tag counted |
| T-41 | Analytics | Every event in §45.3 appears in admin metrics |
| T-42 | Seed Pack | Actual numbers and every gap against §39.1 targets are reported honestly; a shortfall alone does not block the demo |
| T-43 | Pilot data | Sample sizes shown with every metric |
| T-44 | Plain wording | Spot check of 20 screens finds no internal terms |
| T-45 | Mobile quality | Targets in §48.3 recorded for 3 key screens |

---

## 54. Risk register (added)

| Risk | Why it matters | What to do | Trigger to act |
|---|---|---|---|
| A source switches off or blocks collection | Catalog gaps appear overnight | Link-only fallback; manual entry; do not depend on one source (§38) | Source marked `paused` |
| Terms of a source forbid collection | Legal and reputation risk | Permission Gate (§38.1) | Terms unclear or disallow |
| Few events or organizers at start | Users see an empty app | Seed Pack and pilot organizers (§39) | Fewer than 100 real events by M6 |
| Instant Add reads details wrongly | Wrong dates or places hurt trust | Confidence levels, review screen, accuracy check, review queue (§37) | Accuracy under 85% |
| Spam or fake events | Users waste time or are misled | Rate limits, review of new accounts, reports, takedown (§37.6, §50.5) | Several rejected items per day |
| Review queue falls behind | Good events delayed | Named reviewers, pause auto-publish rule (§49.3) | Over 50 items or over 48 hours |
| Users ignore the Passport | Fit stays empty | Two-step setup, learning from behaviour (§43) | Under half of users set interests |
| Fit labels look more certain than the data | Misleading users | Label rules and "can't check" lines (§43.3) | Any "Strong fit" with unknown eligibility |
| Too many notifications | Users unsubscribe | Caps and quiet hours (§47) | Opt-out rate rises |
| Attendance cannot be seen for external events | PS outcome looks unprovable | Three levels of trust, day-after prompt, native check-in (§45.2) | No level A data by M6 |
| Scope grows again | Nothing gets finished | Cut line and FROZEN list (§35) | Any work on a FROZEN item |
| Under-18 users | Consent, privacy and safeguarding requirements | Include minors only through the approved §50.1 flow; restrictive visibility and explicit-only personalization by default | Any attempt to enable minor accounts before consent/safeguarding acceptance criteria pass |

---

## 55. Pending decisions added (with recommended defaults)

These extend the list in §32. If there is no answer, the agent uses the default and writes it in the change log.

| # | Decision | Recommended default |
|---|---|---|
| AD-1 | Map and address-search provider | Use an open map data source if quality is enough for Bengaluru; compare cost and limits of paid options before choosing |
| AD-2 | Travel-time source (Tier 2) | Routing service with ranges only; no exact minutes |
| AD-3 | Which sources pass the Permission Gate first | Knot-native, Instant Add, curated community and college pages; others by Source Record result |
| AD-4 | Sharing channel | Share links and message template; no WhatsApp bot |
| AD-5 | College verification | College email check, Tier 2, optional |
| AD-6 | Account ages | Adults and under-18 students are in scope; production minor accounts require the approved consent and safeguarding design in §50.1 |
| AD-7 | Email consent at sign-up | Off until the user turns it on |
| AD-8 | Evidence image retention | 30 days after the event ends |
| AD-9 | Analytics retention | 13 months, then aggregated |
| AD-10 | Who reviews the queue | Two named team members with a daily rota |
| AD-11 | Auto-publish for Instant Add | Off until the accuracy check passes (§37.8) |
| AD-12 | Seed Pack size | Target 100 real events, 40% non-hackathon; target shortfalls are reported, not hidden and not automatic demo blockers |
| AD-13 | Pilot size | Target 3–5 organizers and 30 users; target shortfalls are reported, not hidden and not automatic demo blockers |
| AD-14 | Sending real emails | Log-only until switched on by the project owner |
| AD-15 | Stack | Mobile-first responsive web app, common well-supported tools |

---

## 56. Plain-word glossary for terms used in this addendum

| Term | Meaning |
|---|---|
| Source Record | A written note about one data source: what it allows, how Knot may use it, who approved it |
| Permission Gate | The rule that a source cannot be used until its Source Record is approved |
| Link-only mode | Knot keeps just facts and a link to the original page |
| Instant Add | The flow where a person gives Knot a poster, message or link and Knot fills an event draft |
| Confidence | How sure the reader is about one field: high, medium, low, or missing |
| Seed Pack | A set of real upcoming events entered by the team so the app is not empty at the start |
| Reach estimate | A range showing about how many people on Knot could be interested in an event |
| Material change | A change that matters to someone who planned to go: date, time, venue, deadline, price, eligibility, cancellation |
| Self-declared / self-reported | Something the user says about themselves. Knot labels it and does not treat it as proof |
| Checked in | Attendance recorded by a QR scan at a native event |
| Sample data | Fake data used only for testing. Always labelled |
| Dedupe key | A short code used so the same alert is not sent twice |
| Tier 1 / 2 / 3 | The order in which features are built (§35) |
| FROZEN | Kept in the plan but not built until Tier 1 is complete |

---

## 57. Addendum summary — what the PS now gets

| PS requirement | Original answer (§1–33) | Added in this addendum |
|---|---|---|
| Information scattered across channels | Aggregation, canonical events, source tracking | Instant Add for posters, messages and links (§37); curated community and college sources (§38) |
| Location-aware, nearby | Locality and radius filters | Near me, map, time chips, distance bands, home feed (§36) |
| Interest-based, personalized | Fit Passport | Passport Lite, honest fit labels, visible learned interests (§43) |
| Easy posting for organizers | 8-step creation studio | Quick Post in 60 seconds with poster autofill (§40) |
| Organizers reach the right audience | Analytics, audience-fit preview | Reach estimate, audience push rules, fairness for new listings (§41) |
| Community engagement | Follows, series, showcases (late phase) | Community Lite loop in the first build: follow, next event, going, history, badges, share, group links, QR check-in, day-after prompt (§44) |
| More people attend and return | Return loop at the end | Three-level attendance trust, return metric, pilot with baselines (§45, §39) |
| User-friendly and fast | Not specified | Screens, states, speed and accessibility targets, plain wording (§48) |
| Buildable and testable | Next step list | Cut line, build order, scaled plans, test list, risks (§35, §51–§54) |

**End of Addendum A.** Sections 1–33 are unchanged above.

---

## 58. Confirmed consolidation decisions for v3

These four decisions were confirmed after reviewing Addendum A. They govern any conflicting earlier wording.

### 58.1 v2 scope and priority are authoritative

The v2 blueprint, including Addendum A's Demo Build cut line, Tier 2/Tier 3 sequencing and FROZEN list, now governs the product plan. Earlier Foundation/P1/P2 ordering no longer overrides it. Full organizer operations and other FROZEN capabilities remain in the long-term vision but are not silently pulled into the Demo Build.

### 58.2 Online-event publication links

An online event may be published with **either a registration link or a joining link**. A joining link is not required immediately when a valid registration route exists. If supplied later, it must use the event's visibility rules and must not be exposed to users who are not entitled to receive it.

Acceptance checks:

- An online event with only a valid registration link can publish.
- An online event with neither a registration nor a joining link cannot publish.
- A pending joining link is shown as pending, not invented or represented as available.
- A later joining-link update follows the material-change and participant-visibility rules.

### 58.3 Under-18 student accounts are in scope

The product must support under-18 students rather than excluding them by policy. This is not permission to launch minor accounts without safeguards. Before production activation, the team must finalize and test age-appropriate notices, required parent/guardian consent, withdrawal/deletion, data minimization, restrictive visibility and safe personalization defaults.

Until that design passes its own acceptance review, minor account activation remains disabled in production; the data model and product flows should still be designed so the approved flow can be supported without excluding students from the long-term product.

### 58.4 Seed and pilot numbers are targets, not hard demo blockers

The targets remain:

- 100 real upcoming events, with at least 40% non-hackathons
- At least 5 event types and 10 Bengaluru localities represented
- At least 15 organizer/community pages
- 3–5 pilot organizers
- 30 pilot users
- At least 3 organizers publishing through Quick Post and one real QR check-in where feasible

The team must report actual numbers, sample sizes and gaps. It must never invent events, organizers, users or attendance to meet these targets. A shortfall alone does not block the demo, but it limits what can honestly be claimed about validation and impact.

### 58.5 Planning status

This v3 consolidation is the reference for subsequent user stories, acceptance criteria and agent architecture. It is **not** an instruction to begin implementation. Coding still requires an explicit user decision to enter the build phase.



---
---

# ADDENDUM B — Age-Based Participation and Minor Safeguards (Sections 59–70)

**Added after v3.** Sections 1–58 above are unchanged. This addendum only adds.

### Decision recorded from the project owner

> **Everyone can view events, hackathons and communities. Joining or participating in any event or community depends on age rules.**

This replaces the idea of treating minors as either "fully in" or "excluded". Minors can see everything. What they can *do* depends on each event's or community's age rule, and on whether Knot is allowed to hold their account yet.

---

## 59. How Addendum B works

### 59.1 Precedence

1. Addendum B adds to v3. It does not delete anything.
2. Where Addendum B conflicts with earlier text on **anything about age or minors**, Addendum B wins. This covers §16, §21, §25, §41, §43.2, §44, §45, §47, §50.1, §50.2, §50.4, §58.3 and AD-6.
3. Where it conflicts on **product principles (§3)** or **what must not be claimed (§31)**, the original wins.
4. Everything in Addendum A and §58 still applies, including: minor accounts stay **disabled in production** until the approved consent and safeguarding flow passes its own review (§58.3).
5. This is planning only. It is not approval to start building (§58.5).

### 59.2 What this addendum changes compared with v3

| Topic | v3 | Addendum B |
|---|---|---|
| Who can view | Everyone | Everyone (unchanged, now stated as a firm rule) |
| Who can join | Adult accounts; minors "in scope" but vaguely | Joining is decided by each event's or community's **age rule**, for every user |
| Age rules on events | Not defined (only free-text eligibility) | A structured age rule on every event and community (§61) |
| Minor rules | Only in §50 | One central **Minor Mode** table that overrides the rest of the document (§63) |
| Sign-up while minor accounts are closed | Not defined | Age first, collect nothing, show a clear message (§64) |
| Behaviour learning for minors | "Off unless separately approved" | **Off and not built** (§63) |
| Legal reference | Removed | Restored with dates, plus a "confirm with a legal adviser" note (§63.4) |
| Missing pieces from §33 | Not done | State diagrams (§66), Source Record worksheet (§67) |
| Numbers from Addendum A | Some too weak | Corrected (§68) |

### 59.3 Two words used precisely

- **View** = actions that need no identity: browse, search, filter, map, open an event or community page, read all details, share a link, download a calendar file, report a problem.
- **Participate** = any action that registers a person, records them as taking part, or puts them in touch with others: register on Knot, start registration on another site, "I'm going", follow or join a community, team finder, check-in, feedback, badges, posting events.

**Rule:** view is open to everyone, of any age, without an account. Participate follows §60–§62.

---

## 60. Age-Based Participation Model

### 60.1 Age bands (what Knot stores about age)

Knot stores an **age band**, not a date of birth (v3 §46, §58.3).

| Band | Range | Notes |
|---|---|---|
| `under_13` | 0–12 | No own Knot account in this plan. See §65 for a guardian-managed option |
| `13_15` | 13–15 | Minor |
| `16_17` | 16–17 | Minor |
| `18_plus` | 18 and above | Adult |

Age bands are **self-declared**. Knot does not check ID. Say this plainly in the product and in reports (see §60.5).

The legal line is 18. India's data protection law defines a child as anyone under 18 (§63.4). The finer bands exist only so that age rules like "13+" or "16+" can be applied.

### 60.2 Age rule on every event and community

Every native event, native community, and imported listing carries an **audience age rule**.

```text
audience_age_rule
  mode:                    all_ages | min_age | age_range | adults_only | under_18_only | not_stated
  min_age:                 whole number or empty
  max_age:                 whole number or empty
  guardian_consent_required: yes | no | not_stated     // set by organizer
  guardian_present_required: yes | no | not_stated     // set by organizer
  rule_text:               the organizer's or source's own words, if any
  source:                  organizer_set | extracted_from_source | team_set | unknown
  confidence:              high | medium | low        // for extracted rules
```

**Mode meanings:**

| Mode | Meaning | Badge shown |
|---|---|---|
| `all_ages` | No age limit | All ages |
| `min_age` | Minimum age only (for example 13, 16, 18) | 13+ / 16+ / 18+ |
| `age_range` | Both limits (for example 13–17) | 13–17 |
| `adults_only` | 18 and above | 18+ |
| `under_18_only` | Youth event | Under 18 only |
| `not_stated` | Source or organizer did not say | Age rule not stated |

**Principle 7 applies:** `not_stated` is never treated as "all ages". It is shown as unknown.

### 60.3 Checking a person against a rule

Convert the person's band to an age range, compare it with the rule's range, and produce one of five results.

| Person's band | Range used |
|---|---|
| `under_13` | 0–12 |
| `13_15` | 13–15 |
| `16_17` | 16–17 |
| `18_plus` | 18 and above |

| Result | When it happens | What the person sees |
|---|---|---|
| `can_join` | The whole band is inside the rule | Normal Join / Register button |
| `cannot_join` | The whole band is outside the rule | Button replaced by a plain line: "This event is for 18 and over. You can still read everything about it." |
| `check_rule` | The band is partly inside the rule (for example rule is 14+ and the band is 13–15), or the rule is `not_stated` | Button with a note "Check the age rule first". On Knot-native events, a tick box: "I meet the age rule (14 and over)". The tick is recorded as self-declared |
| `needs_consent` | Rule allows the person, but a minor's account has no completed guardian consent (only when minor accounts are open) | "A parent or guardian must approve before you can join." |
| `not_open_yet` | Rule allows the person, but minor accounts are closed | "Joining through Knot isn't open for under-18s yet. If this event has a registration link on another site, you can use it if the age rule allows." |

**Order of checks:** (1) age rule result, (2) account and consent state, (3) organizer's extra conditions (for example guardian must be present).

### 60.4 Guests (no account)

A visitor without an account can still get age-aware help, without giving Knot anything.

- Offer an **optional** "Show me what I can join" prompt: pick an age band.
- Store the answer **only on the person's device**. Do not send it to the server. Do not link it to any record. Clearing the browser data resets it.
- Use it to: add the "Events I can join" filter (§61.4), hide or disable Join buttons that would be `cannot_join`, and show `check_rule` notes.
- If the visitor never picks a band, show every event with its age badge and, on an 18+ event, a one-tap confirm before the outside registration link opens: "This event is for 18 and over. Continue only if you are 18 or older."
- The outbound click is recorded as it is today (§14, §45): event, listing, source, anonymous ID. **The age answer is never part of that record.**

### 60.5 Honest limits (must be shown in the product and in reports)

1. Knot **cannot verify age**. A person can pick a wrong band.
2. For events registered on another site, **the other site decides** who can register (Principle 5, §14). Knot shows the age rule and helps people avoid events that are not for them. It does not enforce the source's rules.
3. On Knot-native events and communities, Knot enforces the age rule using the account's age band and consent state. The organizer may still check age at the door. The check-in screen shows a reminder: "Age proof may be requested."
4. Never write "age verified" anywhere. Use "self-declared".

### 60.6 Acceptance criteria

- A guest of any age can open every event and community page.
- The five results in §60.3 appear exactly as described for test cases at each band and rule.
- A guest's age answer never appears in server data or logs.
- No screen says "age verified".

---

## 61. Age rules in events, hackathons and communities

### 61.1 Native events (Quick Post and the full studio)

- Add a **required "Who can join?"** field to Quick Post (§40.1). It is one row of tap options: **All ages · 13+ · 16+ · 18+ · Under 18 only · Custom**. Nothing is pre-selected. This keeps the 60-second target (§40.7) because it is one tap.
- "Custom" opens min and max age fields.
- Optional below it: "Guardian must give consent" and "Guardian must attend" tick boxes. Shown only when the rule allows anyone under 18.
- The rule is part of the event's material-change set (§15). Changing it asks for the notify confirmation (§40.6).

### 61.2 Minors-welcome checklist (organizer gate)

If a **Knot-native** event allows anyone under 18, the organizer must tick every item before publishing:

1. A named responsible adult, with a contact route shown to participants and guardians.
2. A code of conduct is linked.
3. A plan for adult supervision is written in the event details.
4. Whether guardian consent or presence is required is stated.
5. A photo and video policy is stated.
6. For online events: no private one-to-one chat between adults and minors; only open or moderated channels.
7. An emergency contact process is stated.
8. The organizer agrees to use minors' data only for the event and to delete it by the retention date in §63.

This gate does not prove the event is safe (Principle 6). It makes the organizer state the basics.

### 61.3 Imported events (Instant Add and approved sources)

Reading rules (add to §37.4):

| Text found | Result |
|---|---|
| Clear ages ("16+", "13–18 years", "18 and above") | Convert to `min_age` or `age_range`. Confidence `high` if exact, `medium` if inferred from wording |
| Class or grade ("Class 8–12", "Grade 10") | Do **not** convert. Keep as `rule_text`, mode `not_stated`, send to review |
| "School students", "college students only", "freshers" | Do **not** convert. Keep as `rule_text`, mode `not_stated` |
| Nothing | `not_stated` |

Never guess an age from a theme, a prize or a venue (Principle 7).

### 61.4 Display and filters

- **Age badge** on every event card, event page, and community page, as text plus an icon (not colour only): All ages, 13+, 16+, 18+, 13–17, Under 18 only, Age rule not stated.
- **New filter** (add to §11): Age rule (all, 13+, 16+, 18+, under 18 only) and **"Events I can join"** (uses the device age band for guests, or the account band when signed in). Default for "Events I can join" is **off** when no band is set, so people never lose events they did not ask to hide.
- Search and map results show events regardless of age rule unless the person turns the filter on.

### 61.5 Hackathons and other competitions

- Age rules work the same way. Youth hackathons use `under_18_only` or `age_range`.
- If team members have different ages, Knot shows the organizer's rule text and does nothing more. Knot does not decide team eligibility.
- Adults cannot join an `under_18_only` event as participants. Mentor or volunteer roles are outside this build.

### 61.6 Communities

- Every community has an age rule using the same modes.
- A community page can be **viewed by anyone**. Its list of events shows each event's own age rule (a community's rule does not change an event's rule).
- **Join** in Tier 1 means "follow" (§44.1). Following follows the community's age rule and the Minor Mode rules in §63.
- Mixed-age communities show no member list and offer no direct messages (§44.10).
- **Group links** (WhatsApp, Telegram, Discord, §44.5): the organizer must state the group's age rule. If the group allows anyone under 18, the organizer confirms there is an adult moderator and that the group follows the code of conduct. If the community rule is 18+, the link is hidden from anyone with a declared age under 18, and gets a one-tap "This group is for 18 and over" confirm for people who have not declared an age. Knot does not run or moderate these groups and says so.

### 61.7 Acceptance criteria

- A native event cannot be published without an age rule.
- An imported event with class or grade wording is never given a numeric age rule automatically.
- An event allowing under-18s cannot be published as native until all eight checklist items are ticked.
- Age badges always match the stored rule.

---

## 62. Who can do what (action matrix)

Three kinds of user:

- **Guest:** no account. Any age. Includes under-18 visitors while minor accounts are closed.
- **Adult account:** 18 and over.
- **Minor account:** 13–17, **future**, only after the production gate in §64.4 is met. (Under 13: no own account, see §65.)

| Action | Guest | Adult account | Minor account (future) |
|---|---|---|---|
| Browse, search, filter, map, home feed | Yes | Yes | Yes |
| Open any event, hackathon or community page | Yes | Yes | Yes |
| Share link or message | Yes | Yes | Yes |
| Download calendar file | Yes | Yes | Yes |
| Report a problem | Yes (no personal data) | Yes | Yes |
| Start registration on another site | Yes if the rule allows or is not stated, with the notices in §60.4 | Yes, using the account band | Yes, using the account band, plus a guardian notice if the event asks for guardian consent |
| Register on a Knot-native event | No (needs an account) | Age rule | Age rule + guardian consent complete + organizer checklist ticked (§61.2) |
| Save events, "My plan" | No | Yes | Yes, explicit saves only |
| "I'm going" | No | Age rule | Age rule, identity hidden |
| Follow or join a community | No | Age rule | Age rule, identity hidden, no member list |
| Team Finder (Tier 2) | No | Age rule; boards split into under-18 and 18+, no cross-group contact | Not available until a separate safety design is approved |
| Personalised fit and recommendations | Area and age band on the device only | Yes (§43) | Explicit choices only. No learning from behaviour |
| Notifications | None | Per §47 | Only for events they saved, registered for, or followed. In-app by default. No digests, no "new matching event" pushes |
| Post an event or Instant Add | No | Yes | **No.** Adults only |
| QR check-in | Not applicable | Yes, if registered | Yes, if registered; counted only at event level |
| Feedback and day-after prompt | No | Yes | Yes, optional. No streak or nudge messages |
| Badges and history | No | Yes | Off by default. No streaks. Nothing public |
| Delete data or withdraw consent | Clear device data | In settings | Guardian-assisted flow (§64) |

### 62.1 Acceptance criteria

- Every row is covered by at least one test in §69.
- No action available to a Minor account is available through a route that skips the age rule, consent check or Minor Mode rules (check the API as well as the screens).

---

## 63. Minor Mode — one table that overrides the rest of the document

Everything below applies to any **Minor account** (when minor accounts are open) and, where stated, to any **guest who declared an age under 18** on their device. Where this table conflicts with an earlier section, this table wins (§59.1).

### 63.1 Overrides

| Earlier section | Normal rule | Minor Mode rule |
|---|---|---|
| §16 Team Finder | Skill-based team matching with consent | **Off** for minors until a separate safety design is approved |
| §21, §25 Organizer data access | Organizer sees registrations and can export CSV | For a minor's registration, the organizer sees first name or alias, age band, a guardian contact route if the event requires one, and answers to custom questions that the organizer has justified. **No email or phone of the minor.** CSV export of minors' rows needs a prompt where the organizer confirms they will protect the data and delete it by the retention date |
| §24 Recaps, photos, showcases (Tier 3) | Organizer can publish photos and project showcases | Photos showing identifiable minors only when the organizer confirms photo consent. Minors' full names are **not public** by default. Knot shows a reminder; it cannot verify consent |
| §41.1 Reach estimate | Counts matching accounts | **Counts adult accounts only.** The estimate text says "adult accounts" until minor accounts are approved |
| §41.3 Audience push | Pushes new matching events within caps | **No fit-based pushes** to minors. Alerts only for events they saved, registered for, or followed |
| §43.2 Learning from behaviour | Saves and clicks adjust interests | **Not built for minors.** No code path. Only interests the minor selected |
| §44.3 "I'm going" | Counts, optional names | Counts only. No name or college shown, ever |
| §44.4 Badges and streaks | Badges and monthly streak | Off by default. **No streaks.** No public badges |
| §44.9 Day-after prompt | "Did you go? Next up for you" with personalised events | One optional prompt. "Next up" shows only the organizer's next events they follow. No repeat nudges |
| §45 Analytics | Per-user event logging | **No per-user behaviour logs for minors.** Use event-level anonymous counters only (views, clicks, registrations, check-ins). No return-rate or cohort metrics for minors |
| §47 Notifications | Digests, matching events, followed organizers | Only saved, registered or followed items. In-app by default. Email only to a guardian-approved address. No digests |
| §50.4 Retention | Registration data follows the organizer's setting (12 months) | Recommended default for minors: delete at the earlier of consent withdrawal or **6 months after the event**, unless a law requires longer. Confirm with a legal adviser |
| §36.3 Location | Chosen locality and radius | Locality only. Never raw GPS. Radius default 10 km |
| §44.5 Group links | External group links shown | Only links whose organizer-declared age rule allows minors, with the safety notice in §61.6 |

### 63.2 Always true for minors

- No public identity: no public name, college, badges or "going" names.
- No private messages with anyone, in this build.
- No profile that learns from behaviour. Only explicit choices.
- No promotions, sponsored placements or targeted ads (Principle 9 already bans paid ranking).
- Reports about minors' safety are reviewed within **4 hours** (§49.3).

### 63.3 Behaviour tracking: off, and not built

v3 left the option open to approve behaviour-based learning for minors later. This addendum closes it: **do not build it**. Legal commentary on India's children's-data rules says tracking and behavioural monitoring of children is a flat ban that parental consent does not fix, with narrow exemptions for certain organisations and purposes. Assume Knot does not qualify for an exemption unless a legal adviser says otherwise in writing.

### 63.4 Legal reference (restored)

This is a plain note for the team, not legal advice. Confirm every point with a qualified legal adviser before real users are added.

- India's **Digital Personal Data Protection Act, 2023** and the **DPDP Rules, 2025** (notified 14 November 2025). A "child" means anyone under 18.
- Commentary describes a phased start. The **children's-data obligations** (verifiable parental or guardian consent before processing a child's data, and the bar on tracking, behavioural monitoring and targeted ads aimed at children) are scheduled to apply fully from **14 May 2027**.
- Commentary reports penalties of up to ₹200 crore for breaching the children's-data duties.
- Recheck dates and exemptions before launch. Dates and rules can change.

---

## 64. Sign-up and account flow by age

### 64.1 Principles

1. **Ask age first. Collect nothing else before the answer.** No email, no name, no phone on the first screen.
2. **Do not store anything server-side about a person who says they are under 18 while minor accounts are closed.** Not an email, not an age band, not an IP-based record created for this purpose.
3. **Never block viewing.** A person who cannot sign up can still use every View action in §62.

### 64.2 Flow while minor accounts are closed (Demo Build)

```text
Tap "Sign up"
  ↓
Screen 1: "Which age range are you in?"  (under 13 / 13–15 / 16–17 / 18 and over)
  ↓
18 and over  →  continue: email, area, interests (§43.1). Record ConsentRecord: self-declared adult.
Under 18     →  message: "Accounts for under-18s aren't open yet.
                 You can still browse every event and community, and open registration
                 links on other sites where the age rule allows."
                 Nothing is stored on the server. Optionally remember the age band on this device only (§60.4).
```

Do **not** offer "Notify me when it opens" to under-18s, because that needs their email.

### 64.3 Flow when minor accounts are open (future, after §64.4 is met)

```text
Screen 1: age range
13–15 or 16–17  →  collect only what the approved consent flow requires:
                   guardian contact + consent record. Account state = pending_guardian_consent.
                   Until consent is complete: no saves, no registrations, no notifications.
Guardian completes consent  →  account state = active (Minor Mode rules in §63 apply).
Guardian declines or withdraws  →  account closes; data deleted by the flow in §64.5.
Under 13  →  no own account (§65).
```

### 64.4 Production gate (all must be true before minor accounts are switched on)

1. A legal adviser has signed off the consent method, notices, retention and exemptions position (§63.4). The sign-off is recorded.
2. The guardian consent flow is built and tested, including withdrawal.
3. Minor Mode rules in §63 are implemented and their tests pass (§69).
4. The organizer minors-welcome checklist (§61.2) is live.
5. Report handling for minors' safety has a named reviewer on call within 4 hours (§49.3).
6. Deletion and withdrawal work for guardians and for minors (§64.5).
7. The project owner turns on `minor_accounts_enabled` and writes the date in the change log.

### 64.5 Deletion and withdrawal for minors

- A guardian can withdraw consent and delete the account at any time. The minor can request it, and the guardian confirms.
- Deletion removes personal records within 30 days (§46). Event-level anonymous counts stay.
- Organizers who received a minor's registration are told to delete their copy by the retention date.

### 64.6 Age re-check

- Store `age_band_confirmed_on`. Ask the person to re-confirm their band **every 12 months**.
- When a minor's band is `16_17` and a re-check is due, ask whether they are now 18. If yes, move the account to adult through a flow that ends the guardian arrangement.

### 64.7 Scope cap for the Demo Build

Build **only** this for age and minors in the Demo Build:

- `audience_age_rule` on events and communities (§60.2).
- `age_band` and `age_band_confirmed_on` on adult accounts.
- Device-only age band for guests (§60.4).
- The sign-up age screen and the "under-18s aren't open yet" message (§64.2).
- The rule check from §60.3 with all five results.
- Age badges and the age filters (§61.4).
- The switch `minor_accounts_enabled = false` that blocks every route that could create a minor account, including the API.

**Do not build** in the Demo Build: the guardian consent flow, guardian-managed participation, Minor Mode screens, minor Team Finder, minors' deletion flow. Keep §63 as the written rules. This cap prevents the minors work from taking the build time of the discovery, Instant Add and organizer features.

---

## 65. Guardian-managed participation (candidate design for legal review; Later)

This is an option to put in front of a legal adviser. It is **not** part of the Demo Build.

**Idea:** a parent or guardian with an adult account adds a child as a **dependent profile**: first name or nickname, and age band only. The guardian registers the dependent for events, follows communities on the dependent's behalf, and receives every notification. The child has no login.

**Why consider it:**

- It could serve under-13s and 13–17s without a minor logging in.
- The adult is the person acting, so consent is tied to the relationship from the start.
- Organizers get a guardian contact route by design.

**Open questions for the legal adviser:**

- Does it still count as processing a child's data? (Likely yes; the question is what verification of the guardian relationship is needed.)
- How should the guardian relationship be verified?
- What can an organizer keep, and for how long?

**Rules if it is built later:** Minor Mode (§63) applies fully to dependent profiles. The child never receives messages. QR check-in uses the guardian's code. A guardian can delete the dependent at any time.

---

## 66. State diagrams (completes item 3 of §33)

Use these as the allowed states and moves. Any move not shown is not allowed. Every move writes to the audit history (§25).

### 66.1 Event lifecycle

```text
draft → pending_review → published → changed → published
                                   → stale → refreshed → published
                                   → cancelled
                                   → ended → archived
pending_review → rejected
draft → published            (organizer, all required fields met, §40)
```

### 66.2 Outside registration (external handoff, §14)

```text
not_clicked → opened_externally → self_confirmed_registered
                               → self_marked_attended
(any state) → added_to_calendar   (separate flag, does not change the state)
```

An outbound click never becomes "registered" without the person's own confirmation, and then it is labelled self-reported.

### 66.3 Knot-native registration with age and consent

```text
(start) → rule_check
rule_check → cannot_join                     (stop)
rule_check → not_open_yet                    (stop; minors, accounts closed)
rule_check → needs_consent → consent_complete → registered | pending
rule_check → check_rule → self_declared_ok → registered | pending
rule_check → can_join → registered | pending
pending → approved → registered | waitlisted | rejected
registered → cancelled | checked_in → attended
```

### 66.4 Instant Add submission (§37)

```text
received → read → draft_ready → person_reviewing → submitted
submitted → published            (rules in §37.5 all met)
submitted → pending_review → published | rejected | merged
published → claimed_by_organizer
```

### 66.5 Account, age and consent

```text
visitor → age_screen
age_screen → adult_active                         (18 and over)
age_screen → blocked_message                      (under 18, minor accounts closed; nothing stored)
age_screen → pending_guardian_consent             (13–17, minor accounts open)
pending_guardian_consent → minor_active | closed
minor_active → closed | adult_active              (after age re-check and guardian arrangement ends)
any active state → deletion_requested → deleted   (within 30 days)
```

### 66.6 Community membership

```text
not_following → rule_check → following | blocked_by_age_rule | not_open_yet
following → not_following
```

### 66.7 Notification (§47)

```text
queued → deduped → capped_or_quiet_hours → delivered → opened
queued → dropped_duplicate | dropped_opted_out | dropped_minor_rule
capped_or_quiet_hours → waiting_for_next_digest
```

---

## 67. Source Record worksheet (completes item 4 of §33)

This worksheet lists the sources named in the blueprint. **No source below is approved.** The terms of each site have **not** been checked as part of this document. A person must read the terms and robots rules, fill the record (§38.1), and save a dated copy as evidence.

| Source | Planned role | access_method (to decide) | terms_checked_on | allowed_use | status | Fallback |
|---|---|---|---|---|---|---|
| Knot-native | Own events | manual_entry | Not applicable | full_metadata | approved (own data) | — |
| Instant Add | User-given content | manual_entry | Not applicable | See §37 | approved (own flow) | — |
| Luma | Meetups, community events | — | NOT DONE | — | proposed | link_only |
| Meetup | Meetups | — | NOT DONE | — | proposed | link_only |
| Unstop | Competitions, hackathons | — | NOT DONE | — | proposed | link_only |
| Devfolio | Hackathons | — | NOT DONE | — | proposed | link_only |
| Devpost | Hackathons (often online) | — | NOT DONE | — | proposed | link_only |
| Curated Bengaluru college and community pages (15–30) | Local events | manual_entry or feed | NOT DONE | — | proposed | manual |

### 67.1 What the person filling each record must find out

1. Is there an official API, feed (ICS or RSS), or structured event data offered for public use?
2. Do the terms allow automated access or collecting listing data? Is permission needed?
3. What does `robots.txt` allow?
4. May event descriptions or images be reused, or only facts and a link?
5. What are the request limits? Is attribution required?
6. Is there a partnership or contact route for permission?
7. Does the source show an age rule? In what form (field, text, none)? This feeds §61.3.

### 67.2 Evidence to keep

A dated copy (PDF or screenshot) of the terms page and `robots.txt` for each source, stored with the record. Review again every 90 days (§38.1).

### 67.3 Rule until a record is approved

Use **link-only** or **manual** entry for that source. Run no automated collection against it.

---

## 68. Corrections and tighter numbers (override the older numbers)

### 68.1 Reach estimate during the pilot

**Problem:** Addendum A hides the estimate for groups under 10. A pilot of about 30 users spread across areas and interests will almost never reach 10 matches, so the feature would show "Not enough data yet" in the demo.

**Fix:**

- While active adult accounts are **under 100**: show the range when at least **5** adult accounts match. Label it: "Based on a small group on Knot so far."
- Breakdowns by locality or interest still need **10 or more** in a group.
- At **100 or more** active adult accounts, return to the threshold of 10.
- Below 5, show "Not enough data yet" and show real follower and save counts instead.
- Still true: never show or export individuals; show a range, not an exact count (§41.1).
- Recommended: grow the pilot beyond 30 users where possible. Do not invent users.
- Test T-31 and T-67 use these numbers.

### 68.2 Instant Add accuracy check

The 20-item test in §37.8 is a **smoke test**, not proof of accuracy. Add:

- For the **first 100 events auto-published** through Instant Add, a reviewer checks each one within **24 hours** after it goes live.
- If more than **1 in 10** needed a correction, switch auto-publish **off** and send everything to review again.
- Record the counts in the change log.

### 68.3 Seed floor

Seed and pilot numbers stay targets, not demo blockers (§58.4). Add a **floor that controls what may be claimed**:

- If real upcoming events are **under 30**, or cover **fewer than 6 localities**, show a visible note on the home screen and in the demo: "Early coverage: N events." Do not describe the demo as showing discovery at scale.
- State the actual numbers in the pilot report (§45.5).
- T-42 records the numbers and whether the floor was met. A missed floor does not block the demo.

### 68.4 Online events: joining links

For events registered on another site, the joining details live on that site. Knot cannot hide or reveal them and must not claim to. Hiding a joining link until a person is approved applies **only** to Knot-native events (§58.2).

### 68.5 Analytics retention with minors

The 13-month retention in §50.4 applies to adult accounts. For minors, only event-level anonymous counters exist (§63.1), so there is no per-user analytics to retain.

### 68.6 Status of the "correct next step" in §33

| Item in §33 | Status |
|---|---|
| 1. Prioritized user stories | Not written. Tier 1 features (D1–D15) are the list to turn into stories |
| 2. Measurable acceptance criteria | Done at section level (Addendum A) and test level (§53, §69). Per-story criteria still to write |
| 3. Canonical data entities and state diagrams | Entities in §46. State diagrams in §66 |
| 4. Source and organizer permission requirements | Template in §38.1. Worksheet in §67. **Records not filled** |
| 5. Focused demonstration script | Script B (§52) plus additions in §69.3 |
| Then: agent architecture | Not started. Still waits for the explicit user decision to enter the build phase (§58.5) |

**Biggest open item:** the Source Records. They decide which sources can be used and may change the plan.

---

## 69. Milestone additions, new tests and demo additions

### 69.1 Milestone additions (add to §51)

| Milestone | Added work for age and minors | Added exit check |
|---|---|---|
| M0 | Add `audience_age_rule`, `age_band`, `age_band_confirmed_on`, `minor_accounts_enabled` switch to the data model | Fields exist; switch is `false` |
| M1 | "Who can join?" field in Quick Post. Age badge on event page. Minors-welcome checklist as a gate (built but only active when under-18 is allowed) | T-46, T-50 |
| M2 | Age filters and "Events I can join". Device-only age band for guests | T-47 to T-49, T-52, T-53 |
| M3 | Age reading rules in Instant Add (§61.3) | T-51 |
| M4 | Sign-up age screen and the "under-18s aren't open yet" message. Age re-confirmation prompt | T-54 to T-56, T-70 to T-72 |
| M5 | Age rule enforcement at register, "I'm going" and follow. Community age rules and group-link rules | T-57 to T-59 |
| M6 | Demo additions (§69.3). Run all "Demo Build" tests | All Demo Build tests below pass |

### 69.2 New tests

"When" says which tests are required for the Demo Build and which are required only before minor accounts are switched on.

| ID | Test | Pass condition | When |
|---|---|---|---|
| T-46 | Guests view everything | A guest of any age can open every event, hackathon and community page | Demo Build |
| T-47 | 18+ event, guest declared under 18 | Page readable; no register button; message matches §60.3 | Demo Build |
| T-48 | Event with no age rule (outside site) | Shows "Age rule not stated" and the notice; never "All ages" | Demo Build |
| T-49 | Partly inside the rule | Rule 14+, band 13–15 gives `check_rule`; native event requires the tick box | Demo Build |
| T-50 | Quick Post age rule | Cannot publish without it; 60-second target still met with poster (90 without) | Demo Build |
| T-51 | Instant Add age wording | "ages 14–19" gives min 14 and max 19. "Class 8–12" and "school students" stay as text with `not_stated` and go to review | Demo Build |
| T-52 | "Events I can join" | Uses the device band for guests and the account band when signed in; off by default with no band | Demo Build |
| T-53 | Device-only age | Server data and logs contain no guest age band | Demo Build |
| T-54 | Sign-up age first | First screen asks only for age range; no email or name requested before it | Demo Build |
| T-55 | Under-18 sign-up while closed | Message shown; no account, email or age record stored on the server | Demo Build |
| T-56 | Adult sign-up | ConsentRecord stores "self-declared adult" | Demo Build |
| T-57 | Community age rule | 18+ community: adult account can follow; declared under-18 guest cannot | Demo Build |
| T-58 | Group link and age | 18+ community's group link hidden from a declared minor; confirm shown to undeclared guests | Demo Build |
| T-59 | Native all-ages event, minor | Shows "not open yet" while the switch is off | Demo Build |
| T-60 | Minors-welcome checklist | An event allowing under-18 cannot be published until all 8 items are ticked | Demo Build (built, inactive) and again before switch-on |
| T-61 | Analytics for minors | Minor sessions create no per-user behaviour logs; event-level counters only | Before switch-on |
| T-62 | No behaviour learning for minors | Code review confirms no path updates interests from a minor's behaviour | Before switch-on |
| T-63 | Notifications for minors | No digest and no "new matching event" push to minors | Before switch-on |
| T-64 | Organizer view of minors | Only the allowed fields in §63.1; export needs the confirmation prompt | Before switch-on |
| T-65 | Team Finder for minors | Not reachable by screen or API | Before switch-on |
| T-66 | Age badge accessibility | Text and icon present; passes contrast; read correctly by a screen reader | Demo Build |
| T-67 | Reach estimate thresholds | Under 100 adult accounts: range at 5+, breakdown at 10+, "adult accounts" label. 100+: threshold 10 | Demo Build |
| T-68 | Instant Add review of first 100 | Each of the first 100 auto-published events gets a reviewer check within 24 hours; the 1-in-10 rule switches auto-publish off | Demo Build |
| T-69 | Seed floor note | Note "Early coverage: N events" appears when below 30 events or 6 localities | Demo Build |
| T-70 | Switch blocks minors | With `minor_accounts_enabled = false`, no screen or API route can create a minor account | Demo Build |
| T-71 | Age re-confirmation | Prompt appears when 12 months have passed since confirmation | Demo Build |
| T-72 | Under 13 | No own account in any mode; message and browsing still work | Demo Build |
| T-73 | Outbound click record | The click record holds event, listing, source and anonymous ID; no age | Demo Build |
| T-74 | "Age verified" wording | No screen or report uses it; "self-declared" is used | Demo Build |

### 69.3 Demo Script B additions (add after step 3 of §52)

| Step | What happens on screen | What it proves |
|---|---|---|
| 3a | A visitor taps "Show me what I can join" and picks 16–17. The feed now offers "Events I can join" | Age-aware discovery without an account |
| 3b | The visitor opens an **18+ hackathon**. Every detail is readable. The register button is replaced by "This event is for 18 and over. You can still read everything about it." | Everyone can view; joining follows the age rule |
| 3c | The same visitor opens a **13+ workshop** that registers on another site. A short notice appears, then the outside registration page opens | Handoff with age notice |
| 3d | The visitor taps "Sign up" and picks 16–17. The message says accounts for under-18s are not open yet. Nothing is asked for or stored | Safe sign-up path while minor accounts are closed |

---

## 70. Decisions, risks and summary

### 70.1 Decisions added (extend §55; defaults apply if there is no answer)

| # | Decision | Recommended default |
|---|---|---|
| AD-16 | Age model | Four self-declared bands: under 13, 13–15, 16–17, 18 and over. No date of birth |
| AD-17 | Guest age check | Stored on the device only, never sent to the server |
| AD-18 | Under-13 | No own account. Guardian-managed participation is the candidate design for legal review (§65) |
| AD-19 | Sign-up for under-18s while closed | Ask age first, collect nothing, show the message in §64.2 |
| AD-20 | Team Finder for minors | Off until a separate safety design is approved |
| AD-21 | Organizer minors-welcome checklist | Required for native events that allow under-18 (§61.2) |
| AD-22 | Reach estimate threshold during the pilot | 5 with a "small group" label; 10 for breakdowns; back to 10 at 100 or more adult accounts |
| AD-23 | Instant Add auto-publish | Review each of the first 100 within 24 hours; switch off if more than 1 in 10 needed a correction |
| AD-24 | Seed floor | 30 events and 6 localities control the wording of claims, not the demo itself |
| AD-25 | Age rule on native events and communities | Required. Imported events with no clear age wording use `not_stated` |
| AD-26 | Minors posting events | Not allowed. Adults only |
| AD-27 | Minors' registration data retention | Earlier of consent withdrawal or 6 months after the event, subject to legal advice |
| AD-28 | Source Records | Fill before M1. Until then, link-only or manual |

### 70.2 Risks added (extend §54)

| Risk | Why it matters | What to do | Trigger to act |
|---|---|---|---|
| A person declares the wrong age | Self-declared age cannot be verified | Say so plainly. Enforce on native events with consent. Remind organizers about age checks at the door (§60.5) | An organizer reports a mismatch |
| An outside site ignores the age rule Knot shows | Knot cannot enforce another site's rules | Show the rule and notice. Do not claim enforcement | A user is admitted to a restricted event |
| Mixed-age groups on external apps | Adults and minors in unmoderated chats | Organizer age rule and moderator statement for group links (§61.6) | A report about a group link |
| Minor features creep into the Demo Build | Takes time from discovery and Instant Add | Scope cap in §64.7 | Any consent-flow work before M6 |
| Legal position changes | Dates and exemptions can move | Recheck before launch (§63.4) | Change in the rules or dates |
| Source terms forbid collection | Plan relies on fewer sources | Worksheet and fallbacks (§67) | A source marked rejected |

### 70.3 Summary — your rule, in product terms

| Your rule | What the product does |
|---|---|
| Everyone can view events, hackathons and communities | No account and no age needed for any View action (§59.3, §62) |
| Joining or participating depends on age rules | Every event and community has an age rule; five clear results decide what a person can do (§60, §61) |
| Applies to events and to communities | Same age-rule model for both (§61.6) |
| Safe for minors | Minor Mode overrides, organizer checklist, no behaviour tracking, no public identity, accounts closed until the legal and safety gate is met (§63, §64) |
| Honest about limits | Self-declared age; other sites enforce their own rules; no "age verified" anywhere (§60.5) |

**End of Addendum B.** Sections 1–58 are unchanged above.
