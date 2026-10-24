# Delivery guide

**Date:** 24 October 2026  
**Target repository:** `https://github.com/suhail-m01/knot.git`  
**Application directory:** `/home/user/knot-product`

## Deliverables

| Artifact | Path | Validation |
|---|---|---|
| Application source | Repository root | TypeScript build and all documented tests |
| Product PDF | `deliverables/Knot_Product.pdf` | Exactly **5 pages**, 16:9 (960×540 pt) |
| Product demo | `deliverables/Knot_Demo.mp4` | Exactly **120.000 seconds**, H.264, 1280×720, 30 fps; decode check passed |
| Demo accessibility script | `docs/DEMO_SCRIPT.md` | Timestamped captions and reproduction commands |
| Verification report | `docs/VERIFICATION.md` | 46 domain + 135 Chromium checks, limits and commands |
| Product boundary | `docs/PRODUCT_STATUS.md` | Working local features separated from production/scale gaps |
| Artifact manifest | `deliverables/MANIFEST.json` | SHA-256 hashes and artifact properties |

## Reproduce from a source archive

```bash
npm install
npm test
npm run build
npm run dev
```

`npm install` runs `scripts/prepare-ocr.mjs`, restoring the ignored local OCR worker/WebAssembly/language assets. No generated dependency or cache directory is required in the archive.

In another terminal:

```bash
npx playwright install chromium
npx playwright install-deps chromium  # minimal Linux only
npm run test:e2e:all
```

Recreate optional artifacts:

```bash
npm run slides:render   # requires Playwright Chromium
npm run demo:record     # records raw WebM; see docs/DEMO_SCRIPT.md for MP4 export
```

## GitHub delivery

The remote is configured as `origin`. A final Git commit and validated `knot-product-github.zip` archive are produced locally from the same verified HEAD.

**Current external blocker:** GitHub delivery has not been completed. Earlier HTTPS pushing had no available credentials and SSH returned `Permission denied (publickey)`. No credential is requested in chat, and no force-push or unrelated-history overwrite is attempted. When repository access is available, use the normal reviewed flow:

```bash
git fetch origin
git status
# Preserve the remote README/history; do not force-push.
git push origin <current-branch>:<intended-branch>
```

If the remote still contains an unrelated README-only history, reconcile it through a reviewed unrelated-histories merge before pushing. Do not overwrite remote commit `0644ba0`.

## Archive validation

The fallback archive is created with `git archive`, not by copying a mutable working directory:

```bash
git archive --format=zip --prefix=knot-product/ \
  --output /home/user/knot-product-github.zip HEAD
unzip -t /home/user/knot-product-github.zip
```

The archive excludes `node_modules`, test artifacts, local OCR output and other generated caches. It includes source, lockfile, tests, documentation, PDF and MP4. Its commit and SHA-256 are reported with the final delivery response.

## Honest delivery boundary

This is a verified browser-local implementation. It is not a production deployment, live source-integration certification, internet-scale coverage claim, physical-camera certification, cross-browser/assistive-technology certification, or production guardian-consent activation. See `PRODUCT_STATUS.md` and `VERIFICATION.md` for the complete limits.
