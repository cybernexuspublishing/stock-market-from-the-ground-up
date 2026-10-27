-- v20261027: Existing support ticket-backed private book purchase receipt pipeline.
-- Source reconstructed exactly from validated production function definitions.
-- No member receipts, private files, tokens or entitlements are present in this migration.
BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('gu-book-receipts','gu-book-receipts',false,6291456,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO NOTHING;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='gu-book-receipts'
 AND public=false AND file_size_limit=6291456
 AND allowed_mime_types@>ARRAY['application/pdf','image/jpeg','image/png']::text[])
 THEN RAISE EXCEPTION 'RECEIPT_BUCKET_SECURITY_MISMATCH'; END IF;
END $guard$;
DROP POLICY IF EXISTS gu_receipt_member_insert_v1 ON storage.objects;
CREATE POLICY gu_receipt_member_insert_v1 ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='gu-book-receipts'
 AND split_part(name,'/',1)=auth.uid()::text
 AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|png|jpg|jpeg)$'
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
 AND p.account_kind='member' AND p.deleted_at IS NULL));
ALTER TABLE public.gu_book_receipt_claims_20261027
 ADD COLUMN IF NOT EXISTS ticket_id bigint UNIQUE REFERENCES public.support_tickets(id);
CREATE INDEX IF NOT EXISTS gu_receipt_ticket_idx_v1
 ON public.gu_book_receipt_claims_20261027(ticket_id);
CREATE OR REPLACE FUNCTION public.gu_owner_decide_book_receipt_v1(p_claim uuid, p_owner uuid, p_action text, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE cl public.gu_book_receipt_claims_20261027%ROWTYPE; title text;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.admin_user_roles r JOIN public.profiles p ON p.id=r.user_id
   WHERE r.user_id=p_owner AND r.role_code='OWNER'
   AND (r.expires_at IS NULL OR r.expires_at>now())
   AND p.account_kind='member' AND p.deleted_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.admin_user_flags f
   WHERE f.user_id=p_owner AND f.status IN ('restricted','suspended'))
 THEN RAISE EXCEPTION 'OWNER_AUTHORIZATION_REQUIRED';END IF;
 IF p_action NOT IN ('approve','reject','awaiting_information')
 OR length(btrim(coalesce(p_note,'')))<12 OR length(p_note)>1500
 THEN RAISE EXCEPTION 'REVIEW_DECISION_AND_REASON_REQUIRED';END IF;
 SELECT * INTO cl FROM public.gu_book_receipt_claims_20261027
 WHERE id=p_claim FOR UPDATE;
 IF NOT FOUND OR cl.ticket_id IS NULL OR cl.attachment_storage_reference IS NULL
 THEN RAISE EXCEPTION 'RECEIPT_TICKET_NOT_FOUND';END IF;
 IF cl.status IN ('approved','rejected') THEN RAISE EXCEPTION 'ALREADY_DECIDED';END IF;
 IF p_action='approve' THEN
  SELECT title INTO title FROM public.catalog_products
   WHERE product_code=cl.book_code AND product_type='book'
   AND active=true AND companion_access=true;
  IF title IS NULL THEN RAISE EXCEPTION 'BOOK_NOT_ELIGIBLE';END IF;
  IF lower(cl.registered_email)<>lower(cl.sender_email)
   OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=cl.user_id
     AND lower(u.email)=lower(cl.registered_email) AND u.email_confirmed_at IS NOT NULL)
  THEN RAISE EXCEPTION 'REGISTERED_EMAIL_NO_LONGER_VERIFIED';END IF;
  IF EXISTS(SELECT 1 FROM public.user_library ul
    WHERE ul.user_id=cl.user_id AND ul.product_code=cl.book_code
    AND ul.access_type='companion' AND ul.source_channel='admin'
    AND ul.source_reference<>('book_receipt:'||cl.id::text))
  THEN RAISE EXCEPTION 'EXISTING_MANUAL_BOOK_GRANT_REQUIRES_REVIEW';END IF;
  INSERT INTO public.user_library(user_id,product_code,access_type,source_channel,source_reference,metadata)
  VALUES(cl.user_id,cl.book_code,'companion','admin','book_receipt:'||cl.id::text,
  jsonb_build_object('receipt_verified',true,'claim_id',cl.id::text,
   'approved_by',p_owner::text,'access_scope','companion_only_no_ebook_file'))
  ON CONFLICT DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.user_plan_grants
   WHERE user_id=cl.user_id AND plan_code='FREE' AND status='active') THEN
   INSERT INTO public.user_plan_grants(user_id,plan_code,status,source,source_reference,metadata)
   VALUES(cl.user_id,'FREE','active','admin','book_receipt:'||cl.id::text,
    jsonb_build_object('book_receipt_approved',cl.id::text,'approved_by',p_owner::text));
  END IF;
 END IF;
 UPDATE public.gu_book_receipt_claims_20261027 SET
 status=CASE p_action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected'
 ELSE 'awaiting_information' END,
 processed_at=CASE WHEN p_action='awaiting_information' THEN NULL ELSE now() END,
 processed_by=CASE WHEN p_action='awaiting_information' THEN NULL ELSE p_owner END,
 staff_note=btrim(p_note)
 WHERE id=cl.id;
 UPDATE public.support_tickets SET
 status=CASE WHEN p_action='approve' OR p_action='reject' THEN 'resolved'
 ELSE 'waiting_member' END,
 resolved_at=CASE WHEN p_action='approve' OR p_action='reject' THEN now() ELSE NULL END,
 last_staff_reply_at=now(),updated_at=now()
 WHERE id=cl.ticket_id AND requester_user_id=cl.user_id;
 INSERT INTO public.support_ticket_messages(ticket_id,author_user_id,author_kind,body,is_internal)
 VALUES(cl.ticket_id,p_owner,'staff',
 CASE p_action WHEN 'approve' THEN 'Purchase verification approved. Eligible book companion and Free access have been updated.'
 WHEN 'reject' THEN 'Purchase verification was not approved: '||btrim(p_note)
 ELSE 'Additional receipt information is required: '||btrim(p_note) END,false);
 RETURN jsonb_build_object('ok',true,'claimId',cl.id,'ticketId',cl.ticket_id,
 'state',CASE p_action WHEN 'approve' THEN 'approved'
 WHEN 'reject' THEN 'rejected' ELSE 'awaiting_information' END);
