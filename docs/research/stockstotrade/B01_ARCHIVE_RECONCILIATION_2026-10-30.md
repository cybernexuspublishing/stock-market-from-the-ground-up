# B01 — Archive Research Reconciliation and Instructional Acceptance
Document ID: SMFGU-B01-STT-RECON-001 | Version: 1.0 | Date: 2026-10-30
Project: The Stock Market: From the Ground Up | Status: SOURCE REVIEW COMPLETE FOR SELECTED CANDIDATES; EDITORIAL/PRODUCTION ACCEPTANCE OPEN
Location: GitHub main, docs/research/stockstotrade/B01_ARCHIVE_RECONCILIATION_2026-10-30.md | Google Drive: none | New file: yes
Dependencies: truth5 five-day program, B01 20 private Lab rows, 419-Lab registry, Supabase RLS, shared nine-stage engine. Purpose: preserve selected archive provenance and avoid treating partial source review as validated historical teaching.

## Archive manifest and count rules
- User-provided `StocksToTrade-Browser-Research (8).zip`: archive member `private/observations/RESEARCH_SOURCE_REGISTER.csv` contains **320 source rows**. Its status field includes 260 PARTIALLY REVIEWED, 30 WRITTEN WORKBOOK REVIEWED; VIDEO NOT FULLY REVIEWED, 10 PARTIAL TRANSCRIPT REVIEW, and other variants. These are research *records*, not 320 independently verified videos or trading outcomes.
- Same ZIP includes `STT_HISTORICAL_EXAMPLE_REGISTER.csv`: **29** historical candidate rows, predominantly source-side/partially reviewed, with market data and reuse rights not established; `STT_CLAIMED_TRADE_REGISTER.csv`: **20** claimed trade rows, explicitly not owner-verified in many cases.
- User-provided `STT.zip` contains **118 ZIP entries including directories** and 2026-era primary/derivative research deliverables and proprietary course transcripts. No blanket assertion of 116 unique source documents or authorization to republish course transcripts.
- Source-specific records preserve their existing IDs (STT-S-xxxx). The website discovery batch registry uses different IDs and **has not been fully ID-deduplicated** across the archives. Treat totals as nonadditive.
- Original third-party full transcripts and proprietary image assets are not committed.

## B01 priority source crosswalk from browser archive
| Day | Archive source IDs | Source role | Evidence disposition |
|---|---|---|---|
| 1 — Claim categories | STT-S-0268 (SEC how to read 8-K), STT-S-0133 (STT University SEC-filings lesson), STT-S-0247 (Apple Form 8-K) | Distinguish actual corporate disclosures, educational interpretation and news amplification | Primary SEC source candidates; university lesson is written-workbook-reviewed, not fully transcript-reviewed |
| 2 — Originator and chain | STT-S-0036 (issuer IR home), STT-S-0037 (issuer press release), STT-S-0250 (SEC-filed earnings exhibit) | Determine issuer originator, linked supporting filing and independent corroboration | Source records partial; corporate records need item-by-item issuer/date comparison |
| 3 — Information cutoff | STT-S-0247 (date-stamped filing), STT-S-0250 (earnings exhibit), STT-S-0268 (SEC reader guide) | Lock EDGAR acceptance/filing time vs press release and later headlines | Filing dates are document evidence; exact intraday availability and public dissemination remain case-specific |
| 4 — Misleading numbers | STT-S-0246 (Apple Form 10-K), STT-S-0210 (Groupon rights prospectus), STT-S-0248 and STT-S-0249 (Seven Hills rights notices), STT-S-0253 (Reg SHO context) | Percent denominators, rights/offering capacity versus actual proceeds, short-sale metrics | Financing claims must be read in primary disclosure; no implied full draw, completed sale or guaranteed outcome |
| 5 — Independent audit | STT-S-0256 (Coinbase direct-listing prospectus), STT-S-0192 (reverse splits), STT-S-0231 (Nasdaq rules), STT-S-0133 (educational secondary source) | Fresh document review with issuer identity, conditions, chronology, alternative explanations, NO TRADE | Historical price/replay and protected grading acceptance still required |

## Independently corroborated source rules (2026-10-30)
1. **Form 8-K**: The official form's General Instructions, section B.1, generally require a Form 8-K within four business days of a specified reportable event unless otherwise specified; distinct Regulation FD timing obligations may apply. Primary URL: https://www.sec.gov/files/form8-k.pdf ; SEC staff interpretive guidance (updated 2026-10-21): https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations-cfis/exchange-act-form-8-k . Do NOT teach '8-K must precede every press release.'
2. **Short sale volume is not short interest**: FINRA explicitly distinguishes transactional short-sale volume from open short positions observed at reporting dates. Source: https://syndication.finra.org/content/short-interest-what-it-what-it-not . Never infer a squeeze from either number alone.
3. **Filings can be misrepresented**: SEC Investor.gov warns that scammers can use genuine or fabricated SEC filings to misrepresent issuer or advisor status; existence of a filing does not by itself validate the advertised business conclusion. Source: https://www.investor.gov/protect-your-investments/fraud/types-fraud/false-claims-sec-registration .

## Five-day nine-stage teaching integration plan (original, ungraded proposals)
For **each day**, the required nine stages are: (1) zero-knowledge introduction, (2) source-based worked example, (3) interactive variable manipulation, (4) locked initial prediction plus confidence, (5) guided reasoning, (6) fresh independent case, (7) specific error remediation with free deeper teaching, (8) cross-context transfer, (9) securely recorded result and assistance state. These stages are acceptance requirements and are NOT certified merely by adding source-audit callouts.

- **Day 1:** source classification matrix; experiment by changing 'signed' to 'proposed' while keeping promotional headline fixed; fresh case tests recognition of what a filing establishes.
- **Day 2:** map a four-node citation chain; remove original issuer evidence and reassess independent support; fresh source-chain topology with a circular reference.
- **Day 3:** set an information cutoff and time-zone; hide later corrections; fresh documents with conflicting `published`, `updated`, and `accepted` timestamps.
- **Day 4:** calculate true growth with explicit units and denominator, then distinguish authorized securities, available offering capacity, issued shares and cash proceeds; independently classify FINRA short volume vs short interest.
- **Day 5:** six new independent cases with private answers: proposed contract; circular reporting; later correction; financing capacity; short-sale-volume mislabeling; unsupported audited performance. Capture source, cutoff, terms, contrary evidence, unknowns, and no-trade rationale.

## Editorial review gates (not passed here)
- Review each of the original five live truth5 day lessons individually for accessibility, arithmetic, first-principles explanation, nine-stage implementation and no answer-key leak.
- Review **all 20 specific canonical B01 private Lab rows** from `docs/releases/2026-10-25_TRUTH5_AND_LAB_BATCH01_GATE.md`; source references must map to actual Lab competencies, not broadcast the same case to irrelevant Labs.
- Produce fresh nonduplicative, server-private grading keys and independently approve them; do not reuse the ungraded examples above as protected cases.
- Confirm authenticated member entitlement, account isolation, persistence and grading in a real browser; fixture tests alone do not constitute acceptance.
- Validate specific historical cases with original OHLCV and licensing if used. Until then use unmistakably **FICTIONAL** exercises.

## Revision history
| Date | Version | Modification | Acceptance |
|---|---|---|---|
| 2026-10-30 | 1.0 | Archive counts, crosswalk, verified rules and original nine-stage case blueprint | GitHub research documented; private content and member acceptance open |

Footer: Crown & Lantern Press / Cyber Nexus. Research record, not financial advice, independent legal approval, protected grading or deployment certification.
