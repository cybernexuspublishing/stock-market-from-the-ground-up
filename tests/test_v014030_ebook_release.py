"""v0.14.0.30 historical eBook source contract: forward-compatible version, no bypass."""
from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parents[1]
def read(s):return (root/s).read_text(encoding='utf-8')
conf=read('config.js');site=read('assets/js/site.js')
version=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",conf)
assert version and tuple(map(int,version.group(1).split('.')))>=(0,14,0,30)
ver=version.group(1)
assert "version:'"+ver+"'" in read('assets/js/route-policy.js')
assert 'groundup-v'+''.join(ver.split('.'))+'-public' in read('sw.js')
sql=read('supabase/migrations/v0.14.0.30_PRIVATE_DIGITAL_BOOKS_REVIEW_REQUIRED.sql')
for t in ['admin-digital-books-v01430.js','digital-store-v01430.js','digital-library-v01430.js']:assert t in site,t
for path in ['config.js','sw.js','assets/js/route-policy.js','assets/js/site.js','assets/js/admin-digital-books-v01430.js','assets/js/digital-store-v01430.js','assets/js/digital-library-v01430.js','functions/api/digital-book-download-v01430.js','functions/api/checkout-v0135.js']:
 p=subprocess.run(['node','--check',str(root/path)],capture_output=True,text=True)
 assert p.returncode==0,(path,p.stderr)
for clause in ['CREATE TABLE IF NOT EXISTS public.gu_digital_books_v01430','CREATE POLICY "gu_v01430_owner_digital_upload"','security definer','gu_owner_digital_books_save_v01430','gu_digital_offer_status_v01430','gu_digital_paid_owned_v01430','gu_digital_book_can_download_v01430','gu_my_digital_books_v01430',"bucket_id='gu-digital-ebooks'","status='paid'","coalesce(i.metadata->>'format','')='digital'",'NOT p.kdp_select','rights_attested_at','exclusive_until<=now()','OWNER_AAL2_REQUIRED',"'SHOWCASE_VIEWER'",'FOR UPDATE',"'commerce.checkout_enabled'",'REVOKE ALL','GRANT EXECUTE']:
 assert clause.lower() in sql.lower(),clause
assert not re.search(r'(?im)^\s*(?:DROP TABLE|TRUNCATE|DELETE FROM public|UPDATE public.site_orders)\b',sql)
assert 'p_sales AND NOT p_downloads' in sql
assert 'p_rights_attested IS DISTINCT FROM true' in sql
checkout=read('functions/api/checkout-v0135.js');assert 'gu_digital_offer_status_v01430' in checkout
assert 'Digital bundle download rights are not active yet.' in checkout
assert 'Printed formats are not sold through Lemon Squeezy.' in checkout
api=read('functions/api/digital-book-download-v01430.js')
for s in ['gu_digital_book_can_download_v01430','expiresIn:60','SUPABASE_SECRET_KEY','storage/v1/object/sign/gu-digital-ebooks/']:assert s in api
for q in ('PREFLIGHT','POSTFLIGHT'):
 t=read(f'supabase/admin/v0.14.0.30_DIGITAL_{q}_READ_ONLY.sql')
 assert 'BEGIN TRANSACTION READ ONLY;' in t and 'ROLLBACK;' in t
assert 'PyYAML==6.0.2' in read('.github/workflows/backend-contract-v01429.yml')
print('PASS v014030 carried forward: rights, Storage, private downloads and exact cross-file release parity.')
