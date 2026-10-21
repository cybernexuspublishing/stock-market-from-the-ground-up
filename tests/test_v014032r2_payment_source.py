"""Historic R2 payment contract updated to verify CURRENT guarded checkout, not obsolete placeholder wording."""
from pathlib import Path
import subprocess,re
R=Path(__file__).resolve().parents[1]
read=lambda s:(R/s).read_text(encoding='utf-8')
version=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",read('config.js'))
assert version and tuple(map(int,version.group(1).split('.'))) >= (0,14,0,39)
assert "version:'"+version.group(1)+"'" in read('assets/js/route-policy.js')
assert 'groundup-v'+''.join(version.group(1).split('.'))+'-public' in read('sw.js')
assert 'admin-payment-providers-v01432r2.js' in read('assets/js/site.js')
checkout=read('assets/js/checkout-platform.js')
assert 'digital-payment-route-v01432r2' in checkout
assert "route.provider==='STRIPE_MANAGED'" in checkout
# R2 provider routing remains; current customer checkout must NOT depend on the
# discontinued staging database. Owner-only TEST purchases use GU39 shadow state.
assert "'/api/stripe-live-checkout'" in checkout
assert 'stripe-customer-checkout-v01438' not in checkout
assert 'readiness?.liveCheckoutAvailable===true' in checkout
assert 'STRIPE_MANAGED_LIVE' in checkout
assert 'Stripe customer payments not activated' in checkout
assert "GU39_SANDBOX_SHADOW_GATE==='true'" in read('functions/api/gu39-sandbox.js')
assert "GU39_STRIPE_TEST_SECRET_KEY" in read('functions/api/gu39-stripe-webhook.js')
for path in ['assets/js/admin-payment-providers-v01432r2.js','assets/js/checkout-platform.js',
 'functions/api/payment-provider-status-v01432r2.js','functions/api/digital-payment-route-v01432r2.js',
 'functions/api/stripe-managed-sandbox-v01432r2.js','functions/api/stripe-managed-webhook-v01432r2.js',
 'functions/api/gu39-sandbox.js','functions/api/gu39-stripe-webhook.js']:
 p=subprocess.run(['node','--check',str(R/path)],capture_output=True,text=True)
 assert p.returncode==0,(path,p.stderr)
sql=read('supabase/migrations/v0.14.0.32R2_PAYMENT_PROVIDER_ROUTING_REVIEW_REQUIRED.sql')
for k in ['enabled boolean NOT NULL DEFAULT false','STRIPE_MANAGED','LEMON_SQUEEZY',
 'gu_owner_digital_payment_route_save_v01432r2','gu_staff_stepup_active_v01432r1',
 'PASSWORD_RECONFIRM_REQUIRED','FOR UPDATE','admin_audit_log',
 'gu_digital_payment_intent_guard_v01432r2','BEFORE INSERT ON public.checkout_intents',
 'gu_stripe_managed_test_events_v01432r2','gu_stripe_managed_test_sessions_v01432r2',
 'SECURITY DEFINER','search_path=pg_catalog,pg_temp','GRANT EXECUTE','REVOKE ALL']:
 assert k in sql,k
assert 'UPDATE public.site_orders' not in sql and 'DROP TABLE' not in sql
for p in ('PREFLIGHT','POSTFLIGHT'):
 s=read(f'supabase/admin/v0.14.0.32R2_PAYMENTS_{p}_READ_ONLY.sql')
 assert 'BEGIN TRANSACTION READ ONLY;' in s and 'ROLLBACK;' in s
assert "managed_payments[enabled]','true'" in read('functions/api/stripe-managed-sandbox-v01432r2.js')
assert 'STRIPE_MANAGED_TEST_CHECKOUT_ENABLED' in read('functions/api/stripe-managed-webhook-v01432r2.js')
assert 'user_plan_grants' not in read('functions/api/stripe-managed-webhook-v01432r2.js')
assert 'site_orders' not in read('functions/api/stripe-managed-webhook-v01432r2.js')
print('PASS R2 updated: guarded checkout replaces obsolete pending placeholder; shadow sandbox remains isolated.')
