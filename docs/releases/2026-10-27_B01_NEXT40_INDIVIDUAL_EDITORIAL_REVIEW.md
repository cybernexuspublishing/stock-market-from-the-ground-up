# B01 Next 40 — Individual Question Editorial and Protected Assessment Release

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Version/date | 1.0 / October 27, 2026 |
| ID | SMFGU-B01-NEXT40-EDITORIAL-20261027 |
| Owner authority | Source review, protected data correction, technical acceptance; no LIVE payments |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` / `main` |
| Google Drive ID | Not assigned (no Drive copy created) |
| Status | 40 question-level editorial checks completed; private corrections PROVEN; grading regression TESTED; rubric approval/member beta acceptance still pending; latest production **deployment blocked** |

## Professional review

Roles: Owner editorial representative, curriculum architect, independent assessment author, market-structure educator, risk/process auditor, database security and privacy engineer, CI/full-stack engineer, WCAG and member-experience reviewer, operational release auditor.

The controlling cohort is **the first 40 B01 multiple-choice questions in canonical Lab order**, 5 each from `F1-C02-L01`, `F1-C02-L02`, `F1-C04-L01`, `F1-C06-L01`, `F1-C07-L01`, `F1-C07-L02`, `F1-C08-L01`, and `F1-C08-L02`, all original v97 private rubrics. This is not a review of the later 60 B01 choices, or of the remaining numeric questions. The exact existing 419 Lab IDs and 30 competency records are unchanged.

Sources: each existing private B01 authored lesson objective, question, correct option, distractors, and remediation explanation independently checked against the project-controlled research archive `StocksToTrade-Browser-Research (8).zip` (relevant Batch I Foundations, Batch VII Fund Structures, Batch VIII Share-Class Rights, Batch XIV Data Identity/Rights) and the following external primary investor-education materials:
- SEC Investor.gov, Stocks FAQs: https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks
- SEC Investor.gov, Secondary Market glossary: https://www.investor.gov/introduction-investing/investing-basics/glossary
- SEC Investor.gov, Index Funds: https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-4
- SEC Investor.gov, ETF Investor Bulletin: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-24
- SEC Investor.gov, Market Capitalization: https://www.investor.gov/introduction-investing/investing-basics/glossary/market-capitalization
- SEC Investor.gov, Reverse Stock Splits: https://www.investor.gov/introduction-investing/investing-basics/glossary/reverse-stock-splits

This is source-based conceptual education and independently authored editorial evaluation, **not** historical replay/source-license acceptance or confirmation of a trade.

## Findings and actual source corrections

1. **HIGH: private keyed-answer echo.** Before correction, 24 of these 40 choice explanations repeated the verbatim correct option, making supposedly protected key content accessible via post-attempt member feedback. The eight original private rubric drafts were preserved in an **unexposed** `private.b01_question_backups_20261027` PostgreSQL table, then 24 original explanation entries were substantively rewritten directly inside Supabase. No keyed options or private teaching prose were checked into public GitHub. A read-only production query then verified **0/40 exact answer echoes**, compared with 24/40 before. Eight private backups have matching post-edit checksums, row-level security, zero anon/member schema usage, and eight Owner-operation audit entries. All sets stay `draft`.
2. **HIGH: review-time keyed-answer protection.** Existing `/api/training-editor?action=review` now rejects B01 draft publication if any multiple-choice explanation repeats the private keyed option. A real Owner-route mock fixture verifies denial with an otherwise publishable authored hypothetical case; no answer content is returned in errors.
3. **MEDIUM: content feedback relevance.** The 24 revised explanations now teach independently verified evidence limitations, issuer secondary-sale distinctions, candle identity constraints, common-share rights, index/ETF execution differences, market-cap liquidity limitations and reverse-split unit adjustments. The remaining 16 original choice explanations were independently checked and do not repeat the key. Source material remains inside the existing protected database, not in public JS.
4. **Risk-critical policy decided individually:** `B01_APPLICATION` on the two replay Labs above now has `criticalOnWrong=true`. Each incorrect distractor permits future data/look-ahead or falsely equates incompatible information boundaries. This records a **process evidence invalidity**, not an assertion of financial loss, trade intent or a personal risk profile. The other 38 questions have no critical designation, because a missed conceptual distinction alone does not reliably establish an unsafe live-trading decision.
5. **Partial-credit decision:** All forty are choice questions; the existing scorer legitimately grades 0/1 for each. No arbitrary partial-credit percentage or tolerance was added. Numeric-score boundary and partial-credit implementation were separately tested in the existing disposable PostgreSQL fixture; no B01 numeric rubric policy was silently modified.
6. **Reversible change:** `supabase/migrations/20261027_b01_editorial_private_backup.sql` creates only an unexposed original-draft backup, with RLS and no ordinary member reads. `supabase/rollbacks/20261027_b01_editorial_private_backup_ROLLBACK.sql` restores backed-up questions only if each exact post-edit checksum matches, the corresponding version remains draft, and no attempts refer to it. Historical answers and member rows are never truncated or deleted.

## Individual verification evidence (all 40)

`supabase/reviews/2026-10-27_B01_NEXT40_READ_ONLY.sql` was **actually executed against production data**, showing 40/40 with each of the following affirmative: exactly one unique correct listed choice, at least one distinct wrong distractor, normalized whitespace/case handling, no unreviewed partial policy, substantive correction explanation, no verbatim answer key in the feedback, and the installed service-only invalid-choice rejection. The output **does not select private options, questions, rubrics or answer keys**.

`docs/qa/2026-10-27_B01_NEXT40_EDITORIAL_DECISION_REGISTER.csv` records 40 **distinct question-specific** editorial rationales, source categories and controls, with two annotated process-critical cases. Every record remains:
- **Question content:** individually editorially checked;
- **Rubric review_state:** DRAFT / NOT REVIEWED;
- **Protected real-member grading:** BLOCKED on the actual unreviewed bank;
- **Authenticated member journey:** NOT HUMAN VERIFIED.

Actual private **`v014_training_answer`** SQL passed in disposable PostgreSQL 16 against invented reviewed test rubrics: valid/wrong choices, inclusive numeric tolerances, partial-credit boundaries, invalid values, critical-error count, stale-step CAS, review withdrawal and actor isolation. Actual `interactive-training` HTTP handler tests check 422/409/503 and never forward raw database errors or private keys. `tests/test_v014117_lab_topic_gate.mjs` verifies Owner approval refuses key-echo draft feedback. `tests/test_b01_next40_editorial_contract.mjs` verifies 40 one-to-one source-rationale records, rollback integrity and proper unpublished status.

**Completed CI evidence:** [GitHub Actions run 40473171605](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40473171605) both jobs PASS. The job exercised static source guards and real disposable SQL, not a real beta member.

## Security and release blockage — do not bypass

**CRITICAL operational issue:** The GitHub repository is **PUBLIC**, making historical source migrations accessible outside the authenticated member app. Existing v96 source-generating migrations reference original conceptual `answer_key` construction. This does not prove the eight currently private v97 corrected keys are public, but historical generated draft keys and algorithms must not be assumed exam-secret. Never copy any private grading key, authored question, or protected explanation into this public repository. Future approved assessment sets need a separate secret-compromise/provenance review before official mastery.

**HIGH deployment block:** At source `8ad5348807481ed37706bb6f78b5354b034dd6fc`, GitHub Actions **PASS**, but Yahoo Cloudflare Pages production build **FAILED**. Cloudflare deployment `f55d1e72-9298-4531-abf6-145adc85e6fd` logged `PRE-LIVE BUILD BLOCK: GU58_LIVE_DB_CONTRACT_APPROVED is enabled on the production branch.` This is the existing intentional payment-safety barrier in `scripts/build-pages.sh`, not a curriculum syntax failure. **No LIVE setting or payment shutdown was changed or bypassed.** The new Owner-review guard remains source IMPLEMENTED/CI TESTED until a clean exact-revision Cloudflare deploy occurs. The last inspected successful deployment was `100f81a9c965cca57542bdb113068bb37cd94473`, which predates that guard.

## Genuine member journey — accurate disposition

A real logged-in member, Turnstile challenge and rubric-v97 graded response could **not** be accepted: all 20 B01 rubric sets still have `review_state='draft'`. Authorized member routes must fail closed instead of presenting questions or generating mastery. The prior real QA credential workflow can return `captcha_failed` without a valid browser Turnstile token. Do **not** disable CAPTCHA or mint synthetic sessions to manufacture a passing acceptance. Existing read-only technical mock tests establish expected role separation only; real authenticated browser journey, persistence, member service-worker state, cross-device resume, and owner beta signoff remain open.

## Owner decisions and status progression

- **Accepted at question-level content review:** first 40 individual choice cases, content corrections and sources, protected direct-SQL checks, specifically justified critical flags, zero partial credit on choice.
- **Accepted as technical provider evidence:** private RLS backup, zero leaked-choice explanations on selected 40, zero member attempts, eight immutable-on-source audit entries, no new LIVE payment writes.
- **Not accepted:** all eight entire rubrics, any official grade/mastery, the remaining 60 B01 multiple choices, unreviewed numeric rubrics, genuine member beta journey, Cloudflare release of the latest Authoring review guard.
- **Open severity order:** (1) safe review of public repository historical answer-generation, (2) Owner inspection of unexpectedly enabled GU58 LIVE gate without toggling shutdowns, (3) remaining 60 choices and per-Lab full rubric review, (4) authorized member browser/Turnstile test once reviewed grade is truly published.

## Signoff and rollback

Retain the owner-only, data-preserving private archive. Review a script's source and secure backup permission before attempting rollback. Never delete historical member attempts or override the admin financial safety interlock for a curriculum-only release.

**Version history:** v1.0 — question 1–40 detailed review, private feedback corrections, risk classification, source-sensitive safeguards, legitimate grading tests, Cloudflare security interlock identified.

## Production deployment reconciliation — Later same-day proof

The earlier failed Cloudflare deployments remain incident evidence. A **subsequent, exact-source production deployment at `d85140fc8025a4615c8c388992ab4acb2c5a93f2` succeeded** on Cloudflare Pages project `stock-market-from-the-ground-up`; provider deployment ID `af6e64ae-fbba-41aa-b409-bf6f283b7252`. Provider log independently reports `bash scripts/build-pages.sh`, `Cloudflare Pages static output: 511 files`, `Compiled Worker successfully`, `Success: Assets published!`, and `Success: Your site was deployed!`. The earlier `GU58_LIVE_DB_CONTRACT_APPROVED` block was not bypassed or edited by this work. The environment-flag discrepancy is retained for read-only Owner operational reconciliation, but the **B01 source review safeguard is now deployed at that exact revision**. This deployment evidence does not establish a genuine member assessment or any LIVE commerce authorization.
