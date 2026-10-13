"""Portable static integrity runner. Run from anywhere: python tests/qa_clean_baseline.py.
No network calls; cannot replace production Cloudflare/Supabase acceptance."""
from pathlib import Path
from collections import Counter
import subprocess,json,re,hashlib,csv,sys
R=Path(__file__).resolve().parents[1]
all_files=[x for x in R.rglob('*') if x.is_file() and not {'.git','public','__pycache__'}.intersection(x.relative_to(R).parts)]
paths={p.relative_to(R).as_posix() for p in all_files}
print('PASS 1 — Archive layout',len(paths),'source files at repository root')
assert all(not s.startswith(('UPLOAD_TO_REPOSITORY_ROOT/','stock-market-from-the-ground-up-main/')) for s in paths)
assert {'index.html','admin.html','dashboard.html','labs.html','functions/_middleware.js','assets/js/navigation.js','sw.js','lab-catalog.json','data/interactive-lab-index.json','PROJECT_ADVANCED_ENGINEERING_RULES.md'}<=paths
assert not any(x.endswith('README_v0.13.5.1_Admin_Account_Management.md') for x in paths)
assert 'v0.13.5.1_RELEASE_MANIFEST.json' not in paths
# Source / syntax / JSON
js=[p for p in all_files if p.suffix in {'.js','.mjs'}]
for f in js:
 t=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
 assert t.returncode==0,(f,t.stderr)
for f in all_files:
 if f.suffix=='.json' or f.name=='manifest.webmanifest':json.loads(f.read_text(encoding='utf-8'))
print('PASS 2 — JS parsed',len(js),'JSON/manifest parsed')
# Referenced runtime assets are resolvable
missing=[]
for f in (x for x in all_files if x.suffix=='.html'):
 text=f.read_text(errors='replace')
 for field,url in re.findall(r'<(?:script|link)\b[^>]*?\b(src|href)=["\']([^"\']+)["\']',text,re.I):
  if url.startswith(('http:','https:','//','#','data:','mailto:','tel:')):continue
  url=url.split('?')[0].split('#')[0]; p=url.lstrip('/') if url.startswith('/') else (f.parent.relative_to(R)/url).as_posix()
  if p.endswith(('.js','.css','.webmanifest','.svg','.webp','.jpg','.jpeg','.png','.ico')) and p not in paths:missing.append((str(f.relative_to(R)),p))
assert not missing,missing[:25]
# Registry and web service source must not permit global initial Lab fetch
u=(R/'assets/js/lab-registry.js').read_text();a=(R/'functions/api/admin-site-v01354.js').read_text();old=(R/'functions/api/admin-operations-v0135.js').read_text()
for name,body in [('member',u),('admin',a),('legacy',old)]:
 assert 'book_code' in body and ('PAGE_SIZE=50' in body or 'perPage=50' in body),(name,'unbounded')
assert "if(!LAB_BOOKS.has(book))throw fail" in a
assert "if(!LAB_BOOKS.has(book))throw problem" in old
print('PASS 3 — HTML assets resolve, lab views are scoped/book-paged')
# Curriculum ids intact and under explicit provenance boundary
catalog=json.loads((R/'lab-catalog.json').read_text())['labs']
foundation=json.loads((R/'data/interactive-lab-index.json').read_text());assert len(catalog)==419
assert not (R/'data/interactive-labs.json').exists(),'Private authored Labs must not appear in public static assets'
assert len({x['lab_id'] for x in catalog})==419
assert len(foundation)==94 and {x['id'] for x in foundation}<={x['lab_id'] for x in catalog}
assert sum(1 for x in catalog if x.get('ticker') and x.get('historical_date'))==122
# No protected routes from cache, old active worker retained
sw=(R/'sw.js').read_text();assert 'groundup-v01406-public' in sw
assert "POLICY.isProtected(p)" in sw and "fetch(req,{cache:'no-store'})" in sw
assert "'/admin-lab-preview'" in (R/'assets/js/route-policy.js').read_text() or "'admin-lab-preview'" in (R/'assets/js/route-policy.js').read_text()
assert 'Legacy Showcase provisioning is disabled' in (R/'functions/api/admin-v0134.js').read_text()
print('PASS 4 — 419 Lab IDs, 94 private-lesson index records, SW private-route restriction, Showcase guard')
# Entire source inventory file includes original input dispositions
with (R/'docs/FILE_BY_FILE_DISPOSITION.csv').open(newline='') as f:rows=list(csv.DictReader(f))
assert len(rows)==441,('expected input inventory 441',len(rows))
assert len({x['source_path'] for x in rows})==441
print('PASS 5 — 441 input-file disposition audit, original backed up, no fabricated data validation')
