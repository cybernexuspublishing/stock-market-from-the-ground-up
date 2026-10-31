# Crownlight Academy Depth, Lumens Rewards, Wallet and Billing — V1 Decision Register
Document ID: SMFGU-ACADEMY-LUMEN-20261031-001
Project: The Stock Market: From the Ground Up
Version: 1.0 | Date: 2026-10-31 | Status: PRODUCT REQUIREMENTS APPROVED; IMPLEMENTATION AND TESTING OPEN
GitHub: docs/product/ACADEMY_LUMENS_WALLET_BILLING_V1_20261031.md (main)
Google Drive: not created; ID unassigned
Purpose: Canonical V1 integration requirements for Boot Camps, Labs, earned Lumens, member wallet, peer transfers and subscription/order display.
Dependencies: 419 canonical Labs, seven Academy routes, approved nine-stage teaching engine, current wallet ledger, server-owned training progress, approved Lumen Store policies and mixed-checkout readiness.

## 1. Boot Camps are the flagship deep-teaching experience
- **Minimum 30 minutes of planned active instruction per day** (not 30 minutes of required seat-time, idle timers or compulsory videos). Program duration remains five/seven/ten/thirty/forty-five/sixty/ninety instructional days. Distinguish a lesson day from a whole Boot Camp.
- Each day: first-principles concept teaching; terminology; source-referenced factual explanations; multiple fully worked numerical/source cases; interactive experiment; predict before reveal; many ungraded formative questions; error-specific remediation; one fresh protected independent assessment when reviewed; transfer challenge; evidence-based NO TRADE alternative; member-progress reflection. Minimum **12 varied ungraded teaching questions per day** as an initial editorial floor, not a fabricated completion claim; a Lab may use fewer based on its competency. Questions must be purposeful, individually authored and not repetitive padding. The original nine-stage engine remains authoritative.
- A Boot Camp day has a 30–45 minute suggested **active-learning itinerary**, with optional deeper practice allowing longer study. Learners may pause and resume; do not artificially hold completion hostage to wall-clock time.
- Current research must be crosswalked individually to each existing canonical day; independent SEC, FINRA, exchange and issuer verification before factual claims. Do not reproduce third-party transcripts or licensed vendor charts. Optional verified historical replay only with rights and cutoff; otherwise explicitly fictional.
- B001 Truth5 retains the previously approved controlled-Beta **research-scope freeze**. More exercises for depth may use the already approved subject matter; material new subjects are deferred until after Beta except factual/safety corrections.

## 2. Rewards and single canonical currency
- Member-visible brand is **Crownlight Lumens** / **Lumens**. 'Sparks' remains solely as a legacy identifier in old schemas/routes or archival versioned legal records until safe migration; no new wallets, conversion or second currency.
- Define server-owned reward catalog keyed by canonical Lab/program/day, published approved version, eligibility, total award, and award eligibility state. Proposed starting rewards **are NOT approved numeric amounts** until price/economics and abuse review; UI cannot show invented amounts. Use 'Earn Lumens — amount pending' until approved award schedule exists, not arbitrary zero or a promise.
- Rewards for completion must require server-verified independent qualifying activity and be awarded **once** per canonical scope/version via an idempotent ledger event; no award for reveal/skip/assisted cases, abandoned progress, client-supplied percentage or repeated ungraded attempts. Preserve prior improvement-award policy only after separate reconciliation so duplicate awards cannot occur. Staff overrides must be audited.
- All earned, purchased, included and promotional Lumens share the existing single wallet and current approved nonexpiration rule. The seven-cent checkout denomination is **discount math, not cash value**.

## 3. Member-facing progress and quick wallet
- Navbar compact wallet: current verified available Lumens, link to Dashboard Wallet, top 5 **started** and incomplete Labs/Boot Camps sorted by proximity to 100% with ties by latest activity; show percent and estimated award only if approved. No fabricated or locally calculated mastery, grades, balances or award amounts.
- Exclude never-started items. A completed and awarded item should drop from pending rewards; incomplete progression continues according to server truth. Show truthful unknown/unavailable state on API failure; clear private content on account change.
- 'How to use & wallet details' must route to member Dashboard Wallet section, not a detached Store help page. Dashboard wallet widget displays available, held/reserved and total earned/spent when sourced accurately; history ledger and awarded items; transaction details, reasons, timestamps and policy links. Do not expose other members' private balances.
- On Lab/Boot Camp catalog cards: display possible **approved** earned-Lumen reward; distinguish earned-on-verified-completion from prospective or not-yet-awarded. No reward amount if absent from authoritative catalog. Completion progress bar is not a protected assessment grade.

