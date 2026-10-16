# Admin Control Center — Plain Language & Human Verification

| Document control | Value |
|---|---|
| Company | Cyber Nexus |
| Publication | Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up |
| Document ID | GU-WEB-ADMIN-CAPTCHA-20261016-001 |
| File | `docs/ADMIN_SIMPLE_LANGUAGE_AND_CAPTCHA_SETUP_v0.14.0.34.md` |
| File type | Markdown |
| Version | v0.14.0.34 |
| Status | Source candidate; requires deployment and live verification |
| Date | 2026-10-16 |
| Google Drive folder / document ID | Not provided. New Google Drive file not required to deploy; optional document record later. |
| GitHub baseline | `a80a9d30c670dfbf5b65351332903e7b5fbd1dfc` (v0.14.0.33) |
| Dependencies | Deployed v0.14.0.32-R2 security and v0.14.0.33 payment center, Cloudflare Pages, Supabase Auth CAPTCHA |
| Purpose | Fix misleading password-confirmation failure and simplify payment and navigation wording without bypassing security or altering backend identifiers. |

## Defect confirmed from website source

`admin-password-confirm-v01432r1.js` disables password reconfirmation until `/api/auth-guard-v0135` returns `{ok:true, enabled:true, sitekey:...}`. When `ENFORCE_AUTH_TURNSTILE_V135` is not `true` or credentials are incomplete, the modal displays `Turnstile CAPTCHA is not configured.` **A password alone cannot fix this**. This is server configuration, not evidence of an incorrect user password.

This revision keeps password and submit button disabled until the widget loads, gives plain-language setup instructions, and preserves the server's CAPTCHA and recent-password confirmation requirements. It does **not** silently remove the CAPTCHA requirement, bypass Owner/ADMIN permissions, or switch on payment processing.

## Configure Cloudflare Turnstile and Supabase

1. Cloudflare Dashboard → Turnstile: create a widget (Managed mode recommended) for `stock-market-from-the-ground-up.pages.dev`. Add the real custom website hostname as well if used. Cloudflare hostnames must have no scheme/path/port.
2. Cloudflare Pages → the website project → Settings → Variables and Secrets: set `TURNSTILE_SITE_KEY` to the widget's **site key**; set `TURNSTILE_SECRET_KEY` as a **secret**; set `ENFORCE_AUTH_TURNSTILE_V135` to the exact text `true`. Confirm the settings exist in the environment being deployed (production, and preview if tested there). Never enter secrets in GitHub files or chat.
3. Supabase → Authentication → Bot and Abuse Protection: enable CAPTCHA, select Cloudflare Turnstile, enter the **same widget secret**. Review rate limits and authentication policies.
4. Redeploy after updating Cloudflare Pages configuration. As a public *configuration check only*, visit `https://stock-market-from-the-ground-up.pages.dev/api/auth-guard-v0135`. Expected shape: `{"ok":true,"enabled":true,"sitekey":"..."}`. The site key is intentionally public; the secret must never appear.
5. Test sign-up, email login, username login, password reset, and an OWNER recent-password confirmation in an isolated account. Test both successful verification and denied/missing/expired challenges. If Cloudflare config reports enabled but the actual authentication requests fail, verify Supabase CAPTCHA settings and provider policy rather than bypassing checks.

**Configuration check caveat:** the public endpoint checks Cloudflare environment key presence, not the actual secret match or proof that Supabase accepted a token. Real end-to-end authentication tests are mandatory.

Official docs: https://developers.cloudflare.com/turnstile/get-started/ and https://supabase.com/docs/guides/auth/auth-captcha

## Names shown to administrators

The database, RPCs and internal product codes remain untouched. Plain-English screen names include:

| Previous label | Administrator-facing replacement |
|---|---|
| Payment Operations | Manage Payments |
| Stripe Digital Products & Price Mapping | Connect Stripe Products & Prices |
| Reconciliation & Webhooks | Payment Records & Updates (read-only history; not refunds) |
| Signed Book Payments & Fulfillment | Signed Book Orders |
| Print Fulfillment Preferences | Print Order Settings |
| eBook Sales & Downloads | eBooks & Downloads |
| Website SKU | Item Code |
| Membership Variant Mapping (legacy) | Lemon Squeezy Product IDs |
| Check Configuration | Check Payment Setup |
| Digital Payments — Stripe Managed Payments & Lemon Squeezy | Digital Payment Settings |

Existing OWNER-customized sidebar entries are not overwritten. The existing **Manage Admin Controls** editor is the authoritative place for custom sidebar names and categories. Search still accepts provider names and technical keywords for operational staff.

## Safety and acceptance limits

- Source revision only: **no Supabase migrations**, no payment transactions, no provider credential changes, and no actual Cloudflare Turnstile account configuration performed.
- Payment integrations, digital book entitlements, physical fulfillment, Market Commons and navigation permissions remain unchanged.
- CAPTCHA not configured: password input and submission are blocked; explicit directions are shown. No hard-coded CAPTCHA key and no fallback that weakens account security.
- The new Admin → Site Settings → **Human Verification (CAPTCHA)** checker does not claim full readiness from the mere presence of a site key; test actual signup/signin/password-confirmation flows.
- The existing Admin Search is retained. Do not rename stored backend values such as `STRIPE_MANAGED`, `LEMON_SQUEEZY`, `FULL_MONTHLY`, or webhook event keys because that would break cross-system contracts.
- Mandatory MFA is not introduced. CAPTCHA verifies human interaction, not account ownership. OWNER/ADMIN roles, recent password verification, rate limiting and audit logging remain necessary.

## Revision history

| Revision | Date | Summary |
|---|---|---|
| 1.0 | 2026-10-16 | Plain-language payment labels and fail-closed CAPTCHA setup guidance. |
