-- Prelaunch legal clarification: Lumens are platform credits, never cash-out.
-- Preserve each superseded public policy and publish understandable terms.
-- Does not create a payment, grant, wallet movement or change the 7-cent rate.
BEGIN;
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE
   (document_code='TERMS' AND status='published' AND version='2.6') OR
   (document_code='CROWNLIGHT_SPARKS' AND status='published' AND version='2.5'))<>2
 THEN RAISE EXCEPTION 'Current published legal versions changed; manual review required';END IF;
 IF EXISTS(SELECT 1 FROM public.legal_documents WHERE
 document_code IN ('TERMS','CROWNLIGHT_SPARKS') AND body_markdown LIKE '%No cash-out or exchange of Crownlight Lumens — prelaunch terms%')
 THEN RAISE EXCEPTION 'Lumen cash-out clause already published';END IF;
END $guard$;
INSERT INTO public.legal_documents_publication_history_v2
(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at
FROM public.legal_documents
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS')
ON CONFLICT(document_code,version) DO NOTHING;

UPDATE public.legal_documents
SET body_markdown=body_markdown || $new$

### No cash-out or exchange of Crownlight Lumens — prelaunch terms
**Crownlight Lumens are non-cash, limited-use platform credits.** They are not money or a cash balance. Lumens cannot be exchanged or redeemed for cash, withdrawn or paid out to a bank account or payment service, sold back to the Operator, transferred or sold to another person for money, or converted into cryptocurrency, securities, or brokerage trading funds. We do not operate a cash-out or member-to-member currency exchange for Lumens.

A quoted rate such as **$0.07 per Lumen** is a **platform redemption calculation**, not a cash exchange rate or a promise that Lumens may be sold for $0.07. Members may use an authorized number of whole Lumens for eligible website product purchases or checkout discounts, including up to the full eligible product subtotal where available. Lumens cannot be used to withdraw money or obtain cash change. Lumens are distinct from the separate price, if any, charged to acquire a Lumen bundle.

Unused Lumens do not expire under the current program policy; a purchased time-limited benefit or trial may expire according to its disclosed terms. **This restriction does not remove non-waivable rights**, including refunds or other remedies required by applicable law, the payment provider, or the published Refund & Cancellation Policy where purchased credits are not delivered, transactions are unauthorized or duplicated, or other legally protected circumstances apply. Where a refund is owed, its approved method and amount are determined by the underlying transaction and applicable rules, not by an automatic member cash-out feature.

**Prelaunch notice:** this clause describes planned future Lumen purchases and discounts and does not indicate that Lumen bundles or combined cash-and-Lumen checkout are already available or that customers have made such purchases. An offer must be separately released and display its actual cost and restrictions before payment.
$new$,
version='2.7', effective_at=now(), updated_at=now()
WHERE document_code='TERMS' AND status='published' AND version='2.6';

UPDATE public.legal_documents
SET title='Crownlight Lumens (formerly Sparks) Purchase & Use Terms',
 body_markdown=body_markdown || $new$

### No cash-out or exchange of Crownlight Lumens — prelaunch terms
**Crownlight Lumens are non-cash, limited-use platform credits, not money or a withdrawable cash balance.** No Lumen may be exchanged or redeemed for cash, paid out to a bank or other payment account, sold back to the Operator, sold or exchanged with another member for money, converted to cryptocurrency or brokerage buying power, or used outside an authorized platform checkout. The program has no cash-out facility or person-to-person currency exchange.

The current **$0.07 redemption calculation per whole Lumen** is used solely for eligible product prices and discount quotes; it **does not give each Lumen a $0.07 cash surrender or resale value**. Eligible members may apply selected Lumens to part or all of a qualifying item price subject to actual released offers, remaining taxes or delivery charges, access terms and sufficient available credits. No cash change is payable for unused discount capacity or a fully credit-funded checkout. The separate purchase price of a Lumen package, if introduced, is not a buyback or cash exchange rate.

All unused Lumens remain **non-expiring**. Time-limited passes or trials obtained with Lumens may nevertheless expire at their disclosed end time. This non-cash-out rule **does not waive refunds or legal remedies** required under applicable law, processor terms or the Refund & Cancellation Policy for purchased credits, including unauthorized charges, duplicate payments and material nondelivery. A verified refund is handled through the applicable order and ledger correction, not as unrestricted cash conversion of other Lumens.

This program is **prelaunch** for new bundles and mixed cash-and-Lumen purchases. Policy publication does not itself authorize a payment, credit grant, new product sale or availability of cash-out features.
$new$,
 version='2.6', effective_at=now(), updated_at=now()
WHERE document_code='CROWNLIGHT_SPARKS' AND status='published' AND version='2.5';
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE
   (document_code='TERMS' AND version='2.7' AND status='published') OR
   (document_code='CROWNLIGHT_SPARKS' AND version='2.6' AND status='published'))<>2
 THEN RAISE EXCEPTION 'Could not confirm published Lumen cash-out clauses';END IF;
END $verify$;
COMMIT;