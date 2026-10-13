# The Stock Market: From the Ground Up — Website Source

**v0.13.5.7.5 — Controlled Website Stabilization Candidate (not deployed).**

Contains the complete GitHub-root source tree for Cloudflare Pages/Functions, continuing the three-branch reconciled v0.13.5.7.1 package. Old overlapping browser scripts and two duplicate homepage counters were consolidated. v0.13.5.7.2 was subsequently deployed and Owner screenshots verified sign-in and key administrative views. v0.13.5.7.4 is deployed and the Owner reported two additional UI defects. This candidate repairs those specific defects, narrows Market Commons queries, and hardens checkout/archival permissions. **This new candidate has not been deployed; actual Supabase authorization/write paths, KDP listing data and historical market examples remain to be independently verified.**

Start with **`docs/STABILIZATION.md`**, then read **`docs/DEPLOY_AND_VERIFY.md`**, **`docs/CONSOLIDATION.md`** and **`docs/FEATURE_STATUS.md`**.

If creating an empty GitHub repository, extract this ZIP locally and upload/push **all contents into the repository root** (`index.html`, `assets/`, `functions/`, `supabase/`, `docs/`), not as one ZIP or a nested folder. Preserve the current Supabase and Cloudflare projects. GitHub upload does NOT execute Supabase SQL.

**Release safeguards:** No real Showcase entitlements; no enabled paid checkout/QR activation/CAPTCHA/mandatory staff MFA. Existing publisher-approved EPUB files and their curriculum are outside this website repository and remain unchanged. Use only independently authorized thinkorswim OnDemand for Replay Learning.

**Stable-filename release policy:** Active frontend JS/CSS files, catalog data and the canonical service worker use functional names without release numbers. Future changes replace those exact files. Historical SQL migrations, existing API URLs, and legacy service-worker install URLs retain their immutable names to prevent breaking production contracts. See `docs/RELEASE_AND_FILE_POLICY.md`.
