# Talia Source-Based Tutor — Implementation, Verification and Research Acceptance

**Document ID:** SMFGU-TALIA-EXEC-023
**Project:** The Stock Market: From the Ground Up
**Version:** 1.1
**Date:** 2026-10-31
**Status:** PARTIALLY IMPLEMENTED — NOT ACCEPTED (authenticated production acceptance and exact all-site regression outstanding)
**File type:** Markdown
**GitHub location:** `docs/research/talia/2026-10-31_execution_acceptance_v1.md`
**Google Drive location:** Not created; no authenticated Drive write tool was used
**Owner:** Project owner, implementation delegated to ChatGPT
**Dependencies:** Stable `/api/market-tutor` route; `market-tutor-v01492.js`; original public competency guides; 419 canonical Labs; 252 Academy positions; 30 skills; existing authenticated RLS services; Cloudflare Pages main.
**Purpose:** Audit work actually performed and distinguish source research from independent educational/production acceptance.

## Implementation commits (all main, no force pushes)
- `cd43cc8183625da8a3ff43815b767244d461b008` — scored 20 selected free-access public educational pages; restrictions and excluded candidates.
- `f8659e9d3a4e6b3e54213e22a12036441ba26f01` — canonical Lab API now returns the exact checked external reference alongside the approved public Lab ID.
- `f7ae9536aa86310da4507f2c4441a0b2bc469836` — safe allowlisted HTTPS links in the existing Tutor conversation UI; no HTML injection or duplicate Tutor.
- `37af2cded53f474de17d62a32b6f781851dd1c69` — synthetic citation, arithmetic-context, source poisoning, no-evidence and reflection evaluations.
- `5d816b1b74652801e93f8c0aa71feac0f7ba63d2` — Market Tutor trust CI runs the evidence evaluation.
- `f1a10008d5ad0de10fe932ffeaba2a9a4cccbf36` — controlled inventory of 6 uploaded ZIPs and first-party repository sources without extracting proprietary content.
- `d2c7b5d582388e12385fd43ddd86718caafa94f5` — 27-topic curriculum/source-quality map, with explicit outstanding claims.
- `c0b6ac39f86b60951d583636bc58337d9a68a54a` — restrict research-backed worked cases during protected Assess stage.
- `930f1e976401dda51c373dc054841ceeba6d38c7` — eight additional assessment-stage non-disclosure tests.
- `7ed5728b534741931b28e5b79478bb45b5182c22` — source-quality links in the existing Academy's ungraded study-day checkpoint for seven existing program types.
- `14874f96e51456a08ab9be5d88d0f835f42b622b` — Academy reference integrity test.
- `b2d38c526d713f4ca59911cecbd2562f09f19ff1` — run the Academy test in the Free Foundations workflow.
- `89a47340847dc0d1fa6a3813f57285a168e410db` — independently include the Academy source test in Tutor Trust workflow after the Free Foundations workflow encountered an unrelated entitlement fixture failure.

Earlier verified groundwork remains controlling: `a994542f14a940cbf6dcd4f212f7c3223ee32fb5` (five Free lessons), `3e4e9c757faeb5e694dba142c75de475768e24d9` (eight exact public Lab evidence bridges), and `a836ca1bbf78e0cc1ee71f7d6277d1823188aea7` (the 671-unit mandatory investigation audit).

## Complete controlled research files
- `docs/research/talia/2026-10-31_verified20_sources_v1.json`: selected sites, exact URLs, researcher rubric and weighted scores, public access checks, source types, confidence, claim/teaching scope, rights and re-use caution. The rubric is project-specific and **NOT** an industry-wide objective 'top 20.'
- `docs/research/talia/2026-10-31_zip_and_first_party_provenance_v1.json`: all six ZIP metadata, fourteen precisely located candidate STT documents, ten first-party source IDs, rights, limitations, exact locations and use restrictions. ZIP contents were not extracted or publicly ingested.
- `docs/research/talia/2026-10-31_curriculum_topic_coverage_v1.json`: 27 domain topics mapped to primary/secondary pages, all memberships, Boot Camps and current Lab/Studio/Journal/Scanner/Watchlist workstreams; unresolved requirements stated.
- `docs/research/stockstotrade/671_MANDATORY_EVIDENCE_INVESTIGATION_20261031.md`: controlling 419 + 252 investigation and criteria.
- `data/free-foundations-evidence-v1.json` and `data/tutor-lab-claim-evidence-v1.json`: prior five Free and eight canonical Lab claims. These are original **fictional**, ungraded teaching. No historical price/tape/Level II events are inferred from their existence.

