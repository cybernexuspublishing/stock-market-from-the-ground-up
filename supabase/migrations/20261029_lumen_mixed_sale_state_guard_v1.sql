-- Mixed checkout reservations must never use draft/paused product offers.
BEGIN;
DO $guard$
DECLARE definition text;needle text;replacement text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc
 WHERE pronamespace='public'::regnamespace
 AND proname='gu_lumen_mixed_reserve_v1'
 AND pg_get_function_identity_arguments(oid)='p_user uuid, p_sku text, p_request uuid, p_lumens integer, p_expected_cents integer';
 IF definition IS NULL THEN RAISE EXCEPTION 'Required mixed reserve function not found';END IF;
 needle:='v_listing.status IN (''paused'',''coming_soon'',''in_development'',''unavailable'')';
 replacement:='v_listing.status NOT IN (''for_sale'',''selling'',''published'')';
 IF strpos(definition,needle)=0 THEN
   RAISE EXCEPTION 'Mixed reserve source revision changed; manual review required';END IF;
 definition:=replace(definition,needle,replacement);
 EXECUTE definition;
END $guard$;
COMMIT;