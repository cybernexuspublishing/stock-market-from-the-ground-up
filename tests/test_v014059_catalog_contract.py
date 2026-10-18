"""Read-only v59 eight-SKU product preflight and schema-aware checkout contract."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
sql=(r/'supabase/admin/v0.14.0.59_LIVE_EIGHT_SKU_READ_ONLY_AUDIT.sql').read_text(encoding='utf-8')
checkout=(r/'functions/api/stripe-live-checkout-v01458.js').read_text(encoding='utf-8')
schema=(r/'supabase/migrations/v0.11_advanced_platform_architecture.sql').read_text(encoding='utf-8')
assert sql.count('BEGIN TRANSACTION READ ONLY;')==1
assert sql.count('ROLLBACK;')==1
assert sql.index('ROLLBACK;')>sql.index('SELECT kind,sku_code')
assert not any(term in sql.upper() for term in ['INSERT INTO','DELETE FROM','UPDATE PUBLIC.','ALTER TABLE','CREATE TABLE','DROP TABLE'])
for sku in ('FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY',
            'INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'):
 assert "'"+sku+"'" in sql, sku
# Tool eligibility uses real schema: status / active / visibility, not
# platform_plans.checkout_enabled (a distinct table/field).
schema_tool=schema.split('create table if not exists public.platform_tools (',1)[1].split(');',1)[0]
assert 'checkout_enabled' not in schema_tool
assert '(!isPlan&&r.status' in checkout
assert '(isPlan&&r.checkout_enabled!==true)' in checkout
assert 'r.checkout_enabled!==true||(!isPlan' not in checkout
assert 'GU_PAYMENT_LIVE_LAUNCH_APPROVED' in checkout
print('PASS v59: 8 expected product codes, read-only audit, canonical tool eligibility and LIVE protections.')
