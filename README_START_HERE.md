# v0.14.0.29 — SIGNED PRINT FULFILLMENT SETTINGS + GITHUB CI CORRECTIONS

**Target:** `cybernexuspublishing/stock-market-from-the-ground-up`, base `c6c65dccf88bae4190dae9229ef7348c59bf9052` (v0.14.0.28).  
**Format:** DIRECT-UPLOAD source overlay — replace files at the included paths; preserve all other tracked files. NO patch script.  
**Production:** NO paid checkout activation. NO author-copy orders, credit cards, shipping addresses, eBook downloads or other customer records created by this package.

## Delivered
- Fixes v0.14.0.26/v0.14.0.27 Actions failures caused by obsolete version/README assertions **while retaining** actual release-contract requirements.
- Prepares Owner-preferred **personally signed Amazon KDP author-copy channel**, clearly NOT YET ORDERABLE until separate Stripe Checkout/order ledger and shipping queue implementation passes acceptance.
- Keeps Lulu Direct as a separate OPTIONAL physical print provider, now supporting explicit Enable / Disable **without deleting saved links**, once v29 SQL is reviewed and installed.
- Preserves Amazon Kindle/print links, KDP Select controls, Lemon Squeezy digital/member purchases, the Admin Control Center, Market Commons and all unrelated existing website components.
- Adds a new CI gate and read-only Supabase pre/postflight queries.

## Installation
1. Overlay these complete files into their exact directories in GitHub. Do NOT delete other files.
2. Verify all required GitHub Actions (including v0.14.0.26/v0.14.0.27) pass on the same commit. A PASS is source validation, not a production payment signoff.
3. Review `docs/COMBINED_SITEWIDE_GITHUB_AND_SIGNED_BOOK_AUDIT_v0.14.0.29.md`.
4. Run `supabase/admin/v0.14.0.29_PRINT_MODE_PREFLIGHT_READ_ONLY.sql` in staging. ONLY with explicit Owner approval and role-negative staging tests apply `supabase/migrations/v0.14.0.29_SIGNED_PRINT_FULFILLMENT_MODES_REVIEW_REQUIRED.sql` and run POSTFLIGHT. These SQL files are NOT executed by GitHub/Cloudflare.
5. Before using Owner Print controls: enable Supabase AAL2 MFA for the Owner. The new OWNER UI will refuse save otherwise.
6. Leave physical website checkout OFF. Lulu links may be independently enabled after valid account, PDF/ISBN/price and shipping validation. Signed manual checkout must remain noninteractive until Stripe payments/order queue is implemented.

## Acceptance boundaries
No amount of passing GitHub static tests establishes website E2E safety. The manual KDP checkout, payment confirmation, private address handling, tax, author ordering and signed shipping remain HIGH priority work for the next commerce development increment.
