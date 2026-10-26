-- POLICY PUBLICATION v2.0 | Owner-directed prospective website publication, 2026-10-26
-- Source documents: docs/legal/drafts/2026-10-26_*_REVIEW.md
-- Public policies are deliberately modified to omit internal checklists and unverified identity claims.
-- This migration does not authorize checkout, alter Stripe config, or retroactively change existing contracts.
BEGIN;
CREATE TABLE IF NOT EXISTS public.legal_documents_publication_history_v2 (
 document_code text NOT NULL, version text NOT NULL, title text NOT NULL, slug text NOT NULL,
 body_markdown text NOT NULL, effective_at timestamptz NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(document_code,version)
);
ALTER TABLE public.legal_documents_publication_history_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legal_documents_publication_history_v2 FROM anon, authenticated, public;
DO $GU_PREFLIGHT$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE version='1.1' AND status='published' AND document_code IN ('TERMS','SUBSCRIPTION','REFUNDS','DISCLAIMER','PRIVACY','COOKIES','COPYRIGHT','COMMUNITY','ADVERTISING','ACCESSIBILITY')) <> 10 THEN
  RAISE EXCEPTION 'Expected ten published legal version 1.1 records before prospective v2.0 release';
 END IF;
 IF (SELECT count(*) FROM public.legal_documents WHERE document_code IN ('FOUNDING_600','CROWNLIGHT_SPARKS','DIGITAL_BOOKS','ACADEMY_BOOTCAMPS')) <> 0 THEN
  RAISE EXCEPTION 'Product-class addendum already exists; manual version review required';
 END IF;
