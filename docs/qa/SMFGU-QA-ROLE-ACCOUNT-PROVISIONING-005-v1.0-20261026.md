# Production QA Accounts — Provisioning and Acceptance Register

**Document ID:** SMFGU-QA-ROLE-005  
**Project:** The Stock Market: From the Ground Up  
**File:** `docs/qa/SMFGU-QA-ROLE-ACCOUNT-PROVISIONING-005-v1.0-20261026.md`  
**File type:** Markdown  
**Version:** 1.0  
**Status:** Role provisioning code updated and regression-tested; production user creation **not executed**  
**Created:** October 26, 2026  
**Repository / branch:** `cybernexuspublishing/stock-market-from-the-ground-up` / `main`  
**Google Drive folder / Drive ID:** Not assigned. This is a newly created repository-controlled record, not a Google Drive document.  
**Owner authorization:** Owner approved creation of dedicated QA accounts to test administration, permissions, Free/paid entitlements and the member experience. No LIVE payment transaction or change to an existing customer's account was authorized.  
**Dependencies:** Valid signed-in production Owner browser session, separate deliverable inbox aliases, Member Account Management, Supabase Auth Admin invitations, and QA access evidence.  
**Purpose:** Prevent accidental staff privilege escalation and document reproducible, minimal, auditable QA identities, without duplicating or exposing existing customers.

## Read-only production baseline

- Active `profiles` rows with `account_kind='member'`: 5.
- `test_account_profiles` records: 0.
- Active staff assignments: one OWNER and one ADMIN.
- Role catalog includes MODERATOR, SUPPORT, COMMUNITY_MANAGER, LEARNING_MANAGER and others; these are **assignable role definitions**, not automatically working sessions.
- Existing account editor `/api/admin-accounts-v01353` uses Supabase Auth Admin invite or create, then existing identity/profile/role/audit tables.
- The connected Supabase plugin exposes PostgreSQL SQL and project tools but **no Auth Admin create/invite operation**. The TinyFish profile does not share the Owner's successful local-Chrome session, and its hosted browser Turnstile challenge failed. Do not manufacture `auth.users` by SQL, forge JWTs, extract the Owner browser token, disable CAPTCHA, or expose secrets.
- At document creation, no real QA account was provisioned; no invitation was dispatched.

## Staff-provisioning defect corrected on `main`

Previous `type='admin'` creation always issued `ADMIN` even when a specialist staff role was requested, potentially over-granting privileges. The new `roleForNewAccount` resolver in `functions/api/admin-accounts-v01353.js` checks the exact requested code against the database-backed, assignable roles, and excludes Owner/Moderator/Showcase from generic Admin selection.

The Account Management Create Account modal in `assets/js/admin-operations.js` now requests available specialist roles, shows an explicit selector for Administrator-type staff accounts, and refuses staff provisioning if the source role list cannot be retrieved. The selected role is submitted in `roleCode`.

Delegated Administrators cannot use the member editor to manage an account with **any active staff-role assignment**, not merely OWNER/ADMIN/MODERATOR. `tests/test_admin_account_creation_least_privilege_v1.mjs` tests all role mappings, backend invalid-role denial before Auth create, one mocked Support invite, audit events and delegated Admin denial. The test is mandatory under Deployment 16 Admin Shell CI.

**Important boundary:** This confirms source/runtime behavior with mocked identity transport. It does **not** mean that an invitation was sent or a real staff account was used in a browser.

## Minimal independently isolated QA roster

Use distinct deliverable email aliases owned by the project. Do not use existing customer addresses, unknown third-party mailboxes or invented email addresses. For every real account use the actual authorized QA contact's lawful, verified DOB requirement through the Owner form; do not record DOB in this file or in CI logs.