END $function$;

CREATE OR REPLACE FUNCTION public.gu_support_create_book_receipt_v1(p_member uuid, p_book_code text, p_retailer text, p_order_ref text, p_evidence_path text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage', 'pg_temp'
AS $function$
DECLARE b public.catalog_products%ROWTYPE;
  o storage.objects%ROWTYPE; usr auth.users%ROWTYPE;
  ticket bigint; cl uuid; sz bigint; mime text; tno text;
BEGIN
 IF auth.role() NOT IN ('service_role') THEN RAISE EXCEPTION 'SERVICE_ROLE_REQUIRED';END IF;
 IF p_member IS NULL OR p_book_code !~ '^[A-Z0-9_]{3,90}$'
 OR length(btrim(p_retailer)) NOT BETWEEN 2 AND 100
 OR length(coalesce(p_order_ref,''))>150 OR length(coalesce(p_notes,''))>1200
 OR p_evidence_path !~ ('^'||p_member::text||'/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$')
 THEN RAISE EXCEPTION 'INVALID_RECEIPT_FORM';END IF;
 SELECT * INTO usr FROM auth.users WHERE id=p_member;
 IF NOT FOUND OR usr.email_confirmed_at IS NULL OR usr.email IS NULL
 THEN RAISE EXCEPTION 'CONFIRMED_MEMBER_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles
    WHERE id=p_member AND account_kind='member' AND deleted_at IS NULL)
 THEN RAISE EXCEPTION 'MEMBER_PROFILE_REQUIRED';END IF;
 SELECT * INTO b FROM public.catalog_products
   WHERE product_code=p_book_code AND product_type='book' AND active=true
   AND companion_access=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'BOOK_NOT_ELIGIBLE';END IF;
 SELECT * INTO o FROM storage.objects WHERE bucket_id='gu-book-receipts' AND name=p_evidence_path;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECEIPT_ATTACHMENT_REQUIRED';END IF;
 sz:=coalesce((o.metadata->>'size')::bigint,0);
 mime:=o.metadata->>'mimetype';
 IF sz<100 OR sz>6291456 OR mime NOT IN ('application/pdf','image/jpeg','image/png')
 THEN RAISE EXCEPTION 'UNSAFE_RECEIPT_ATTACHMENT';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_member::text||':'||p_book_code,0));
 IF EXISTS(SELECT 1 FROM public.gu_book_receipt_claims_20261027
 WHERE user_id=p_member AND book_code=p_book_code
 AND status IN ('pending_staff_validation','awaiting_information','approved'))
 THEN RAISE EXCEPTION 'BOOK_RECEIPT_ALREADY_PENDING_OR_APPROVED';END IF;
 INSERT INTO public.support_tickets
 (requester_user_id,category,subject,description,status,priority,
  last_member_reply_at,updated_at,tags,metadata)
 VALUES(p_member,'book_access','Book purchase verification: '||b.title,
  'Purchased book: '||b.title||E'\nRetailer: '||btrim(p_retailer)||
  E'\nOrder reference: '||coalesce(nullif(btrim(p_order_ref),''),'Not provided')||
  E'\nNotes: '||coalesce(nullif(btrim(p_notes),''),'None')||
  E'\nPrivate receipt attached for authorized Admin review.',
 'new','normal',now(),now(),ARRAY['book_receipt','admin_review'],
 jsonb_build_object('claim_type','book_receipt','book_code',p_book_code,
  'private_receipt_attached',true))
 RETURNING id,ticket_number INTO ticket,tno;
 INSERT INTO public.gu_book_receipt_claims_20261027
 (user_id,registered_email,sender_email,book_code,provider,
  external_order_reference,attachment_storage_reference,ticket_id)
 VALUES(p_member,lower(usr.email),lower(usr.email),p_book_code,btrim(p_retailer),
  nullif(btrim(p_order_ref),''),p_evidence_path,ticket)
 RETURNING id INTO cl;
 INSERT INTO public.support_ticket_messages
 (ticket_id,author_user_id,author_kind,body,is_internal,attachments)
 VALUES(ticket,p_member,'member',
  'Receipt uploaded for verification. Book: '||b.title||
  '. The private file is accessible to authorized Admin reviewers only.',false,
  jsonb_build_array(jsonb_build_object('kind','book_receipt','name','Purchase receipt',
   'mime',mime,'size',sz,'receipt_claim_id',cl::text)));
 RETURN jsonb_build_object('ok',true,'ticketId',ticket,'ticketNumber',tno,
   'claimId',cl,'status','pending_staff_validation');
END $function$;

REVOKE ALL ON FUNCTION public.gu_support_create_book_receipt_v1(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_support_create_book_receipt_v1(uuid,text,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.gu_owner_decide_book_receipt_v1(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gu_owner_decide_book_receipt_v1(uuid,uuid,text,text) TO service_role;
COMMIT;
