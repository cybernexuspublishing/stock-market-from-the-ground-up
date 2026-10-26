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
