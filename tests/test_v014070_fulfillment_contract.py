"""v0.14.0.70 — Static service-only LIVE SQL/handler guard (zero provider/DB calls)."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sql_path = root / "supabase/admin/v0.14.0.70_EXISTING_GU58_RPC_AND_LEDGER_CONTRACT_READ_ONLY.sql"
sql = sql_path.read_text(encoding="utf-8")
webhook = (root / "functions/api/stripe-live-webhook-v01458.js").read_text(encoding="utf-8")
checkout = (root / "functions/api/stripe-live-checkout-v01458.js").read_text(encoding="utf-8")
alias = (root / "functions/api/stripe-live-webhook.js").read_text(encoding="utf-8")
must_sql = [
 "BEGIN TRANSACTION READ ONLY;", "ROLLBACK;", "pg_get_functiondef",
 "prosecdef", "aclexplode", "acldefault", "has_function_privilege",
 "service_role", "authenticated", "anon", "relrowsecurity",
 "refund_hold_invoice_id", "stale_ignored", "MARKERS_PRESENT",
 "NOT_TESTED", "NOT_APPROVED",
]
for value in must_sql:
    assert value in sql, f"Missing GU58 read-only audit control: {value}"
for prohibited in ("CREATE TABLE", "CREATE OR REPLACE", "ALTER TABLE", "DROP TABLE", "GRANT EXECUTE ON", "TRUNCATE ", "INSERT INTO ", "UPDATE public.", "DELETE FROM "):
    assert prohibited not in sql.upper(), f"Audit may not mutate Supabase: {prohibited}"
assert "export {onRequestPost,onRequestGet} from './stripe-live-webhook-v01458.js'" in alias
assert "if(!tagged(s.metadata,true))return null;" in webhook
assert "if(!tagged(sub.metadata))return null;" in webhook
assert "if(!ss)throw Error('gu58:session_subscription_missing_marker');" in webhook
assert "if(!tagged(session.metadata,true))return null;" in webhook
assert "return resp('Fulfillment temporarily unavailable; retry',503)" in webhook
assert "if(!await checkHmac" in webhook
assert "GU58_LIVE_FULFILLMENT_APPROVED" in webhook
assert "GU_PAYMENT_LIVE_LAUNCH_APPROVED" in checkout
assert "GU58_LIVE_DB_CONTRACT_APPROVED" in checkout
assert "env.GU58_LIVE_CHECKOUT_ENABLED!=='true'" in checkout
print("PASS v70: service-only SQL read-only audit, foreign-event isolation, genuine GU58 retry gates; zero live writes.")