## 4. Member purchases and receipts
- Dashboard **Subscriptions (Memberships)** separate from **Orders & Receipts (Boot Camps, Labs and eligible tools)**. Subscription cards show plan, status, billing dates, historical provider charges where verified, and a controlled detail view. Do not label a subscription total from the plan price alone (renewals, refunds and taxes differ).
- Each order detail displays product lines, tax/shipping/fees if present, cash captured, Lumens redeemed, internal applied Lumen discount in USD cents, refunds/adjustments, and total **purchase consideration**. Do not add the dollar amount of Lumens to the already undiscounted purchase total again. Use: list-price total = cash collected + Lumen discount + other discounts, adjusted for tax and fees as applicable, with explicit reconciliation or an 'unavailable breakdown' state.
- No historical Lumen spend or cash spend can be inferred solely from current wallet balance. If order ledger lacks authoritative allocation, display 'breakdown unavailable' and link official provider receipt. Existing mixed-cash/Lumen checkout is quote/selector only, settlement not accepted; do not imply completed mixed purchases.

## 5. Optional member-to-member Lumens gifts (security and legal gated)
- Proposed 10–200 **whole Lumens per gift**, not daily or account maximum; define abuse/rate limits before enablement. User selects verified @username recipient; avoid exposing email, identity, balances or account enumeration through unrestricted search.
- **Do not enable transfers in V1** until legal/payment risk review and a server-side atomic ledger contract have passed. Existing policy explicitly bans selling Lumens between members; gifting must be noncommercial, nonredeemable for cash, irreversible only after informed confirmation (with documented dispute policy), and disallowed for restricted users.
- Required server implementation: public-handle opt-in, exact handle normalization and immutable user-ID lookup; self-transfer denial; 10/200 limits; spendable balance and reserved-credit checks; row-level locking with atomic debit/credit and ledger correlation IDs; client-independent idempotency; throttling, anti-sybil checks, velocity/cycle limits, audit events, abuse reporting, suspicious transfer holds; reversals only through audited privileged service; recipient privacy and notifications.
- FinCEN risk depends on transferability, redemption and business model. Even with noncash-only platform rewards, product/legal review must decide whether the design raises money transmission, stored-value, tax or consumer-law issues. See https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering and https://www.fincen.gov/system/files/2019-05/FinCEN%20CVC%20Guidance%20FINAL.pdf . No presumption of exempt status.

## 6. Delivery sequence, acceptance
P0: current wallet/ledger/checkout and purchase-schema inventory; site-wide visible-string audit and legacy API compatibility list; exact current education progress semantics.
P1: original deep lesson specifications and rewards economics with cost/risk bounds; server-reward entitlement contract and idempotent test ledger.
P2: dashboard Wallet, payment history segmented and reconciled, navbar quick wallet and top-five server-ranked progress, catalog reward display; no unsupported amounts.
P3: original 30-minute-per-day authored Boot Camp lessons with >=12 meaningful ungraded questions/day, followed by private editorial acceptance and member journey.
P4: username gifting only after legal/risk approval and atomic transfer lifecycle with adversarial tests.
Acceptance: exact head CI, Cloudflare exact commit, authenticated real member, cross-user isolation, fail closed API errors, accounting equality, double award and duplicate webhook tests, keyboard/mobile usability, rollback evidence. No LIVE payment, fake receipts or unauthorized cash transfer.

## Revision history
2026-10-31 v1.0: established instructional depth, canonical currency and wallets, payment transparency, proposed peer gifting rules and release boundaries.
Footer: Crown & Lantern Press / Cyber Nexus — internal product specification; not legal opinion or deployed feature acceptance.
