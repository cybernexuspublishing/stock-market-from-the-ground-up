-- Prospective Lumen Store discount cap; no checkout/grant/payment activation.
BEGIN;
DO $pre$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents
      WHERE (document_code='TERMS' AND version='2.3' AND status='published')
         OR (document_code='CROWNLIGHT_SPARKS' AND version='2.2' AND status='published')) <> 2
 THEN RAISE EXCEPTION 'Unexpected legal policy version; no changes made'; END IF;
END $pre$;
INSERT INTO public.legal_documents_publication_history_v2
 (document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at
FROM public.legal_documents
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS') AND status='published'
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents
SET version='2.4',effective_at=now(),updated_at=now(),
 body_markdown=body_markdown || $append$

### Proposed Crownlight Lumens purchase-discount limits (not yet activated)
When the optional Lumen discount at eligible cash checkout is separately activated, the **initial proposed per-order limit** is the lesser of: **20% of the eligible subtotal after other authorized discounts**, or **$10.00**. Each applied Lumen would reduce the eligible amount payable by **$0.10**; only whole Lumens may be applied. Taxes, shipping, gift cards, buying Lumens, recurring subscription renewals, and other excluded categories do not qualify under this proposed first release. A checkout must disclose the final eligibility, number of Lumens spent, discount, remaining credit balance and total cash payable before confirmation; no policy text authorizes a debit or purchase.

The previously proposed one-time 200-Lumen registration reward represents **up to $20 across eligible future purchases**, not a promise of a $20 discount on one order. The unused balance never expires. Capped cash discounts are a separate option from spending Lumens on approved temporary tool access and other marketplace rewards; the permitted product and current Lumen cost are verified before each redemption. Unreleased account rewards, digital downloads and future physical apparel are not available for purchase until actually supported. Current package checkout and Lumen cash-discount redemption are disabled pending pricing, fulfillment and member acceptance.
$append$
WHERE document_code='TERMS' AND version='2.3' AND status='published';
UPDATE public.legal_documents
SET version='2.3',effective_at=now(),updated_at=now(),
 body_markdown=body_markdown || $append$

### Proposed Lumen Store redemption and discount cap — inactive cash-discount feature
Unused Crownlight Lumens **do not expire**, whether earned, promotional, purchased, granted, or included in membership. Eligible temporary passes, studio trials and other time-limited benefits expire at the stated end time; standalone access trials do not auto-renew.

The proposed optional cash-checkout discount is **$0.10 per Lumen**, limited per eligible order to **20% of the discounted eligible subtotal or $10.00**, whichever is less. These restrictions apply after any valid Founding Member or other authorized discount, before taxes and shipping. Buying additional Lumens, gift cards, recurring subscription renewals, and future physical merchandise do not qualify for this initial proposed redemption program. The 200-Lumen promotional sign-up offer, if activated, is potentially worth up to $20 **across multiple qualifying orders** and cannot necessarily be used in one purchase.

The Lumen Store may separately allow direct Lumen redemption for server-verified learning passes and educational conveniences. Only released items with a confirmed cost and an atomic, authorized fulfillment pathway can be redeemed. Digital/account customization, research micro-trials and apparel listings marked as planned are **not offers to purchase**. Do not double-charge a member for active included Founding Member benefits. Lumen discounts and packages remain unavailable until final commercial approval and tested implementation.
$append$
WHERE document_code='CROWNLIGHT_SPARKS' AND version='2.2' AND status='published';
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents
 WHERE (document_code='TERMS' AND version='2.4')
    OR (document_code='CROWNLIGHT_SPARKS' AND version='2.3')) <> 2
 THEN RAISE EXCEPTION 'Prospective policy publication verification failed'; END IF;
END $post$;
COMMIT;
