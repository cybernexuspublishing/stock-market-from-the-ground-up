# Legal Policy Publication Record — Website Version 2

**Project:** The Stock Market: From the Ground Up  
**Business branding:** The Stock Market: From the Ground Up / Crown & Lantern Press  
**Document ID:** SMFGU-LEGAL-PUB-20261026-001  
**File type:** Markdown  
**Filename:** docs/legal/2026-10-26_LEGAL_PUBLICATION_RECORD_V2.md  
**Google Drive location:** Not assigned; authoritative source in GitHub main  
**Google Drive document ID:** None — create a separate Drive file only if Drive archiving is authorized  
**Version:** 2.0  
**Prepared / published:** October 26, 2026  
**Project jurisdiction for legal review:** Owner reports operating online from Nixa, Missouri, U.S. (no personal residential address placed in public policy).  
**Purpose:** Establish verified production publication, version history, website routes and remaining acceptance issues.  
**Status:** PUBLISHED IN SUPABASE; LEGAL REVIEW AND NEW-SALES APPROVAL OPEN  
**Dependencies:** Supabase legal_documents, legal-platform.js, Cloudflare Pages, GitHub main, current Privacy/Consent settings, product catalog, Stripe provider roles, state/federal consumer regulations.

## Published production policy inventory
| Code | Version | URL |
| --- | --- | --- |
| TERMS | 2.0 | /terms.html |
| SUBSCRIPTION | 2.0 | /subscription-terms.html |
| REFUNDS | 2.0 | /refund-policy.html |
| DISCLAIMER | 2.0 | /educational-disclaimer.html |
| PRIVACY | 2.0.1 | /privacy.html |
| COOKIES | 2.0.1 | /cookie-policy.html |
| COPYRIGHT | 2.0 | /copyright.html |
| COMMUNITY | 2.0 | /community-guidelines.html |
| ADVERTISING | 2.0 | /advertising-disclosure.html |
| ACCESSIBILITY | 2.0.1 | /accessibility.html |
| FOUNDING_600 | 2.0 | /founding-600-terms.html |
| CROWNLIGHT_SPARKS | 2.0 | /crownlight-sparks-terms.html |
| DIGITAL_BOOKS | 2.0 | /digital-books-terms.html |
| ACADEMY_BOOTCAMPS | 2.0 | /bootcamp-terms.html |

Production base domain: https://stock-market-from-the-ground-up-d1r.pages.dev/. Database RLS allows anon/authenticated SELECT only of `status='published'` records. All published customer-facing policy bodies include the support email stockmarketfromthegroundup@gmail.com. The policy frontend displays version and effective date from the database.

## Publication actions and evidence
1. GitHub `main` migration `supabase/migrations/v0.14.0.306_PUBLISH_ONLINE_COMMERCE_POLICIES_V2_20261026.sql` created; Supabase migration returned success. Fourteen records were confirmed `published`, initially version 2.0 and effective 2026-10-26 19:44:55 UTC.
2. All ten replaced v1.1 originals were archived in private `legal_documents_publication_history_v2`, with RLS enabled and anon/authenticated grants revoked.
3. Corrections `supabase/migrations/v0.14.0.307_LEGAL_POLICY_MINOR_COPY_CORRECTIONS_20261026.sql` applied successfully. Privacy, Cookies, Accessibility now show 2.0.1 with effective date 2026-10-26 19:47:42 UTC; their previous 2.0 texts are also archived.
4. Four new policy pages and product-addendum link navigation were committed on main. A successful Cloudflare deployment was confirmed for the original publication migration commit; later 2.0.1 deployment must be checked independently.
5. Customer-facing text was separated from internal draft checklists and amended to identify support and prospective application to new contracts. No assertion of attorney approval, completed business registration or verified personal street address was published.
6. Website LIVE payment launch flags remain independently controlled and were not changed for this legal publication.

## Missouri and online-only commercial review
- **Missouri business name:** Under Missouri Revised Statutes §417.200, trading under a name other than the person/entity's true name generally requires registering a fictitious business name. Determine whether Cyber Nexus, Crown & Lantern Press, or the trading site name are existing registered legal entities or require DBA filings. Source: https://www.sos.mo.gov/business/corporations/fictitious_faq
- **Nixa home businesses:** Nixa City Code §12-30(b) exempts qualifying no-impact home-based businesses from city business licenses but calls for a Missouri retail sales license or no-tax-due certificate to the city clerk. Other retail arrangements may require a license. A purely online operating model does NOT automatically prove the exemption. Sources: https://ecode360.com/50995481 and https://www.nixa.com/business-licensing/
- **Tax classification:** Missouri DOR says electronically delivered canned software differs from tangible goods, and issued 2026 Letter Ruling 8392 addressing nontaxable electronic textbooks on the specific facts. Those facts do not establish exemption for every membership, course, ad, digital credit or sale outside Missouri. Sources: https://dor.mo.gov/faq/taxation/business/sales-use-tax-exemptions.html and https://dor.mo.gov/rulings/show/8392
- **Out-of-state customers:** Selling online does not eliminate sales/use tax registration, VAT/GST or consumer-protection requirements in customer destinations. Merchant-of-record and seller-of-record obligations must be verified separately for each payment flow.
- **Recurring billing:** ROSCA, applicable state auto-renewal statutes and actual Stripe/Link terms remain relevant. The broad FTC 2024 rule was vacated, so do not represent its exact provisions as currently in force. Source: https://www.govinfo.gov/content/pkg/FR-2026-02-12/pdf/2026-02866.pdf
- **No verified home address published:** Use a lawful business correspondence address when needed; do not expose a personal residential street address without explicit authorization.

## Unresolved release gates
1. Confirm legal seller name, entity type/DBAs, registered business mailing address where needed, and actual merchant-of-record identity; current customer legal documents use verified brand labels but do not independently establish that legal identity.
2. Obtain qualified U.S. business/consumer-subscription, privacy/securities/publishing and tax review of the policies and transaction-specific disclosures. Publication is not a representation of legal compliance.
3. Implement and test versioned policy assent for new subscribers/purchasers and track material notice/consent for existing customers. No retroactive restriction on already completed purchases.
4. Audit actual analytics, cookie/AI processor data practices, data retention, disclosures and U.S. state privacy eligibility.
5. Verify written consent, tax jurisdiction calculations, digital edition rights, product delivery, refund and cancellation UI as part of paid-checkout acceptance; general LIVE checkout remains a separate release.
6. Perform authenticated member-browser validation of all 14 links; a Pages deployment and DB record alone are not proof that a member's client successfully rendered every document. External browsing was unable to access the Pages origin directly.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 2.0 | 2026-10-26 | Published 14 records; archived 10 original published policies; added four legal routes; privacy/cookie/accessibility minor amendments and legal readiness summary |

**Footer:** SMFGU-LEGAL-PUB-20261026-001 • v2.0 • Published, but legal and payment launch review open.