## Source selection — project-specific weighted score out of 100
Weights: authority 20, accuracy 15, breadth 10, recency 10, free public access 10, beginner education 10, advanced usefulness 10, clarity 10, permitted use 5. Reviewer assigns each 0–5 and computes weighted sum; equal scores ordered by source ID.
| Selected source | Score | Restriction |
|---|---:|---|
| SEC Investor.gov | 96 | Government-created guidance; review imagery and third-party assets individually |
| SEC / EDGAR | 96 | Government-created text generally reusable; filing/timing and special embedded assets still require review |
| FINRA Investor Education | 96 | Public reading/linking and original summary; no blanket redistribution license |
| Federal Reserve | 96 | Government source; embedded rights exceptions |
| IRS | 96 | General tax guidance; effective-year/jurisdiction checks |
| FRED | 95 | Underlying graphs/series may be copyrighted; links only pending individual licensing |
| BLS | 94 | Government data with release vintage and embedded-asset caveats |
| BEA | 94 | Revisions/vintages and embedded-asset caveats |
| TreasuryDirect | 94 | Public government education; no live yield assumption |
| Nasdaq Trader | 90 | Public notices only; proprietary market data licensing excluded |
| NYSE | 90 | Public market-structure rules; proprietary market feeds excluded |
| CME Institute | 90 | Public course descriptions; do not reproduce course text |
| DTCC | 90 | Public settlement education; do not reproduce proprietary documentation |
| Cboe Options Institute | 89 | Public pages; separate free account required for some portal lessons |
| StockCharts ChartSchool | 86 | Original citation and link, no republication of illustrations or course text |
| Schwab | 86 | Public educational pages; some comprehensive courses require client login |
| Interactive Brokers Campus | 86 | Public educational pages; no copying videos/quizzes |
| TradingView Help | 84 | Platform-specific indicator conventions; no content or library copying |
| Vanguard | 84 | Public education; not a fund recommendation or license for redistribution |
| Fidelity Learn | 82 | Public education; no bulk reuse |
Excluded (access not independently established): Morningstar (direct 403), Investopedia (unavailable page), SIPC (direct 502). No paywalls, CAPTCHA bypass, bulk crawls, vendor profile scraping or proprietary imports were attempted. **Free-to-read is not free-to-ingest or free-to-train.** This work does not establish all 20 websites' full contractual terms for redistribution; therefore all external full-text ingestion remains disallowed.

## Archive inventory
Observed six original archives without extraction: five browser-research snapshots ranging from about 146 MB to 351 MB and the ~95.6 MB `STT.zip`. The STT archive contains 116 non-directory entries, including 65 ODT, 18 XLSX, 11 DOCX, 9 PDF and five TXT files; 108 non-private research documents were inventoried. Browser snapshots include node_modules/Chrome profile data; dedicated workspace `AGENTS.md` forbids ordinary profile access and background scraping. No private observations, sessions, transcript contents, recorded quotes or unlicensed study materials were used as Tutor authority.

## QA evidence and limitations
- Tutor Trust GitHub Actions on `main` passed in the last verified implementation run `41196163673`; exact run details must be checked after the final acceptance-report commit.
- The suite reported 13 synthetic source-evidence cases passed before adding eight Assess-stage withholding cases. The amended suite should pass **21** synthetic cases, subject to final CI logs.
- Prior CI passed Lab metadata, grade separation, 419 canonical IDs and 30 competencies, test fixtures for member-scoped conversations and safe source-only fallback. Fixture tests do not certify live Supabase RLS, private storage or authenticated browser sessions.
- The broad Free Foundations contract on `b2d38c5` failed with `Unexpected private book entitlement URL /rest/v1/platform_plans` *before* this source-link test. This is separately logged, not silently suppressed; no entitlement logic was changed to make it green.
- Cloudflare production Pages deployment for `d2c7b5d582388e12385fd43ddd86718caafa94f5` was observed as `success`, deployment `170e792b-223e-4a90-9c68-aada450ebf4d`. Later code commits require their own exact final deployment verification.
- Served public page retrieval failed from available public web and container DNS tools. Authenticated browser acceptance and live provider calls have NOT been obtained.
- Feature code requires `AI_SERVICE_ENABLED=true` plus explicit owner/model/provider/quotas and saved member consent; Cloudflare configuration values could not be read safely from this session. Therefore actual live flag and provider availability remain **unverified**. No provider switch or spending was authorized.
- Repository is updated directly through the linked GitHub API with current file-SHA optimistic writes and never a forced update. A local full repository checkout, five-hour continuous browser session and end-to-end authenticated deployment fixture were not available.