END $GU_PREFLIGHT$;
INSERT INTO public.legal_documents_publication_history_v2(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at FROM public.legal_documents
WHERE version='1.1' AND document_code IN ('TERMS','SUBSCRIPTION','REFUNDS','DISCLAIMER','PRIVACY','COOKIES','COPYRIGHT','COMMUNITY','ADVERTISING','ACCESSIBILITY')
ON CONFLICT(document_code,version) DO NOTHING;
WITH proposed(document_code,title,slug,body_markdown) AS (VALUES
  ('TERMS','Terms of Service','terms',$GU_TERMS_20261026$
### Application to new purchases and existing customer rights
These Terms apply to new website registrations and purchases beginning on the effective date shown above. Earlier completed purchases retain their applicable agreed terms and nonwaivable legal rights. Material changes to existing recurring contracts require additional notice or consent when required by law.

### 1. Contract and scope
These Terms govern use of The Stock Market: From the Ground Up website and its education, historical exercises, fictional practice environment, trading journals, research materials, books and companion materials, Market Commons, AI-supported tutor, subscriptions, and digital purchases. “We,” “us,” and “Operator” mean the seller identified in the applicable checkout or transaction receipt. This online educational service operates under The Stock Market: From the Ground Up and Crown & Lantern Press branding; no walk-in retail storefront, local pickup, or in-person purchasing facility is represented. Where Stripe or another provider is merchant of record, its transaction terms also apply. Product-specific terms and mandatory consumer law control where they conflict with these general Terms.

### 2. Age and account eligibility
Account registration and purchase require a person aged at least 18 years. Provide accurate details and protect your login credentials. Do not share accounts or credentials. The Operator may reasonably verify eligibility and temporarily restrict access for credible security, fraud, payment abuse, or misconduct concerns, subject to applicable law and appeal/support processes. Do not upload third-party confidential information, payment card numbers, or market-data credentials into public community posts or tutor questions.

### 3. Educational, not brokerage, services
The Operator supplies general education and self-directed practice, not brokerage, custodial trading, portfolio management, fiduciary services, or tailored investment recommendations. No trade is executed with real money through the educational chart and simulation tools. No learning score is a license or professional credential. Members remain responsible for independently verifying market information and consulting licensed professionals when appropriate.

### 4. Plans and product-specific entitlements
Available features, current price, billing duration, start date, prerequisites, and deliverables must appear in the offer before purchase. Store visibility and a Stripe catalog record do not create a purchase entitlement. A purchased membership, Tool Pass, or course grants only the approved first-party access expressly described for that SKU, during the valid entitlement period. An inactive, unreleased or unavailable capability is not represented as delivered. Third-party data, thinkorswim access, brokerage services, and market subscriptions are not included unless the specific offer expressly states otherwise.

### 5. Orders and payment
By placing an order, you authorize the stated one-time or recurring charges, with applicable taxes shown by checkout. A purchase is completed only after the payment provider reports its required success state. Access is provisioned against verified provider evidence, not by visiting a success page alone. Charges, taxes, merchant of record and payment services may be administered by Stripe/Link or another provider identified during checkout. Orders may be rejected for insufficient availability, suspected fraud, rights restrictions, age ineligibility, or failed price/entitlement validation.

### 6. Recurring billing
Recurring offers identify the renewal price, billing interval, cancellation process, and material limitations before payment. Separate informed consent is required where applicable. Cancel through the Member Dashboard's billing controls or Support Center; cancellation of future billing and refund eligibility are distinct. The Subscription & Billing Terms and product checkout disclosure form part of this agreement.

### 7. Digital access and intellectual property
Unless explicitly sold as transferable ownership, digital books, courses, illustrations, software interfaces, instructor content, and tools are licensed for individual personal learning. Do not republish, scrape, resell, redistribute, publicly expose private grading keys, circumvent access controls, or use other people's copyrighted/market-data works without rights. Fair use and other nonwaivable lawful uses are preserved. Original content that you submit remains yours; you grant the Operator a limited non-exclusive license to store, reproduce, moderate and display that submission only as needed to provide the services, maintain backups, meet legal obligations, and exercise rights described in the Privacy and Community policies.

### 8. Community and user conduct
Do not impersonate, harass, defraud, coordinate unlawful market manipulation, post fabricated performance claims, distribute malware, expose personal information, infringe copyrights, or use forums for undisclosed paid promotion. We may moderate posts and impose proportionate, reviewable account restrictions. User posts, ratings, trading claims and sponsor materials are not guaranteed accurate or endorsed.

### 9. Third-party services
Third-party software, books, broker platforms, market-data providers, payment networks, and external links are governed by their own agreements. You must hold authorized credentials and licenses. Names and marks do not indicate affiliation or sponsorship. Third-party access can change or terminate beyond the Operator's control; a material failure to provide explicitly promised paid benefits is reviewed under the applicable remedy provisions.

### 10. Service changes, cancellation and support
We may change or discontinue future features and content, but will not unilaterally erase paid-through rights or materially reduce purchased services without addressing applicable obligations and remedies. Security changes may require immediate action. The Refund & Cancellation Policy and relevant order terms determine permitted refunds, cancellations, and access adjustments.

### 11. No warranties of trading outcomes
Educational content and market observations may contain errors, stale feeds, synthetic examples, or limitations. No profit, returns, trading results, specific learning achievement, or uninterrupted third-party connection is promised. Any disclaimers or limitations apply only to the maximum extent the law permits; they do not remove consumer rights regarding materially undelivered or misrepresented purchased services.

### 12. Liability and dispute handling
The Operator is not responsible for members' independently initiated brokerage trades or unauthorized redistribution by other members solely by virtue of providing education. No provision excludes liability for intentional misconduct, fraud, or other responsibility that cannot lawfully be limited. Raise order or account concerns through the Support Center. A forum selection, arbitration provision, class-action waiver, or hard damages cap will not apply unless separately approved by licensed counsel and validly incorporated into the purchase contract.

### 13. Changes and consent
We will publish material prospective policy updates with clear effective dates and provide notice and any required consent for changes affecting ongoing paid terms. Transaction-specific agreed prices and statutory rights cannot be silently amended.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_TERMS_20261026$),
  ('SUBSCRIPTION','Subscription & Billing Terms','subscription',$GU_SUBSCRIPTION_20261026$
### Scope and affirmative authorization
Only products expressly labeled recurring renew automatically. At the time an eligible recurring purchase becomes available, its checkout displays the seller or merchant of record, recurring price, interval, currency, initial term, renewal rules, relevant tax disclosures, restrictions, and cancellation procedure. Do not infer subscription consent from accepting generic website Terms alone.

### Standard offerings
Individual Full Platform, Historical Replay Learning, and Tool Pass offers identify their then-current authorized price and billing interval at checkout. A product listed in the Store is not itself an active offer for payment.

### Founding Members
Subject to a shared 600-account limit and explicit eligibility: Founding Standard is **$49.99 recurring every 30 days**; Founding Extended is **$59.99 recurring every 60 days**, each until canceled. These are day-based terms, not calendar-month substitutions. They do not automatically change into standard memberships. The Founding discount applies only to separately eligible first-party purchases, not the Founding renewal charge. Standard's discount is 10%; Extended's discount is 15%, including eligible Lifetime Membership purchases, according to the published benefit conditions. An earned discount must be applied before payment or the purchase must be blocked; it must never be promised and then omitted from the charge.

### Crownlight Sparks tied to subscriptions
Included Sparks follow the applicable allocation and expiry terms and do not automatically extend earlier grant buckets. Founding Standard includes 5 Sparks per confirmed paid 30-day cycle, expiring 90 days after that cycle ends; Extended includes 15 per confirmed paid 60-day cycle, expiring 150 days after that cycle ends, unless a subsequently approved offer explicitly states otherwise. Separately purchased Sparks do not expire. Wallet balances are not cash or stored financial value.

### Consent, receipt and records
A customer must affirmatively authorize automatic recurring charges during checkout. We retain available order and consent evidence and provide access to transaction details. Clicking a Store listing alone does not authorize recurring billing.

### Cancellation
Members may use their Dashboard billing portal to cancel future renewals. Where portal functions are unavailable, Support must provide a workable alternative. We will not require a cancellation phone call or obstruct canceling an online enrollment where applicable law prohibits it. Cancellation ordinarily stops future charges; paid access remains until its lawful and disclosed paid-through time, subject to exceptions and fraud/security restrictions.

### Plan changes, retries, and failure
Changes between plans may affect billing dates, access and prorations as disclosed during the change process. We investigate duplicate charges and billing mistakes. Failed charges may cause a subscription to be identified as past due rather than paid. Authorized retries follow the disclosed provider contract and law. A canceled plan must not continue to bill due to an internal interface state error.

### Notices and governing laws
Any renewal, price-change, annual reminder, and material-change notices required by applicable law will be provided. Online renewals are subject to ROSCA's disclosure/consent/cancellation requirements and applicable state automatic-renewal laws. Stripe/Link customer support and merchant-of-record obligations control where Managed Payments is the checkout provider.

### Refunds and disputes
Canceling future billing does not by itself refund earlier periods, but the Refund & Cancellation Policy, mandatory legal remedies, and processor rulings remain applicable.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_SUBSCRIPTION_20261026$),
  ('REFUNDS','Refund & Cancellation Policy','refunds',$GU_REFUNDS_20261026$
### Earlier purchases
The updated discretionary refund standard applies prospectively to purchases completed after this policy's effective date. Previously completed orders retain all contractual and legal rights that governed them.

### Ordinary final-sale rule for delivered digital products
For completed transactions with a purchase subtotal below **$500.00 USD**, we ordinarily do not grant **discretionary refunds** after the purchased digital product or period of service has been delivered or made available as expressly promised. Change of mind, nonuse, or choosing a different product generally does not establish a discretionary refund right. The threshold applies to the pre-tax, post-discount subtotal of the individual transaction; unless the law applicable to that transaction or the payment provider requires another calculation.

### Exceptions are not limited by transaction amount
No final-sale statement overrides applicable law, the terms disclosed at checkout, a payment-network/merchant-of-record remedy or a legal duty to correct a billing error. We will investigate unauthorized or suspected fraudulent charges, duplicate or incorrect charges, material nondelivery, defective or unusable purchased access, material misdescription, required cancellation remedies, accidental renewal after a valid cancellation, and other legally protected claims. Customers need not prove that a crime occurred before reporting an unauthorized charge or exercising lawful consumer/dispute rights. A request will be assessed on available evidence rather than rejected merely for lack of a police report.

### Transactions at or above $500
There is no automatic entitlement to a discretionary refund based solely on reaching $500. Each request is evaluated against the disclosed offer, evidence, applicable law, and payment-provider requirements.

### Nonreleased products and preorders
A catalog entry marked Coming Soon is not evidence that the item is available. If a separately authorized preorder is offered, its checkout identifies the deliverable, expected schedule, cancellation rights and any legally required remedies. We cannot reject a mandatory refund for an undelivered preorder merely because the sale is below $500.

### Subscriptions
Canceling a recurring plan stops future renewals according to the valid cancellation and provider terms and is separate from a refund request. Canceling does not remove mandatory billing-error rights or legally required restitution. Confirmations and dispute review should cite the actual paid period, canceled-at/paid-through dates, and provider transaction IDs.

### Books and external retailers
For a Kindle, paperback, hardcover or other purchase completed through an external retailer, follow that merchant's return/refund rules. An order placed on this website is governed by the correctly identified merchant of record and the site's applicable product terms, including digital distribution rights.

### Crownlight Sparks and entitlements
Verified refunds, chargebacks or reversals may reverse a corresponding purchase entitlement in a documented, non-duplicative manner after provider confirmation. This does not permit arbitrary seizure of unrelated purchased balance or previously earned progress.

### Stripe Managed Payments and disputes
Where Stripe via Link acts as merchant of record, Stripe may independently decide or process refunds and chargeback responses under its agreements. We may provide supporting records and product-delivery evidence, but do not promise to override Stripe's decision. Members retain lawful card, bank, and statutory dispute rights. We do not penalize members solely for asserting a lawful dispute.

### Requests and processing
Use the Support Center and provide the order number, purchase date, amount and issue description; never send card numbers. We review requests in accordance with applicable laws and provider requirements; processor and financial-institution settlement times vary. When approved, refunds generally go to the original payment method and appear subject to processor/bank settlement.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_REFUNDS_20261026$),
  ('DISCLAIMER','Educational & Trading Disclaimer','disclaimer',$GU_DISCLAIMER_20261026$
### General educational purpose
All website content, books, historical Labs, source-verified case studies, Talia tutor responses, hypothetical charts, simulated practice exercises, watchlists, scanners, Journal records, forums and AI-generated explanations are intended to teach general market concepts, analytical reasoning, source verification and risk awareness. They are not individualized advice, portfolio management, brokerage order execution, advisory fiduciary services, market making, a signal subscription, or a recommendation tailored to any individual's objectives, finances, risk tolerance or circumstances.

### Actual service boundaries
The website does not execute securities trades or custody brokerage funds. Illustrative chart exercises and historical replay do not reproduce a live broker simulator. Use of thinkorswim OnDemand, where discussed, requires separately authorized access from its provider and is not included unless expressly stated in a specific offer. No third-party broker or market-data provider sponsors, endorses or warrants this platform merely because its name or functionality is discussed.

### Accuracy, licensing and no hindsight
Markets involve risks including substantial or total loss of capital, illiquidity, slippage, gaps, volatility halts, partial fills, stop-order uncertainty, costs, leverage and overnight exposure. Historical and hypothetical examples have hindsight/selection bias. Source-reported trade narratives are not independent brokerage confirmations. Price/volume bars may be historical, delayed, synthetic, provisional, incomplete or corrected; labels should disclose provenance. No training outcome, backtest or past trade implies future performance.

### AI tutor and independent judgment
Talia offers educational teaching assistance and may make mistakes. It must not direct individualized securities trades, solicit portfolio details as individualized advice, or present simulated or illustrative exercises as live quotes. Members must check material facts against appropriate primary sources, trading platform records and licensed professionals. A membership does not form an investment adviser-client, broker-client, attorney-client, or tax-advice relationship.

### Conflicts, paid sponsors and securities discussion
Paid advertising and sponsored educational material are identified separately and do not control grading, prices, risk assessments or learning recommendations. User community posts may be inaccurate, self-promotional or financially conflicted. No part of a marketplace or forum is a guarantee against market manipulation.

### Registration boundary
Whether a particular service legally constitutes investment advice depends on conduct, compensation, tailoring and applicable securities law, not this disclaimer alone. The Operator will not represent itself as exempt from adviser, broker-dealer or other registration duties without appropriate fact-specific legal review.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_DISCLAIMER_20261026$),
  ('PRIVACY','Privacy Policy','privacy',$GU_PRIVACY_20261026$
### Data controller and covered systems
This statement applies to information collected by The Stock Market: From the Ground Up and the first-party site account, educational content, Market Commons, Journal, support, Store and payment interactions. Privacy questions and lawful requests may be submitted through the Support Center or to stockmarketfromthegroundup@gmail.com. The educational service operates online from Missouri, United States. Payment processing may be provided by a separately identified merchant of record, including Stripe via Link for eligible purchases; that provider may act as an independent controller for its own legally mandated functions.

### Information categories and sources
Information processed to operate services can include your account name, username, email, protected date of birth or age eligibility, login/session and security identifiers, device/network logs, preferences, account access roles, educational actions and competency evidence, tutor prompts and answers, practice and Journal records, community posts, moderation reports, support messages, and purchase/order/subscription data. Payment providers process card and payment details directly; we may receive limited payment identifiers, pricing, status, fraud/dispute signals and receipts. Connected market-data credentials, if supported, are sensitive user-supplied information and should not be shown publicly.

### Use purposes
We process appropriate data to register and authenticate adults, preserve learning progress, deliver entitlements, reconcile orders, operate course tools, support customers, enforce safety and anti-abuse rules, diagnose outages, fulfill reporting duties, comply with law, and administer optional marketing or advertising where supported and authorized. Do not represent behavioral profiles or trading ideas as licensed professional advice. An advertiser does not receive private tutor messages or payment credentials merely by purchasing an ad.

### Disclosures and service providers
Infrastructure and transactional service providers may include Supabase, Cloudflare, Stripe/Link, email communications providers, marketplace/print distributors and member-selected data connections. Each receives only the information reasonably necessary for its function under its agreements and applicable law. Providers involved in current operations include Cloudflare, Supabase, and Stripe. Additional service providers may participate in particular user-selected features, retail orders, support and educational delivery. Their own privacy terms may also apply. Community posts and voluntary public profile information are visible as described by their audience settings.

### Optional features, AI and ads
The educational tutor may process member prompts and interaction results as necessary to provide guidance, monitor quality and prevent misuse. Where external AI processing is used for educational assistance, member prompts and instructor responses may be processed by the relevant provider. Avoid entering private account credentials, full card numbers, brokerage passwords, or highly sensitive information in tutor messages. Optional analytics, tracking, targeted advertising and marketing communications require the notices, legal bases, consent/opt-out mechanisms and configuration applicable to each jurisdiction. Do not claim that data is never shared, never trained on or never transferred overseas without auditing service contracts and settings.

### Retention and deletion
We retain personal information as reasonably necessary to deliver service, preserve learning records, protect account security, maintain financial records and satisfy applicable legal requirements. Some order, chargeback, fraud and audit records must survive account closure when legally necessary. A deletion request does not entitle the requester to erase evidence that law requires the business to retain, but remaining personal information should be minimized and access-restricted. A verified retention schedule must identify categories, retention periods, legitimate exceptions and deletion jobs.

### Privacy and account requests
Adults may request access, correction, export, deletion, marketing preference changes or other rights where law grants them. The Support Center and privacy contact should authenticate sensitive requests without collecting excessive additional information. Rights vary by jurisdiction, and any applicable appeal, opt-out, authorized-agent, sensitive-data and nonretaliation mechanisms must be implemented before claiming availability. We will not condition lawful rights upon abandoning membership claims or waiving disputes.

### Security and incidents
Our technical safeguards include encrypted connections, restricted data access, server-side credential handling and operational security reviews. No system can guarantee complete security. No platform can warrant absolute protection. If an incident triggers notification obligations, notices will follow applicable law and regulator/provider requirements.

### Age and sensitive data
This service is intended for adults aged 18 and older. Do not knowingly open accounts for minors. Preserve restricted treatment of DOB and connected credentials. Avoid collecting unneeded brokerage passwords, SSNs, precise financial-account information or special-category data.

### Cookies and changes
The Cookie Notice details browser-side technologies. Material changes to purposes, providers or rights will be communicated when the law requires and may require fresh consent. For privacy inquiries, contact stockmarketfromthegroundup@gmail.com.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_PRIVACY_20261026$),
  ('COOKIES','Cookie & Local Storage Notice','cookies',$GU_COOKIES_20261026$
### Scope
Cookies, web storage and related technologies are used by the website and approved service providers. Some are required to establish secure sign-in, protect against abuse, retain authentication state, keep page navigation accessible, and respect interface preferences. Examples of preferences may include text size, instructor text size, visual scaling, selected tabs and member display settings.

### Essential technologies
Authentication and security state, CSRF prevention, anti-abuse challenges, load/performance safeguards, and session continuity may need device/browser storage. Clearing essential storage can log out the user or interrupt features. The particular storage technologies may change as website and third-party services evolve.

### Optional analytics and advertisements
Optional analytics, campaign measurement, personalisation, interest-based advertising or third-party advertising technology are not automatically essential. Their use must respect applicable consent, notice and opt-out laws. Where the law requires a consent or opt-out mechanism for optional tracking, applicable controls will govern its use. Payment providers and embedded third-party services may apply their own technologies under their separate notices; our integration should minimize unnecessary exposure.

### User controls
Where optional storage choices are offered, they should be accessible through appropriate Privacy/Consent settings and operate before applicable trackers fire. Browser settings may block or remove cookies, though essential functionality can stop working. Browser signals and statutory opt-out requests will be honored where applicable and technologically supported, after verification.

### Updates and inventory
Changes in a vendor, purpose or tracking category may require updated disclosures and renewed choice. Questions about cookies or browser storage may be directed to Support.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COOKIES_20261026$),
  ('COPYRIGHT','Copyright & Intellectual Property Notice','copyright',$GU_COPYRIGHT_20261026$
### Our material and license
Original educational lesson text, design, images, exercises, platform software, workbook organization, source annotations, original book manuscripts and distinctive first-party branding belong to their respective owners. An eligible membership or individual purchase provides a limited, nonexclusive, nontransferable right for personal educational use during the applicable term. It does not transfer copyright, a public redistribution license, or a right to publish private grading keys.

### Member content
You retain copyright in content you independently create and have rights to post, such as your own Journal entries or Commons contributions. You grant a limited license only as necessary to host, display to your chosen audience, transmit for services, moderate, back up and comply with law. You represent you have rights to content you upload and will not post confidential brokerage statements or copyrighted charts/media beyond your permissions.

### Third-party intellectual property
Securities symbols, exchange data, broker software names including thinkorswim, market charts, regulatory filings, logos, books and quoted sources may belong to third parties. Descriptive mention does not assert affiliation, endorsement or licensing. Source research archives may include restricted third-party material and personal browser data and must not be published or redistributed without permission. The educational credibility of research does not establish permission to reproduce or redistribute protected third-party materials.

### Digital books, exclusivity, and editions
Digital distribution rights are edition-specific. If a title is enrolled in KDP Select, its digital format cannot be independently distributed on this website during the applicable exclusivity period. Print editions and retailer links may follow different conditions. No standalone PDF/EPUB delivery is permitted before the edition's rights, storage and private download entitlement are verified.

### Reporting infringement
Rights holders can submit specific notices identifying the protected work, allegedly infringing material, location, good-faith basis, contact information, and authority to act. We will review legally sufficient notices promptly and follow any required counter-notice/restoration process. Repeat infringers may lose content-posting privileges under a reasonably implemented policy, subject to applicable law.

### DMCA designation
For copyright reports or inquiries, contact stockmarketfromthegroundup@gmail.com with the relevant work and material location. Nothing in this notice asserts a completed U.S. Copyright Office designated-agent registration.

### Permitted uses and enforcement
Contract restrictions do not prohibit fair use, protected consumer criticism, lawful reverse engineering where protected, or other rights that cannot be waived. We may suspend access for credible infringement, preserve relevant evidence, and refer matters to appropriate providers or authorities when required.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COPYRIGHT_20261026$),
  ('COMMUNITY','Community Guidelines','community',$GU_COMMUNITY_20261026$
### Purpose
Market Commons hosts general stock-market education, evidence-based discussion, chart and research analysis, and peer-to-peer learning. Posts are user-generated expression, not individualized investment recommendations or independently validated market information.

### Member conduct
Use respectful communication. Do not harass, threaten, dox, stalk, impersonate, or publish personal credentials, contact information, financial account statements or restricted private data. Fraud, phishing, malware, harmful code, scams, market manipulation, pump-and-dump coordination, undisclosed paid promotion, misleading endorsements, manufactured reviews, or false claims of guaranteed gains are prohibited. Do not pressure others into specific securities transactions.

### Sources, charts and results
Distinguish verified primary-source facts, your own interpretation, estimates, hypotheticals, synthetic charts, retrospective performance and first-hand executions. Use citations and preserve timestamps where practical. Do not imply historical chart data is licensed or independently authenticated when it is not. Recorded performance must not be fabricated, and screenshots of private brokerage accounts or copyrighted feeds may require redaction or permission.

### Moderation and escalation
Authorized moderators may move, label, temporarily hide, close, restrict or remove content when reasonably needed for safety, legal compliance or topic integrity, and may restrict repeat abusers. Log moderation actions with permissible appeal and support routes. Members may report abuse, intellectual property complaints, dangerous misinformation or account compromise without posting sensitive data publicly.

### Member-created content and privacy
Members retain their independent rights in their original posts while granting limited hosting and moderation rights under the Terms. Do not upload copyrighted paywalled lessons, book PDFs, vendor datasets or identifiable third-party financial information without permission. Private messages and journals remain restricted to authorized users and staff only as required for service operation, safety and legal compliance.

### Advertisements and testimonials
Paid placement and relationships must be disclosed close to promotional statements. Community inclusion does not mean endorsement by the Operator. Sponsor compensation does not confer learning grade control or authority to dictate educational conclusions.

### Enforcement and rights
Enforcement decisions may reflect gravity, repeated conduct, good-faith misunderstanding and legal rights. No policy waives lawful criticism, consumer reviews, reporting rights, or legally protected communications.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COMMUNITY_20261026$),
  ('ADVERTISING','Advertising & Sponsorship Disclosure','advertising',$GU_ADVERTISING_20261026$
### Clearly identified paid promotion
Some areas may display paid advertisements, sponsor branding, or affiliate links. Advertising must be recognizable as promotion at the point of display, rather than disguised as independent instructor guidance, moderator messages, product ratings or market signals. Where a sponsored or affiliate relationship could affect a reasonable consumer's assessment, we will disclose that relationship clearly and close to the content or link.

### Educational independence and prohibited claims
Sponsors do not purchase control over Talia's teaching, Lab answer keys, assessment results, member journal analysis, market data evidence standards or moderation outcomes. We may reject or remove promotions with false trading performance, deceptive pricing, unlicensed brokerage offerings, fabricated testimonials, inappropriate targeting, malware or other legal and reputational risks. Paid status must never imply security legitimacy or regulatory approval.

### Member data and advertiser measurement
Ad reporting may involve legitimate impressions, clicks and aggregate campaign performance, subject to actual configured tracker choices, the Privacy Policy and applicable consent/opt-out law. Advertisers do not receive passwords, raw payment card data, restricted age information or private learning conversations merely for buying a placement. Any actual personalized audience sharing must be explicitly and accurately disclosed and authorized where required.

### Reviews, testimonials and influencers
Testimonials and reviews must be authentic. Material paid promotions, affiliate commissions and insider relationships must be disclosed as required by law; fabricated testimonials and deceptive suppression of reviews are prohibited. Financial-education performance claims require substantiation and visible limitations; hypothetical trading results are not verified member profits.

### Third-party products and risks
Clicking an ad may take you to an independent third party whose pricing, products, privacy and support differ from our platform. An ad is not investment advice or an Operator warranty. Third-party purchase disputes go through the actual merchant of record and governing terms.

### Sponsored placements and contracts
Advertising terms specify paid inventory, campaign length, permitted creative claims, truthful targeting, cancellation/suspension, reporting and payment method before a business order. A custom-quote sponsor entry is not automatically an authorized, instantly purchasable consumer SKU.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ADVERTISING_20261026$),
  ('ACCESSIBILITY','Accessibility Statement','accessibility',$GU_ACCESSIBILITY_20261026$
### Commitment and design objective
The Stock Market: From the Ground Up aims to make its educational site usable by adults with disabilities. Its engineering objective is the WCAG 2.2 Level AA standard, including keyboard navigation, logical page structures, meaningful labels, visible focus, readable text, responsive zoom/reflow, adequate contrast and understandable form errors. This statement is a goal, not a claim of independent certification or universal conformance.

### Educational charts and trading interfaces
Financial charts, candlestick replays, dense tables, journal forms, and simulations can be difficult to use with some assistive technologies. Where important instructional meaning is conveyed visually, text descriptions, OHLC data, alternative reference tables, keyboard-operated controls and accessible feedback should be offered to the extent technically feasible and required by law. Fictional and historical information must not be mislabeled as live brokerage data.

### Individual display preferences
The member settings may support text-size, instructor-text-size and interface-scale preferences. Where supported, settings may persist across ordinary sessions; the current interface defines which controls are available.

### Third-party services
Some embedded payment, market-data or retailer interfaces are provided by third parties. We will assess known limitations, provide reasonable accessible support alternatives where required, and not use third-party ownership as an automatic defense to our own duties.

### Reporting a barrier
Send accessibility reports through the Support Center and include the relevant page or feature, device/browser, optional assistive technology and obstacle. Do not include credentials or private financial records. Reports will be triaged and used to plan remediation; substantive unresolved barriers should not be misrepresented as corrected.

### Verification and updates
Formal accessibility claims will be updated only after documented automated and manual review of production member journeys and relevant third-party integrations. This statement does not assert that current accessibility acceptance testing is complete.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ACCESSIBILITY_20261026$),
  ('FOUNDING_600','Founding 600 Enrollment & Benefits Terms','founding-600-terms',$GU_FOUNDING_600_20261026$
### Limited program
The Founding Members program is limited to 600 verified eligible member accounts combined across both Founding plans. A reserved seat does not become permanent until the eligibility, consent, payment and fulfillment checks specified at checkout are completed. Accounts are assigned one eligible Founder identity, subject to the published qualification and cancellation terms. No purchaser receives shares, securities, ownership or voting rights in the Operator.

### Standard 30-Day offer
$49.99 every 30 days, automatically recurring until canceled. During eligible access, members receive the specifically released first-party learning features, private Founders Commons and relevant Founding benefits shown in the offer. A 10% discount applies to qualifying separately priced first-party purchases, including eligible Lifetime Membership transactions, not to Founding renewal charges. Each confirmed paid billing cycle grants 5 included Crownlight Sparks; the related included bucket expires 90 days after that billing cycle ends. Purchased Sparks remain separate and never expire.

### Extended 60-Day offer
$59.99 every 60 days, automatically recurring until canceled. A 15% discount applies to qualifying separately priced first-party purchases, including eligible Lifetime Membership transactions, not to Founding renewal charges. Each confirmed paid billing cycle grants 15 included Sparks, with expiration 150 days after that billing cycle ends. Extended benefits may include Founder Design Council participation, founder-only design voting and other specifically launched educational privileges, only while qualifying access remains active.

### Discount and upgrade processing
Discounts must be accurately calculated and shown in Checkout before payment; if an eligible offer cannot honor the earned discount, the purchase will not proceed at an undiscounted amount. Founding discounts on separate purchases do not stack with an unrelated discount unless expressly specified. Upgrades, changes, cancellation and Lifetime conversion must disclose any new charge, change in renewal, access period and the handling of an existing paid Founding subscription before consent. The Operator may not silently invoice full price when the disclosed Founding benefit calls for a lower charge.

### Content and benefits availability
A list of planned enhancements does not establish immediate delivery. A planned benefit is not represented as delivered before it is available. An authorized purchase offer will distinguish currently available benefits from planned benefits and preserve applicable remedies for material non-delivery. Certificates evidence documented study completion rather than a professional credential, passing score guarantee, regulatory license, or endorsement.

### Billing, cancellation and capacity
Checkout obtains distinct informed authorization for 30-day or 60-day recurring charges and the applicable Terms. Members can cancel future renewals through the payment portal or available support method. Paid-through access, missed payment, provider cancellation, charge disputes and refund decisions are controlled by the payment-provider record, product-specific terms, and applicable law. Seats may not be oversold through simultaneous payment sessions; the authoritative registration ledger governs issued Founder numbers.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_FOUNDING_600_20261026$),
  ('CROWNLIGHT_SPARKS','Crownlight Sparks Purchase & Use Terms','crownlight-sparks-terms',$GU_CROWNLIGHT_SPARKS_20261026$
### Nature of Sparks
Crownlight Sparks are internal, noncash educational-use credits for permitted practice-question actions. They are not a cryptocurrency, transferable payment account, investment, stored-value financial instrument, equity interest, reward of monetary value, or cash-equivalent currency. They cannot be redeemed for money, transferred between members or traded outside the platform.

### Purchase packages
A Sparks purchase is authorized only through an available checkout displaying the package quantity, price, permitted educational uses and entitlement terms. Current catalog reference packages are Starter (10) at $3.99, Practice (30) at $9.99 and Extended Practice (75) at $19.99, but catalog labels alone do not prove that Checkout is enabled or that pricing is final. Any tax treatment and payment-provider fees will be disclosed where applicable.

### Free instruction versus optional spending
Teaching actions such as Ask Talia, Explain This Concept, Guided Example, Another Example, and Teach in More Depth do not consume Sparks. Spending on eligible reveal/skip functions must be confirmed by the member at the point of expenditure with a clearly displayed quantity and effect. A reveal or skip cannot falsely count as independent learning mastery or earned certification.

### Wallet and expiration
Independently purchased Sparks do not expire under the approved product contract. Eligible subscription-included Sparks are allocated to independent dated buckets with 60-day ordinary rollover, subject to expressly described Founder-specific extensions. The wallet spends included Sparks beginning with the bucket expiring soonest, then purchased Sparks. New included allocations do not reset older bucket expirations. The member should be able to review purchased and included balances, expiration, adjustments, spends and remaining units.

### Refunds and payment reversals
Completed purchased digital credits are ordinarily nonrefundable at the Operator's discretion if delivered and legitimately used, except where mandated by law, provider terms or the Refund Policy. Verified accidental double billing, nondelivery, unauthorized payment or product misdescription will be investigated regardless of price. Any reversal of purchased Sparks must be tied to its verified transaction and must not confiscate unrelated purchased balances.

### Corrections, misuse and platform closure
An administrator may correct demonstrable accounting errors through Owner-authorized, audited adjustments. Suspected abuse must not result in arbitrary erasure of otherwise valid balances. If a purchased balance cannot be used because a paid product is withdrawn, any required legal or contractual remedy applies.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_CROWNLIGHT_SPARKS_20261026$),
  ('DIGITAL_BOOKS','Digital Books & Downloads Terms','digital-books-terms',$GU_DIGITAL_BOOKS_20261026$
### What is purchased
When direct digital editions are available, the offer identifies title, edition, format, price, delivery method and permitted use. A book-cover listing or retail publisher announcement alone does not authorize a direct website download. Paperback and hardcover orders may use different fulfillment partners and shipping terms.

### Digital distribution rights
Direct website distribution is offered only for editions whose publisher distribution rights permit that channel. KDP Select digital enrollment prevents duplicate distribution on a separate website for that enrollment period; books enrolled in an exclusivity program will be sold through the permitted retailer rather than by independent PDF/EPUB distribution. No purchase may grant a digital asset that does not exist or cannot be lawfully delivered.

### Secure delivery
After payment-provider evidence is verified, the member receives a private, limited-access download entitlement or documented delivery instructions. A successful return URL is not proof of payment. Links should expire or be authenticated, with redownload procedures for legitimate access difficulties; deliver only the correct purchased format and edition revision.

### Editorial changes and replacements
Substantial changes to an ebook should use recorded edition or asset versions. A replacement should not silently remove access to a purchased edition or materially change what was sold. Legitimate corrections and compatible file updates may be supplied under the order terms; a new paid edition is a separate offer if not included.

### License and use
Unless a specific sale expressly grants wider rights, purchase conveys a personal, nonexclusive, nontransferable license to read the file. The buyer may not unlawfully redistribute, resell, upload, or remove copyright notices. This restriction preserves statutory fair use and mandatory lawful access rights.

### Failed delivery and refunds
When the product cannot be lawfully or technically delivered as promised, customer remedies, including applicable refund rights, cannot be eliminated by a final-sale statement. Third-party retailer purchases follow that merchant's return process and terms.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_DIGITAL_BOOKS_20261026$),
  ('ACADEMY_BOOTCAMPS','Boot Camp & Clinic Purchase Terms','bootcamp-terms',$GU_ACADEMY_BOOTCAMPS_20261026$
### Course-specific offer
An available paid educational program identifies the course, study duration, curriculum, prerequisites, current resources, start or availability terms, and limitations before purchase. A seven-day clinic, 30-day Boot Camp, or 90-day practicum describes the educational scope or expected study program, not a guarantee of professional trading competency or portfolio returns.

### Delivered versus planned learning
When paid course enrollment opens, the offer identifies which lessons, Labs, assessments and replay features are currently available, separately from planned content. Content that is still in editorial development cannot be represented as complete. Course access and independent assessed mastery are separate rights; a member may see Not Yet Assessed if independently reviewable evidence is absent.

### Historical evidence and third-party tools
Historical examples may require rights-cleared source data. Author-reported trades are not verified brokerage executions merely because a research article is credible. Some replay lessons may direct a member to separately obtained thinkorswim OnDemand software; the course price does not include broker accounts or unauthorized market-data subscriptions.

### Optional preorders
The website will not take a preorder for an unreleased course until a specific separately authorized presale offer identifies its expected availability, exactly what access is immediate, material release risks, potential delay notifications, payment timing, and legally required cancellation/refund rights. An item labeled Coming Soon by itself is not a preorder authorization. Payments are not collected against an unspecified final release date under generic store visibility flags.

### Access, support and changes
Paid access begins only when payment and course entitlement are confirmed. Schedule changes should not silently eliminate already purchased material. Additional or updated educational materials may be made available without implying independent teaching has been certified or live market price data is included.

### Learning outcomes
No course, Boot Camp or tutorial constitutes a guarantee of profits, a regulated occupational license, a broker credential, completion certificate, or qualification for trading employment. Certificates may only reflect educational achievement actually assessed under documented criteria.

### Cancellation and remedies
Refund requests for legitimately delivered educational access follow the posted Refund Policy and mandatory exceptions. An undelivered or materially misrepresented program cannot be insulated from lawful remedies merely by being under $500.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ACADEMY_BOOTCAMPS_20261026$)
)
UPDATE public.legal_documents p SET title=v.title,slug=v.slug,body_markdown=v.body_markdown,version='2.0',status='published',effective_at=now(),updated_at=now()
FROM proposed v WHERE p.document_code=v.document_code AND p.version='1.1';
WITH proposed(document_code,title,slug,body_markdown) AS (VALUES
  ('TERMS','Terms of Service','terms',$GU_TERMS_20261026$
### Application to new purchases and existing customer rights
These Terms apply to new website registrations and purchases beginning on the effective date shown above. Earlier completed purchases retain their applicable agreed terms and nonwaivable legal rights. Material changes to existing recurring contracts require additional notice or consent when required by law.

### 1. Contract and scope
These Terms govern use of The Stock Market: From the Ground Up website and its education, historical exercises, fictional practice environment, trading journals, research materials, books and companion materials, Market Commons, AI-supported tutor, subscriptions, and digital purchases. “We,” “us,” and “Operator” mean the seller identified in the applicable checkout or transaction receipt. This online educational service operates under The Stock Market: From the Ground Up and Crown & Lantern Press branding; no walk-in retail storefront, local pickup, or in-person purchasing facility is represented. Where Stripe or another provider is merchant of record, its transaction terms also apply. Product-specific terms and mandatory consumer law control where they conflict with these general Terms.

### 2. Age and account eligibility
Account registration and purchase require a person aged at least 18 years. Provide accurate details and protect your login credentials. Do not share accounts or credentials. The Operator may reasonably verify eligibility and temporarily restrict access for credible security, fraud, payment abuse, or misconduct concerns, subject to applicable law and appeal/support processes. Do not upload third-party confidential information, payment card numbers, or market-data credentials into public community posts or tutor questions.

### 3. Educational, not brokerage, services
The Operator supplies general education and self-directed practice, not brokerage, custodial trading, portfolio management, fiduciary services, or tailored investment recommendations. No trade is executed with real money through the educational chart and simulation tools. No learning score is a license or professional credential. Members remain responsible for independently verifying market information and consulting licensed professionals when appropriate.

### 4. Plans and product-specific entitlements
Available features, current price, billing duration, start date, prerequisites, and deliverables must appear in the offer before purchase. Store visibility and a Stripe catalog record do not create a purchase entitlement. A purchased membership, Tool Pass, or course grants only the approved first-party access expressly described for that SKU, during the valid entitlement period. An inactive, unreleased or unavailable capability is not represented as delivered. Third-party data, thinkorswim access, brokerage services, and market subscriptions are not included unless the specific offer expressly states otherwise.

### 5. Orders and payment
By placing an order, you authorize the stated one-time or recurring charges, with applicable taxes shown by checkout. A purchase is completed only after the payment provider reports its required success state. Access is provisioned against verified provider evidence, not by visiting a success page alone. Charges, taxes, merchant of record and payment services may be administered by Stripe/Link or another provider identified during checkout. Orders may be rejected for insufficient availability, suspected fraud, rights restrictions, age ineligibility, or failed price/entitlement validation.

### 6. Recurring billing
Recurring offers identify the renewal price, billing interval, cancellation process, and material limitations before payment. Separate informed consent is required where applicable. Cancel through the Member Dashboard's billing controls or Support Center; cancellation of future billing and refund eligibility are distinct. The Subscription & Billing Terms and product checkout disclosure form part of this agreement.

### 7. Digital access and intellectual property
Unless explicitly sold as transferable ownership, digital books, courses, illustrations, software interfaces, instructor content, and tools are licensed for individual personal learning. Do not republish, scrape, resell, redistribute, publicly expose private grading keys, circumvent access controls, or use other people's copyrighted/market-data works without rights. Fair use and other nonwaivable lawful uses are preserved. Original content that you submit remains yours; you grant the Operator a limited non-exclusive license to store, reproduce, moderate and display that submission only as needed to provide the services, maintain backups, meet legal obligations, and exercise rights described in the Privacy and Community policies.

### 8. Community and user conduct
Do not impersonate, harass, defraud, coordinate unlawful market manipulation, post fabricated performance claims, distribute malware, expose personal information, infringe copyrights, or use forums for undisclosed paid promotion. We may moderate posts and impose proportionate, reviewable account restrictions. User posts, ratings, trading claims and sponsor materials are not guaranteed accurate or endorsed.

### 9. Third-party services
Third-party software, books, broker platforms, market-data providers, payment networks, and external links are governed by their own agreements. You must hold authorized credentials and licenses. Names and marks do not indicate affiliation or sponsorship. Third-party access can change or terminate beyond the Operator's control; a material failure to provide explicitly promised paid benefits is reviewed under the applicable remedy provisions.

### 10. Service changes, cancellation and support
We may change or discontinue future features and content, but will not unilaterally erase paid-through rights or materially reduce purchased services without addressing applicable obligations and remedies. Security changes may require immediate action. The Refund & Cancellation Policy and relevant order terms determine permitted refunds, cancellations, and access adjustments.

### 11. No warranties of trading outcomes
Educational content and market observations may contain errors, stale feeds, synthetic examples, or limitations. No profit, returns, trading results, specific learning achievement, or uninterrupted third-party connection is promised. Any disclaimers or limitations apply only to the maximum extent the law permits; they do not remove consumer rights regarding materially undelivered or misrepresented purchased services.

### 12. Liability and dispute handling
The Operator is not responsible for members' independently initiated brokerage trades or unauthorized redistribution by other members solely by virtue of providing education. No provision excludes liability for intentional misconduct, fraud, or other responsibility that cannot lawfully be limited. Raise order or account concerns through the Support Center. A forum selection, arbitration provision, class-action waiver, or hard damages cap will not apply unless separately approved by licensed counsel and validly incorporated into the purchase contract.

### 13. Changes and consent
We will publish material prospective policy updates with clear effective dates and provide notice and any required consent for changes affecting ongoing paid terms. Transaction-specific agreed prices and statutory rights cannot be silently amended.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_TERMS_20261026$),
  ('SUBSCRIPTION','Subscription & Billing Terms','subscription',$GU_SUBSCRIPTION_20261026$
### Scope and affirmative authorization
Only products expressly labeled recurring renew automatically. At the time an eligible recurring purchase becomes available, its checkout displays the seller or merchant of record, recurring price, interval, currency, initial term, renewal rules, relevant tax disclosures, restrictions, and cancellation procedure. Do not infer subscription consent from accepting generic website Terms alone.

### Standard offerings
Individual Full Platform, Historical Replay Learning, and Tool Pass offers identify their then-current authorized price and billing interval at checkout. A product listed in the Store is not itself an active offer for payment.

### Founding Members
Subject to a shared 600-account limit and explicit eligibility: Founding Standard is **$49.99 recurring every 30 days**; Founding Extended is **$59.99 recurring every 60 days**, each until canceled. These are day-based terms, not calendar-month substitutions. They do not automatically change into standard memberships. The Founding discount applies only to separately eligible first-party purchases, not the Founding renewal charge. Standard's discount is 10%; Extended's discount is 15%, including eligible Lifetime Membership purchases, according to the published benefit conditions. An earned discount must be applied before payment or the purchase must be blocked; it must never be promised and then omitted from the charge.

### Crownlight Sparks tied to subscriptions
Included Sparks follow the applicable allocation and expiry terms and do not automatically extend earlier grant buckets. Founding Standard includes 5 Sparks per confirmed paid 30-day cycle, expiring 90 days after that cycle ends; Extended includes 15 per confirmed paid 60-day cycle, expiring 150 days after that cycle ends, unless a subsequently approved offer explicitly states otherwise. Separately purchased Sparks do not expire. Wallet balances are not cash or stored financial value.

### Consent, receipt and records
A customer must affirmatively authorize automatic recurring charges during checkout. We retain available order and consent evidence and provide access to transaction details. Clicking a Store listing alone does not authorize recurring billing.

### Cancellation
Members may use their Dashboard billing portal to cancel future renewals. Where portal functions are unavailable, Support must provide a workable alternative. We will not require a cancellation phone call or obstruct canceling an online enrollment where applicable law prohibits it. Cancellation ordinarily stops future charges; paid access remains until its lawful and disclosed paid-through time, subject to exceptions and fraud/security restrictions.

### Plan changes, retries, and failure
Changes between plans may affect billing dates, access and prorations as disclosed during the change process. We investigate duplicate charges and billing mistakes. Failed charges may cause a subscription to be identified as past due rather than paid. Authorized retries follow the disclosed provider contract and law. A canceled plan must not continue to bill due to an internal interface state error.

### Notices and governing laws
Any renewal, price-change, annual reminder, and material-change notices required by applicable law will be provided. Online renewals are subject to ROSCA's disclosure/consent/cancellation requirements and applicable state automatic-renewal laws. Stripe/Link customer support and merchant-of-record obligations control where Managed Payments is the checkout provider.

### Refunds and disputes
Canceling future billing does not by itself refund earlier periods, but the Refund & Cancellation Policy, mandatory legal remedies, and processor rulings remain applicable.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_SUBSCRIPTION_20261026$),
  ('REFUNDS','Refund & Cancellation Policy','refunds',$GU_REFUNDS_20261026$
### Earlier purchases
The updated discretionary refund standard applies prospectively to purchases completed after this policy's effective date. Previously completed orders retain all contractual and legal rights that governed them.

### Ordinary final-sale rule for delivered digital products
For completed transactions with a purchase subtotal below **$500.00 USD**, we ordinarily do not grant **discretionary refunds** after the purchased digital product or period of service has been delivered or made available as expressly promised. Change of mind, nonuse, or choosing a different product generally does not establish a discretionary refund right. The threshold applies to the pre-tax, post-discount subtotal of the individual transaction; unless the law applicable to that transaction or the payment provider requires another calculation.

### Exceptions are not limited by transaction amount
No final-sale statement overrides applicable law, the terms disclosed at checkout, a payment-network/merchant-of-record remedy or a legal duty to correct a billing error. We will investigate unauthorized or suspected fraudulent charges, duplicate or incorrect charges, material nondelivery, defective or unusable purchased access, material misdescription, required cancellation remedies, accidental renewal after a valid cancellation, and other legally protected claims. Customers need not prove that a crime occurred before reporting an unauthorized charge or exercising lawful consumer/dispute rights. A request will be assessed on available evidence rather than rejected merely for lack of a police report.

### Transactions at or above $500
There is no automatic entitlement to a discretionary refund based solely on reaching $500. Each request is evaluated against the disclosed offer, evidence, applicable law, and payment-provider requirements.

### Nonreleased products and preorders
A catalog entry marked Coming Soon is not evidence that the item is available. If a separately authorized preorder is offered, its checkout identifies the deliverable, expected schedule, cancellation rights and any legally required remedies. We cannot reject a mandatory refund for an undelivered preorder merely because the sale is below $500.

### Subscriptions
Canceling a recurring plan stops future renewals according to the valid cancellation and provider terms and is separate from a refund request. Canceling does not remove mandatory billing-error rights or legally required restitution. Confirmations and dispute review should cite the actual paid period, canceled-at/paid-through dates, and provider transaction IDs.

### Books and external retailers
For a Kindle, paperback, hardcover or other purchase completed through an external retailer, follow that merchant's return/refund rules. An order placed on this website is governed by the correctly identified merchant of record and the site's applicable product terms, including digital distribution rights.

### Crownlight Sparks and entitlements
Verified refunds, chargebacks or reversals may reverse a corresponding purchase entitlement in a documented, non-duplicative manner after provider confirmation. This does not permit arbitrary seizure of unrelated purchased balance or previously earned progress.

### Stripe Managed Payments and disputes
Where Stripe via Link acts as merchant of record, Stripe may independently decide or process refunds and chargeback responses under its agreements. We may provide supporting records and product-delivery evidence, but do not promise to override Stripe's decision. Members retain lawful card, bank, and statutory dispute rights. We do not penalize members solely for asserting a lawful dispute.

### Requests and processing
Use the Support Center and provide the order number, purchase date, amount and issue description; never send card numbers. We review requests in accordance with applicable laws and provider requirements; processor and financial-institution settlement times vary. When approved, refunds generally go to the original payment method and appear subject to processor/bank settlement.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_REFUNDS_20261026$),
  ('DISCLAIMER','Educational & Trading Disclaimer','disclaimer',$GU_DISCLAIMER_20261026$
### General educational purpose
All website content, books, historical Labs, source-verified case studies, Talia tutor responses, hypothetical charts, simulated practice exercises, watchlists, scanners, Journal records, forums and AI-generated explanations are intended to teach general market concepts, analytical reasoning, source verification and risk awareness. They are not individualized advice, portfolio management, brokerage order execution, advisory fiduciary services, market making, a signal subscription, or a recommendation tailored to any individual's objectives, finances, risk tolerance or circumstances.

### Actual service boundaries
The website does not execute securities trades or custody brokerage funds. Illustrative chart exercises and historical replay do not reproduce a live broker simulator. Use of thinkorswim OnDemand, where discussed, requires separately authorized access from its provider and is not included unless expressly stated in a specific offer. No third-party broker or market-data provider sponsors, endorses or warrants this platform merely because its name or functionality is discussed.

### Accuracy, licensing and no hindsight
Markets involve risks including substantial or total loss of capital, illiquidity, slippage, gaps, volatility halts, partial fills, stop-order uncertainty, costs, leverage and overnight exposure. Historical and hypothetical examples have hindsight/selection bias. Source-reported trade narratives are not independent brokerage confirmations. Price/volume bars may be historical, delayed, synthetic, provisional, incomplete or corrected; labels should disclose provenance. No training outcome, backtest or past trade implies future performance.

### AI tutor and independent judgment
Talia offers educational teaching assistance and may make mistakes. It must not direct individualized securities trades, solicit portfolio details as individualized advice, or present simulated or illustrative exercises as live quotes. Members must check material facts against appropriate primary sources, trading platform records and licensed professionals. A membership does not form an investment adviser-client, broker-client, attorney-client, or tax-advice relationship.

### Conflicts, paid sponsors and securities discussion
Paid advertising and sponsored educational material are identified separately and do not control grading, prices, risk assessments or learning recommendations. User community posts may be inaccurate, self-promotional or financially conflicted. No part of a marketplace or forum is a guarantee against market manipulation.

### Registration boundary
Whether a particular service legally constitutes investment advice depends on conduct, compensation, tailoring and applicable securities law, not this disclaimer alone. The Operator will not represent itself as exempt from adviser, broker-dealer or other registration duties without appropriate fact-specific legal review.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_DISCLAIMER_20261026$),
  ('PRIVACY','Privacy Policy','privacy',$GU_PRIVACY_20261026$
### Data controller and covered systems
This statement applies to information collected by The Stock Market: From the Ground Up and the first-party site account, educational content, Market Commons, Journal, support, Store and payment interactions. Privacy questions and lawful requests may be submitted through the Support Center or to stockmarketfromthegroundup@gmail.com. The educational service operates online from Missouri, United States. Payment processing may be provided by a separately identified merchant of record, including Stripe via Link for eligible purchases; that provider may act as an independent controller for its own legally mandated functions.

### Information categories and sources
Information processed to operate services can include your account name, username, email, protected date of birth or age eligibility, login/session and security identifiers, device/network logs, preferences, account access roles, educational actions and competency evidence, tutor prompts and answers, practice and Journal records, community posts, moderation reports, support messages, and purchase/order/subscription data. Payment providers process card and payment details directly; we may receive limited payment identifiers, pricing, status, fraud/dispute signals and receipts. Connected market-data credentials, if supported, are sensitive user-supplied information and should not be shown publicly.

### Use purposes
We process appropriate data to register and authenticate adults, preserve learning progress, deliver entitlements, reconcile orders, operate course tools, support customers, enforce safety and anti-abuse rules, diagnose outages, fulfill reporting duties, comply with law, and administer optional marketing or advertising where supported and authorized. Do not represent behavioral profiles or trading ideas as licensed professional advice. An advertiser does not receive private tutor messages or payment credentials merely by purchasing an ad.

### Disclosures and service providers
Infrastructure and transactional service providers may include Supabase, Cloudflare, Stripe/Link, email communications providers, marketplace/print distributors and member-selected data connections. Each receives only the information reasonably necessary for its function under its agreements and applicable law. Providers involved in current operations include Cloudflare, Supabase, and Stripe. Additional service providers may participate in particular user-selected features, retail orders, support and educational delivery. Their own privacy terms may also apply. Community posts and voluntary public profile information are visible as described by their audience settings.

### Optional features, AI and ads
The educational tutor may process member prompts and interaction results as necessary to provide guidance, monitor quality and prevent misuse. Where external AI processing is used for educational assistance, member prompts and instructor responses may be processed by the relevant provider. Avoid entering private account credentials, full card numbers, brokerage passwords, or highly sensitive information in tutor messages. Optional analytics, tracking, targeted advertising and marketing communications require the notices, legal bases, consent/opt-out mechanisms and configuration applicable to each jurisdiction. Do not claim that data is never shared, never trained on or never transferred overseas without auditing service contracts and settings.

### Retention and deletion
We retain personal information as reasonably necessary to deliver service, preserve learning records, protect account security, maintain financial records and satisfy applicable legal requirements. Some order, chargeback, fraud and audit records must survive account closure when legally necessary. A deletion request does not entitle the requester to erase evidence that law requires the business to retain, but remaining personal information should be minimized and access-restricted. A verified retention schedule must identify categories, retention periods, legitimate exceptions and deletion jobs.

### Privacy and account requests
Adults may request access, correction, export, deletion, marketing preference changes or other rights where law grants them. The Support Center and privacy contact should authenticate sensitive requests without collecting excessive additional information. Rights vary by jurisdiction, and any applicable appeal, opt-out, authorized-agent, sensitive-data and nonretaliation mechanisms must be implemented before claiming availability. We will not condition lawful rights upon abandoning membership claims or waiving disputes.

### Security and incidents
Our technical safeguards include encrypted connections, restricted data access, server-side credential handling and operational security reviews. No system can guarantee complete security. No platform can warrant absolute protection. If an incident triggers notification obligations, notices will follow applicable law and regulator/provider requirements.

### Age and sensitive data
This service is intended for adults aged 18 and older. Do not knowingly open accounts for minors. Preserve restricted treatment of DOB and connected credentials. Avoid collecting unneeded brokerage passwords, SSNs, precise financial-account information or special-category data.

### Cookies and changes
The Cookie Notice details browser-side technologies. Material changes to purposes, providers or rights will be communicated when the law requires and may require fresh consent. For privacy inquiries, contact stockmarketfromthegroundup@gmail.com.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_PRIVACY_20261026$),
  ('COOKIES','Cookie & Local Storage Notice','cookies',$GU_COOKIES_20261026$
### Scope
Cookies, web storage and related technologies are used by the website and approved service providers. Some are required to establish secure sign-in, protect against abuse, retain authentication state, keep page navigation accessible, and respect interface preferences. Examples of preferences may include text size, instructor text size, visual scaling, selected tabs and member display settings.

### Essential technologies
Authentication and security state, CSRF prevention, anti-abuse challenges, load/performance safeguards, and session continuity may need device/browser storage. Clearing essential storage can log out the user or interrupt features. The particular storage technologies may change as website and third-party services evolve.

### Optional analytics and advertisements
Optional analytics, campaign measurement, personalisation, interest-based advertising or third-party advertising technology are not automatically essential. Their use must respect applicable consent, notice and opt-out laws. Where the law requires a consent or opt-out mechanism for optional tracking, applicable controls will govern its use. Payment providers and embedded third-party services may apply their own technologies under their separate notices; our integration should minimize unnecessary exposure.

### User controls
Where optional storage choices are offered, they should be accessible through appropriate Privacy/Consent settings and operate before applicable trackers fire. Browser settings may block or remove cookies, though essential functionality can stop working. Browser signals and statutory opt-out requests will be honored where applicable and technologically supported, after verification.

### Updates and inventory
Changes in a vendor, purpose or tracking category may require updated disclosures and renewed choice. Questions about cookies or browser storage may be directed to Support.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COOKIES_20261026$),
  ('COPYRIGHT','Copyright & Intellectual Property Notice','copyright',$GU_COPYRIGHT_20261026$
### Our material and license
Original educational lesson text, design, images, exercises, platform software, workbook organization, source annotations, original book manuscripts and distinctive first-party branding belong to their respective owners. An eligible membership or individual purchase provides a limited, nonexclusive, nontransferable right for personal educational use during the applicable term. It does not transfer copyright, a public redistribution license, or a right to publish private grading keys.

### Member content
You retain copyright in content you independently create and have rights to post, such as your own Journal entries or Commons contributions. You grant a limited license only as necessary to host, display to your chosen audience, transmit for services, moderate, back up and comply with law. You represent you have rights to content you upload and will not post confidential brokerage statements or copyrighted charts/media beyond your permissions.

### Third-party intellectual property
Securities symbols, exchange data, broker software names including thinkorswim, market charts, regulatory filings, logos, books and quoted sources may belong to third parties. Descriptive mention does not assert affiliation, endorsement or licensing. Source research archives may include restricted third-party material and personal browser data and must not be published or redistributed without permission. The educational credibility of research does not establish permission to reproduce or redistribute protected third-party materials.

### Digital books, exclusivity, and editions
Digital distribution rights are edition-specific. If a title is enrolled in KDP Select, its digital format cannot be independently distributed on this website during the applicable exclusivity period. Print editions and retailer links may follow different conditions. No standalone PDF/EPUB delivery is permitted before the edition's rights, storage and private download entitlement are verified.

### Reporting infringement
Rights holders can submit specific notices identifying the protected work, allegedly infringing material, location, good-faith basis, contact information, and authority to act. We will review legally sufficient notices promptly and follow any required counter-notice/restoration process. Repeat infringers may lose content-posting privileges under a reasonably implemented policy, subject to applicable law.

### DMCA designation
For copyright reports or inquiries, contact stockmarketfromthegroundup@gmail.com with the relevant work and material location. Nothing in this notice asserts a completed U.S. Copyright Office designated-agent registration.

### Permitted uses and enforcement
Contract restrictions do not prohibit fair use, protected consumer criticism, lawful reverse engineering where protected, or other rights that cannot be waived. We may suspend access for credible infringement, preserve relevant evidence, and refer matters to appropriate providers or authorities when required.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COPYRIGHT_20261026$),
  ('COMMUNITY','Community Guidelines','community',$GU_COMMUNITY_20261026$
### Purpose
Market Commons hosts general stock-market education, evidence-based discussion, chart and research analysis, and peer-to-peer learning. Posts are user-generated expression, not individualized investment recommendations or independently validated market information.

### Member conduct
Use respectful communication. Do not harass, threaten, dox, stalk, impersonate, or publish personal credentials, contact information, financial account statements or restricted private data. Fraud, phishing, malware, harmful code, scams, market manipulation, pump-and-dump coordination, undisclosed paid promotion, misleading endorsements, manufactured reviews, or false claims of guaranteed gains are prohibited. Do not pressure others into specific securities transactions.

### Sources, charts and results
Distinguish verified primary-source facts, your own interpretation, estimates, hypotheticals, synthetic charts, retrospective performance and first-hand executions. Use citations and preserve timestamps where practical. Do not imply historical chart data is licensed or independently authenticated when it is not. Recorded performance must not be fabricated, and screenshots of private brokerage accounts or copyrighted feeds may require redaction or permission.

### Moderation and escalation
Authorized moderators may move, label, temporarily hide, close, restrict or remove content when reasonably needed for safety, legal compliance or topic integrity, and may restrict repeat abusers. Log moderation actions with permissible appeal and support routes. Members may report abuse, intellectual property complaints, dangerous misinformation or account compromise without posting sensitive data publicly.

### Member-created content and privacy
Members retain their independent rights in their original posts while granting limited hosting and moderation rights under the Terms. Do not upload copyrighted paywalled lessons, book PDFs, vendor datasets or identifiable third-party financial information without permission. Private messages and journals remain restricted to authorized users and staff only as required for service operation, safety and legal compliance.

### Advertisements and testimonials
Paid placement and relationships must be disclosed close to promotional statements. Community inclusion does not mean endorsement by the Operator. Sponsor compensation does not confer learning grade control or authority to dictate educational conclusions.

### Enforcement and rights
Enforcement decisions may reflect gravity, repeated conduct, good-faith misunderstanding and legal rights. No policy waives lawful criticism, consumer reviews, reporting rights, or legally protected communications.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_COMMUNITY_20261026$),
  ('ADVERTISING','Advertising & Sponsorship Disclosure','advertising',$GU_ADVERTISING_20261026$
### Clearly identified paid promotion
Some areas may display paid advertisements, sponsor branding, or affiliate links. Advertising must be recognizable as promotion at the point of display, rather than disguised as independent instructor guidance, moderator messages, product ratings or market signals. Where a sponsored or affiliate relationship could affect a reasonable consumer's assessment, we will disclose that relationship clearly and close to the content or link.

### Educational independence and prohibited claims
Sponsors do not purchase control over Talia's teaching, Lab answer keys, assessment results, member journal analysis, market data evidence standards or moderation outcomes. We may reject or remove promotions with false trading performance, deceptive pricing, unlicensed brokerage offerings, fabricated testimonials, inappropriate targeting, malware or other legal and reputational risks. Paid status must never imply security legitimacy or regulatory approval.

### Member data and advertiser measurement
Ad reporting may involve legitimate impressions, clicks and aggregate campaign performance, subject to actual configured tracker choices, the Privacy Policy and applicable consent/opt-out law. Advertisers do not receive passwords, raw payment card data, restricted age information or private learning conversations merely for buying a placement. Any actual personalized audience sharing must be explicitly and accurately disclosed and authorized where required.

### Reviews, testimonials and influencers
Testimonials and reviews must be authentic. Material paid promotions, affiliate commissions and insider relationships must be disclosed as required by law; fabricated testimonials and deceptive suppression of reviews are prohibited. Financial-education performance claims require substantiation and visible limitations; hypothetical trading results are not verified member profits.

### Third-party products and risks
Clicking an ad may take you to an independent third party whose pricing, products, privacy and support differ from our platform. An ad is not investment advice or an Operator warranty. Third-party purchase disputes go through the actual merchant of record and governing terms.

### Sponsored placements and contracts
Advertising terms specify paid inventory, campaign length, permitted creative claims, truthful targeting, cancellation/suspension, reporting and payment method before a business order. A custom-quote sponsor entry is not automatically an authorized, instantly purchasable consumer SKU.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ADVERTISING_20261026$),
  ('ACCESSIBILITY','Accessibility Statement','accessibility',$GU_ACCESSIBILITY_20261026$
### Commitment and design objective
The Stock Market: From the Ground Up aims to make its educational site usable by adults with disabilities. Its engineering objective is the WCAG 2.2 Level AA standard, including keyboard navigation, logical page structures, meaningful labels, visible focus, readable text, responsive zoom/reflow, adequate contrast and understandable form errors. This statement is a goal, not a claim of independent certification or universal conformance.

### Educational charts and trading interfaces
Financial charts, candlestick replays, dense tables, journal forms, and simulations can be difficult to use with some assistive technologies. Where important instructional meaning is conveyed visually, text descriptions, OHLC data, alternative reference tables, keyboard-operated controls and accessible feedback should be offered to the extent technically feasible and required by law. Fictional and historical information must not be mislabeled as live brokerage data.

### Individual display preferences
The member settings may support text-size, instructor-text-size and interface-scale preferences. Where supported, settings may persist across ordinary sessions; the current interface defines which controls are available.

### Third-party services
Some embedded payment, market-data or retailer interfaces are provided by third parties. We will assess known limitations, provide reasonable accessible support alternatives where required, and not use third-party ownership as an automatic defense to our own duties.

### Reporting a barrier
Send accessibility reports through the Support Center and include the relevant page or feature, device/browser, optional assistive technology and obstacle. Do not include credentials or private financial records. Reports will be triaged and used to plan remediation; substantive unresolved barriers should not be misrepresented as corrected.

### Verification and updates
Formal accessibility claims will be updated only after documented automated and manual review of production member journeys and relevant third-party integrations. This statement does not assert that current accessibility acceptance testing is complete.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ACCESSIBILITY_20261026$),
  ('FOUNDING_600','Founding 600 Enrollment & Benefits Terms','founding-600-terms',$GU_FOUNDING_600_20261026$
### Limited program
The Founding Members program is limited to 600 verified eligible member accounts combined across both Founding plans. A reserved seat does not become permanent until the eligibility, consent, payment and fulfillment checks specified at checkout are completed. Accounts are assigned one eligible Founder identity, subject to the published qualification and cancellation terms. No purchaser receives shares, securities, ownership or voting rights in the Operator.

### Standard 30-Day offer
$49.99 every 30 days, automatically recurring until canceled. During eligible access, members receive the specifically released first-party learning features, private Founders Commons and relevant Founding benefits shown in the offer. A 10% discount applies to qualifying separately priced first-party purchases, including eligible Lifetime Membership transactions, not to Founding renewal charges. Each confirmed paid billing cycle grants 5 included Crownlight Sparks; the related included bucket expires 90 days after that billing cycle ends. Purchased Sparks remain separate and never expire.

### Extended 60-Day offer
$59.99 every 60 days, automatically recurring until canceled. A 15% discount applies to qualifying separately priced first-party purchases, including eligible Lifetime Membership transactions, not to Founding renewal charges. Each confirmed paid billing cycle grants 15 included Sparks, with expiration 150 days after that billing cycle ends. Extended benefits may include Founder Design Council participation, founder-only design voting and other specifically launched educational privileges, only while qualifying access remains active.

### Discount and upgrade processing
Discounts must be accurately calculated and shown in Checkout before payment; if an eligible offer cannot honor the earned discount, the purchase will not proceed at an undiscounted amount. Founding discounts on separate purchases do not stack with an unrelated discount unless expressly specified. Upgrades, changes, cancellation and Lifetime conversion must disclose any new charge, change in renewal, access period and the handling of an existing paid Founding subscription before consent. The Operator may not silently invoice full price when the disclosed Founding benefit calls for a lower charge.

### Content and benefits availability
A list of planned enhancements does not establish immediate delivery. A planned benefit is not represented as delivered before it is available. An authorized purchase offer will distinguish currently available benefits from planned benefits and preserve applicable remedies for material non-delivery. Certificates evidence documented study completion rather than a professional credential, passing score guarantee, regulatory license, or endorsement.

### Billing, cancellation and capacity
Checkout obtains distinct informed authorization for 30-day or 60-day recurring charges and the applicable Terms. Members can cancel future renewals through the payment portal or available support method. Paid-through access, missed payment, provider cancellation, charge disputes and refund decisions are controlled by the payment-provider record, product-specific terms, and applicable law. Seats may not be oversold through simultaneous payment sessions; the authoritative registration ledger governs issued Founder numbers.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_FOUNDING_600_20261026$),
  ('CROWNLIGHT_SPARKS','Crownlight Sparks Purchase & Use Terms','crownlight-sparks-terms',$GU_CROWNLIGHT_SPARKS_20261026$
### Nature of Sparks
Crownlight Sparks are internal, noncash educational-use credits for permitted practice-question actions. They are not a cryptocurrency, transferable payment account, investment, stored-value financial instrument, equity interest, reward of monetary value, or cash-equivalent currency. They cannot be redeemed for money, transferred between members or traded outside the platform.

### Purchase packages
A Sparks purchase is authorized only through an available checkout displaying the package quantity, price, permitted educational uses and entitlement terms. Current catalog reference packages are Starter (10) at $3.99, Practice (30) at $9.99 and Extended Practice (75) at $19.99, but catalog labels alone do not prove that Checkout is enabled or that pricing is final. Any tax treatment and payment-provider fees will be disclosed where applicable.

### Free instruction versus optional spending
Teaching actions such as Ask Talia, Explain This Concept, Guided Example, Another Example, and Teach in More Depth do not consume Sparks. Spending on eligible reveal/skip functions must be confirmed by the member at the point of expenditure with a clearly displayed quantity and effect. A reveal or skip cannot falsely count as independent learning mastery or earned certification.

### Wallet and expiration
Independently purchased Sparks do not expire under the approved product contract. Eligible subscription-included Sparks are allocated to independent dated buckets with 60-day ordinary rollover, subject to expressly described Founder-specific extensions. The wallet spends included Sparks beginning with the bucket expiring soonest, then purchased Sparks. New included allocations do not reset older bucket expirations. The member should be able to review purchased and included balances, expiration, adjustments, spends and remaining units.

### Refunds and payment reversals
Completed purchased digital credits are ordinarily nonrefundable at the Operator's discretion if delivered and legitimately used, except where mandated by law, provider terms or the Refund Policy. Verified accidental double billing, nondelivery, unauthorized payment or product misdescription will be investigated regardless of price. Any reversal of purchased Sparks must be tied to its verified transaction and must not confiscate unrelated purchased balances.

### Corrections, misuse and platform closure
An administrator may correct demonstrable accounting errors through Owner-authorized, audited adjustments. Suspected abuse must not result in arbitrary erasure of otherwise valid balances. If a purchased balance cannot be used because a paid product is withdrawn, any required legal or contractual remedy applies.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_CROWNLIGHT_SPARKS_20261026$),
  ('DIGITAL_BOOKS','Digital Books & Downloads Terms','digital-books-terms',$GU_DIGITAL_BOOKS_20261026$
### What is purchased
When direct digital editions are available, the offer identifies title, edition, format, price, delivery method and permitted use. A book-cover listing or retail publisher announcement alone does not authorize a direct website download. Paperback and hardcover orders may use different fulfillment partners and shipping terms.

### Digital distribution rights
Direct website distribution is offered only for editions whose publisher distribution rights permit that channel. KDP Select digital enrollment prevents duplicate distribution on a separate website for that enrollment period; books enrolled in an exclusivity program will be sold through the permitted retailer rather than by independent PDF/EPUB distribution. No purchase may grant a digital asset that does not exist or cannot be lawfully delivered.

### Secure delivery
After payment-provider evidence is verified, the member receives a private, limited-access download entitlement or documented delivery instructions. A successful return URL is not proof of payment. Links should expire or be authenticated, with redownload procedures for legitimate access difficulties; deliver only the correct purchased format and edition revision.

### Editorial changes and replacements
Substantial changes to an ebook should use recorded edition or asset versions. A replacement should not silently remove access to a purchased edition or materially change what was sold. Legitimate corrections and compatible file updates may be supplied under the order terms; a new paid edition is a separate offer if not included.

### License and use
Unless a specific sale expressly grants wider rights, purchase conveys a personal, nonexclusive, nontransferable license to read the file. The buyer may not unlawfully redistribute, resell, upload, or remove copyright notices. This restriction preserves statutory fair use and mandatory lawful access rights.

### Failed delivery and refunds
When the product cannot be lawfully or technically delivered as promised, customer remedies, including applicable refund rights, cannot be eliminated by a final-sale statement. Third-party retailer purchases follow that merchant's return process and terms.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_DIGITAL_BOOKS_20261026$),
  ('ACADEMY_BOOTCAMPS','Boot Camp & Clinic Purchase Terms','bootcamp-terms',$GU_ACADEMY_BOOTCAMPS_20261026$
### Course-specific offer
An available paid educational program identifies the course, study duration, curriculum, prerequisites, current resources, start or availability terms, and limitations before purchase. A seven-day clinic, 30-day Boot Camp, or 90-day practicum describes the educational scope or expected study program, not a guarantee of professional trading competency or portfolio returns.

### Delivered versus planned learning
When paid course enrollment opens, the offer identifies which lessons, Labs, assessments and replay features are currently available, separately from planned content. Content that is still in editorial development cannot be represented as complete. Course access and independent assessed mastery are separate rights; a member may see Not Yet Assessed if independently reviewable evidence is absent.

### Historical evidence and third-party tools
Historical examples may require rights-cleared source data. Author-reported trades are not verified brokerage executions merely because a research article is credible. Some replay lessons may direct a member to separately obtained thinkorswim OnDemand software; the course price does not include broker accounts or unauthorized market-data subscriptions.

### Optional preorders
The website will not take a preorder for an unreleased course until a specific separately authorized presale offer identifies its expected availability, exactly what access is immediate, material release risks, potential delay notifications, payment timing, and legally required cancellation/refund rights. An item labeled Coming Soon by itself is not a preorder authorization. Payments are not collected against an unspecified final release date under generic store visibility flags.

### Access, support and changes
Paid access begins only when payment and course entitlement are confirmed. Schedule changes should not silently eliminate already purchased material. Additional or updated educational materials may be made available without implying independent teaching has been certified or live market price data is included.

### Learning outcomes
No course, Boot Camp or tutorial constitutes a guarantee of profits, a regulated occupational license, a broker credential, completion certificate, or qualification for trading employment. Certificates may only reflect educational achievement actually assessed under documented criteria.

### Cancellation and remedies
Refund requests for legitimately delivered educational access follow the posted Refund Policy and mandatory exceptions. An undelivered or materially misrepresented program cannot be insulated from lawful remedies merely by being under $500.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
$GU_ACADEMY_BOOTCAMPS_20261026$)
)
INSERT INTO public.legal_documents(document_code,title,slug,body_markdown,version,status,effective_at,updated_at)
SELECT v.document_code,v.title,v.slug,v.body_markdown,'2.0','published',now(),now() FROM proposed v
WHERE v.document_code IN ('FOUNDING_600','CROWNLIGHT_SPARKS','DIGITAL_BOOKS','ACADEMY_BOOTCAMPS');
DO $GU_POSTFLIGHT$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE status='published' AND version='2.0' AND document_code IN ('TERMS','SUBSCRIPTION','REFUNDS','DISCLAIMER','PRIVACY','COOKIES','COPYRIGHT','COMMUNITY','ADVERTISING','ACCESSIBILITY','FOUNDING_600','CROWNLIGHT_SPARKS','DIGITAL_BOOKS','ACADEMY_BOOTCAMPS'))<>14 THEN
  RAISE EXCEPTION 'Expected fourteen published legal v2.0 policies';
 END IF;
 IF (SELECT count(*) FROM public.legal_documents_publication_history_v2 WHERE version='1.1') < 10 THEN
  RAISE EXCEPTION 'Original v1.1 publication history not preserved';
 END IF;
END $GU_POSTFLIGHT$;
COMMIT;
