-- Preserve the original $20 signup offer intent when one Lumen = 7 cents.
-- 286 Lumens yield up to $20.02 in eligible redemptions; still prospective.
BEGIN;
DO $v$ BEGIN
 IF (SELECT count(*) FROM public.legal_documents WHERE
 (document_code='TERMS' AND version='2.5' AND status='published') OR
 (document_code='CROWNLIGHT_SPARKS' AND version='2.4' AND status='published'))<>2
 THEN RAISE EXCEPTION 'Legal versions changed; review before updating';END IF;
END $v$;
INSERT INTO public.legal_documents_publication_history_v2
(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at FROM public.legal_documents
WHERE document_code IN ('TERMS','CROWNLIGHT_SPARKS')
ON CONFLICT(document_code,version) DO NOTHING;
UPDATE public.legal_documents
SET body_markdown=replace(replace(replace(replace(replace(replace(replace(
 body_markdown,
 '200 complimentary Crownlight Lumens','286 complimentary Crownlight Lumens'),
 '200 complimentary Lumens','286 complimentary Lumens'),
 '200 promotional credits','286 promotional credits'),
 '200-Lumen','286-Lumen'),
 '200 credits','286 credits'),
 '$14.00','$20.02'),
 '200 Lumens','286 Lumens')
 || $note$

### Revised prospective welcome bonus quantity
To preserve the originally advertised approximately $20 welcome-credit offer under the $0.07-per-Lumen rate, the **proposed quantity is 286 complimentary Lumens**, nominally worth **up to $20.02** on eligible platform products. This supersedes earlier references to 200 Lumens or a $14 promotional value. The offer is **not yet active**, requires eligible registration and verified email, is limited to one award per qualifying account, cannot be withdrawn as cash, and must be implemented through the server-side promotional wallet ledger before it is advertised as already issued.
$note$,
 version='2.6',effective_at=now(),updated_at=now()
WHERE document_code='TERMS' AND version='2.5';
UPDATE public.legal_documents
SET body_markdown=replace(replace(replace(replace(replace(replace(replace(replace(
 body_markdown,
 '200 complimentary Crownlight Lumens','286 complimentary Crownlight Lumens'),
 '200 complimentary Lumens','286 complimentary Lumens'),
 '200 promotional credits','286 promotional credits'),
 '200-Lumen','286-Lumen'),
 '200 credits','286 credits'),
 '$14.00','$20.02'),
 '200 Lumens','286 Lumens')
 || $note$

### Revised welcome offer — prospective only
At $0.07 per Lumen, **286 complimentary Lumens** have up to **$20.02** in eligible product redemption value. This preserves the intended approximately $20 signup promotion, rather than reducing its value to $14. The promotion remains inactive pending one-time, verified, origin-tagged wallet issuance and anti-duplicate controls; it is not a cash bonus or a guaranteed payment.
$note$,
 version='2.5',effective_at=now(),updated_at=now()
WHERE document_code='CROWNLIGHT_SPARKS' AND version='2.4';
COMMIT;