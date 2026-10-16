# v0.14.0.35 — MEMBERSHIP BOOK BENEFITS / STRIPE ALIGNMENT

**Project:** The Stock Market: From the Ground Up · Cyber Nexus  
**Type:** GitHub direct-upload **overlay**, same process as previous versions (paths correspond to repository paths).  
**Baseline:** deployed `v0.14.0.34`, commit `d02a9fe0bba155b71f4ca951d188aa6bc6e9aa89`.  
**State:** Candidate; do not activate checkout, grants or ebook distribution solely by installing source.

The user approved Full Monthly/Annual book **companions**, Lifetime including five full eBooks **when rights permit**, Pick What You Want à-la-carte subscriptions, and provisional website eBook prices. This package fixes visible source contracts and prepares a staging-reviewed migration. Existing verified Stripe products and price IDs are **not available**, and no provider account changes were made.

1. Upload overlay ZIP preserving unrelated existing files. Verify GitHub Actions.
2. Run read-only v0.14.0.35 preflight in **staging** and review current values. Apply migration only after review; run postflight. Do not rerun unrelated older migrations.
3. Verify full/limited/lifetime member access on the website, including false/denied scenarios, book covers, KDP Select gating and disabled checkout.
4. Create appropriate Stripe **sandbox** products and capture `price_...` IDs. Configure server-only price map separately; do not place Stripe IDs in Lemon Squeezy fields. Stripe live order fulfillment is still unimplemented, so do not enable live sales.

**Documentation:** `docs/RELEASE_AUDIT_AND_STRIPE_ACCEPTANCE_v0.14.0.35.md`.  
**Staging SQL:** `supabase/migrations/v0.14.0.35_MEMBERSHIP_BOOK_RIGHTS_REVIEW_REQUIRED.sql`.
