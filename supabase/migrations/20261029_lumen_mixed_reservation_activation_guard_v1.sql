-- Lumen/cash reservations must honor the audited checkout activation flag.
-- This migration does not enable mixed checkout, charge Stripe, or spend Lumens.
-- Existing release migration guards changing mixed_checkout_enabled.
BEGIN;
DO $guard$
DECLARE definition text;
DECLARE anchor text := 'PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,489301));';
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO definition
 FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace
   AND p.proname='gu_lumen_mixed_reserve_v1'
   AND pg_get_function_identity_arguments(p.oid)=
     'p_user uuid, p_sku text, p_request uuid, p_lumens integer, p_expected_cents integer';
 IF definition IS NULL THEN
   RAISE EXCEPTION 'Mixed reservation contract absent; cannot install safety gate';
 END IF;
 IF strpos(definition,'MIXED_CHECKOUT_DISABLED')>0 THEN
   RETURN;
 END IF;
 IF strpos(definition,anchor)=0 THEN
   RAISE EXCEPTION 'Mixed reservation lock contract changed; manual review required';
 END IF;
 definition:=replace(
   definition,anchor,
   E'IF NOT EXISTS (SELECT 1 FROM public.gu_lumen_value_settings_v1 WHERE singleton=true AND mixed_checkout_enabled=true) THEN\n'
   ||E'  RETURN jsonb_build_object(''ok'',false,''error'',''MIXED_CHECKOUT_DISABLED'');\n'
   ||E' END IF;\n '||anchor
 );
 EXECUTE definition;
END $guard$;
COMMIT;
