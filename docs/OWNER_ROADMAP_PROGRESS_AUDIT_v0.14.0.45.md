# Website Development Progress & Evidence Audit — v0.14.0.45

| Document control | Value |
| --- | --- |
| Organization | Cyber Nexus |
| Imprint / website | Crown & Lantern Press / The Stock Market: From the Ground Up |
| Project | Companion Learning Platform — website engineering |
| Document ID | GU-WEB-ENG-STATUS-014045-20261017 |
| Filename | `OWNER_ROADMAP_PROGRESS_AUDIT_v0.14.0.45.md` |
| File type | Markdown |
| Repository location | `docs/OWNER_ROADMAP_PROGRESS_AUDIT_v0.14.0.45.md` |
| Companion status inventory | `docs/OWNER_ROADMAP_PROGRESS_AUDIT_v0.14.0.45.csv` — 281 primary requirements |
| Google Drive folder / file ID | Unassigned; no Drive upload or Google document ID claimed |
| As of | 2026-10-17 |
| Baseline reviewed | GitHub `main` v0.14.0.44, `931ff27fcda6e4040d18a8185e075e38672460fa` |
| New feature version | v0.14.0.45 — release verification pending |
| Dependencies | GitHub, Cloudflare Pages, Supabase Auth/PostgreSQL, Cloudflare Turnstile, Stripe sandbox |
| Status | Engineering/source evidence review. No independent Supabase production data inspection, authenticated end-to-end account testing, or attorney certification. |
| Purpose | Show exactly what is delivered, present in source, in active integration, blocked or still in backlog without creating false Owner approvals. |

## Summary of all recoverable website agreements

The Owner register contains 2,096 records: 166 consolidated commitments, 77 historical execution gates, 38 historical promises (281 **primary** checklist entries), 1,668 trace statements, and 147 structural/reference lines. Several records repeat the same feature from different stages and are not 2,096 independent finished software features.

**Primary-item engineering assessment as of the reviewed GitHub release:**

| Assessment | Items | What the status actually means |
| --- | ---: | --- |
| Verified delivered controls (limited scope) | **12** | There is direct public-deployment/source/CI or Owner screenshot evidence for the *particular narrow claim*. It is not a release-wide product certification. |
| Implemented in source; live acceptance pending | **153** | A relevant screen, API, policy, catalog, or control exists but complete database/provider/multi-role acceptance is not established. |
| Current active integration or verification | **47** | Relevant to present integration work: Owner status tracker, Cloudflare CAPTCHA, Stripe catalog/fulfillment, role/entitlement hardening, audit and go-live gates. Not necessarily 47 simultaneous coding tasks. |
| Blocked — independent evidence / dependency | **25** | Requires installed database verification, licensed real market data, legal/tax/payment provider eligibility, historical rubric review, security, accessibility or restore evidence. |
| Recorded backlog | **44** | Agreed requirements preserved but not currently being actively integrated or production-verified. |
| **Total primary items** | **281** | Independent of the Owner's own checkmark states. |
| Unclassified historical source/reference lines | **1,815** | Retained verbatim as prior task context; not individually certified by this engineering review. |

### Narrow items supported by completed delivery/source verification

- Cloudflare Pages production host and release manifest: live release v0.14.0.44 reported commit `931ff27...`; deploy parity previously checked.
- Cyber Nexus and Crown & Lantern Press publishing/site identity.
- Static build allowlist and exclusion of SQL, runtime secrets, development docs and Cloudflare Functions; automated checks passed. A full penetration test was not performed.
- Single Dashboard menu link, supported by earlier Owner screenshot.
- OWNER / SUPER ADMIN profile label and account membership display, supported by Owner screenshot; actual privilege boundaries still require runtime tests.
- Stripe approved integration architecture decision; **not** payment-system acceptance.
- Live checkout and live webhook fulfillment **remain disabled**, confirmed by production release metadata.
- Catalog count 419 unique historical Labs (94 original Foundations IDs); **not** verified chart/rubric quality.
- Previous locally verified Pages + Supabase Auth account sign-in, Dashboard and account listing evidence.
- GitHub/Cloudflare release SHA matched on the reviewed version.

These are deliberately conservative delivered-control categories, not an assertion that every feature beneath these headings is fully working.

### Implementation/code present, but not certified end to end

- Homepage, About, Help, SEO, legal information pages, navigation and responsive member layout.
- Registration/login, username normalization, password validation/recovery, session handling, CAPTCHA frontend, accounts and privileges.
- Free, Monthly, Annual, Lifetime, Pick What You Want/Flex, Replay-Only and closed Founding membership configuration; plan toggles and manual entitlements in source.
- Store, book catalog, book key redemption, digital rights preparations, private file/download routes, signed/print books, Admin book control and KDP eligibility gates.
- 30 skill paths, Lab Registry and authoring interfaces, training modes, owner pilot rubric, learning progress records and Tutor interface.
- Simulator, replay and trading journal modules, including structured trade fields and analytics interfaces.
- Market Commons topics, replies, Rich/BBCode editor, follows, mentions, moderation, reports and notification code.
- Admin operations, Pages/CMS editor, branding, communications, advertisements/forms, Site Health and configuration exports.
- Source-based isolation for SHOWCASE and private routes, role enforcement and moderation controls.
- 24/24 GitHub release workflows succeeded for the reviewed v0.14.0.44 deploy. The full source audit reported **71 HTML, 220 JavaScript and 50 CSS files**, zero syntax failures, zero missing static asset references, zero duplicate IDs and 21 review flags (14 inline handlers, 7 potentially unlabeled inputs).

