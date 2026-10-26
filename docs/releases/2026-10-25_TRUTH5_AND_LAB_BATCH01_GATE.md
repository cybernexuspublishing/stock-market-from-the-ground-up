# 2026-10-25-B01 — Boot Camp 1 + Private Lab Content Batch 01 — Migration Gate Evidence

## Document control
- Project: The Stock Market: From the Ground Up (website and publication companion)
- Publisher: Crown & Lantern Press / Cyber Nexus
- Date: October 25, 2026
- Content batch version: 2026-10-25-B01; website release version: **unchanged** (content and noncharging migration-gate review; **not a schema release**)
- Source repository: `cybernexuspublishing/stock-market-from-the-ground-up`
- Branch: `main`; no separate release branch
- File path / type: `docs/releases/2026-10-25_TRUTH5_AND_LAB_BATCH01_GATE.md` / Markdown
- Google Drive location: **Not assigned**; no Drive copy created
- Google Drive document ID: **Not assigned**
- Purpose: Evidence of one full five-day Boot Camp source expansion, exact twenty private instructional Lab updates, security/grade boundaries, and next acceptance gates
- Status: **IMPLEMENTED — UNGRADED SOURCE AND PRIVATE-DATA CONTENT; INDEPENDENT MEMBER / EDITORIAL / PRODUCTION ACCEPTANCE PENDING**
- Dependencies: existing Academy v0.14.0.168, canonical 419 Lab registry, 30 competency definitions, private `lab_instruction_v014`, existing `/api/lab-content`, `lab_training_sets_v014`, existing Supabase entitlement/RLS contracts and Cloudflare Pages build
- Non-scope: LIVE Stripe charge/refund, checkout changes, replacement historical OHLCV, answer-key publication, official skills award, changing prices, additional boot camps

## Scope and observed evidence
1. **Academy `truth5`** — The Truth Behind the Ticker. All five individual days received substantial original lesson paragraphs, labeled **FICTIONAL** worked cases, independently repeatable primary-source research procedures, misconceptions, transfer tasks, and an ungraded self-check. Added an accessible stepwise teaching interface that requires the learner to provide reasoning before showing the formative model answer. Official grading and mastery remain **false**.
2. **20 canonical Labs** — the next twenty by original `platform_labs.sort_order`, not new Lab IDs, were updated *in place* in private `lab_instruction_v014` with specific objectives, concept instruction, rationale, fabricated practice scenarios, at least four practice steps, formative learner question, review guide, risk/uncertainty caveat, and compatible `teaching` structure. The existing book restrictions and protected training review system were not modified.
3. The atomic Supabase content transaction checked **419 active canonical Labs** and twenty unmodified original v96 rows before updating exactly twenty; any mismatched row count would have raised an exception and rolled back.
4. Read-only postflight returned **20 batch rows, 20 content-shape passes, 20 still unreviewed, and 0 reviewed independent assessments**. The private content rows carry `lessonBatch = 2026-10-25-B01`, `authoringStatus = ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED`, and no verified historical data claim.
5. Read-only DB grants showed `service_role` grants, **no `anon`/`authenticated` direct grants** on the four touched private instruction, assessment, enrollment and progress tables. All four have RLS enabled and zero public policies; the established authenticated server/secure RPC paths are intentionally authoritative.
6. A dedicated five-day Academy source test was added to the existing Boot Camp GitHub Actions workflow. The final exact-head run and browser test must be checked separately: **a source push is not production deployment acceptance**.

## Exact Lab batch (canonical sort order)
1. `F1-C02-L01`
2. `F1-C02-L02`
3. `F1-C04-L01`
4. `F1-C06-L01`
5. `F1-C07-L01`
6. `F1-C07-L02`
7. `F1-C08-L01`
8. `F1-C08-L02`
9. `F1-C08-L03`
10. `F1-C09-L01`
11. `F1-C10-L01`
12. `F1-C10-L02`
13. `F1-C12-L01`
14. `F1-C13-L01`
15. `F1-C13-L02`
16. `F2-C01-L01`
17. `F2-C02-L01`
18. `F2-C02-L02`
19. `F2-C02-L03`
20. `F2-C03-L01`

## Defects / risks / recommendations
- The pre-existing generic v96 instructions were not complete standalone Labs. A long-form conceptual teaching draft improves content but is not substitute for editorial review, authentic licensed bars, independent graded assessment, and member/browser acceptance.
- The existing Academy v0.14.0.168 enroll/progress/member API was reused. Do **not** create a parallel Lab engine, another 30-day course, or independent credit/mastery ledger.
- All worked prices are fabricated for arithmetic or source-criticism teaching; ticker/date metadata must not be presented as evidence that an actual quote, bid, fill, issuer announcement or trade occurred.
- Separately review any outstanding Supabase `SECURITY DEFINER` executable grants. The current security advisor reported nine anon-executable and 77 authenticated-executable privileged functions; function-by-function contract review is required, not indiscriminate mass revocation. See https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .
- RLS enabled with no policies is expected on service-only tables; it must remain paired with absence of direct client grants. Do not create broad public SELECT policies to clear informational advisor warnings.
- Password breach protection was flagged as not enabled by the Supabase security advisor; review its availability and Auth configuration without silently changing credentials or account access.

