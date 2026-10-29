"""v0.14.0.41 release and destructive-path guards. No external credentials."""
from pathlib import Path
import json,re,subprocess
R=Path(__file__).resolve().parents[1]
read=lambda p:(R/p).read_text()
version=json.loads(read('release-manifest.json'))['version']
cache=version.replace('.','')
assert f"VERSION: '{version}'" in read('config.js')
assert f"version:'{version}'" in read('assets/js/route-policy.js')
assert f'groundup-v{cache}-public' in read('sw.js')
assert json.loads(read('release-manifest.json'))['version']==version
assert json.loads(read('release-manifest.json'))['customerCheckoutApproved'] is False
assert json.loads(read('data/commerce-config.json'))['version']==version
# The GU39 panel now mounts itself after authentication/permissions hydrate.
# The retired navigation callback loadShadowDashboard() must not be restored.
shadow=read('assets/js/admin-stripe-shadow-v01439.js')
nav=read('assets/js/admin-simple-navigation-v014036.js')
assert 'admin-stripe-shadow-v01439.js' in read('admin.html')
assert 'admin-stripe-shadow-v01439.js' in nav
assert 'function mount()' in shadow
assert "document.addEventListener('DOMContentLoaded',start" in shadow
assert "roles.some(x=>['OWNER','ADMIN'].includes" in shadow
assert "ctx.permissions.includes('commerce.view')" in shadow
assert 'window.GroundUpStripeShadowV01439' in shadow
sql=read('supabase/migrations/v0.14.0.39_ISOLATED_STRIPE_SANDBOX_OWNER_REVIEW_REQUIRED.sql')
for term in ['DEFAULT false','gu39_sandbox_settings','gu39_sandbox_intents','gu39_sandbox_events','gu39_sandbox_access',
  'ENABLE ROW LEVEL SECURITY','FROM PUBLIC,anon,authenticated','TO service_role',
  'gu_staff_identity_v01431r1','gu_staff_stepup_active_v01432r1','PASSWORD_RECONFIRM_REQUIRED',
  'gu39_shadow_apply','RETURN jsonb_build_object',"auth.role() IS DISTINCT FROM 'service_role'"]:
 assert term in sql,term
# SQL source must never make DML changes to customer entitlements or billing tables.
statements=re.sub(r'--[^\n]*','',sql)
for table in ['user_plan_grants','user_tool_passes','site_orders','site_order_items','site_subscriptions',
              'gu_stripe_checkout_intents_v01438','gu_stripe_events_v01438']:
 assert not re.search(r'\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|TRUNCATE\s+TABLE)\s+(?:public\.)?'+table+r'\b',statements,re.I),table
for f in ['config.js','sw.js','assets/js/route-policy.js','assets/js/admin-simple-navigation-v014036.js',
  'assets/js/admin-stripe-shadow-v01439.js','functions/api/gu39-sandbox.js','functions/api/gu39-stripe-webhook.js']:
 p=subprocess.run(['node','--check',str(R/f)],capture_output=True,text=True)
 assert p.returncode==0,(f,p.stderr)
print('PASS v39: version integrity, front-end JavaScript syntax, shadow-only SQL, Owner/role guards, disabled defaults')
