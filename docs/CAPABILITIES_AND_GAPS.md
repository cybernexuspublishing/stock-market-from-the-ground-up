# v0.14.0.0 — Capability inventory and definitive open work

**Statuses:** `PRESERVED` means source exists; `IMPLEMENTED (LOCAL)` means new functionality with static/mock checks; `SCHEMA REQUIRED` means the new SQL must first be applied; `NOT COMPLETE` means do not promise or sell this as operational. Code presence is not production certification.

| Area | Existing capability preserved | New in v0.14.0.0 | Still required for production readiness |
|---|---|---|---|
| Foundation | Static site, Cloudflare Pages Functions, Supabase Auth and database | Stable release version and private content split | Live preview/production smoke tests, recovery drills |
| Identity | Username/email sign-in, verification, session timeout | No changes to production auth; separate existing flows preserved | Real-device sessions, recovery/revocation test |
| Account Management | Owner/Admin views, create/edit/disable, synthetic test profiles | Owner management page and role boundaries retained | Live create/edit/delete test matrix, ensure DOB consent and retention law |
| Roles | OWNER, ADMIN, MODERATOR and specialized role scaffolding | No server permission weakening | Audit every legacy route and DB RLS policy |
| Memberships | Free, Flex/individual tool, Full monthly/annual, Lifetime, Replay-Only | OWNER plan active/visible/checkout-OFF control via SQL RPC | Provider subscription reconciliation, retries, UI confirmation, actual fulfillment, renewal and cancel |
| Founding memberships | Pricing proposal previously discussed | Draft $49.99 monthly / $499 annual; invisible, inactive, checkout disabled | Approved enrollment quota (100), provider variants, renewal duration, offer disclosures, grandfathering |
| Entitlements | User plan grants, subscriptions, tool passes, books, book key flows | Server-paid tool check for simulator/BYO bars/graded training; private Guided Lab content | Replace remaining legacy browser-only paywalls; remove spoofable scores; full contract tests |
| Book companions | Owned-book Labs and free samples | Interactive Lab authored content served through backend instead of public bulk JSON | Verify full book entitlement sources and trial access before launch |
| Labs | 419 catalog records; 94 authored Foundations interactive Labs | Reviewed per-step bank infrastructure and 6 book-authored candle math questions for F2-C07-L01 | Editorial answer key/rubric for remaining 93 authored Labs and 325 other catalog entries; market evidence licensing |
| Lesson modes | Guided, Practice, Blind, Assessment | Durable question-by-question answers, feedback after each Guided question or after final advanced attempt | Genuine branching time-bounded historical scenarios, behavior-based remediation, replay P&L scenario orchestration |
| Trading decisions | Decision journal, stop/target plan, basic replay | Review cannot claim correctness from mere completeness | Server-side scenario state, slippage/fill modeling, source-proven OHLC/tape, follow-up paths |
| Grading | Competency Cases reviewed server-side (earlier implementation) | New server-owned graded attempt answer/report history and private source status | Connect to canonical skills with secure grade validation and minimum evidence thresholds |
| Skill Development | 30 competencies and current Dashboard | Preserved existing visuals | Skill-specific course graph, mastery/retention rubric, recommend weak-topic practice |
| Simulator | CSV replay and BYO Tiingo beta bars, chart canvas, manual enter/exit, journal | Server-paid simulator gate; server-paid BYO bars; separate premium OnDemand training | Central server-owned trades, verified datasets, provider licensing, execution realism, durable replay sessions |
| Historical data | Selected ticker/date records, provenance warnings | No fabricated quotes | Independently verify each case, corporate actions, sessions/ET and publication rights |
| Reading the Tape | Book-aligned teaching topics | No invented tape evidence | Licensed timestamped T&S/Level II where available, explicit limitations |
| Journal | Trade journal, MFE/MAE, analytics and screenshots | Preserved | Live server access check for every premium action, exports/imports, PII retention controls |
| Analytics | Activity and Dashboard, approx online stats | Online members now use rolling 60-minute window, live/custom still Owner controlled | Statistical accuracy, concurrency, dashboard status test |
| Community | Market Commons forums, topics, replies, reports, moderation admin | Atomic forum report quota & duplicate prevention | Posting quotas, spam prevention, report workflow notification, moderation appeal/legal policy |
| CMS/site builder | Block CMS, Pages/SEO, Branding, forms and preview | Preserved | Full block/media library, template editing, preview revisions, publish/rollback, safe client domain deployment |
| Grant Web Solutions | Earlier ambition to reuse Admin backend | PRIVATE Owner-only client draft registry/editor | Strong tenant model, per-client domains/roles/deploys, asset storage, invoices, scopes, consent/contracts, recovery |
| Forms/leads | Existing form editor/lead infrastructure | Preserved | Spam mitigation, PII access/retention, export & deletion verification |
| Advertising | Sponsor controls, ad disclosure | Preserved | Provider contracts, placement permissions, ad filtering and fraud handling |
| Commerce | KDP Select safeguards, Lemon webhook and checkout disabled | Checkout remains OFF; hidden membership never selectable | Atomic webhook claim/idempotency, tested fulfillment/chargebacks, direct sale KDP guard, taxes/terms |
| Catalog | Book/edition state + Amazon links | Preserved | Confirm KDP real listing and external checkout correctness per title/format |
| Showcase | Synthetic-only read-only demo | New server-paid guards exclude Showcase/test | Entire-route synthetic isolation and data leak penetration testing |
| MFA/Turnstile | Owner toggles; optional MFA | Existing OFF policies preserved | Staff enrollment and rollout tests before enabling, provider validation |
| Automation | Rule draft UI, admin controls | Preserved | Authenticated execution worker, queues, retries, audit/alerting; currently NOT COMPLETE |
| Backup/recovery | Readiness/inventory UI | SQL preflight and documented rollback | Tested Supabase PITR/export/restore and scheduled backup retention |
| Site operations | Admin settings, feature inventory, health dashboard | OWNER plan controls and private editor routes | Performance monitoring/SLO, structured error logs, secrets rotation, deploy canaries |
| Accessibility | Keyboard and focus work, semantic components | New form labels, no legacy unsafe file renames | WCAG 2.2 AA audits, screen readers, mobile touch/zoom |
| Legal/compliance | Financial/educational disclosures, community rules | Marketing simulations expressly marked source-qualified | Educational-vs-advisory counsel review, privacy policy, paid-service refund rights, ADA accessibility and licenses |

