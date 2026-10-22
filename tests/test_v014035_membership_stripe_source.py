"""v0.14.0.35 protected Lifetime membership and book benefits (regression)."""
from pathlib import Path
import json,subprocess
root=Path(__file__).resolve().parents[1];rd=lambda s:(root/s).read_text(encoding='utf-8')
version=json.loads(rd('release-manifest.json'))['version']
cache_version='014'+version.split('.')[-1].zfill(3)
sql=rd('supabase/migrations/v0.14.0.35_MEMBERSHIP_BOOK_RIGHTS_REVIEW_REQUIRED.sql')
assert f"VERSION: '{version}'" in rd('config.js')
assert f"version:'{version}'" in rd('assets/js/route-policy.js')
assert f'groundup-v{cache_version}-public' in rd('sw.js')
assert 'includes_all_books=true' in sql
assert "plan_code='PICK_WHAT_YOU_WANT'" in sql and 'checkout_enabled=false' in sql
assert "'FOUNDATION_BOOK_1',999" in sql and "'READING_THE_TAPE',1499" in sql
assert "('FOUNDATION_BOOK_3',1199)" in sql
assert 'gu_lifetime_ebook_eligible_v01435' in sql
assert 'gu_digital_book_can_download_v01430' in sql
assert 'gu_my_digital_books_v01430' in sql
assert "coalesce(p.metadata->'website_price_by_format_cents_v135'" in sql
for must in ['p.kdp_select','p.rights_attested_at','p.exclusive_until','p.asset_path',
             'gu_digital_paid_owned_v01430','gu_lifetime_ebook_eligible_v01435',
             "'SHOWCASE_VIEWER'", "g.status='active'", "s.status='active'", "'restricted','suspended'"]:
 assert must in sql,must
assert 'NOT EXISTS(SELECT 1 FROM storage.objects so' in sql
assert 'REVOKE ALL ON FUNCTION public.gu_lifetime_ebook_eligible_v01435' in sql
for path in ['assets/js/membership-platform.js','assets/js/commerce-common.js','assets/js/digital-library-v01430.js']:
 r=subprocess.run(['node','--check',str(root/path)],capture_output=True,text=True)
 assert r.returncode==0,(path,r.stderr)
front=rd('assets/js/membership-platform.js')
assert 'Choose Your Tools' in front and 'while the platform operates' in front
assert 'Separate purchase' in front and 'Book companion learning (not ebook files)' in front
lib=rd('assets/js/digital-library-v01430.js')
assert 'book.accessSource' in lib and 'purchased' in lib and 'lifetime' in lib
assert 'digital-book-download-v01430' in lib
covers=['foundation-book-1.webp','foundation-book-2.webp','foundation-book-3.webp','day-trading-book-1.webp','reading-the-tape.webp']
for cover in covers:
 assert cover in rd('assets/js/commerce-common.js') and cover in lib
conf=json.loads(rd('docs/STRIPE_SANDBOX_PRODUCTS_v0.14.0.35.json'))
assert len(conf['stripe_prices'])==8 and len(conf['digital_books_prices_prepared_sales_disabled'])==5
assert conf['external_accounts_configured'] is False
assert all(x['stripe_price_id'] is None for x in conf['stripe_prices']+conf['digital_books_prices_prepared_sales_disabled'])
for f in ['supabase/admin/v0.14.0.35_PREFLIGHT_READ_ONLY.sql','supabase/admin/v0.14.0.35_POSTFLIGHT_READ_ONLY.sql']:
 v=rd(f)
 assert v.lstrip().startswith('--') and v.count('SELECT name')==1
print('PASS v014035: membership benefits, book rights, version, static client contracts')
