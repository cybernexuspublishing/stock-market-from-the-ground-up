# LAB-UX-STD-001 — Implementation and Acceptance Evidence

| Control | Value |
|---|---|
| Document ID | LAB-UX-STD-001-EVIDENCE |
| Project | The Stock Market: From the Ground Up (unified books and website) |
| Version | 1.0; audit date 2026-10-23 |
| Status | **Shared source functionality integrated; individual editorial and live production acceptance OPEN** |
| Source of requirements | Owner-approved LAB-UX-STD-001 v1.0 and VWAP Replay v3.2 visual reference |
| Production instructional engine | Learning Engine v3.3 |
| Existing source of truth | 419 canonical Lab IDs; 30 official competencies |
| Proposed Google Drive location | The Stock Market: From the Ground Up / Website / Product & UX / Standards |
| Current Google Drive ID | Not created |
| Dependencies | Lab content/rubric approvals, historical market data licensing/provenance, Cloudflare/Supabase permissions, Playwright suite and owner live tests |
| Purpose | Distinguish implemented components, testing evidence and unaccepted requirements |

## Delivered in shared source

- A subject-aware reusable visual renderer: \`assets/js/lab-v33-contextual-visuals.js\`.
- Compatible visual styles: \`assets/css/lab-v33-contextual-visuals.css\`.
- One renderer used by the canonical Learning v3.3 nine-stage module: \`assets/js/lab-engine-v32-universal.js\`. The file retains its historical name; the exported version remains v3.3.
- Contextual visual selection by authorized Lab instructional topic or explicit authorized configuration, without changing canonical IDs.
- Labeled single candlesticks with OHLC, real body, full range and formula; matching new-case candle for Transfer.
- Multi-candle chart with aligned volume; separate VWAP-style weighted illustration, EMA9/EMA20 reference and structure level when relevant.
- Matched price and share-quantity trade-group diagrams for fictional VWAP arithmetic, without pre-revealing the learner's calculated answer.
- Time & Sales, Level II/quoted spread, and routing conceptual illustrations when those are the actual topic.
- Chart/visual stages: Learn, appropriate Experiment, Predict, Practice, Review and Transfer; intentionally no instructional visuals or revealed answers in protected Blind/Assessment shells.
- Free contextual explanation, deeper instruction, guided examples, new-case practice, and error-specific remediation. Numeric help use is marked assisted within the local, ungraded learning sequence.
- Original site header, in-Registry member Lab host and protected real assessment/replay services remain intact.
- **No new Stripe checkout, account entitlement, official grading, or Supabase migration.**

## Canonical applicability audit (source-level, not approval)

The source visual selector ran against all 419 canonical topic records, incorporating 94 original author Lab records and chapter metadata where available and produced **419 classifications without errors**. Exactly **30 competency records** remained unchanged.

| Suggested visual | Lab count |
|---|---:|
| Candlestick | 13 |
| Multi-candle / price structure | 100 |
| VWAP | 17 |
| EMA | 17 |
| Volume | 11 |
| Time & Sales | 28 |
| Level II / market depth | 27 |
| Order/market relationship diagram | 10 |
| No automatic visual recommendation — manual review required | 196 |
| **Total** | **419** |

This is a **keyword- and configuration-driven recommendation**, not a published editorial ruling. All 419 subjects need applicability reconciliation. For Labs requiring original historical charts, a synthetic chart **never** closes the historical-source acceptance gate.

Detailed suggested visual map: \`docs/qa/LAB-UX-STD-001_419_Lab_Visual_Audit.json\`.

## Source-level runtime evidence

Using a simulated DOM and local curriculum fetch responses, all **419/419** canonical IDs mounted a guided Learning v3.3 journey and advanced to Learn without a JavaScript exception after the 94-record chapter-context refinement. Of those, **223/419** Learn stages rendered a relevant fictional/chart/conceptual visual and **196/419** remain unclassified pending individual visual applicability review. **223** of the canonical Labs are classified as requiring a subject-relevant fictional or conceptual visual using the original author registry where available; remaining subjects received narrative/competency instruction and require human review of visual applicability.

This is not equivalent to executing the website in a signed-in browser or approving the content of each Lab.

## Automated regression additions

- \`tests/test_lab_ux_std001.mjs\`: 419 map, 30 competencies, known concept categories, visual load order, stage presentation, no pre-revealed results, assessment authorization contract.
- \`tests/test_lab_ux_std001_browser.mjs\`: local Chromium at mobile/desktop widths checks a representative Candlestick and VWAP teaching journey, a Time & Sales table, a Level II board, and no visual disclosure in Assessment mode.
- \`.github/workflows/sitewide-playwright-v014136.yml\` includes both checks.

**CI result:** A GitHub Actions pass has **not** been independently observed yet; test presence alone is not a passing outcome.

## Production acceptance gates not closed

| Gate | Status | Evidence needed |
|---|---|---|
| Shared visual components committed | SOURCE IMPLEMENTED | Included files and source checks |
| Source mount across 419 Lab IDs | SIMULATED RUNTIME PASS | Separate full Playwright and live browser QA |
| All 419 visual-type editorial classifications | **PENDING** | Topic-by-topic editorial approval/exemptions |
| All 419 Lab-specific beginner-first lesson depth | **PENDING** | Instructional content review and remediation acceptance |
| Historical chart copyright/source/time-bound verification | **PENDING** | Authorized historical chart evidence per applicable Lab |
| Correctness of all private graded questions | **PENDING** | Reviewed question banks and server-authorized grading test |
| No-look-ahead server replay across all scenarios | **PENDING** | Supabase/Cloudflare replay test and entitlement audit |
| All member account / Question Pass outcomes | **PENDING** | Live authorized session and server-ledger tests |
| Cross-browser/mobile usability and accessibility | **PENDING** | GitHub Actions results, human accessibility review |
| Owner live production acceptance | **PENDING** | Owner completion and signoff |

## Acceptance rule

Do not label LAB-UX-STD-001 or any canonical Lab **100% production accepted** until all applicable content, visual provenance, functional, access, grading, no-look-ahead and owner-live tests have supporting evidence. Completed engine code alone is not an approved historical market curriculum.

## Change history

| Date | Version | Note |
|---|---|---|
| 2026-10-23 | 1.0 | Initial shared engine implementation evidence and 419-Lab visual applicability register |

**End of evidence document.**
