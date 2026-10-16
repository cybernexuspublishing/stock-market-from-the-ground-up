# v0.14.0.39 — Stripe Shadow Testing, Existing Supabase (ONE COMBINED RELEASE)

**Status: code candidate, not deployed. DO NOT ENABLE LIVE CUSTOMER PAYMENTS.**

This is a path-preserving **direct-upload source overlay**, not a replacement for the full repository. Overlay on the current GitHub `main` version v0.14.0.38 (commit `b9e077a2c755643893cb3d22f2b64263dc74c2d0`). Preserve all unrelated files and existing Cloudflare secrets.

**Purpose:** Test Stripe in a separate **shadow ledger inside the existing Supabase database**, without creating a second Supabase project or touching real entitlements. A test success never grants real access.

**Included:** Owner Payment Testing controls, disabled-by-default SQL shadow tables/RPCs, Owner-only Stripe sandbox checkout endpoint, signed test webhook handler, read-only SQL security inventory, unit/mock tests, updated checkout source contract, consistent version/service-worker cache identifiers, release control and security documentation.

**Required before any SQL:** review the SQL and take a recoverable backup. It will ADD shadow tables and functions in your production Supabase database; it does **not** silently auto-run. Do not run historic v38 migrations or repurpose v38 entitlement RPCs. The SQL preflight is read-only.

**Owner startup (after approved database migration):** Add actual Stripe **TEST** Price IDs to the `GU39_STRIPE_TEST_PRICE_MAP_JSON` Worker secret, plus TEST Stripe API/webhook secrets; set `GU39_SANDBOX_SHADOW_GATE=true`; open Admin → Payments & Billing → Stripe Payment Testing, reconfirm password, Enable Testing. All settings are initially off. Run actual test-mode purchases and export shadow-only results; no direct membership grants. Never paste API/webhook secrets in chat.

Read `docs/STRIPE_SHADOW_RELEASE_CONTROL_v0.14.0.39.md` for controls, risks, version details, dependencies, and pending acceptance tests.
