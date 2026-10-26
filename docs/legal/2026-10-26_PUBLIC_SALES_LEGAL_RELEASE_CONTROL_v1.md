# Public LIVE Sales — Legal Architecture and Release Control

**Project:** The Stock Market: From the Ground Up  
**Publisher/brand:** Crown & Lantern Press (confirm contracting legal entity)  
**Document ID:** GU-LEGAL-LAUNCH-GATE-20261026  
**File:** docs/legal/2026-10-26_PUBLIC_SALES_LEGAL_RELEASE_CONTROL_v1.md  
**Type:** Markdown  
**Version:** 1.0 — legal and engineering readiness review  
**Prepared:** October 26, 2026  
**Status:** POLICY DRAFTS PRODUCED; LAUNCH NOT LEGALLY OR TECHNICALLY ACCEPTED  
**Google Drive location / file ID:** Not assigned; GitHub main is source of draft  
**Purpose:** Assess full-site public commerce, define specialty-counsel review, and prevent false compliance claims.  
**Dependencies:** Supabase published legal_documents v1.1; 14 new policy/addendum drafts; Cloudflare LIVE environment; Stripe/Link; founder terms; KDP edition rights; Auth; Store; ads and Market Commons.

## Executive disposition
The existing site has ten customer-facing legal policies published as v1.1 in Supabase. Ten separate v2 drafts have been created in `docs/legal/drafts/`, plus four product-class addenda. These are proposals, not attorney-approved policies; none has been published to `legal_documents`. Distinct customer rights cannot be extinguished by an all-sales-final statement, and legal text does not substitute for working cancellation, refund, accessibility, data access or digital fulfillment controls.

## Published-document replacement register
| Existing Supabase document_code | Draft replacement in docs/legal/drafts | Key new controls |
| --- | --- | --- |
| TERMS | 2026-10-26_TERMS_v2_REVIEW.md | Identity, purchase, entitlement, community, material changes and limits |
| SUBSCRIPTION | 2026-10-26_SUBSCRIPTION_v2_REVIEW.md | Price/cadence, ROSCA informed consent, easy cancellation, 30/60-day Founder plans |
| REFUNDS | 2026-10-26_REFUNDS_v2_REVIEW.md | Under-$500 discretionary final sale; nonwaivable non-delivery/fraud/errors rights |
| DISCLAIMER | 2026-10-26_DISCLAIMER_v2_REVIEW.md | Actual education, historical vs synthetic, investment adviser boundary |
| PRIVACY | 2026-10-26_PRIVACY_v2_REVIEW.md | Vendors, personal information, retention, statutory rights and AI processing |
| COOKIES | 2026-10-26_COOKIES_v2_REVIEW.md | Inventory-based browser storage, opt-in requirements for optional trackers |
| COPYRIGHT | 2026-10-26_COPYRIGHT_v2_REVIEW.md | KDP, original source licenses, member UGC, DMCA agent eligibility |
| COMMUNITY | 2026-10-26_COMMUNITY_v2_REVIEW.md | Anti-manipulation, notices, moderation and lawful member expression |
| ADVERTISING | 2026-10-26_ADVERTISING_v2_REVIEW.md | Paid sponsorship labels, FTC affiliate disclosures and sponsored independence |
| ACCESSIBILITY | 2026-10-26_ACCESSIBILITY_v2_REVIEW.md | WCAG objective, assistive alternatives and accurate progress claims |

## Product-specific contracts
- 2026-10-26_FOUNDING_600_v1_REVIEW.md: precise 600-seat limit; 30/60-day billing; 10%/15% eligible benefits; purchased vs included Sparks; cancellations and no securities ownership.
- 2026-10-26_CROWNLIGHT_SPARKS_v1_REVIEW.md: noncash internal credits; purchased-never-expire; included bucket expirations and verified wallet debits.
- 2026-10-26_DIGITAL_BOOKS_v1_REVIEW.md: edition rights; exclusive KDP periods; private PDF/EPUB licensing and legitimate delivery remedies.
- 2026-10-26_ACADEMY_BOOTCAMPS_v1_REVIEW.md: instructional deliverables, no performance guarantee, accurate release status and lawful presale contracts.
All are draft and are NOT checkout-authorized agreements until reviewed and versioned.

