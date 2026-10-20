/* v0.14.0.91 Owner-private planning estimates. No payment, grant, promotion or Owner checkboxes. */
export const ownerProductReadinessV01491=Object.freeze({
  "version": "0.14.0.91",
  "reviewedOn": "2026-10-19",
  "basis": "Source inspection of main v0.14.0.90 plus Owner-supplied database audit of October 17; not live production QA.",
  "percentagePolicy": "Estimates are non-certifying ranges for planning only. Values do not rise automatically after commits, CI, publication or an Owner checkbox. Record review evidence first.",
  "salesPolicy": "Four separately priced $29.99/month tools and four paid memberships form the eight existing Stripe SKUs. Other tool records are beta/planned, not automatically sellable.",
  "acceptanceGates":   [
    {
      "title": "AI Tutor — source and curriculum",
      "state": "source_implemented",
      "gate": "v107 combined original glossary + guides, synonym expansion, safe citation validation, model adapter, diagnostic event codes and server-authored transcript saving. New CI outcome is a separate gate."
    },
    {
      "title": "AI Tutor — v102 private transcript SQL",
      "state": "owner_reported_sql",
      "gate": "Owner reported SQL Editor Success. No rows returned; authenticated save/read/delete tests remain pending."
    },
    {
      "title": "AI Tutor — v103 global quota SQL",
      "state": "owner_reported_sql",
      "gate": "Owner reported SQL Editor Success. No rows returned; provider billing and quota operation remain independently unverified."
    },
    {
      "title": "Lab competence — v105 knowledge mapping SQL",
      "state": "owner_reported_sql",
      "gate": "Owner reported SQL Editor Success. No rows returned; 419 candidate mappings are not individually approved."
    },
    {
      "title": "AI Tutor — v107 feedback/rate SQL",
      "state": "needs_installation",
      "gate": "New, separate migration in existing Supabase project for per-member source Tutor throttling and private response feedback."
    },
    {
      "title": "AI Tutor — real generative inference",
      "state": "blocked_external",
      "gate": "Service-side provider key/model, three caps, provider-side monetary ceiling, funded test and truthful commercial disclosures pending."
    },
    {
      "title": "AI Tutor — quality and safety acceptance",
      "state": "needs_live_qa",
      "gate": "Golden-question fixtures and mocked safety regressions cannot certify citation faithfulness, pedagogy or real provider output quality."
    },
    {
      "title": "AI Tutor — transcript authenticity and privacy",
      "state": "needs_live_qa",
      "gate": "v107 server-only response saving implemented. Legacy member-authored notes remain explicitly unverified; retention/deletion policy, user isolation and data requests need production acceptance."
    },
    {
      "title": "419 Labs — editorial and rubric acceptance",
      "state": "editorial_review",
      "gate": "419 IDs, no automatic Lab editorial approval; approve each question, relevant competency, feedback quality and exact answer rubric separately."
    },
    {
      "title": "30 Competencies — evidence and mastery",
      "state": "editorial_review",
      "gate": "One reviewed conceptual quiz may contribute knowledge only. Recognition, decision and process require independent evidence and member-specific QA."
    },
    {
      "title": "Replay/Simulator — authentic history",
      "state": "blocked_external",
      "gate": "Fictional OHLCV training cases are not authenticated historical market data; licensed provenance and no-lookahead acceptance pending."
    },
    {
      "title": "Journal, scanner, watchlist and risk tools",
      "state": "needs_live_qa",
      "gate": "Validate per-member input, persistence, correct calculations, exports, deletion and failure behavior across all offered tool records."
    },
    {
      "title": "Forum + Market Commons",
      "state": "needs_live_qa",
      "gate": "v105 improved request and lock guards. Atomic moderation+audit, anti-spam, appeals, provider content handling and live RLS remain open."
    },
    {
      "title": "Store — Stripe fulfillment and tax",
      "state": "needs_live_qa",
      "gate": "Live checkout/webhook/entitlement/reversal/refund/tax acceptance not established by isolated CI; preserve all existing SKUs and prices."
    },
    {
      "title": "Books — QR, KDP, rights and claims",
      "state": "needs_live_qa",
      "gate": "Verify current book editions, companion URLs, real member book access, licensed media and actual KDP purchase/claim behavior."
    },
    {
      "title": "Legal, privacy, cookies and retention",
      "state": "needs_live_qa",
      "gate": "Published legal_documents entries, crawlable policy content, consent and member data erasure/retention have not been confirmed."
    },
    {
      "title": "SEO, CSP, PWA and accessibility",
      "state": "needs_live_qa",
      "gate": "Verify robots/sitemap, indexed canonical content, restrictive CSP after inline script remediation, installability and screen readers."
    },
    {
      "title": "Operations — backups and incident readiness",
      "state": "blocked_external",
      "gate": "Restore drills, uptime alerts, automated operational workers and billing alert thresholds remain independently unverified."
    }
  ],
  "toolDefinitions": [
    {
      "code": "INTERACTIVE_LEARNING",
      "name": "Interactive Learning & Historical Labs",
      "range": [
        30,
        40
      ],
      "stage": "content-blocked",
      "roadmapId": "CORE-0207",
      "gate": "419 registered Lab IDs; complete reviewed, privately served lessons, actual grading and no-lookahead acceptance."
    },
    {
      "code": "JOURNAL_ANALYTICS",
      "name": "Trading Journal & Performance Analytics",
      "range": [
        55,
        65
      ],
      "stage": "integration-pending",
      "roadmapId": "CORE-0221",
      "gate": "Prove journal create/edit/export, process analytics, per-user isolation and review queue."
    },
    {
      "code": "MARKET_SIMULATOR",
      "name": "Advanced Market Simulator & Replay",
      "range": [
        35,
        45
      ],
      "stage": "data-blocked",
      "roadmapId": "CORE-0218",
      "gate": "Verify datasets, no-future-leakage, deterministic replay, order modeling and journal bridge."
    },
    {
      "code": "MARKET_TUTOR",
      "name": "Market Tutor / AI Teaching System",
      "range": [
        15,
        25
      ],
      "stage": "major-build",
      "roadmapId": "CORE-0210",
      "gate": "v0.14.0.107 source improves combined glossary/guide retrieval, safe request/output policies, confidential diagnostic reason codes, global cap reporting, and golden regression tests. Owner reported v103 SQL successful. Actual paid provider configuration/billing, member rate limits, provenance of saved AI text, accessibility and live teaching quality remain unverified."
    },
    {
      "code": "DISCOVERY_LAB",
      "name": "Market Discovery Lab",
      "range": [
        50,
        60
      ],
      "stage": "beta",
      "roadmapId": "CORE-0218",
      "gate": "Validate CSV imports, screening assumptions, rank explainability, stored records and access controls."
    },
    {
      "code": "SCANNER_BUILDER",
      "name": "Scanner Builder & Historical Scanner Replay",
      "range": [
        50,
        60
      ],
      "stage": "beta",
      "roadmapId": "CORE-0218",
      "gate": "Validate scanner criteria on historical candidates and repeatable no-lookahead testing."
    },
    {
      "code": "WATCHLIST_WORKBENCH",
      "name": "Watchlist & Trade-Plan Workbench",
      "range": [
        55,
        65
      ],
      "stage": "beta",
      "roadmapId": "CORE-0220",
      "gate": "Validate user-owned workspaces, plan state transitions, no-trade classifications and exports."
    },
    {
      "code": "CATALYST_RESEARCH",
      "name": "Catalyst & Filing Research Lab",
      "range": [
        40,
        50
      ],
      "stage": "beta",
      "roadmapId": "CORE-0208",
      "gate": "Require source provenance, filing timestamps, dilution and corporate-action checks."
    },
    {
      "code": "FLOAT_SUPPLY_LAB",
      "name": "Float & Supply Lab",
      "range": [
        60,
        70
      ],
      "stage": "beta",
      "roadmapId": "CORE-0208",
      "gate": "Check float-versus-outstanding calculations, ranges, input validation and sourced examples."
    },
    {
      "code": "MARKET_STRUCTURE_LAB",
      "name": "Market Structure Lab",
      "range": [
        45,
        55
      ],
      "stage": "beta",
      "roadmapId": "CORE-0207",
      "gate": "Verify pivot interpretations, visually accurate teaching examples and no hindsight."
    },
    {
      "code": "MULTI_TIMEFRAME_LAB",
      "name": "Multi-Timeframe Synchronizer",
      "range": [
        45,
        55
      ],
      "stage": "beta",
      "roadmapId": "CORE-0208",
      "gate": "Test time aggregation, corporate actions, timezone handling and future-bar boundaries."
    },
    {
      "code": "RISK_POSITION_LAB",
      "name": "Risk & Position Sizing Laboratory",
      "range": [
        65,
        75
      ],
      "stage": "beta",
      "roadmapId": "CORE-0221",
      "gate": "Test numerical boundaries, exposure budgets, stop direction, spread/slippage assumptions and mobile UI."
    },
    {
      "code": "EXECUTION_LAB",
      "name": "Execution Laboratory",
      "range": [
        55,
        65
      ],
      "stage": "beta",
      "roadmapId": "CORE-0219",
      "gate": "Validate market/limit/stop distinctions, partial fills, cost assumptions and edge cases."
    },
    {
      "code": "LIQUIDITY_SPREAD_LAB",
      "name": "Liquidity & Spread Laboratory",
      "range": [
        60,
        70
      ],
      "stage": "beta",
      "roadmapId": "CORE-0219",
      "gate": "Check bid/ask math, invalid quotes, spreads, fees and worst-case risk disclosures."
    },
    {
      "code": "HALT_SSR_LAB",
      "name": "Halt / SSR / Abnormal Market Lab",
      "range": [
        45,
        55
      ],
      "stage": "beta",
      "roadmapId": "CORE-0207",
      "gate": "Use accurate exchange rules and reviewed halt/SSR scenarios; label hypothetical inputs."
    },
    {
      "code": "PATTERN_FAILURE_LIBRARY",
      "name": "Pattern & Failure Library",
      "range": [
        35,
        45
      ],
      "stage": "content-blocked",
      "roadmapId": "CORE-0207",
      "gate": "Finish source-verified success/failure/no-trade examples with documented criteria."
    },
    {
      "code": "ORDER_FLOW_TAPE_LAB",
      "name": "Order Flow & Tape Laboratory",
      "range": [
        45,
        55
      ],
      "stage": "data-blocked",
      "roadmapId": "CORE-0208",
      "gate": "Require licensed synchronized quote/trade inputs; quote inference is not actual aggressor certainty."
    },
    {
      "code": "MARKET_CONTEXT_LAB",
      "name": "Market Context & Regime Lab",
      "range": [
        40,
        50
      ],
      "stage": "beta",
      "roadmapId": "CORE-0208",
      "gate": "Verify session aggregation, sector/index context and source timestamps."
    },
    {
      "code": "TRADE_REVIEW_REPLAY",
      "name": "Trade Review Replay",
      "range": [
        30,
        40
      ],
      "stage": "data-blocked",
      "roadmapId": "CORE-0220",
      "gate": "Link replay sessions to genuine journal entries, source data and privacy protections."
    },
    {
      "code": "STRATEGY_VALIDATION",
      "name": "Strategy Validation Lab",
      "range": [
        50,
        60
      ],
      "stage": "beta",
      "roadmapId": "CORE-0221",
      "gate": "Test sample-size disclosures, expectancy, R distributions, missing data and outcome bias."
    },
    {
      "code": "OPTIONS_LAB",
      "name": "Options Learning & Simulator",
      "range": [
        5,
        15
      ],
      "stage": "planned",
      "roadmapId": "CORE-0259",
      "gate": "Future project: requires rights-cleared options data and reviewed education; not a V1 sellable tool."
    }
  ],
  "supportingSystems": [
    {
      "code": "LEARNING_SYSTEM",
      "name": "Learning System & Curriculum",
      "range": [
        45,
        55
      ],
      "roadmapId": "CORE-0213",
      "gate": "Complete book-to-lesson-to-competency crosslinks and learner navigation."
    },
    {
      "code": "SKILL_DEVELOPMENT",
      "name": "30 Competencies & Progress",
      "range": [
        40,
        50
      ],
      "roadmapId": "CORE-0213",
      "gate": "v105 SQL installation reported successful. All 419 primary links are CANDIDATE until each exact rubric and competency receives independent Owner review. Record only genuine knowledge-dimension quiz evidence; no activity-only mastery."
    },
    {
      "code": "SKILL_ASSESSMENTS",
      "name": "Skill Assessments & Rubrics",
      "range": [
        20,
        30
      ],
      "roadmapId": "CORE-0209",
      "gate": "Review every assessment rubric; prevent answer leakage."
    },
    {
      "code": "ADAPTIVE_LEARNING",
      "name": "Adaptive Learning & Remediation",
      "range": [
        15,
        25
      ],
      "roadmapId": "CORE-0217",
      "gate": "Recommend approved lessons from defensible scored evidence."
    },
    {
      "code": "LAB_REGISTRY",
      "name": "Historical Lab Registry",
      "range": [
        65,
        75
      ],
      "roadmapId": "CORE-0207",
      "gate": "419 IDs are catalog scope, not 419 finished assessed lessons."
    },
    {
      "code": "FOUNDATIONS_CONTENT",
      "name": "Foundations Authored Lab Scope",
      "range": [
        20,
        30
      ],
      "roadmapId": "CORE-0207",
      "gate": "Preserve 94 authored source records; independently confirm private installed content."
    },
    {
      "code": "HISTORICAL_REPLAY_TRAINING",
      "name": "Historical Replay Learning",
      "range": [
        25,
        35
      ],
      "roadmapId": "CORE-0215",
      "gate": "Finish training-only $19.99 workflow using independently authorized software."
    },
    {
      "code": "SAMPLE_INTERACTIVE_LABS",
      "name": "Sample Interactive Labs & Previews",
      "range": [
        45,
        55
      ],
      "roadmapId": "CORE-0094",
      "gate": "Verify sample quotas, discoverability and correct entitlement exclusions."
    },
    {
      "code": "BOOK_COMPANIONS",
      "name": "Book Companion Learning",
      "range": [
        35,
        45
      ],
      "roadmapId": "CORE-0204",
      "gate": "Resolve authorized book proof, private content and QR/key claim lifecycle."
    },
    {
      "code": "DATA_CONNECTIONS",
      "name": "Optional Market Data Connections",
      "range": [
        35,
        45
      ],
      "roadmapId": "CORE-0218",
      "gate": "Validate provider permissions, credentials, data licensing and failure paths."
    },
    {
      "code": "MY_LIBRARY",
      "name": "Member Library & Book Keys",
      "range": [
        55,
        65
      ],
      "roadmapId": "CORE-0205",
      "gate": "Verify purchase/claim provenance, edition availability and refund revocation."
    },
    {
      "code": "MARKET_COMMONS",
      "name": "Market Commons",
      "range": [
        65,
        75
      ],
      "roadmapId": "CORE-0223",
      "gate": "v105 same-origin/body-size/locked-post improvements merged for both forums. Atomic moderation+audit, verified rate limiting, appeals, RLS tests and production privacy remain open."
    },
    {
      "code": "MEMBERSHIP_FULFILLMENT",
      "name": "Purchase-to-Access Fulfillment",
      "range": [
        35,
        45
      ],
      "roadmapId": "CORE-0197",
      "gate": "Live paid invoice→webhook→tool/plan entitlement has not been independently accepted."
    }
  ],
  "memberships": [
    {
      "code": "FREE",
      "name": "Free Member Preview",
      "scope": "Basic samples and limited explicitly approved tools; no premium unlimited access."
    },
    {
      "code": "ONDEMAND_MONTHLY",
      "name": "Historical Replay Learning $19.99/mo",
      "scope": "Training-only historical replay; excludes first-party simulator, books and brokerage access."
    },
    {
      "code": "FULL_MONTHLY",
      "name": "Full Platform $69.99/mo",
      "scope": "All released first-party tools plus book companion learning; books sold separately."
    },
    {
      "code": "FULL_ANNUAL",
      "name": "Full Platform $699/yr",
      "scope": "Same first-party tool/companion scope, annual billing."
    },
    {
      "code": "LIFETIME",
      "name": "Lifetime $2,499 one-time",
      "scope": "Current/future first-party tools and companions plus conditional five designated eBooks."
    },
    {
      "code": "PICK_WHAT_YOU_WANT",
      "name": "À-la-Carte / Flex",
      "scope": "Pay separately for released individual tools; not an extra all-tools membership."
    },
    {
      "code": "FOUNDING_MONTHLY",
      "name": "Founding Monthly $49.99 draft",
      "scope": "Hidden founding offer; never assume public checkout or provider price exists."
    },
    {
      "code": "FOUNDING_ANNUAL",
      "name": "Founding Annual $499 draft",
      "scope": "Hidden founding offer; never assume public checkout or provider price exists."
    }
  ],
  "nextWork": [
    {
      "priority": "P1",
      "title": "AI Teaching System",
      "roadmapId": "CORE-0210",
      "exitCriterion": "Prove grounded answers, controlled usage, curriculum retrieval, learner privacy and tutor safety."
    },
    {
      "priority": "P1",
      "title": "Foundations Labs & Grading",
      "roadmapId": "CORE-0209",
      "exitCriterion": "Prove a small, fully authored, private and historically supported assessed set before broader release."
    },
    {
      "priority": "P1",
      "title": "Journal Release Acceptance",
      "roadmapId": "CORE-0221",
      "exitCriterion": "Run complete authenticated journal scenario tests and fix defects."
    },
    {
      "priority": "P1",
      "title": "Historical Replay Membership",
      "roadmapId": "CORE-0215",
      "exitCriterion": "Complete actual book-aligned instructions, OnDemand limitations and entitled guided journal."
    },
    {
      "priority": "P2",
      "title": "Simulator Replay & Data",
      "roadmapId": "CORE-0218",
      "exitCriterion": "Publish only proven datasets and reproducible simulations without false tape claims."
    },
    {
      "priority": "P2",
      "title": "Skill Assessment Connections",
      "roadmapId": "CORE-0213",
      "exitCriterion": "Link controlled lab scores, competencies and verifiable remediation."
    },
    {
      "priority": "P2",
      "title": "Specialized Research Prototypes",
      "roadmapId": "CORE-0208",
      "exitCriterion": "Review existing 16 beta tools one by one; gate independent release."
    },
    {
      "priority": "P3",
      "title": "Options Future Branch",
      "roadmapId": "CORE-0259",
      "exitCriterion": "Defer until stock education V1 is accepted; never promise licensed OPRA data."
    }
  ],
  "sourceChecks": {
    "expectedOriginalCore": 281,
    "expectedSupplementalCore": 94,
    "expectedCore": 375,
    "expectedTrace": 1815,
    "expectedTotal": 2190,
    "reason": "375 core checklist tasks plus 1,815 preserved source trace lines are different scopes; blocked is a status count within core tasks, not the 1,815-line source inventory.",
    "missingEvidence": [
      "Installed Supabase content counts",
      "Historical market-data provenance and licensing",
      "Live real-member paid fulfillment",
      "AI service and approved tutor content",
      "Independent account permissions and accessibility QA"
    ]
  }
});
