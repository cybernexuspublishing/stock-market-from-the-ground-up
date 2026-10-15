-- v0.14.0.31 READ ONLY. Single exportable result; no customer or fulfillment data.
WITH checks(name,passed) AS (VALUES
 ('offers_table',to_regclass('public.gu_signed_book_offers_v01431') IS NOT NULL),
 ('orders_table',to_regclass('public.gu_signed_book_orders_v01431') IS NOT NULL),
 ('stripe_event_ledger',to_regclass('public.gu_signed_stripe_events_v01431') IS NOT NULL),
 ('master_switch_defaults_off',EXISTS(SELECT 1 FROM public.site_settings s WHERE s.setting_key='commerce.signed_books_checkout_enabled' AND s.value='false'::jsonb)),
 ('offers_rls',COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_signed_book_offers_v01431')),false)),
 ('orders_rls',COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_signed_book_orders_v01431')),false)),
 ('events_rls',COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.gu_signed_stripe_events_v01431')),false)),
 ('anon_cannot_select_orders',NOT COALESCE(has_table_privilege('anon',to_regclass('public.gu_signed_book_orders_v01431'),'SELECT'),false)),
 ('member_cannot_select_orders',NOT COALESCE(has_table_privilege('authenticated',to_regclass('public.gu_signed_book_orders_v01431'),'SELECT'),false)),
 ('member_cannot_insert_orders',NOT COALESCE(has_table_privilege('authenticated',to_regclass('public.gu_signed_book_orders_v01431'),'INSERT'),false)),
 ('member_cannot_edit_events',NOT COALESCE(has_table_privilege('authenticated',to_regclass('public.gu_signed_stripe_events_v01431'),'UPDATE'),false)),
 ('public_quote_installed',to_regprocedure('public.gu_signed_quote_v01431(text,text)') IS NOT NULL),
 ('member_order_start_installed',to_regprocedure('public.gu_signed_order_start_v01431(text,text)') IS NOT NULL),
 ('webhook_paid_rpc_installed',to_regprocedure('public.gu_signed_stripe_paid_v01431(text,uuid,text,text,integer,integer,integer,text)') IS NOT NULL),
 ('webhook_reversal_rpc_installed',to_regprocedure('public.gu_signed_stripe_reversal_v01431(text,text,text)') IS NOT NULL),
 ('authenticated_cannot_direct_webhook_paid',NOT COALESCE(has_function_privilege('authenticated',to_regprocedure('public.gu_signed_stripe_paid_v01431(text,uuid,text,text,integer,integer,integer,text)'),'EXECUTE'),false)),
 ('anon_cannot_direct_webhook_paid',NOT COALESCE(has_function_privilege('anon',to_regprocedure('public.gu_signed_stripe_paid_v01431(text,uuid,text,text,integer,integer,integer,text)'),'EXECUTE'),false)),
 ('owner_offer_save_rpc',to_regprocedure('public.gu_signed_owner_offer_save_v01431(text,text,integer,integer,boolean,timestamptz)') IS NOT NULL),
 ('owner_fulfillment_rpc',to_regprocedure('public.gu_signed_owner_transition_v01431(uuid,text,timestamptz,text,text)') IS NOT NULL),
 ('owner_payment_switch_rpc',to_regprocedure('public.gu_signed_owner_payment_switch_save_v01431(boolean)') IS NOT NULL),
 ('member_orders_rpc',to_regprocedure('public.gu_signed_my_orders_v01431()') IS NOT NULL)
)
SELECT name,coalesce(passed,false) AS passed FROM checks ORDER BY name;