## Migration gate status and rollback
- **Applied:** One atomic, constrained *data/content* update of 20 existing private rows; no new DDL, tables, grants, triggers, SQL functions or formal Supabase migration history row. All historical database migrations remain untouched.
- **Not applied:** Any speculative “next numbered” schema migration. There is no verified incompatible schema contract for this batch, so manufacturing DDL would create schema drift and unwanted deployment risk.
- **Rollback:** Use a **reviewed, targeted transaction** restoring only the twenty `lab_instruction_v014` rows tagged `2026-10-25-B01` to their retained baseline content where source backups exist, without modifying reviewed grading sets or member progress. Since previous complete row snapshots were not stored with this operation, never perform a blind or destructive rollback. A per-record restore requires backup/snapshot verification first.
- **Acceptance remains open:** run the dedicated Academy CI on exact head; review all 20 authored Labs individually with authorized reference materials; verify entitlement segregation including other-book, free sample, Showcase/restricted and regular member; mobile/keyboard/screen reader; chronological replay rights; private grading and progress; and actual Yahoo Cloudflare deployment and authenticated service behavior.

## Revision history
| Version | Date | Change | Acceptance |
|---|---|---|---|
| 2026-10-25-B01 | 2026-10-25 | One Boot Camp authored; 20 private Labs updated; security and rollout gate inventoried | Pending member/editorial/browser QA |

**Document footer:** Crown & Lantern Press / Cyber Nexus — Private educational data lives in Supabase, not the public repository. No payment or historical outcome asserted.

## 2026-10-25 — Acceptance gate continuation and observed failures

### Code implementation and live production checks
- GitHub main authored source: `functions/api/lab-content.js` now authenticates a bearer **before** privileged case reads. Three approved free samples are accessible only to eligible active signed-in members, never anonymous, restricted or Showcase users.
- A premium training member lacking the matching proprietary book receives an explicit 404 from the private book-instruction API, permitting the existing member player to retry its **separately authorized** metadata-only `lab-player-context`. Missing training and book access remains denied. The canonical 419 Lab identifiers and source manuscripts are unchanged.
- `tests/test_lab_batch01_authenticated_access.mjs` covers guest denial, bad token, Showcase/restricted accounts, free samples during optional tool-RPC outages, matching-book access, cross-book isolation, and safe premium orientation, with no private rubric exposure.
- `tests/test_v014168_academy_browser.mjs` adds real Chromium **fixture** assertions for all five-day original instructional material, independent reasoning required before model explanation, fresh Day 2 material, and per-day self-check reset at mobile and desktop widths.
- Exact source commit `160ab9a7a149d9656034ecce8204df7de2178fc5`: [Boot Camp CI success](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261287192); [Sitewide Playwright success](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261286647). These tests use mocked credentials/member responses, not a real accepted production member.
- Yahoo-master Cloudflare Pages confirmed successful production deployment of authenticated QA script commit `193ec6dea6f92d83c72ba436aebc69225a924fc8`, preserving the existing production branch `main`.
- Independent **guest production requests** returned HTTP 401 for `/api/lab-content?id=F1-C02-L01`, `/api/lab-player-context?id=F1-C02-L01` and `/api/bootcamp-academy?program=truth5`. The intentional **public** `/api/bootcamp-academy?action=catalog` returned seven program listings. These are genuine deployed guest results, not simulated member acceptance.
- Supabase SQL read-only grading audit: **20 of 20 v96 protected training sets remain DRAFT; 0 of 20 reviewed; all 20 corresponding private instructions remain educational drafts.** No mastery, trade execution or historical authenticity can be certified.
- Supabase privilege audit: `gu_bootcamp_academy_save_v014168` is SECURITY INVOKER; only `service_role` can execute. Existing `v014_training_start` and `v014_training_answer` remain service-role-only RPCs; anonymous and regular authenticated roles cannot execute them directly.

### Hard blocker — actual production login / member journey
- [Authenticated read-only Lab QA run](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261566827) attempted the intended real QA member but received **Supabase Auth HTTP 400 / `captcha_failed`** before obtaining a session. All 20 Lab and five-day Academy authenticated HTTP requests consequently remain **NOT EXECUTED**; do not misreport the pre-auth failure as an application entitlement success or as proof that the member's password is wrong.
- The standalone QA script currently attempts a direct GoTrue password grant **without a Turnstile challenge token**. With CAPTCHA enforcement, this test method itself is invalid and needs a browser-based member session with a genuine one-time human-completed challenge. The independent [Yahoo master auth diagnosis](../v0.14.0.275_YAHOO_MASTER_AUTH_LOGIN_CAPTCHA_DIAGNOSIS.md) additionally recorded provider errors of `invalid-input-secret`, requiring Supabase's CAPTCHA secret to match the Yahoo Cloudflare Turnstile widget. Both problems must be distinguished.
- **Owner private prerequisite:** Using secure Dashboards, configure the exact Yahoo Cloudflare Turnstile private widget secret in the ONE existing Supabase project under Authentication → Bot and Abuse Protection; never send the secret in chat or commit it. Keep CAPTCHA enabled. Sign in interactively as a dedicated eligible QA member after completing the CAPTCHA. Real acceptance requires adequate Book I, Book II and `ONDEMAND_TRAINING` entitlements, 20/20 authorized lessons, five-day Academy, persisted private reflections, restricted/unauthorized account denial, accessibility, and a genuinely independently reviewed private grading set.
- **Protected grading is still blocked:** twenty `draft` private answer sets cannot be promoted to `reviewed` solely from source shape or a successful browser fixture. Require exact per-Lab grading-key validation, independent learner cases, editorial signoff, and production QA before any change to review state.
- LIVE Stripe operations, billing, founding prices, credits, and payment owner approvals remain untouched.

**Acceptance decision:** Source/security hardening implemented and code regression passed. **Member E2E BLOCKED** (human CAPTCHA/provider secret); **20 assessments UNREVIEWED**; **do not advance to the next Boot Camp or Labs batch**.