## Specialist-counsel review matrix
| Discipline | Required legal/operational review | Evidence necessary before acceptance |
| --- | --- | --- |
| Commercial contracts/e-commerce | Party identity, digital license, product offer, terms precedence, enforceability | Legal seller identity; authenticated versioned checkout assent; actual offers |
| Consumer protection and UDAP | Product completeness, omission/misrepresentation, under-$500 policy, mandatory remedies | Refund and delivery evidence; exceptions; dispute support |
| Subscription/auto-renew | ROSCA, state-specific online-cancel and reminder requirements | Separate consent records; easy cancellation; renewal/price disclosures |
| Payments and processor contracts | Stripe Managed Payments/Link merchant-of-record status, refund discretion, webhook duties | Provider eligibility, correct webhook signing secret and status, Stripe Terms review |
| Sales/use tax and VAT/GST | Actual merchant of record per transaction, economic nexus, exemption/responsibility | Tax classification and agreement per product/market; business tax professional review |
| Securities and investment-adviser | Advice vs general education, ticker-specific tutor behavior, publisher exception | Tutor/product-behavior audit; licensed securities counsel classification |
| Privacy / state data protection | Notice, California and other state applicability, rights, AI vendors, sensitive DOB | Verified data map; retention; processor agreements; privacy controls |
| Information security/breach | Reasonable safeguards, breach reporting and incident response obligations | RLS/least privilege; logging; tabletop exercise; vendor risk review |
| IP/publishing/licensing | KDP digital exclusivity, books, licensed OHLCV, trademark and chart reproduction | Per-edition rights, source provenance, content license register |
| User content / copyright | DMCA agent registration, repeat infringer, takedown/counter-notice | Copyright Office record, public contact and functioning workflow |
| Advertising/influencer | Sponsored labels, affiliate links, truthful testimonials and reviews | Creative approval archive; compensation disclosures and claims substantiation |
| Community/platform | Moderation, privacy, hate/threats, market-manipulation referrals | Safe reporting and appeals, audits, staff rights |
| Accessibility | ADA and applicable state requirements, WCAG 2.2 AA design objective | Keyboard/screen-reader/zoom/manual member checkout and Labs QA |
| Children/age eligibility | 18+ signups, DOB minimization and accidental minor data | Age-eligibility enforcement and minor-data procedure |
| Education/licensing | Educational certificates, use of word certified, course outcomes and refund fairness | Learning evidence and honest credential claims |
| Corporate/insurance | LLC/corporation identity, names, imprint/DBA, professional liability and cyber coverage | Corporate filings, policies and actual named merchant |
| Contracts for ad sponsors | Inventory term, disclosures, rights, termination, nonfulfillment and billing | Approved signed B2B sponsorship terms and invoices |
| Consumer disputes and litigation | Dispute venue, mandatory remedies, lawful record retention | Counsel review of clause-specific enforceability, evidence-preservation SOP |
| Email/marketing | CAN-SPAM unsubscribe, authenticated transactional vs promotional messages | Valid postal contact; unsubscribe processing; suppression logs |
| Accessibility/consumer support | Alternative assistance and complaints without deceptive support claims | Tested help flows and response ownership |

## Controlling legal reference and current-law traps
- **ROSCA** (15 USC §8403): disclosures before billing, express informed consent and easy-to-use mechanism to stop recurring charges. https://uscode.house.gov/us/usc/119-120/t15/s8403/
- **Federal FTC 2024 Click-to-Cancel rule is VACATED**; the 2026 Federal Register restored the original 1973 rule; do not falsely claim the vacated provision is currently controlling. Separate ROSCA and state laws still apply. https://www.govinfo.gov/content/pkg/FR-2026-02-12/pdf/2026-02866.pdf
- **California B&P §17602**: online cancellation and certain notices, where applicable. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=17602.&lawCode=BPC
- **Stripe Managed Payments**: Stripe/Link may be merchant of record and control refunds/disputes; processor agreement and actual product eligibility control. https://support.stripe.com/questions/managed-payments-transaction-support-refunds-and-order-management
- **KDP Select**: prohibited third-party digital distribution during enrolled exclusivity. https://kdp.amazon.com/en_US/select
- **Investment adviser definition**: Compensation, personalized recommendations and publisher exclusions depend on conduct, not disclaimers. https://www.sec.gov/files/divisions/investment/iaregulation/memoia.htm
- **FTC advertising endorsements**: paid relationships and false consumer reviews need appropriate disclosures. https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews
- **Copyright Office DMCA agent**: registration and website notice may be prerequisites for safe harbor. https://www.copyright.gov/dmca-directory/
- **CAN-SPAM**: marketing email identification, postal address and opt out duties. https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- **California privacy**: 2026 laws/regulations and applicable-business eligibility assessed before invoking rights obligations. https://cppa.ca.gov/regulations/
- **COPPA**: intended audience 18+, protect against knowingly collecting under-13 data even if account policy requires adults. https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions

## Launch requirements not satisfiable by policy text
1. Confirm legal entity, postal/business contact, support ownership, sales-tax/MoR allocation and state-specific consumer law.
2. Verify each product is **deliverable or separately lawful and disclosed as a preorder**; no Stripe product active flag substitutes for entitlement acceptance.
3. Reconcile all active Stripe webhooks. Current LIVE d1r.pages.dev GU58/F600 endpoints were observed DISABLED; an older pages.dev GU58 endpoint remains ENABLED. Do not enable until actual signing secrets, event lists and provider delivery are validated; no paid Checkout until finished.
4. Complete signed, idempotent settlement → entitlements for every billed category, including Sparks, courses, books, and future tools.
5. Preserve cancel/refund webhooks after disabling any new-sales flag so prior paid customers can be serviced.
6. Test exact-head CI and deployed production parity at 390px and 1280px (with necessary other breakpoints), real authenticated roles, screen reader/keyboard, security roles, account deletion and legal version consent.
7. Approve and publish one coherent versioned legal document set; record acceptance versions for each purchase and changes affecting existing subscriptions.

## Approval authority and change management
Business draft by Owner's AI technical delegate is not legal advice, legal opinion, compliance certification or attorney signoff. Real legal compliance depends on executed operational processes and jurisdiction-specific law. A licensed attorney qualified in consumer-subscription, privacy, securities and publishing issues should review as appropriate. A tax professional should review nexus and MoR boundaries. Current published policies remain v1.1, unless verified otherwise.

## Revision history
| Version | Date | Status | Description |
| --- | --- | --- | --- |
| 1.0 | 2026-10-26 | Draft control record | 10 coordinated policy updates, 4 addenda, legal specialists and launch evidence |

**Footer:** GU-LEGAL-LAUNCH-GATE-20261026 • 1.0 • Draft • No LIVE sale authorization.
