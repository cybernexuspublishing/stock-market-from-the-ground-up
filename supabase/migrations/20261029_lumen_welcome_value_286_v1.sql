-- Restore ~$20 sign-up offer value when Lumen redemption is 7 cents.
BEGIN;
DO $v$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE
 (document_code='TERMS' AND version='2.5' AND status='published') OR
 (document_code='CROWNLIGHT_SPARKS' AND version='2.4' AND status='published'))<>2
 THEN RAISE EXCEPTION 'Legal versions changed';END IF;
END $v$;
INSERT INTO public.legal_documents_publication_history_v2
(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at FROM public.legal_documents
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS')
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200 complimentary Crownlight Lumens','286 complimentary Crownlight Lumens')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200 complimentary Lumens','286 complimentary Lumens')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200 promotional credits','286 promotional credits')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200-Lumen','286-Lumen')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200 credits','286 credits')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'200 Lumens','286 Lumens')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=replace(body_markdown,'$14.00','$20.02')
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS');
UPDATE public.legal_documents
SET body_markdown=body_markdown || $note$

### Revised prospective welcome bonus quantity — October 29, 2026
To preserve the original approximately $20 sign-up offer with 1 Lumen worth $0.07, the **proposed welcome quantity is 286 complimentary Lumens**, which can provide up to **$20.02 of eligible redemption value**. Earlier references to a 200-Lumen or $14 welcome award are superseded. This offer remains **inactive** until verified registration, email confirmation, once-per-qualifying-account issuance and independently auditable promotional wallet credits are released. The bonus is never withdrawable as cash.
$note$,
version='2.6',effective_at=now(),updated_at=now()
WHERE document_code='TERMS' AND version='2.5';
UPDATE public.legal_documents
SET body_markdown=body_markdown || $note$

### Revised welcome offer — prospective only
At $0.07 per Lumen, **286 complimentary Lumens** represent **up to $20.02 of eligible product redemption value**. This preserves the intended approximately $20 bonus rather than reducing it to $14. The campaign remains inactive pending one-time verified, origin-tagged, anti-duplicate credit issuance, and is not a cash payment.
$note$,
version='2.5',effective_at=now(),updated_at=now()
WHERE document_code='CROWNLIGHT_SPARKS' AND version='2.4';
COMMIT;