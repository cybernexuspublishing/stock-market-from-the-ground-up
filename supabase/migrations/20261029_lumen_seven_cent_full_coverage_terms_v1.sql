-- Supersede old 10-cent/20%/$10 Lumen proposals, keep historical versions.
BEGIN;
DO $v$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE
 (document_code='TERMS' AND version='2.4' AND status='published') OR
 (document_code='CROWNLIGHT_SPARKS' AND version='2.3' AND status='published'))<>2 THEN
 RAISE EXCEPTION 'Unexpected legal versions'; END IF;
END $v$;
INSERT INTO public.legal_documents_publication_history_v2
 (document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at
FROM public.legal_documents
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS')
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents SET body_markdown=
 replace(replace(replace(
 regexp_replace(body_markdown,
  E'### Proposed Crownlight Lumens purchase-discount limits \\(not yet activated\\)[\\s\\S]*$', ''),
 '$0.10','$0.07'),'$20.00','$14.00'),
 'not a $20 cash payment','not a cash payment')
 || $new$

### Current Lumen denomination and full-coverage policy — October 29, 2026
**One (1) Crownlight Lumen provides up to $0.07 of redemption value for eligible platform products.** Eligible products may be paid **100% with Lumens**, with **no percent or fixed-dollar discount cap**, provided the member has sufficient available Lumens and the product is released for Lumen redemption. Only whole Lumens are spent, so the last Lumen may cover a residual 1–6 cents without cash change. A complete final price, number of Lumens to debit, qualification checks, any taxes or delivery charges not covered, and term of access must appear before the member confirms.

The planned one-time sign-up award of **200 complimentary Lumens is now worth up to $14.00**, not $20.00. That promotion remains unactivated and does not create a cash payment. Unused Lumens never expire. Digital access purchased with Lumens may expire at its disclosed end time and does not automatically renew. No duplicate payment is required for a benefit already included with a current membership. Lumen-only orders may use a separate server-verified, atomic entitlement and wallet debit rather than an unnecessary $0.00 card processor transaction.

Only product offers explicitly released at an approved server price are purchasable. Draft offers, unpublished books, unsupported physical merchandise, unlicensed source material and missing files are not available regardless of a member's Lumen balance. Credit bundles remain independently priced, and a Lumen's redemption value does not set the sale price of a credit bundle.
$new$,
 version='2.5',updated_at=now(),effective_at=now()
WHERE document_code='TERMS' AND version='2.4';
UPDATE public.legal_documents SET body_markdown=
 replace(replace(replace(
 regexp_replace(body_markdown,
  E'### Proposed Lumen Store redemption and discount cap — inactive cash-discount feature[\\s\\S]*$', ''),
 '$0.10','$0.07'),'$20.00','$14.00'),
 'not a $20 cash payment','not a cash payment')
 || $new$

### Current Lumen value, non-expiration and 100% redemption — October 29, 2026
The revised nominal Lumen redemption rate is **$0.07 for each whole Lumen**. Any eligible, authorized digital platform product may be funded entirely in Lumens when the wallet balance covers the quote. There is **no 20% restriction and no $10 per-order ceiling**. The final whole Lumen may cover less than $0.07 when the item's cent price is not evenly divisible by seven; the confirmed screen must disclose the exact number deducted, without cash change. Product eligibility, price, access duration, and existing membership inclusion are enforced by the server. No member must purchase an item again if it is included in the member's active rights.

**All unused Lumens never expire**, irrespective of whether included, purchased, earned or promotional. A purchased trial or temporary software entitlement still ends at its disclosed expiration date/time, without automatic renewal. Full Lumen-only payments can be processed without charging a bank card. Member-origin promotional credits remain distinct from purchased/earned credits in the ledger once promotional grants are launched.

**200 proposed welcome Lumens have a nominal maximum redemption value of $14.00**, not $20.00. The welcome campaign and new unpriced tool offers are not activated by these Terms. Refunds, reversals and canceled entitlements require a server-audited transaction path and may not be fabricated by a browser success page. Apparel remains a future category.
$new$,
 version='2.4',updated_at=now(),effective_at=now()
WHERE document_code='CROWNLIGHT_SPARKS' AND version='2.3';
COMMIT;