| Alias / intended username | Owner Create Account type | Staff role | Initial access | Primary acceptance |
|---|---|---|---|---|
| `QaAdmin26` | Administrator | ADMIN | FREE; no purchase | Allowed Admin modules, denied Owner-only operations |
| `QaMod26` | Moderator | MODERATOR | FREE | Forum report review, role isolation, no commerce/roles writes |
| `QaSupport26` | Administrator | SUPPORT (explicit selector) | FREE | Support scope, cannot manage staff or access Owner-only finance |
| `QaFree26` | Member | NONE | FREE | Foundational teaching only, denied premium Labs/tools and Admin |
| `QaPaid26` | Member | NONE | FREE initially | Verified paid-entitlement resolver, temporary **noncommercial QA** access only after Owner-authorized grant; no falsely labeled paid sale |
| `QaRestricted26` | Member | NONE | FREE initially | Revocation, sign-in and authorization denial, audit trail |
| `QaShowcase26` | Showcase | SHOWCASE_VIEWER only | Synthetic only | Synthetic read-only isolation, zero production plans, commerce or staff authority |

**Do not** use `type='test'` or `type='showcase'` to simulate real Moderator, Support, Administrator, or paid member entitlements: those account types are intentionally barred from genuine production staff roles and commercial rights. Synthetic plans are display-only.

No second OWNER account is needed; the existing verified Owner identity is the authority for issuance and audit.

## Secure provisioning procedure

1. In the Owner's authenticated **local Chrome**, open `https://stock-market-from-the-ground-up-d1r.pages.dev/admin.html#account-management`, then **Create Account**.
2. For each real identity enter an individually controlled deliverable email, QA username, account type, eligible QA user identity details and choose **Send email invitation**. Choose an exact specialist role when the Administrator type is selected. Retain FREE as the initial membership for all accounts.
3. Invite/redeem through the normal secure mail and Turnstile flow in a dedicated Chrome profile/incognito session per persona. Do **not** transmit passwords, session tokens or authentication codes through chat or repository.
4. Refresh Admin Account Management and verify each account ID, `account_kind`, email-confirmation state, active `admin_user_roles` row, and audit events. If any provisioning response is uncertain, **search the existing Auth users before retrying**; do not create duplicates.
5. For paid-entitlement tests, use only the approved reversible noncommercial Owner QA grant and cross-check the effective access endpoint. The test identity is not a paying customer and cannot certify actual Stripe checkout.
6. On `QaRestricted26` use the existing Owner restriction form with a recorded reason and validate immediate denial and audit; restore/revoke the QA restriction after testing, leaving a documented event.
7. At four viewport sizes (390, 900, 1280, 1440 pixels), independently verify navigation, permission-restricted actions, field validation, responsive layout, keyboard focus, loading/errors and audit actions.
8. Remove or restrict disposable QA identities after acceptance according to retention policy, taking care not to delete records with provider billing, book-key redemptions or assessed learning evidence.

## Verification queries (read-only; do not print PII)

- Count active roles by `role_code` from `admin_user_roles` with expiration filter.
- Count `profiles.account_kind` grouped without listing names.
- Count `admin_audit_log` actions beginning `v1353.account.`, `v1353.role.`, and relevant moderation/entitlement changes.
- For each disposable account, verify authenticated API 200/401/403 and effective membership with a separate session. SQL grants or backend mocks cannot replace this evidence.

## Acceptance status and next actions

- **Source guard fix:** Implemented.
- **CI security regression:** Workflow dispatched automatically on `main`; record its terminal result before marking passed for the latest revision.
- **Production Owner access:** User-confirmed in normal Chrome, not available to the connected TinyFish profile.
- **QA Auth users:** **0 newly created by this task at the time of this record.** No credentials or access tokens were obtained.
- **Real Owner, Administrator, Moderator, Support, Free and paid identity browser journeys:** **NOT YET ACCEPTED.**
- **LIVE Stripe transactions:** Prohibited in this QA scope.

## Revision history

| Version | Date | Changes | Release |
|---|---|---|---|
| 1.0 | 2026-10-26 | Account roles, identified overgrant defect and correction, safe provisioning roster, acceptance gates | Not fully accepted |

**Footer — SMFGU-QA-ROLE-005 v1.0 — Internal QA release register — No LIVE billing or credential sharing authorized**
