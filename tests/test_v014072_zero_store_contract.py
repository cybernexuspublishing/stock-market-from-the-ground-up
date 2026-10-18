from pathlib import Path
root=Path(__file__).resolve().parent.parent
rpc=(root/"supabase/migrations/v0.14.0.72_SIGNED_ZERO_MONTHLY_QA_REVIEW_REQUIRED.sql").read_text()
api=(root/"functions/api/store-zero-monthly-qa.js").read_text()
hook=(root/"functions/api/stripe-live-webhook-v01458.js").read_text()
store=(root/"store.html").read_text()
front=(root/"assets/js/store-zero-live-qa.js").read_text()
for marker in ["SECURITY DEFINER","search_path=pg_catalog,pg_temp","auth.role() IS DISTINCT FROM 'service_role'",
 "FROM PUBLIC, anon, authenticated","GRANT EXECUTE","pg_advisory_xact_lock",
 "source='stripe_zero_monthly_qa_v72'","interval '1 month'","plan_code='FULL_MONTHLY'",
 "IF EXISTS(","user_plan_grants","expiresAt","NOTIFY pgrst"]:
 assert marker in rpc, marker
assert "CREATE TABLE" not in rpc.upper()
assert "gu58_live_checkout_intents" not in rpc
assert "GU72_QA_ALLOWED_USER_ID" in api
assert "GU72_ZERO_MONTHLY_QA_ENABLED" in api
assert "GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED" in api
assert "my_platform_access_for_user" in api
assert "member(request,c)" in api
assert "line_items[0][price]" in api
assert "payment_method_collection" not in api or "payment_method_collection=if_required is NOT supported" in api
assert "GU58_STRIPE_LIVE_CATALOG_JSON" in api
assert "session.amount_total!==0" in api
assert "session.payment_intent!=null" in api
assert "storeZeroMonthlyQA(request,env)" in hook
assert "checkHmac(raw" in hook
assert "GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED" in hook
assert "gu72_signed_zero_monthly_grant" in hook
assert "s.payment_status!=='no_payment_required'" in hook
assert "store-zero-monthly-qa" in store
assert "store-zero-live-qa.js" in store
assert "access.html" in front
assert "ONE_TIME_ZERO_MONTHLY_QA" in front
print("PASS v72: allowlisted store purchase, zero-only Stripe path, expiring service-only signed grant, existing DB and no auto LIVE paid checkout.")
