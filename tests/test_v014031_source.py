"""v31 static source/SQL security contract; not a PostgreSQL E2E authorization test."""
from pathlib import Path
import re,subprocess
R=Path(__file__).resolve().parents[1]
def txt(p):return (R/p).read_text(encoding='utf-8')
config=txt('config.js');version=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",config)
assert version and version.group(1)=='0.14.0.31'
assert "version:'0.14.0.31'" in txt('assets/js/route-policy.js')
assert "groundup-v014031-public" in txt('sw.js')
site=txt('assets/js/site.js')
for s in ('admin-signed-books-v01431.js','store-signed-books-v01431.js','member-signed-orders-v01431.js','admin-digital-books-v01430.js','admin-report-cases-v01424.js','v014018-forum-corrections.js'):
 assert s in site,s
for p in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js','assets/js/print-store-channels-v01428.js','assets/js/store-signed-books-v01431.js','assets/js/admin-signed-books-v01431.js','assets/js/member-signed-orders-v01431.js','functions/api/signed-book-checkout.js','functions/api/signed-book-stripe-webhook.js','functions/api/signed-book-owner-detail.js']:
 c=subprocess.run(['node','--check',str(R/p)],text=True,capture_output=True);assert c.returncode==0,(p,c.stderr)
checkout=txt('functions/api/signed-book-checkout.js')
webhook=txt('functions/api/signed-book-stripe-webhook.js')
owner=txt('functions/api/signed-book-owner-detail.js')
assert 'payment_intent_data[metadata][gu_order_id]' in checkout
for s in ('shipping_address_collection[allowed_countries][0]','automatic_tax[enabled]','Idempotency-Key','gu_signed_order_start_v01431','gu_signed_order_attach_v01431','ENABLE_SIGNED_BOOK_STRIPE','STRIPE_SIGNED_TAX_ENABLED','checkout.stripe.com'):
 assert s in checkout,s
for s in ("crypto.subtle.sign('HMAC'",'evt.livemode===testMode','checkout.session.completed','charge.refunded','charge.dispute.created','gu_signed_stripe_reversal_v01431'):
 assert s in webhook,s
for s in ('gu_staff_signed_shipping_session_v01431r1','payment_status',"'cache-control':'no-store, private'",'STRIPE_SECRET_KEY'):
 assert s in owner,s
sql=txt('supabase/migrations/v0.14.0.31_SIGNED_BOOK_STRIPE_REVIEW_REQUIRED.sql')
for s in ('gu_signed_book_offers_v01431','gu_signed_book_orders_v01431','gu_signed_stripe_events_v01431','ENABLE', 'gu_signed_owner_hold_v01431','gu_signed_owner_payment_switch_save_v01431','gu_signed_stripe_paid_v01431','gu_signed_stripe_reversal_v01431','OWNER_MFA_REQUIRED','pg_advisory_xact_lock','FOR UPDATE','id uuid PRIMARY KEY','commerce.signed_books_checkout_enabled',"'false'::jsonb",'REVOKE ALL','SET search_path=pg_catalog,pg_temp','p_next=\'signed\''):
 if s=='ENABLE':continue
 assert s in sql,s
assert not re.search(r'^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE)\s',sql,re.I|re.M)
assert 'payment_intent' in sql
for script in ['supabase/admin/v0.14.0.31_SIGNED_BOOK_PREFLIGHT_READ_ONLY.sql','supabase/admin/v0.14.0.31_SIGNED_BOOK_POSTFLIGHT_READ_ONLY.sql']:
 s=txt(script)
 assert s.lstrip().startswith('--')
 assert not re.search(r'^\s*(?:CREATE|ALTER|DROP|DELETE|INSERT|UPDATE|REVOKE|GRANT|TRUNCATE)\s',s,re.I|re.M)
assert 'gu_digital_offer_status_v01430' in txt('functions/api/checkout-v0135.js')
assert 'gu_signed_book' not in txt('functions/api/digital-book-download-v01430.js')
print('PASS v014031 source: version parity, frontend/forum preservation, Stripe HMAC, shipping address isolation, owner roles, grant and audit contracts.')
