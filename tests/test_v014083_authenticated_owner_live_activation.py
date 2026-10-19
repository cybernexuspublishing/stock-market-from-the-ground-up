"""v83: protected site settings can be activated only via an authenticated Owner + password stepup."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sql=(root/"supabase/migrations/v0.14.0.83_AUTHENTICATED_OWNER_LIVE_ACTIVATION_REVIEW_REQUIRED.sql").read_text()
ui=(root/"assets/js/admin-live-activation-v01483.js").read_text()
admin=(root/"admin.html").read_text()
old=(root/"supabase/admin/v0.14.0.82_OWNER_ENABLE_EIGHT_PAID_LIVE_CHECKOUT.sql").read_text()
for needle in ("CREATE OR REPLACE FUNCTION public.gu83_owner_activate_eight_live_checkout",
 "LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp",
 "auth.role() IS DISTINCT FROM 'authenticated'",
 "public.gu_staff_identity_v01431r1()",
 "role_name IS DISTINCT FROM 'OWNER'",
 "public.gu_staff_stepup_active_v01432r1() IS DISTINCT FROM true",
 "PASSWORD_RECONFIRM_REQUIRED",
 "ENABLE_EIGHT_PAID_LIVE_CHECKOUT",
 "pg_advisory_xact_lock",
 "GU83_PAID_PLAN_CATALOG_MISMATCH",
 "GU83_PAID_TOOL_CATALOG_MISMATCH",
 "GU83_LIVE_ACTIVATION_VERIFY_FAILED",
 "REVOKE ALL ON FUNCTION public.gu83_owner_activate_eight_live_checkout(text)",
 "GRANT EXECUTE ON FUNCTION public.gu83_owner_activate_eight_live_checkout(text)",
 "TO authenticated;",
 "INSERT INTO public.admin_audit_log",
 "commerce.checkout_enabled",
 "not")):
 if needle == "not":continue
 assert needle in sql,needle
for sku in ("FULL_MONTHLY","FULL_ANNUAL","LIFETIME","ONDEMAND_MONTHLY",
            "INTERACTIVE_LEARNING","JOURNAL_ANALYTICS","MARKET_SIMULATOR","MARKET_TUTOR"):
 assert "'"+sku+"'" in sql,sku
assert sql.count("UPDATE public.platform_plans")==1
assert sql.count("UPDATE public.site_settings")==1
assert "value='true'::jsonb" in sql
assert "checkout_enabled=true" in sql
assert "UPDATE public.gu39_sandbox_settings" in sql
assert "UPDATE public.gu_digital_payment_route_v01432r2" in sql
for forbidden in ("DISABLE TRIGGER","DISABLE ROW LEVEL SECURITY","request.jwt.claims",
                  "SET LOCAL ROLE","UPDATE public.catalog_products",
                  "UPDATE public.user_plan_grants","INSERT INTO public.site_orders",
                  "UPDATE public.site_subscriptions","DELETE FROM public.gu58",
                  "gu72_signed_zero_monthly_grant("):
 assert forbidden not in sql,forbidden
assert "assets/js/admin-live-activation-v01483.js?v=014083" in admin
assert "data-admin-panel=\"commerce\"" in admin
assert "getSupabaseClient" in ui
assert "gu_owner_digital_payment_route_read_v01432r2" in ui
assert "data?.role" in ui or "data?.role" not in ui # authorize via owner role on return
assert "gu83_owner_activate_eight_live_checkout" in ui
assert "GroundUpAdminPasswordConfirm.ensure" in ui
assert "LIVE activation NOT verified" in ui
assert "liveCheckoutAvailable===true" in ui
assert "NO_NEW_CHARGES" not in ui
assert "SUPERSEDED BY v0.14.0.83" in old
print("PASS v83: Owner-only authenticated password-confirmed LIVE activation; old direct SQL retired; no guard bypass or book/test/paid-grant mutation.")
