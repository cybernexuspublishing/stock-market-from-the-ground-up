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

## Typed instructor and optional AI Tutor enhancement

**Owner direction (2026-10-23):** Make the existing Learning v3.3 lesson feel like a real instructor is typing the explanation, with the existing Market Tutor available without leaving the Lab.

- The new \`assets/js/lab-v33-instructor.js\` creates a per-stage introductory narration. The source lesson text is predetermined and **not represented as AI-generated or live-streamed**.
- Visual animation uses incremental character display after the complete narration is available to screen readers. Members can show all text immediately or replay the visual typing effect. Reduced-motion preferences bypass the effect.
- The instructor is present in guided instructional stages; **Predict and Assess deliberately exclude it**. Blind and Assessment modes use the existing concealed-instruction rendering boundary.
- The in-Lab Tutor request is voluntary. It submits only a topic-safe general question chosen by the member, not any journal entry, account information, private question/rubric, locked answers or unrevealed market candle.
- Source-grounded responses are available through the existing \`/api/market-tutor\` service only after server-authenticated Market Tutor entitlement. Paid AI generation is requested only if the member explicitly checks the AI-consent control, and it is still subject to server rate limits, provider availability and validated source grounding.
- Responses indicate whether they are an **AI-generated educational draft** or a **source-grounded response**. A fallback does not masquerade as AI-generated.
- New Tutor answers are shown in the Lab with the same optional local typewriter effect. The API currently returns the complete text before the visual effect; this is **not token streaming** from a model provider.
- The inline Tutor defaults to \`saveHistory:false\`. Existing full Market Tutor workspace remains accessible through its own link.
- Pending requests and animations are cancelled when stages, Lab subjects or modes change. No existing assessment record, credit balance or official competency score is modified.

**Source-level simulated runtime:** After integration, all **419/419** canonical Labs mounted and advanced to Learn, with the instructor visible in **419/419**, topic visuals visible in **223/419**, and zero simulated rendering exceptions. This does not establish authenticated browser or member-entitlement QA.

**Added regression:** \`tests/test_lab_v33_instructor.mjs\`, included in GitHub Actions. The CI job result and live signed-in interaction remain unverified.

## Owner-authorized unified redesign — source implementation addendum (2026-10-23)

**Design inputs:** Approved VWAP reference experience; three uploaded Lab-environment concepts; LAB-UX-STD-001; user-directed learning/Tutor redesign; owner-provided research ZIP \`StocksToTrade-Browser-Research (5).zip\`.

### Source implemented, subject to independent acceptance

- \`assets/js/lab-v33-visual-interactions.js\`: consistent single-candle Full candle / Real body / Full range focus; accessible Price + indicators / Price + volume / Both controls; inspect **already displayed** completed fictional OHLCV rows with the associated time and volume. Never fetches replay or grading data.
- \`assets/css/lab-v33-experience.css\` and \`assets/js/lab-engine-v32-universal.js\`: chart-first responsive visual/instructor teaching region; compact 3 × 3 Learning Journey; focused prompts beneath the chart; optional reference/credit notices collapsed; subject-specific Start objectives; four-dimension Skill Development statuses explicitly **Not Yet Assessed** absent reviewed evidence.
- \`assets/js/lab-v33-decision-workshop.js\`: eight original *fictional, ungraded, editorial-review-pending* research decision exercises H-01–H-08, matched only when relevant. Learner analysis must be entered before local instructional feedback. Does not write official credit, assessment, competency, or trading records.
- Instructional action buttons in **production** Lab/teaching components no longer advertise \`— Free\`, \`Always Free\`, or \`(free)\`; eligibility, price and server access rules remain unchanged. The **frozen non-production v3.2 reference** remains an archival fidelity baseline; it is not a production label source.
- \`tests/test_v33_approved_learning_redesign.mjs\` and updated \`tests/test_lab_ux_std001_browser.mjs\`: source/no-look-ahead and contextual interaction regressions; included in \`.github/workflows/sitewide-playwright-v014136.yml\`.
- The standard uses the established website header, in-Registry workspace, four learning modes, nine stages, existing Market Tutor API and 419-Lab/30-competency relationships. No client has gained access to official private rubrics, future bars, real transactions or AI entitlement overrides.

### Remaining work — not represented as complete

- Manual editorial review and substantive concept-specific depth for all 419 Lab subjects, including 196 topics still requiring visual applicability judgment. A shared renderer is **not** a replacement for individual reviewed lesson content.
- Licensed and provenance-verified historical chart datasets and market replay acceptance per applicable Lab.
- Browser-confirmed authenticated paid-member access, actual Tutor quota behavior, progress persistence, server-side grading and genuine historical no-look-ahead.
- Accessibility and visual acceptance against the approved image references across mobile/desktop, including actual keyboard interactions.
- Full sitewide text audit outside production learning controls, without modifying store “Free Membership” policy or the frozen nonproduction reference.
- Production CI job confirmation. Source compilation and published assets alone do not establish a passing automated browser suite.

### Research licensing and correctness boundary

The original H-series decision cases are represented as **FICTIONAL STUDY EXERCISES** based on the user's research archive. Claims regarding external market events, historical prices, copyrighted charts, proprietary indicators, fills or win probabilities are not imported as verified facts. A separate editorial review is necessary before counting the exercises as reviewed graded curriculum.

## Instructional quality defect correction — no instructions masquerading as teaching (2026-10-23)

**Owner-reported defect:** The Learn-stage panel labeled *Your learning instructor* displayed generic directives such as "Read the explanation" rather than actually teaching the member. This violated the beginner-first teaching requirement even though the typewriter animation worked.

**Correction implemented in source:**

- \`assets/js/lab-v33-instruction-content.js\`: teaches concepts with factual definitions, how/why explanations, units and formulas where applicable, a separate worked fictional example, conceptual limitations, common mistakes, and an ungraded knowledge check. The specialized subject families are candlestick/OHLC, VWAP, EMA, sequential structure, volume, Time & Sales, Level II/quotes, and order handling.
- \`assets/js/lab-v33-instructor.js\`: replaces all previous "read this" boilerplate with the approved Lab's subject/competency-linked instructional plan. Shows the calculation/working visibly, not merely a link or an instruction to go read something. Uses a typewriter effect for **actual educational content**, with an instant reveal option and accessible complete text. Adds instant-feedback checks that are not official graded questions.
- \`assets/js/lab-engine-v32-universal.js\`: feeds existing authorized teaching, the selected topic, visual family and original competency guide into the instructor. The "Guided Example," "Teach This in More Depth" and mistake-remediation disclosures now reuse genuine worked examples and topic-specific explanations rather than only generic process directives.
- The independent Predict and Assess stages still contain **no** inline instructor or Tutor. Actual graded answers, future bars, replay entitlement and user records remain protected.
- **Source smoke checks:** all 419 canonical IDs mounted and advanced to Learn with instructor content, with zero simulated exceptions; a direct candlestick instructor test confirmed O/H/L/C definitions, the body/range formula, a separate 40% worked example (distinct from the canonical 50% candle practice answer), three check choices, explicit feedback and the existing Market Tutor entry point. Eight specialized concept paths were inspected for definitions, actual examples, common misconceptions and checks.
- \`tests/test_v33_teaching_content_quality.mjs\` and the expanded \`tests/test_lab_v33_instructor.mjs\` are in the existing CI workflow.

**Limits:** This closes the reported *generic instructor copy* source defect. It does **not** certify complete individually reviewed instruction, source provenance or historically correct visuals for every one of 419 Labs. Where a specific approved Lab has no specialist teaching package, the panel falls back to its original competency guide and clearly indicates the need for further per-Lab editorial development. AI-generated teaching remains member-initiated and server-entitlement-protected; a typewriter animation is not an AI response.

## Personalized guided instruction and chart-linked worked candle — 2026-10-23

**Owner acceptance direction:** The previously separate and generic “What you will learn” bullets must be delivered by the instructor itself, personally, and with genuine teaching—not merely appear as a checklist. The visual worked example must correspond to the chart evidence.

**Production source implemented**

- The named guide **Avery — Your Learning Instructor** is explicitly labeled a **virtual course guide**. Avery addresses the member directly, teaches the concept, demonstrates the method, and supports further exploration without pretending to be a human trader or an AI model response.
- Stage 1 (“Start”) now types three actionable objectives and beginning definitions in the **same instructional panel**; its old generic “Recognize and explain: Explain X” list was removed. A compact “Review your learning objectives” control remains available. Learning goals are written to the subject (candlestick, VWAP, EMA, volume, structure, tape, Level II, routing) or based on that Lab’s existing approved competency guide.
- Typing can be skipped or replayed and complies with reduced-motion preference. Full text is immediately available to screen readers; typing does not issue hidden API calls.
- In the Candlestick Learn stage, the chart now uses **the exact worked fictional example**: Open $20.00, High $22.00, Low $19.00, Close $21.20. The real body is $1.20, the full range $3.00, or **40%**. This is distinct from the separate fictional Practice answer (50%); there is no numeric-answer leakage.
- The accessible worked-candle controls highlight **Open, Close, High, Low, Real body, Full range, and Body percentage**. A “Next highlight” control progresses through the chart evidence. Buttons in Avery’s worked explanation select the matching chart feature.
- Tutor access and server entitlements are unchanged; protected Blind, Predict, Assessment and unrevealed replay states remain separate.

**Source verification:** Modified JavaScript parsed; all **419/419** canonical Lab IDs mounted and advanced from Start to Learn with Avery’s panel in simulated runtime testing. Automated source and browser regressions were updated for typed objectives and linked chart states. **Do not infer a passing GitHub Actions browser run or production member acceptance from source-only checks.** Editorial review of the remaining Labs and live member-mode testing remain open.

## Member first-name personalization and distinct instructor identity — 2026-10-23

**Owner-requested change:** Replace the provisional instructor name Avery. Address each signed-in member by their **first name**, NOT their username, public handle, full name, or email.

**Implementation:**

- The first-party fictional/virtual guide is **Elara Voss — Your Learning Instructor**, visibly identified as a virtual course guide rather than a real person or AI-generated character.
- The existing /api/account?action=identity backend, already authenticated and member-scoped, returns profile.firstName sourced from profiles.first_name. Lab Player reads that field only after a session is available; the allowed fallback is exclusively the registration user_metadata.first_name value.
- If no valid first name exists, Elara uses a neutral greeting. Never infer a name from username, display_name, full_name, email, or public navigation data. No account identity change is required and no new SQL is introduced.
- The name is inserted as text, not interpreted as HTML, and is not appended to Tutor questions, URLs, logs, credits, assessments or local persistence.
- The shared Learning Engine forwards memberFirstName into safe instructor stages. Member first-name personalization does not change learning mode permissions, protected assessment behavior, membership entitlements, or the 419 canonical Lab IDs.
- Added first-name, invalid-name, missing-name and identity authorization checks to tests/test_lab_v33_instructor.mjs and tests/test_v33_member_first_name.mjs, integrated with the existing Lab CI workflow.

**Acceptance remaining:** Validate a signed-in account with profiles.first_name set and an account without a usable first name, in both desktop and mobile views. Source and simulated tests alone are not full production acceptance.

## Owner-directed instructional layout revision — 2026-10-23 (v3.3.1)

**Supersedes the earlier provisional instructor identities:** The currently displayed instructor is **Talia Mercer**, not Avery or Elara Voss. The existing authenticated member first-name-only greeting remains unchanged.

**Production source changes:**
- Lab Stage 1 shows **Historical Lab Setup BEFORE the Start heading and instructor**, retaining the same ticker/date/pause/timeframe values and their source-provenance caution.
- Talia's narration is distinctly bordered. Her worked demonstration and comprehension check become separate cards immediately beneath the chart/instructor region.
- Learning Objectives and Market Tutor are side-by-side keyboard-accessible tab controls linked to one content pane below; the Tutor still uses the original authenticated, consent-based service and does not receive private answers.
- Historical chart/source status and historical setup/replay/curriculum references use a second two-tab, shared-content panel while preserving existing attachment references.
- The primary **Start Guided Learning** button is gold/high contrast; an **Ask Market Tutor** action sits next to it and opens the same Tutor tab.
- The member decision and reflection remain in the protected end-of-lesson workbench, now presenting six prompts **one at a time** with Previous/Next navigation. Talia's prompts can be accessed from stages within the guided journey, and prior input is retained while progressing. Existing IDs, decision lock, graded assessment boundary, entitlement checks, server-saved attempt schema and no-look-ahead rules were not replaced.
- The shared application continues to support 419 canonical Labs, four modes and the 30-competency model.

**Evidence:** Source syntax checks passed for instructor, player, engine and workspace-flow modules. Simulated source mounts passed across 419/419 canonical Start and Learn stages. GitHub main was checked against Cloudflare's release manifest after the change. The new regression test is tests/test_v33_focus_workspace.mjs, wired to the existing sitewide CI workflow, with affected browser-test expectations updated.

**Unclosed acceptance:** A signed-in, end-to-end browser session is still required to validate visual layout, mobile focus/order, Tutor request success, protected assessments, saving and actual database persistence. A matching deploy SHA does not prove that all Playwright jobs passed. No new Supabase SQL or billing change was introduced.

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
