# v0.14.0.37 — Coordinated Admin Corrections and Stripe Product Registration

| Document control | Value |
|---|---|
| Company | Cyber Nexus |
| Publishing imprint | Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` |
| Baseline | GitHub `main` v0.14.0.36, commit `484e0b061bbd7e6a7f5548871fcd222e257cfc54` |
| Document ID | `GU-WEB-RELEASE-V014037-20261016` |
| Version | v0.14.0.37 |
| Date | 2026-10-16 |
| Status | **Candidate; not deployed or production-approved** |
| Google Drive folder / document ID | Not supplied; not uploaded to Google Drive |
| Purpose | Connect eight owner-entered Stripe product identifiers to an authorized, read-only Admin verification page and correct current CI/navigation regressions without enabling purchases. |

## Accepted owner decisions preserved

- The Admin Control Center uses simplified top-level sections and a global search field; custom older controls remain under **All admin controls**. A missing authorization must never be bypassed by navigation composition.
- **Stripe Managed Payments** is the primary proposed merchant-of-record provider for eligible *digital* products; Lemon Squeezy is optional; standard Stripe handles separately configured signed physical books; Lulu Direct remains optional.
- Free and Pick What You Want base memberships have no Stripe product. Individual tools are separately purchased in Pick What You Want; Full monthly and annual include companion experiences but **not** independent eBook files. Lifetime includes five designated digital books only once rights, private files and authorizations permit. Founding plans remain closed.
- No mandatory MFA; authorized accounts continue to require server-side role and password-confirmation controls, plus CAPTCHA when configured. CAPTCHA does not prove account ownership by itself.
- No payment, membership, book download or shipping function can be enabled merely by selecting a UI toggle.

## Source checks and corrections in this release

1. **Existing v0.14.0.36 menu regression:** `admin-payment-center-v01433.js` used `if(commerceNav()&&!commerceNav().disabled)` at initialization, rendering a payment hub even when the navigation button had the HTML `hidden` attribute. Restored the actual `allowed(...)` authorization/visibility filter. Browser regression at `tests/test_v014033_admin_payment_browser.py` now passes in an isolated environment.
2. **Owner-entered Stripe products:** Registered **8** Product IDs exactly as observed in the Stripe screenshot. Status is `SCREENSHOT_ACTIVE_API_UNVERIFIED`: screen presence is not proof of API account, environment, tax classification, or successful payment.
3. **Secure Price ID verification:** Added `GET /api/stripe-product-readiness-v01437`, requiring existing OWNER/ADMIN role authorization. If a sandbox key exists, the endpoint fetches each Stripe product and associated configured Price (if provided), checks `product`, amount, currency, billing period, active and sandbox environment, and returns status **without exposing secrets or modifying records**.
4. **Admin interface:** The Payments & Billing section displays registered product names, SKU, price, `prod_` ID, Price ID connection state, and verification errors in plain language. Unauthorized staff cannot mount the catalog section; the server refuses the verification API.
5. **Tax-classification inconsistency:** Annual Full Membership was entered as `txcd_20060058` (self-study web-based training) whereas Monthly Full Membership used `txcd_10000000` (general electronically supplied service). This is **review required**, not a request to blindly make both codes identical. Stripe Managed Payments eligibility and indirect tax rules determine the correct choice.
6. **Version/caching:** `config.js`, route policy, service-worker cache, static commerce data, release manifest and runtime reporting all identify **v0.14.0.37**. New build scripts allowlist the public non-secret Product ID registry. Older static worker files remain excluded by the v0.14.0.36 build script.
7. **Existing UI controls retained:** No payment editing, buyer PII, moderation table, recipient messaging, or entitlement data is overwritten by this release. `site.js` loads the new module only on Admin.

## Explicit outstanding acceptance blockers (NOT fixed by eight Product IDs)

| Priority | Requirement | Evidence still required |
|---|---|---|
| P0 | Stripe `price_` IDs | Eight actual Price IDs copied from the same Stripe sandbox account and mapped in Cloudflare `STRIPE_MANAGED_PRICE_MAP_JSON`; `prod_` values are not valid substitutes. |
| P0 | Stripe paid fulfillment | New, staging-reviewed webhook-to-entitlement code handling subscription creation, renewals, payments, failures, cancel-at-period-end, cancellations, disputes, refunds, replay and out-of-order events; never grant based only on redirect URL or client metadata. The existing v0.14.0.32-R2 webhook intentionally records **test events only**. |
| P0 | Subscription billing and access lifecycle | Simulated transactions, tampering tests, replay/race-condition tests, account reassignment and restricted-user denial; actual Stripe test events, not only mocks. |
| P0 | Digital eBook rights | KDP Select restrictions, owner attestation, private Storage file authorization, download entitlement and refund revocation checks, including Lifetime member cases. |
| P0 | Payment-provider account eligibility | Confirm Managed Payments covers every exact item and account; reviewed appropriate tax codes for each product. Physical books must use separate standard Stripe Payments if configured. |
| P0 | Cloudflare Turnstile | Valid public site key + private secret + Supabase CAPTCHA configuration + actual sign-in, sign-up and password confirmation tests. |
| P1 | Production deployment parity | GitHub release SHA, Cloudflare build SHA and no-store release manifest must agree; current GitHub source alone is not proof of Pages deployment. |
| P1 | Market Commons and member messaging end-to-end | Browser tests for post-edit/delete, reports, moderation, notifications, staff messaging, role denials and spam prevention against staging database. |
| P1 | Main-branch protection | Protect `main` with required status checks; currently unprotected as observed through GitHub branch metadata. |
| P1 | Website accessibility and privacy | Automated a11y and manual keyboard/mobile audits, privacy retention, session/PII access, recovery/backups, tax/consumer disclosures; not independently certified. |

## External operations NOT undertaken

The owner has created Stripe products independently. This release does **not** connect to the owner's Stripe account, record actual Price IDs, modify Stripe products, install SQL migrations, deploy GitHub/Cloudflare files or accept payment. New API verification works only after existing Cloudflare sandbox credentials are configured by the owner.

## Release / revision history

| Version | Date | Status | Scope |
|---|---|---|---|
| v0.14.0.35 | 2026-10-16 | Existing historical baseline | Approved membership and book-access source |
| v0.14.0.36 | 2026-10-16 | GitHub main as of audit | Admin directory and version consistency source; 17/19 workflows passed; two existing admin browser workflows failed. |
| v0.14.0.37 | 2026-10-16 | Candidate | Fix hidden-commerce-tab regression, enter eight Stripe Products, verify account/prices read-only, preserve disabled checkout, controlled version bump. |
