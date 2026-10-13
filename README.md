# The Stock Market: From the Ground Up — Website Source

**v0.13.5.7.6 — Visual learning and Admin workflow candidate (not deployed).**

Contains the complete GitHub-root source tree for Cloudflare Pages/Functions, continuing the three-branch reconciled v0.13.5.7.1 package. Old overlapping browser scripts and two duplicate homepage counters were consolidated. v0.13.5.7.2 was subsequently deployed and Owner screenshots verified sign-in and key administrative views. v0.13.5.7.4 is deployed and the Owner reported two additional UI defects. The v0.13.5.7.5 candidate repaired those defects; this next release adds 30 original skill illustrations, a grouped Admin workflow directory, page-editor preview, and bounded Market Commons reply pagination. **This new candidate has not been deployed; actual Supabase authorization/write paths, KDP listing data and historical market examples remain to be independently verified.**

Start with **`docs/CURRENT_RELEASE.md`**, **`docs/DEPLOY_AND_VERIFY.md`**, **`docs/SQL_STATUS.md`**, and **`docs/PROMISES_AND_READINESS_MATRIX.csv`**. Older reports are historical audit records rather than current install instructions.

If creating an empty GitHub repository, extract this ZIP locally and upload/push **all contents into the repository root** (`index.html`, `assets/`, `functions/`, `supabase/`, `docs/`), not as one ZIP or a nested folder. Preserve the current Supabase and Cloudflare projects. GitHub upload does NOT execute Supabase SQL.

**Release safeguards:** No real Showcase entitlements; no enabled paid checkout/QR activation/CAPTCHA/mandatory staff MFA. Existing publisher-approved EPUB files and their curriculum are outside this website repository and remain unchanged. Use only independently authorized thinkorswim OnDemand for Replay Learning.

**Stable-filename release policy:** Active frontend JS/CSS files, catalog data and the canonical service worker use functional names without release numbers. Future changes replace those exact files. Historical SQL migrations, existing API URLs, and legacy service-worker install URLs retain their immutable names to prevent breaking production contracts. See `docs/RELEASE_AND_FILE_POLICY.md`.
