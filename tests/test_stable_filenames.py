"""Static checks for the durable source filename contract. No live Cloudflare DB calls."""
from pathlib import Path
import csv,json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
paths={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and 'public' not in p.parts}
for group, ext in [('assets/js','.js'),('assets/css','.css')]:
    files=[p for p in paths if p.startswith(group+'/') and p.endswith(ext)]
    assert not any(re.search(r'v0\.\d+|v0\d+', p.rsplit('/',1)[-1]) for p in files),files
    print('PASS stable names',group,len(files))
rows=list(csv.DictReader((ROOT/'docs/ASSET_RENAME_MAP.csv').open()))
assert len(rows)==70
for row in rows:
    old,new=row['old_path'],row['new_path']
    assert new in paths,new
    if old!='sw-v0135.js': assert old not in paths,old
assert 'sw-v0135.js' in paths
assert "importScripts('/sw.js')" in (ROOT/'sw-v0135.js').read_text()
print('PASS retired canonical asset names, legacy SW shim',len(rows))
redirects=(ROOT/'_redirects').read_text().splitlines()
mapping={a:b for a,b,*_ in (s.split() for s in redirects if s and not s.startswith('#'))}
assert len(mapping)==68,len(mapping)
for row in rows:
    old,new=row['old_path'],row['new_path']
    if old.startswith(('assets/js/','assets/css/')) or old.endswith('_LAB_CATALOG.json'):
        assert mapping.get('/'+old)=='/'+new,old
print('PASS redirects to valid canonical static assets')
for row in rows:
    if row['old_path'].startswith('assets/'):
        old=row['old_path'].split('/')[-1]
        for p in [ROOT/'functions/_middleware.js']+list(ROOT.glob('*.html')):
            assert old not in p.read_text(errors='replace'),(p,old)
print('PASS no outdated asset paths in Cloudflare middleware or HTML')
# Preserve previously deployed API endpoint contracts (unmodified public route filenames).
for needed in ['functions/api/admin-operations-v0135.js','functions/api/admin-accounts-v01353.js','functions/api/admin-lab-preview-v01355.js','functions/api/home-member-stats-v01353.js','functions/api/username-login.js']:
    assert needed in paths,needed
assert 'lab-catalog.json' in paths and 'v0.13.3_LAB_CATALOG.json' not in paths
catalog=json.loads((ROOT/'lab-catalog.json').read_text())['labs']
assert len(catalog)==419 and len({x['lab_id'] for x in catalog})==419
print('PASS existing API routes preserved, Lab ID count')
# Cloudflare Pages source-to-public packaging contract is tested separately by Bash.
cmd=(ROOT/'scripts/build-pages.sh').read_text()
assert 'lab-catalog.json' in cmd and 'cp -R --' in cmd and 'supabase' not in cmd
assert 'bash scripts/build-pages.sh' in (ROOT/'docs/RELEASE_AND_FILE_POLICY.md').read_text()
print('PASS stable build command exists; source-only checks complete')