## Exact remaining gates
1. Independent editorial review of exact source claims, calculations, counterexamples and transfer work for 671 positions; passing general topic audits does not approve them.
2. Rights clearance/authorized data for market tape, full historical OHLCV, proprietary indicator/strategy source and third-party transcripts. Uploaded ZIP possession is not a republication or training license.
3. Live authenticated role tests (Owner, Admin, Free, entitled and non-entitled members, showcase, signout/cross-account) and actual RLS/entitlement verification; test account fixtures are not production acceptance.
4. Production behavior: verify correct Cloudflare active commit and Tutor response with a real authorized member. The normal browser cannot be proven from deployment metadata alone.
5. Confirm real `AI_SERVICE_ENABLED`, provider binding/model approvals and quotas from authorized configuration, without exposing secrets or turning on paid inference. Only then conduct a permitted provider-on validation.
6. Resolve the broad Free Foundations entitlement fixture failure independently, without bypassing access rules.
7. Each research-source use must distinguish currentness, primary versus secondary authority, licensing, data vintage, and whether the source supports the particular original claim.

## Change-control history
Version 1.0, October 31, 2026: first focused source register, provenance inventory, topic map, existing Tutor citations, assessment-stage safety and Academy source checkpoint release. **No SQL migrations, private answer keys, membership pricing, LIVE charges, paid AI services or new Tutor architecture.**

## Version 1.1 acceptance addendum — protected assessment and exact-commit checks
- `0f85ef4fc8ba960ceaec9a56351262218c99efb5`: removed the raw source-evidence object from public `labContext` JSON. Source references remain narrowed to a reviewed public link, and no protected answers or fictional worked case scaffolds are returned in that field.
- `e93f61d4cc459106e73c584ac22edaabff27ac2c`: assessment-stage test inspects the **entire JSON response**, not just the rendered text. Original worked/counterexample/transfer fields are excluded when `Learning Journey stage: Assess`.
- `56a7d08b713bb73ad6223bbdfe51a3c9383a6b63`: corrected Academy source-status label to explicit `topic-level reference only`, never day-level or editorial acceptance.
- Tutor Trust `first-party-tutor-contract` job `124524270915` passed on `56a7d08b713bb73ad6223bbdfe51a3c9383a6b63`; logged **PASS 21 synthetic Talia source-evidence cases** and **PASS seven Academy program public-reference checks**. The related 419-Lab, 30-competency, no-external-provider, member-scoped history and safe-browser-source tests also passed.
- Other exact-commit checks: `source-and-build` and Cloudflare Pages passed, but three unrelated site-level checks failed: `source-and-curriculum-contract` job `124524270622` (Lab Pack purchase-route assertion); `contract-regression` job `124524270398` (unexpected `/rest/v1/platform_plans` in entitlement fixture); and `live-public-browser` job `124524271005` (owner-removed homepage example membership statistics).
- Cloudflare Pages production deployment `135fd865-e0fd-4118-8097-32d7b32fb924` explicitly confirmed `success` for commit `56a7d08b713bb73ad6223bbdfe51a3c9383a6b63`, branch `main`.
- These results do not establish authenticated browser acceptance, live-model availability, third-party rights clearance or 671-unit editorial acceptance. This document-only addendum commit has its own subsequent CI/deployment result and is not represented by the above SHA.

**Release determination:** PARTIALLY IMPLEMENTED — NOT ACCEPTED. Actual source links, seven Academy source-quality checkpoints, stricter protected assessment responses, source-quality registers and evaluations are implemented and individually tested. Full production acceptance remains blocked by unrelated CI failures, unverified live authenticated operation, unavailable provider configuration evidence and unresolved curriculum/license research.
