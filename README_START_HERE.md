# v0.14.0.34 — SIMPLER ADMIN LABELS & HUMAN VERIFICATION SETUP

**Project:** The Stock Market: From the Ground Up  
**Publisher:** Crown & Lantern Press / Cyber Nexus  
**GitHub baseline:** `cybernexuspublishing/stock-market-from-the-ground-up`, commit `a80a9d30c670dfbf5b65351332903e7b5fbd1dfc` (v0.14.0.33)  
**Status:** Source release candidate; NOT deployed. No payment activation.  
**Format:** Direct-upload source ZIP with original repository paths. **Preserve every unrelated repository file.**

## What is corrected

- Simple names for the Payment Center, Stripe configuration, signed books, membership prices, and legacy Lemon Squeezy forms. Existing buttons, DOM selectors, permissions and provider IDs remain unchanged.
- Password confirmation now explains that **Turnstile is not yet set up**, rather than silently disabling the button. For security, input and submission stay disabled until Turnstile initialization succeeds.
- The Admin Site Settings panel receives **Human Verification (CAPTCHA)** with a non-secret readiness check and setup instructions.
- All existing customer pages, Market Commons, digital-book database and user accounts are preserved. No mandatory MFA is introduced.

## Why the original password screen cannot proceed yet

The website requires Cloudflare Turnstile to be connected to Cloudflare Pages and Supabase Auth. **This cannot be fixed by changing browser text alone.** Do not weaken or bypass that requirement. Read `docs/ADMIN_SIMPLE_LANGUAGE_AND_CAPTCHA_SETUP_v0.14.0.34.md` to complete the provider configuration. Do not share secret keys in chat or commit them to GitHub.

## Installation and verification

1. Overlay ZIP source files in matching GitHub locations (existing process). Do not delete other repository files. Cloudflare Pages source deploy does **not** execute SQL.
2. Check GitHub Actions and the deployed commit SHA. The release adds `Admin Clarity and CAPTCHA Guidance v0.14.0.34` tests.
3. Admin → Site Settings → Human Verification (CAPTCHA): review its status and follow provider setup instructions.
4. Configure a Turnstile widget for the actual hostname; set Cloudflare Pages `TURNSTILE_SITE_KEY`, secret `TURNSTILE_SECRET_KEY`, and `ENFORCE_AUTH_TURNSTILE_V135=true`; configure Supabase Auth CAPTCHA with the same Turnstile secret; redeploy.
5. Test actual login, registration, password reset and sensitive Admin password reconfirmation; verify intentionally missing/invalid CAPTCHA is rejected by the server.
6. Payment Settings: check that the Stripe / Lemon Squeezy descriptions are understandable and still open the same authorized backend controls. Keep live checkout OFF.

**No migration required. No Stripe/Lemon Squeezy product IDs or prices are changed.**
