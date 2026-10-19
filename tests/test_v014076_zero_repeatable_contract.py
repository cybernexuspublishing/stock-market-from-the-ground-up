"""v76: repeatable QA reuses one allowlisted account without replay or paid-rights changes."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sql=(root/"supabase/migrations/v0.14.0.76_REPEATABLE_ZERO_MONTHLY_QA_REVIEW_REQUIRED.sql").read_text()
api=(root/"functions/api/store-zero-monthly-qa.js").read_text()
front=(root/"assets/js/store-zero-live-qa.js").read_text()
store=(root/"store.html").read_text()
assert "CREATE TABLE" not in sql.upper()
assert "CREATE OR REPLACE FUNCTION public.gu72_signed_zero_monthly_grant" in sql
assert "source_reference=p_session_id" in sql
assert "pg_advisory_xact_lock" in sql
assert "GU72_PAID_ACCESS_ALREADY_PRESENT" in sql
assert "CREATE OR REPLACE FUNCTION public.gu76_reset_zero_monthly_qa" in sql
assert "GU76_SERVICE_ROLE_ONLY" in sql
assert "SET search_path=pg_catalog,pg_temp" in sql
assert "REVOKE ALL ON FUNCTION public.gu76_reset_zero_monthly_qa" in sql
assert "GRANT EXECUTE ON FUNCTION public.gu76_reset_zero_monthly_qa" in sql
assert "TO service_role" in sql
assert "source='stripe_zero_monthly_qa_v72'" in sql
assert "status='canceled'" in sql
assert "AND plan_code='FULL_MONTHLY'" in sql
assert "UPDATE public.site_subscriptions" not in sql
assert "DELETE FROM public.user_plan_grants" not in sql
assert "DELETE FROM public.site_subscriptions" not in sql
assert "UPDATE public.user_plan_grants" in sql
assert "GU72_QA_ALLOWED_USER_ID" in api
assert "action==='reset'" in api
assert "RESET_MY_ZERO_MONTHLY_QA_ACCESS" in api
assert "gu76_reset_zero_monthly_qa" in api
assert "checkoutAttemptId" in api
assert "'Idempotency-Key':'gu72-zero-'+m.user.id+'-'+input.checkoutAttemptId" in api
assert "status=in.(active,trialing)" in api
assert "canReset" in api
assert "id=\"store-zero-monthly-reset\"" in store
assert "crypto?.randomUUID" in front
assert "reset.addEventListener" in front
assert "reset.hidden=!d.canReset" in front
print("PASS v76: existing account, explicit controlled reset, session-id-based webhook replay safety, unique checkout attempt, service-only SQL.")
