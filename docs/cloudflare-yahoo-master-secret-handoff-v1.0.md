# Yahoo Master — Encrypted Credentials & Cutover Handoff v1.0
**Project:** The Stock Market: From the Ground Up
**Date:** 2026-10-25
**Account:** `4fe9e562905cf607b6f004d2374299fc` (Yahoo master)
**Pages:** `stock-market-from-the-ground-up`, `https://stock-market-from-the-ground-up-d1r.pages.dev`
**Status:** Operator secret-entry instructions. **NOT** approval for LIVE payment testing or site/account retirement.

## 1. Exact destination (six credentials)
Cloudflare Dashboard → choose **Yahoo master account** (verify account ID above) → **Workers & Pages** → **stock-market-from-the-ground-up** → **Settings → Variables and Secrets → Production**.
For each item, create a **Secret/Encrypted** production binding (Cloudflare API type `secret_text`). Match the names exactly, with no spaces.
**Never paste values into GitHub repositories, documentation, screenshots, ChatGPT messages, or public Pages files.**
Keep previous Cloudflare accounts running.

| Exact production secret name | Source | Required matching account/endpoint |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase project `oxihglyfgzywsupnyicb` → Project Settings / API Keys → active server-side secret key (or approved service_role key) | The **existing** production Supabase database. Never use the public publishable key here. |
| `GU39_STRIPE_TEST_SECRET_KEY` | Stripe **TEST** mode → API keys → TEST secret API key | TEST account `acct_1URGkDJY9FI7byHB`; `sk_test_` prefix. |
| `GU39_STRIPE_TEST_WEBHOOK_SECRET` | Stripe **TEST** mode → Webhooks → Yahoo master TEST endpoint → Signing secret | Endpoint `we_1UUZqGJY9FI7byHB8Ool1VaR`, `https://stock-market-from-the-ground-up-d1r.pages.dev/api/gu39-stripe-webhook`; `whsec_`. Do not use an old site's signing secret. |
| `GU58_STRIPE_LIVE_SECRET_KEY` | Stripe **LIVE** mode → API keys → LIVE secret API key | LIVE account `acct_1OxhOiJL0O4GGVBH`; `sk_live_`. **Store only; do not make a LIVE test request.** |
| `GU58_STRIPE_LIVE_WEBHOOK_SECRET` | Stripe **LIVE** mode → Webhooks → Yahoo master primary LIVE endpoint → Signing secret | Endpoint `we_1UUZvAJL0O4GGVBH5Tp77DVM`, `https://stock-market-from-the-ground-up-d1r.pages.dev/api/stripe-live-webhook`; `whsec_`. Store without enabling endpoint. |
| `GU_F600_LIVE_WEBHOOK_SECRET` | Stripe **LIVE** mode → Webhooks → Yahoo master Founding 600 endpoint → Signing secret | Endpoint `we_1UUZvEJL0O4GGVBHa1CTpKMO`, `https://stock-market-from-the-ground-up-d1r.pages.dev/api/founding600-webhook`; `whsec_`. Store without enabling endpoint. |

Existing master secret bindings `GU_BILLING_TASK_SECRET` and `TURNSTILE_SECRET_KEY` are already configured. **Do not regenerate or overwrite them.** Their cryptographic pairings and widget configuration have passed the master nonpayment checks.

## 2. While installing secrets, preserve these safeguards
- Keep `GU_PAYMENT_LIVE_LAUNCH_APPROVED=false`.
- Keep `GU58_LIVE_CHECKOUT_ENABLED=false`, `GU58_LIVE_WEBHOOK_ENABLED=false`, `GU58_LIVE_DB_CONTRACT_APPROVED=false`, `GU58_LIVE_FULFILLMENT_APPROVED=false`.
- Keep `GU_F600_LIVE_CHECKOUT_ENABLED=false`, `GU_F600_LIVE_WEBHOOK_ENABLED=false`, `GU_F600_LIVE_FULFILLMENT_APPROVED=false`.
- Keep `GU72_ZERO_MONTHLY_QA_ENABLED=false` and `GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED=false`.
- Keep the **new master** Stripe TEST and both LIVE webhook endpoints **disabled** during secret installation. The **original** enabled Stripe TEST and LIVE endpoints must continue to receive events until signed-delivery and member acceptance pass.
- Keep the Yahoo master `ground-up-billing-scheduler` at **zero cron triggers**, with `workers.dev` and preview URLs disabled.
- Do not delete/disable the source Pages projects or original billing schedules before the approved cutover.

