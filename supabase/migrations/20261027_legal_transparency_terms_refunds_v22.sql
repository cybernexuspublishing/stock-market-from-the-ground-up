-- SMFGU legal transparency 2026-10-27: prospectively revise two published documents and publish five notices.
-- No change to prices, recurring consent, actual purchase entitlements or LIVE payment settings.
BEGIN;
DO $check$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE document_code IN ('TERMS','REFUNDS') AND status='published' AND version='2.1') <> 2 THEN RAISE EXCEPTION 'Terms/refunds version preflight failed'; END IF;
 IF EXISTS (SELECT 1 FROM public.legal_documents WHERE document_code IN ('EDITORIAL','AFFILIATE','RELATED_ENTITIES','DMCA','AI_USE')) THEN RAISE EXCEPTION 'New codes already exist'; END IF;
END $check$;
INSERT INTO public.legal_documents_publication_history_v2 (document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at FROM public.legal_documents
WHERE document_code IN ('TERMS','REFUNDS') AND status='published' AND version='2.1'
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents SET title='Terms of Service & User Agreement',slug='terms',body_markdown='
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
Recurring offers identify the renewal price, billing interval, cancellation process, and material limitations before payment. Separate informed consent is required where applicable. Cancel through the Member Dashboard''s billing controls or Support Center; cancellation of future billing and refund eligibility are distinct. The Subscription & Billing Terms and product checkout disclosure form part of this agreement.

### 7. Digital access and intellectual property
Unless explicitly sold as transferable ownership, digital books, courses, illustrations, software interfaces, instructor content, and tools are licensed for individual personal learning. Do not republish, scrape, resell, redistribute, publicly expose private grading keys, circumvent access controls, or use other people''s copyrighted/market-data works without rights. Fair use and other nonwaivable lawful uses are preserved. Original content that you submit remains yours; you grant the Operator a limited non-exclusive license to store, reproduce, moderate and display that submission only as needed to provide the services, maintain backups, meet legal obligations, and exercise rights described in the Privacy and Community policies.

### Account and licensed-content integrity
To protect the service and purchasers'' licensed access, the Operator may investigate evidence of credential sharing, automated extraction, unauthorized redistribution of purchased lessons or answer keys, deliberately deceptive purchase requests, and circumvention of paid feature controls. After proportionate review, confirmed misuse may result in revocation of the unauthorized activity, reasonable access restrictions, or appropriate account action under the existing Community and Support procedures. Actions must respect accrued lawful payment rights, nonwaivable statutory remedies, data-access rules, and opportunities to challenge mistaken enforcement. No punitive charge, forfeiture of unrelated purchased value, or attorney-fee obligation is created solely by this section.

### 8. Community and user conduct
Do not impersonate, harass, defraud, coordinate unlawful market manipulation, post fabricated performance claims, distribute malware, expose personal information, infringe copyrights, or use forums for undisclosed paid promotion. We may moderate posts and impose proportionate, reviewable account restrictions. User posts, ratings, trading claims and sponsor materials are not guaranteed accurate or endorsed.

### 9. Third-party services
Third-party software, books, broker platforms, market-data providers, payment networks, and external links are governed by their own agreements. You must hold authorized credentials and licenses. Names and marks do not indicate affiliation or sponsorship. Third-party access can change or terminate beyond the Operator''s control; a material failure to provide explicitly promised paid benefits is reviewed under the applicable remedy provisions.

### 10. Service changes, cancellation and support
We may change or discontinue future features and content, but will not unilaterally erase paid-through rights or materially reduce purchased services without addressing applicable obligations and remedies. Security changes may require immediate action. The Refund & Cancellation Policy and relevant order terms determine permitted refunds, cancellations, and access adjustments.

### 11. No warranties of trading outcomes
Educational content and market observations may contain errors, stale feeds, synthetic examples, or limitations. No profit, returns, trading results, specific learning achievement, or uninterrupted third-party connection is promised. Any disclaimers or limitations apply only to the maximum extent the law permits; they do not remove consumer rights regarding materially undelivered or misrepresented purchased services.

### 12. Liability and dispute handling
The Operator is not responsible for members'' independently initiated brokerage trades or unauthorized redistribution by other members solely by virtue of providing education. No provision excludes liability for intentional misconduct, fraud, or other responsibility that cannot lawfully be limited. Raise order or account concerns through the Support Center. A forum selection, arbitration provision, class-action waiver, or hard damages cap will not apply unless separately approved by licensed counsel and validly incorporated into the purchase contract.

### 13. Changes and consent
We will publish material prospective policy updates with clear effective dates and provide notice and any required consent for changes affecting ongoing paid terms. Transaction-specific agreed prices and statutory rights cannot be silently amended.

### 14. AI instruction, learning records and accuracy
Talia is a designed educational instructor persona. AI explanations and automated feedback may be incorrect, incomplete or outdated, and cannot provide personalized investment advice. Educational skill records, fictional replay, journal entries and assessment results are not verified investment performance or professional certifications. Members must not upload private credentials, card details or confidential brokerage records. See the AI Use Disclosure and Privacy Policy.

### 15. Relationship and sponsorship transparency
Advertisements and compensated referrals are distinct from independent lessons and assessment. Material commercial relationships are disclosed at affected promotions. A reference to thinkorswim, Charles Schwab, Amazon or an infrastructure provider does not establish sponsorship, shared ownership or inclusion of third-party services in a purchase. See Editorial Guidelines, Affiliate Disclosure and Related Brands/Providers Disclosure.

### 16. Account closure versus subscription cancellation
Members may request account closure through support, subject to lawful record retention and security obligations. Closing an account does not by itself cancel a separate recurring payment authorization: use Dashboard billing controls or support to cancel future renewals, and retain confirmation. Valid cancellation must not be obstructed, and any renewal after effective cancellation must be investigated.

### 17. Policy hierarchy and prospective updates
The Legal & Policies directory collects general disclosures and purchase-specific agreements. Product-specific terms prevail within their stated scope when consistent with applicable law and the agreed offer. No later website update silently adds charges, withdraws statutory remedies or retroactively alters completed purchases.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
',version='2.2',effective_at=now(),updated_at=now() WHERE document_code='TERMS' AND status='published' AND version='2.1';
UPDATE public.legal_documents SET title='Refund & Cancellation Policy',slug='refunds',body_markdown='
### Earlier purchases
The updated discretionary refund standard applies prospectively to purchases completed after this policy''s effective date. Previously completed orders retain all contractual and legal rights that governed them.

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
For a Kindle, paperback, hardcover or other purchase completed through an external retailer, follow that merchant''s return/refund rules. An order placed on this website is governed by the correctly identified merchant of record and the site''s applicable product terms, including digital distribution rights.

### Crownlight Sparks and entitlements
Verified refunds, chargebacks or reversals may reverse a corresponding purchase entitlement in a documented, non-duplicative manner after provider confirmation. This does not permit arbitrary seizure of unrelated purchased balance or previously earned progress.

### Stripe Managed Payments and disputes
Where Stripe via Link acts as merchant of record, Stripe may independently decide or process refunds and chargeback responses under its agreements. We may provide supporting records and product-delivery evidence, but do not promise to override Stripe''s decision. Members retain lawful card, bank, and statutory dispute rights. We do not penalize members solely for asserting a lawful dispute.

### Purchase, access, and billing evidence
To investigate a refund, cancellation, or payment dispute fairly, the Operator may rely on transaction receipts, verified payment-event identifiers, terms and consent records captured at checkout, entitlement and access-provisioning logs, fulfillment or download availability records, relevant support correspondence, and documented cancellation time. The existence of an access log alone does not establish that a product was fully or correctly delivered, that a charge was authorized, or that a legally required remedy may be denied. Record handling is subject to the Privacy Policy and applicable law.

### Requests and processing
Use the Support Center and provide the order number, purchase date, amount and issue description; never send card numbers. We review requests in accordance with applicable laws and provider requirements; processor and financial-institution settlement times vary. When approved, refunds generally go to the original payment method and appear subject to processor/bank settlement.

### Cancellation instructions and confirmation
To cancel future recurring charges, use the Member Dashboard billing controls and applicable payment-provider portal. If unavailable, contact stockmarketfromthegroundup@gmail.com and provide the account email and an order or subscription reference, not card numbers. A workable support alternative must be available. Cancellation should identify the applicable effective date and paid-through period. Stopping renewals and evaluating a refund are separate decisions; a valid cancellation must not continue to incur unauthorized renewals.

### How delivered access is evaluated
For digital books, Crownlight Sparks, Tool Passes, memberships and educational programs, review focuses on whether the purchased benefit was materially delivered and usable as offered. An entitlement row or download link alone does not conclusively establish complete delivery. For missing or materially defective paid access, we will consider restoration, correction, another remedy affirmatively accepted by the customer, or a refund required by contract, payment-provider rules or law.

### Prorations, disputes and processing
Nonuse or a changed trading preference does not ordinarily create discretionary refunds. A partial refund, credit or pro rata adjustment may be due where the offer, law or payment provider requires it. No transaction amount cancels mandatory consumer remedies. Refund posting times vary by issuer and provider. Customers are not required to present a police report as a precondition to a legitimate billing complaint, and lawful payment disputes will not be punished solely because they were asserted.

### Contact and support
Questions about this policy may be submitted through the website Support Center or to stockmarketfromthegroundup@gmail.com.
',version='2.2',effective_at=now(),updated_at=now() WHERE document_code='REFUNDS' AND status='published' AND version='2.1';
INSERT INTO public.legal_documents (document_code,title,slug,body_markdown,version,status,effective_at,updated_at) VALUES ('EDITORIAL','Editorial Guidelines & Correction Standards','editorial-guidelines','### Purpose and instructional standard
The Stock Market: From the Ground Up publishes beginner-first, evidence-based stock-market education. Books, Labs, Boot Camps, Market Tutor guidance and research explain market mechanisms and disciplined decisions. We teach definitions, calculations, examples, common execution mistakes and risk limitations before independent practice. Scores represent learning evidence, not financial returns, professional credentials or investment suitability.

### Research and source standards
Factual statements about rules, market history, broker functionality, order processing and trading mechanics should use identifiable, appropriate sources. We distinguish primary evidence, secondary commentary, estimates, instructional interpretations and unresolved questions. Market regulations, pricing and third-party products can change; dated assertions require review when material.

### Historical charts and fictional instruction
Genuine historical examples should have traceable instrument, date, interval, data source and sufficient rights for publication. Diagrammatic candles, synthetic prices and fictional exercises must be identified as illustrative, never marketed as real trades or performance. A trading decision exercise must not quietly use future data to explain a decision that supposedly preceded it. No historical result guarantees a future outcome.

### Editorial independence and AI
Sponsors, advertisers and affiliate partners cannot buy favorable assessment keys, inaccurate endorsements, unverified claims or suppression of material corrections. AI may assist content and tutoring; AI-generated text is not necessarily independently verified. Where human/editorial review has not occurred, we do not imply it has. See the AI Use and Advertising disclosures.

### Corrections and evidence
We evaluate credible reports of material errors, mislabeled data, unsupported claims and missing attribution. Material corrections should identify the corrected concept and update the applicable edition or lesson where feasible. We may preserve versions for editorial audit. No fixed correction turnaround is promised.

### Contact
Report source or editorial concerns to stockmarketfromthegroundup@gmail.com. Do not include private credentials, full brokerage statements or payment-card details.','1.0','published',now(),now());
INSERT INTO public.legal_documents (document_code,title,slug,body_markdown,version,status,effective_at,updated_at) VALUES ('AFFILIATE','Affiliate, Referral & Compensation Disclosure','affiliate-disclosure','### Direct sales and paid promotion
The Stock Market: From the Ground Up sells its own educational books, memberships and eligible services. It may also offer clearly identified paid advertising or sponsored placements. Paid promotion is separate from independent educational instruction and assessment.

### Affiliate and referral compensation
If a verified commercial relationship exists, a qualified link or referral may generate a commission, credit or other benefit to the Operator. Such a material connection must be communicated clearly and near the affected link, review or endorsement. This general page alone is not a substitute for point-of-promotion disclosure. An affiliate link does not guarantee product quality, profitability, approval, pricing, or availability.

### thinkorswim and Charles Schwab
Our educational materials may describe thinkorswim, a third-party platform associated with Charles Schwab, for independent learning and practice workflows. Naming thinkorswim or linking to its informational pages does not by itself establish that Charles Schwab pays, endorses or sponsors this website. We must not call a thinkorswim link a commission-paying affiliate link or represent a formal partnership without verifying an applicable commercial agreement and placing a specific disclosure. External brokerage and market-data services are not included in our membership merely because they are referenced.

### Independence, reviews and conflicts
A payment or referral benefit does not entitle a sponsor to choose Lab grades, control tutor answers, conceal documented risk, or require misleading investment claims. Testimonials and paid endorsements must be truthful and identify material relationships when relevant.

### Third-party terms and contact
External merchants govern their own product, return, licensing and privacy terms. Verify those terms before purchasing or registering. Questions about compensation or relationships: stockmarketfromthegroundup@gmail.com.','1.0','published',now(),now());
INSERT INTO public.legal_documents (document_code,title,slug,body_markdown,version,status,effective_at,updated_at) VALUES ('RELATED_ENTITIES','Related Brands, Providers & Third-Party Relationships','related-entities-disclosure','### Educational brand names
The Stock Market: From the Ground Up is the educational series and platform name. Crown & Lantern Press is used as a publishing imprint or brand. Cyber Nexus appears in related project or publishing materials. Use of these names alone does not establish a legally registered corporation, LLC, fictitious business name, parent company, or subsidiary. The actual contracting seller and merchant of record must be determined from the relevant checkout, provider agreement and transaction receipt.

### Operational providers
The site uses providers such as Cloudflare for hosting and security, Supabase for application data and accounts, and Stripe or Stripe-related payment services where enabled. These are independent service providers with distinct contracts and processing roles; infrastructure use does not create corporate affiliation or a content endorsement. See the Privacy Policy for personal-information processing practices.

### Publishing and external merchants
Books may be sold through independent retailers, including Amazon where applicable. Their purchases, delivery mechanisms, subscription rules and refund terms can differ from direct website transactions. An external marketplace listing is not an offer of direct website download rights.

### Trading software and financial services
thinkorswim and Charles Schwab are referenced as independent third parties for educational context. Their trademarks and platforms are not owned by this educational site. We do not infer sponsorship, affiliate compensation or a commercial relationship from a reference or external link. Brokerage terms, trading eligibility and fees are controlled by the provider.

### Sponsors, partners and changes
Any verified material sponsorship, referral or other commercial relationship that could affect a recommendation should be disclosed with the relevant content. We will not publish unverified company hierarchies or claim registration of related entities that has not been confirmed.

### Contact
To identify the merchant or inquire about a named relationship, email stockmarketfromthegroundup@gmail.com with the relevant order reference. Never send full payment-card information.','1.0','published',now(),now());
INSERT INTO public.legal_documents (document_code,title,slug,body_markdown,version,status,effective_at,updated_at) VALUES ('DMCA','Copyright Complaints & DMCA Takedown Policy','dmca-takedown-policy','### Scope
We respect copyright in educational materials, member posts, charts, images and other creative work. This policy supplements our Copyright & Intellectual Property Notice and does not transfer rights to third-party materials.

### Written infringement notifications
Email stockmarketfromthegroundup@gmail.com with: a physical or electronic signature of the rights owner or authorized representative; identification of the copyrighted work (or representative list); identification and reasonably precise location of the complained-of material, including applicable URLs; sufficient contact details; a statement of good-faith belief that the use is unauthorized by the owner, its agent or law; and a statement under penalty of perjury that the notice is accurate and the sender is authorized to act for the owner of the allegedly infringed exclusive right.

### Review and removal
We review sufficiently specific claims, may seek clarifications, may remove or disable access to disputed material when warranted, and may notify the relevant posting member. A complaint is not proof of infringement. Lawful fair use, valid licenses and other statutory protections remain relevant.

### Counter-notifications
A member disputing removal based on mistake or misidentification can provide a physical or electronic signature; identification of the removed content and former location; a statement under penalty of perjury of good-faith belief that removal resulted from mistake or misidentification; name, address, telephone number and email; and consent to jurisdiction of the appropriate United States federal district court (or qualifying district for a person outside the United States) and to accept service of process from the original claimant or its agent. Where required, a valid counter-notice may be forwarded to the claimant and content restored in accordance with statutory procedures and any court notice.

### Repeat infringement and misuse
We may reasonably restrict posting access for repeat infringement consistent with applicable law and notice review. Knowingly false assertions in notices or counter-notices may carry legal consequences. We do not prohibit lawful criticism or fair use.

### Designated agent and eligibility
The email above is a copyright-reporting contact. Publishing this policy does not constitute verification of a designated agent registration with the U.S. Copyright Office or a claim of eligibility for a DMCA safe harbor. The required registration and operational process are separately subject to verification.','1.0','published',now(),now());
INSERT INTO public.legal_documents (document_code,title,slug,body_markdown,version,status,effective_at,updated_at) VALUES ('AI_USE','AI Use & Automated Educational Feedback Disclosure','ai-use-disclosure','### Educational purpose
AI may assist The Stock Market: From the Ground Up with explanations, guided examples, content drafts, diagnostic feedback or learning support. AI is not a broker, financial adviser, fiduciary, lawyer, accountant or substitute for independently checking consequential information.

### Talia instructor persona
Talia is a designed educational instructor persona, not a human professional offering individually licensed financial advice. The appearance of a portrait or conversational voice does not mean every response has been reviewed by a human. AI-assisted explanations may be incorrect, incomplete, inconsistent or outdated.

### Limits of personalization
Adapting explanations to a member''s learning progress does not constitute a personalized recommendation to buy, sell, hold or size a real-money position. Member journal entries, scores, hypothetical exercises and fictional replay are educational records, not independently verified trading returns or real brokerage confirmations.

### Data, privacy and security
Member prompts and answers may be processed to deliver supported tutoring or assessments under our Privacy Policy. Do not submit passwords, API keys, government identifiers, full brokerage statements, card numbers, private medical data or information you lack authority to disclose. We do not claim that every AI interaction stays entirely on first-party infrastructure without verifying the underlying processing architecture.

### Research verification and corrections
Verify live rules, broker features, data timestamps, company actions and calculations from appropriate sources before depending on them. Fictional and reconstructed examples must not be mislabeled as historical trades. Report errors or problematic content for review, and consult properly licensed professionals for personalized financial questions.

### Sponsored content and contact
Paid sponsors may not determine private grading or manufacture a tutor endorsement. See Editorial Guidelines and Affiliate Disclosure. Questions: stockmarketfromthegroundup@gmail.com.','1.0','published',now(),now());
COMMIT;