### Active work requiring immediate integration / QA attention

1. **Owner Roadmap persistence and access:** the owner confirmed its username link is visible; acceptance still needs authenticated data loading, save+reload, status update audit, direct API Owner/non-Owner/Showcase/RLS denial and multi-Owner consistency. The current update adds a read-only engineering evidence overlay without changing any saved Owner state.
2. **Human-verification end to end:** user-initiated Turnstile client is deployed; verify actual browser registration, email/username login, password reset, token expiry, duplicate challenge absence, and matching Supabase Bot Protection backend.
3. **Stripe sandbox catalog:** eight imported/reported products and a consolidated verifier exist. Do **not** mark 8/8 verified; current release manifest says `stripePriceIdsVerified=0`. The correct account, eight actual Product IDs, eight corresponding Price IDs and interval/amount/tax classification must all pass API evidence.
4. **Stripe customer/entitlement lifecycle:** signed webhook, renewal, cancellation, failed payment, refund/dispute, replay/out-of-order events, account restriction, partial rights, and reconciliation must be verified against controlled Stripe test events and installed database policies. Production checkout OFF.
5. **Admin, roles and Supabase RLS:** live create/update/archive/restore, owner-only account changes, feature flags, TEST/SHOWCASE restrictions, private resources and audit log writes all need role-negative staging verification.
6. **Member + Market Commons integration:** real forum post/edit/delete, reporting limits, moderation case chronology, mentions/notification delivery and accessibility in paired signed-in sessions.
7. **Release/acceptance:** exact source-to-Cloudflare parity, web security, retained privacy and KDP restrictions, book/learning provenance, browser and mobile accessibility, and realistic backups.

### Blockers — do not certify without independent evidence

- Installed Supabase migrations, role grants, Row Level Security and live snapshot cannot be deduced from repository SQL.
- Digital book retail rights and KDP Select enrollment must be checked per edition before website ebook downloads and Lifetime bundle delivery.
- Real historical charts/market-data rights, source-specific lab questions, grading rubrics and replay/no-lookahead dataset validity remain incomplete.
- Realistic trade execution across bid/ask spread, slippage, order modeling and extended trading hours must be checked against trusted data.
- Stripe tax code differences, recurring subscription disclosures, refunds, privacy retention and education/market data legal positioning require provider and professional review.
- Full database plus object-storage restoration, 24/7 health alerting and comprehensive WCAG 2.2 AA accessibility have not passed production acceptance.
- No permission to enable checkout or bulk-grant customer entitlements is implied by this audit.

### Backlog — preserved, not falsely marked as active completion

- Full visual drag-and-drop media page builder; more advanced site theming and comprehensive screen-reader refinements.
- Durable automation scheduler, queue, retries, real monitors and database restoration drills.
- Grant Web Solutions independent external tenant/client-site publishing beyond existing Owner-only draft tooling.
- Broad historical replay/AI Tutor adaptive strategies after data licensing, exact rubrics and cost control are established.
- Future 100-user staged onboarding and additional internationalization; must not distract from Version 1 security and live purchase readiness.
- Publication/book QR activation and supplementary charts depend on verified rights and actual published book metadata.

## Website tracker implementation policy

The new **Engineering review** section and filter in `/owner-roadmap.html` show six classified states and the evidence/limitation for each primary task. The source review is a **read-only versioned snapshot** in private Cloudflare Pages Functions. No rows in `site_settings` are bulk-updated, no Owner checkbox is checked automatically, and any manually saved Owner status takes precedence as Owner attestation. The detailed trace tab is preserved separately. CSV/JSON exports include the engineering stage and evidence note alongside Owner-saved status.

Current UI label `Owner marked complete` retains its original meaning. `Verified delivered controls` is not the same as `Owner marked complete`.

The Roadmap backend was also corrected to accept the modern `sb_secret_*` Supabase server key via an `apikey` header without an invalid bearer token; legacy JWT service-role keys still use the appropriate Bearer+apikey shape. This is not a substitute for a real Owner persistence test.

## Evidence / test execution

- Source audits: `docs/SITEWIDE_DISPLAY_FUNCTION_AUDIT_v0.14.0.44.md`, `docs/PROMISES_AND_READINESS_MATRIX.csv`, `docs/BACKEND_PHASE_4_ACCEPTANCE_MATRIX.csv`, `docs/FEATURE_STATUS.md`.
- Active GitHub release `931ff27...`, 24 successful workflow checks; production live release manifest matched source.
- Owner confirmed Roadmap link visible; this does not alone establish saved-status persistence.
- New audit contract: `tests/test_owner_roadmap_progress_v014045.mjs`; the existing `tests/test_owner_roadmap_v014044.py` remains unchanged.
- No direct Stripe private API call using account credentials, live Supabase Owner token, migration, payment, or book publication was performed in this audit.

## Revision history

| Date | Version | Change | Status |
| --- | --- | --- | --- |
| 2026-10-17 | v0.14.0.45 | Evidence-backed 281 primary requirement status inventory; distinct Owner vs engineering progress; current-work and blocker dashboard; Supabase service header correction and test | New source/release candidate |