## Non-negotiable release-blocking acceptance tests
1. Database migrations are reviewed, prerequisites verified and applied exactly once, with backups.
2. Disabled and hidden memberships disappear from ALL public list sources and are unpurchasable on ALL checkout routes. Existing paying subscribers are not silently revoked.
3. All premium data/API writes are guarded by **server** permission checks; no synthetic Showcase permissions leak.
4. Only reviewed answer keys can grade a Lab; historical outcomes never appear before decision lock and grading reports don't claim unverified market accuracy.
5. Client GWS drafts are not readable by normal members or other tenants. Public client publishing remains OFF.
6. Forum posting/reporting/moderation scenarios are verified using real permissions, concurrency and quotas.
7. Browser UI and Cloudflare Functions pass desktop/mobile/auth/offline replay tests.
8. Actual checkouts and registration invites stay OFF until billing, disclosures, support, backups and terms are accepted.

## Known risk: hidden answer material in other static resources
`data/interactive-lab-index.json` includes only non-answer identifiers and short metadata. The 94 book-authored instructions are stored exclusively in the new service-role-only Supabase `lab_instruction_v014` table after the Owner applies a **separate private SQL seed**, not in the public GitHub release. The secret reviewed answer-key seed is also separate. The Cloudflare Function requires server authentication/entitlement for all non-sample access. Other public learning/catalog JSON remains visible and must be reviewed individually for proprietary content before launch.
