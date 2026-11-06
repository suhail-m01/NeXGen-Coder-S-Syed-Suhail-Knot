# Hackathon discovery: setup and deployment verification

**Scope:** the additive TypeScript Hackathon catalog/API and its flagged UI. This guide does not claim that a hosted database, provider, source, cron job, or deployed agent run is active. Static checks and local tests are not production-activation evidence.

## 1. Install and verify the source

Use Node.js `20.19+` or `22.12+`.

```bash
npm ci
npm test
npm run build
npm run check:hackathon-deployment
```

The postinstall script prepares local OCR assets. `dist/`, `node_modules/`, local environment files, OCR output, and test artifacts are generated files and are not required in a source archive.

For local UI development:

```bash
cp .env.example .env.local
npm run dev
```

Keep `VITE_DATA_PROVIDER=local` unless a Supabase environment is intentionally configured. Hackathon UI is available only when the public flag is configured; set either `NEXT_PUBLIC_ENABLE_HACKATHONS=false` or the legacy `VITE_ENABLE_HACKATHONS=false` for immediate shutoff and rebuild/redeploy. Public flags are not authentication controls.

## 2. Apply the reviewed additive migrations

Take a backup and use the normal Supabase migration pipeline. Do not destructively reseed an existing Knot project.

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The Hackathon chain is:

1. `supabase/migrations/20261105120000_knot_hackathon_discovery.sql`
2. `supabase/migrations/20261105180000_add_hackathon_verification_tracking.sql`

It adds only `hackathons`, `hackathon_interests`, `agent_runs`, their indexes/grants/RLS, and additive verification tracking. It does not reshape or replace the existing Event catalog. The base migration depends on the existing Knot auth helper functions, so apply the complete reviewed migration chain in order on a new environment rather than copying only these two files.

Verify with a server-only database connection:

```bash
npm run agent:doctor
```

The doctor exits nonzero until the database/schema, cron secret, and at least one complete runtime source configuration are ready. A ready result still does not prove a deployed run.

## 3. Configure Vercel/server environment values

Use the annotated `.env.example` as the complete variable list. At minimum, persistent API/run usage needs:

- `DATABASE_URL`: server-only Supabase pooled Postgres connection string.
- `CRON_SECRET`: a random server-only secret of at least 16 characters.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` **or** `SUPABASE_PUBLISHABLE_KEY`: server-side JWT verification for signed-in interests.
- `KNOT_PUBLIC_URL`: canonical public origin used for honest bot identification.

Never put database passwords, service-role keys, provider keys, or cron secrets in `VITE_*` or `NEXT_PUBLIC_*` variables. Configure secrets in the deployment provider/Supabase secret store, not in Git or chat.

## 4. Opt in only to reviewed sources

Committed records in `agents/hackathon/sources.approved.ts` are reviewed candidates, not automatic activation. A runnable source requires all of the following:

1. Its ID in `HACKATHON_ENABLED_SOURCES`.
2. HTTPS `permissionEvidence` and at least one `approvedMethods` entry.
3. A reviewed `discoveryUrls` entry.
4. Required provider credentials and, for Tavily/Brave/SerpAPI, a matching `SEARCH_API_PROVIDER`.

Use `HACKATHON_SOURCE_CONFIG` only for reviewed JSON overrides. Do not enable a source whose current terms, API agreement, robots rules, or written permission have not been reviewed. Never bypass logins, CAPTCHA, paywalls, robots exclusions, or rate limits.

A run with no runnable selected source finishes as `failed`; it does not report a successful zero-item discovery. Bounded dry runs are for connector diagnosis and do not establish persistence or deployed activation:

```bash
npm run agent:hackathons -- --dry-run
```

## 5. Deploy and verify explicitly

Deploy the repository to Vercel with the included build settings, then redeploy after environment changes. `vercel.json` declares a daily `/api/hackathons/run` cron (`0 0 * * *`) for Hobby compatibility. This is only a schedule declaration: confirm the cron in the deployment dashboard and inspect function logs before claiming operation. Any different frequency must match the Vercel plan and runtime limits.

After deployment, check without exposing secrets in logs or chat:

```bash
curl -fsS https://your-app.example/api/hackathons/status
curl -fsS "https://your-app.example/api/hackathons?limit=1"
curl -X POST https://your-app.example/api/hackathons/run \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected trust behavior:

- Missing database/schema returns an explicit unavailable response, not fallback records or fake timestamps.
- Missing/incorrect cron authorization is rejected.
- A failed run returns an error result and is not presented as completed ingestion.
- Curated sample IDs never create server-side interest records.
- An outbound click is not registration or attendance.

Finally inspect `agent_runs` and source/run statistics using server-only access. Claim scheduled or live ingestion only after a real deployed invocation, persisted run record, and reviewed source responses agree. Provider activation for Resend, Razorpay, Meta WhatsApp Cloud API, and LiveKit Cloud is separate and is not established by this Hackathon setup.
