-- Safe USD payment minimum guard for mixed Lumen+cash reservations.
-- Full-Lumen zero-cash purchases must use separate server fulfillment.
BEGIN;
DO $gate$
DECLARE definition text;needle text;replacement text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname='gu_lumen_mixed_reserve_v1'
 AND pg_get_function_identity_arguments(oid)='p_user uuid, p_sku text, p_request uuid, p_lumens integer, p_expected_cents integer';
 IF definition IS NULL THEN RAISE EXCEPTION 'Expected mixed reservation function unavailable';END IF;
 needle:='v_cash:=p_expected_cents-v_discount;';
 replacement:=needle || E'\n IF v_cash BETWEEN 1 AND 49 THEN' ||
   E'\n  RETURN jsonb_build_object(''ok'',false,''error'',''BELOW_USD_PAYMENT_MINIMUM'', ' ||
   E'''cashDueCents'',v_cash,''minimumCents'',50);END IF;';
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'Reservation calculation revision changed';END IF;
 definition:=replace(definition,needle,replacement);
 EXECUTE definition;
END $gate$;
COMMIT;