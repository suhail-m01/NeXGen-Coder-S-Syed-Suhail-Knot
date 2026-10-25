# Knot deployment guide

Use this checklist for the static React application and its existing Supabase backend. The repository includes explicit Vercel and Netlify configurations; another static host needs the equivalent SPA fallback.

## 1. Release prerequisites

- Node.js `^20.19.0 || >=22.12.0`.
- The GitHub `main` branch contains the complete source, migration chain and README image.
- The Supabase database is already migrated. **Do not rerun the PostGIS move migration manually.**
- Production launch remains adults-only.
- Live provider credentials and approved ingestion sources are configured only when those optional workflows are ready to be tested.

## 2. Build settings

| Setting | Value |
|---|---|
| Install | `npm ci` |
| Build | `npm run build` |
| Publish directory | `dist` |
| Node | `^20.19.0 || >=22.12.0` |

`npm ci` runs the postinstall script that prepares eight local OCR assets. Do not disable lifecycle scripts unless you prepare those assets another way.

Vite environment variables are embedded **at build time**. Set them in the hosting dashboard before starting the deployment.

## 3. Required hosting environment

```dotenv
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use only the publishable/anon browser key. Never configure a service-role key, database password, Resend/Razorpay/WhatsApp/LiveKit secret or webhook secret as a `VITE_*` variable.

If `VITE_DATA_PROVIDER` is omitted, the application intentionally uses its local reference workspace. Set it explicitly to `supabase` for the cloud deployment.

### Basemap

The default uses public OpenStreetMap tiles for development/low volume. For a production tile provider, configure its URL and exact attribution:

```dotenv
VITE_TILE_URL=https://YOUR_TILE_PROVIDER/{z}/{x}/{y}.png
VITE_TILE_ATTRIBUTION=YOUR_REQUIRED_ATTRIBUTION
```

Keep the OpenStreetMap attribution whenever the selected provider requires it.

## 4. SPA routing

Knot uses `BrowserRouter`. Every valid application path must serve `index.html` instead of returning a host 404.

- **Vercel:** `vercel.json` supplies the rewrite, build output and baseline security headers.
- **Netlify:** `netlify.toml` supplies the redirect, build output and baseline security headers.
- **Another host:** configure a fallback/rewrite from unknown application paths to `/index.html`, while continuing to serve existing static assets normally.

Test a direct event URL after deployment, not only the home page.

## 5. Supabase Auth

In the existing Supabase project:

1. Set **Auth → URL Configuration → Site URL** to the final HTTPS application origin.
2. Add the deployed `/auth` URL to allowed redirect URLs, for example `https://your-app.example/auth`.
3. Add preview origins separately only if they should be allowed to receive authentication redirects.
4. Keep email confirmation/auto-confirm settings aligned with the intended production sign-up flow. Do not enable auto-confirm merely to make testing easier.
5. Confirm that hosted sign-up remains adult-only.

## 6. Edge Function configuration

The core catalog and participation application does not require provider secrets merely to render. Optional provider operations fail closed when not configured.

For organizer address geocoding, set server-only Edge Function values:

```dotenv
APP_ORIGINS=https://your-app.example
NOMINATIM_BASE_URL=https://your-authorized-nominatim.example/
NOMINATIM_USER_AGENT=KnotEventDiscovery/1.0 (https://your-app.example)
NOMINATIM_CONTACT_EMAIL=ops@your-app.example
```

Use an authorized Nominatim-compatible deployment. Public Nominatim returned HTTP 403 from the hosted Edge environment during verification; without an authorized endpoint, Knot retains the honest locality-area fallback instead of inventing a precise venue location.

Configure Resend, Razorpay, WhatsApp and LiveKit secrets only through Supabase secret storage. A queued outbox job is not proof of delivery, payment or room creation.

## 7. Post-deployment smoke check

Perform read-only checks first:

1. Open `/` and confirm the shell says **Supabase provider · ready**, not local workspace.
2. Open `/search` and confirm cloud event cards appear.
3. Open the map and verify event markers, loaded tiles and provider attribution.
4. Copy an event URL, open it in a new tab and confirm the direct route renders without a host 404.
5. Check a 390px mobile viewport for horizontal page overflow.
6. Open the browser console and confirm there are no application errors.
7. Complete one controlled adult Auth email flow, then verify save/register/cancel only if you are prepared to clean up the test participation records.
8. Confirm external-platform handoffs are not described as registrations.

Do not run the disposable authenticated cloud harness against routine production data. The read-only discovery harness is separate.

## 8. Verification baseline for this release

- Exact remote export: 137 files matched the verified workspace before this deployment-hardening patch.
- Clean `npm ci`: passed; 0 dependency-audit findings.
- Domain/cloud-mapping tests: 68/68.
- Browser suites after correcting the Leaflet selector: 166/166.
- Read-only remote discovery after the PostGIS move: 11/11.
- Cloud production-build smoke: 6 home cards, direct event route, 4 markers, 30 loaded tiles, no mobile overflow and 0 browser errors.
- Earlier authenticated core harness: 14/14; it was not rerun after these newest read-only/build/test changes.

## 9. Remaining non-code activation work

A successful static deployment does not complete these external tasks:

- Final Auth URLs and email-provider/domain configuration.
- Authorized production geocoder and production tile-service arrangements.
- Live provider credentials and end-to-end provider verification.
- Approved live feed/source permissions.
- Monitoring, backup/restore drills and operational ownership.
- Full durable cloud migration of secondary organizer/reviewer/account workflows.

Keep sample events labelled and do not represent them as live coverage or traction.