## 3. Non-secret steps after the six bindings are saved
1. Redeploy the Yahoo master production Pages project from GitHub `main` so the newly installed bindings are present in the running Functions environment. **No payment tests.**
2. Run GitHub Actions **Yahoo Master — Post-Secret Backend Readiness (No Payments)** (`.github/workflows/master-postsecret-readiness.yml`). It checks only encrypted-binding **presence**, shutoff flags, inactive Worker, and a read-only GET to `/api/ad-sales`. It never reads or prints credential values.
3. Run GitHub Actions **Yahoo Master — Consolidated Nonpayment Acceptance** and **Cloudflare Yahoo Master — No-Charge Acceptance** (read-only health/security tests). Restore any detected regressions before broader acceptance.
4. Coordinate Supabase Auth CAPTCHA: the Yahoo master Turnstile sitekey is `0x4AAAAAAFlx7GxnPwFqJCMc` and its encrypted secret already exists **in Cloudflare**. Supabase Auth also needs the matching **private Turnstile secret**. Do not paste the secret into chat, and do not flip the existing Supabase provider until the old-site sign-in transition is planned. This single Supabase project may not accept unrelated site-specific secrets concurrently.
5. In Supabase Auth URL Configuration, set the intended Yahoo master Site URL and redirect allowlist while preserving any still-active necessary old-site callback URLs for a rollback window. Verify account confirmation, password resets, callback origin/CORS and email links.
6. Authenticated acceptance must include Owner/Admin authorization, two separate member sessions, Free and paid-entitlement server denials, Labs/Boot Camps/Journal/Simulator access and weekly limit resets, as well as the QA/editor switches. **Do not mark these complete from public HTTP 200 checks alone.**
7. Only after TEST credentials and Auth acceptance pass should the disabled master TEST webhook be enabled for **Stripe TEST-mode only**, then perform actual signed TEST event/fulfillment/renewal/failure/refund evidence. Do not send test events to the LIVE Stripe account.
8. LIVE API credentials and disabled LIVE endpoint configuration may be audited for **presence** without sending LIVE requests. Do not enable LIVE payments, activate LIVE webhook delivery, or execute LIVE reconciliation as part of the secret-entry task.
9. Later, perform a separate controlled production cutover/rollback review for old webhook destinations and the single billing cron owner. Keep the old Cloudflare accounts until there are no remaining dependencies and obtain explicit irreversible deletion confirmation.

## 4. Current known non-secret state
- Yahoo master Pages: GitHub source `main`, correct canonical hostname, 20 public security checks passed.
- Production env inventory **40** names after non-secret parity work. Two editor features deliberately default to `false` until authenticated QA.
- Database reused from existing Supabase project: 419 Labs, 30 competencies, 60 storefront items, 3 ad packages.
- Test and live regular product maps contain 8 SKUs each; Founding 600 live map contains 2, with checkout flags disabled.
- Original inventory field `GU72_QA_ALLOWED_USER_ID` is intentionally absent until the correct existing designated QA member UUID is confirmed. Do not choose an arbitrary user.
- Master `/api/ad-sales` returned HTTP 503 while `SUPABASE_SECRET_KEY` was absent; this is an expected **blocked** state, not a backend acceptance PASS.
- Supabase security advisor warnings for SECURITY DEFINER RPC grants and breached-password checking should be separately reviewed; do not make uncontrolled RLS/grant changes to the shared production database during Cloudflare account migration.
- The GitHub secret `SMFGU_LIVES_PAGES_DEPLOY` has been used successfully for master migration. Restrict it to least privilege once migrations are complete; do not use a no-expiration, broad billing/token-admin key for routine deployments.

**Next human checkpoint:** Report only **“Six master secrets installed”** when complete. Do not share the values. Secret-presence and site/backend validation will be executed before any TEST-mode webhook operation.
