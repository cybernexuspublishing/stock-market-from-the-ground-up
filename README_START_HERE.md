# v0.14.0.37 — Combined Admin + Stripe Catalog Direct Upload

**Base:** GitHub main v0.14.0.36 (`484e0b061bbd7e6a7f5548871fcd222e257cfc54`) as inspected 2026-10-16.

This ZIP is a **path-preserving source overlay**, not a complete website archive. Do not delete unrelated existing repository files. It fixes the v0.14.0.36 hidden-commerce navigation regression, adds the eight owner-entered Stripe Products to an authorized read-only Payment Center, and updates release consistency checks.

**DO NOT RUN SQL MIGRATIONS** from this release: none are included. The `supabase/admin/` SQL is read-only inspection only.

**No live payment activation.** Stripe Price IDs were not supplied and must NOT be guessed. This release does not grant any membership/book entitlement, process refunds, change Stripe configuration, or publish digital books.

See `docs/CONSOLIDATED_RELEASE_REVIEW_v0.14.0.37.md` and `docs/STRIPE_PRICE_IDS_TO_COLLECT_v0.14.0.37.csv`.
