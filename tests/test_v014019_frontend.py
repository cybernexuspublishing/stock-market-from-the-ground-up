"""v0.14.0.19 isolated source QA; run against merged repository or source ZIP."""
from pathlib import Path
import subprocess, json, re
ROOT=Path(__file__).resolve().parents[1]
RUNTIME=[
'assets/js/site.js','assets/js/sitewide-runtime.js',
'assets/js/member-mentions.js','assets/js/v014018-forum-corrections.js',
'assets/js/new-discussion.js','assets/js/frontend-integration-health.js',
'functions/api/member-mentions.js','config.js','sw.js','assets/js/route-policy.js']
for p in RUNTIME:
    f=ROOT/p
    assert f.is_file(),p
    result=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    assert result.returncode==0,(p,result.stderr)
site=(ROOT/'assets/js/site.js').read_text()
for script in ['sitewide-runtime.js','member-mentions.js','frontend-integration-health.js','v014018-forum-corrections.js']:
    assert script in site,script
# The v0.14.0.19 feature regression must remain valid after later releases.
# Require consistent active release identities instead of pinning the full site to 0.14.0.19.
config=(ROOT/'config.js').read_text()
policy=(ROOT/'assets/js/route-policy.js').read_text()
sw=(ROOT/'sw.js').read_text()
match=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",config)
assert match,'Missing explicit browser build version'
version=match.group(1)
parts=tuple(map(int,version.split('.')))
assert parts >= (0,14,0,19),f'Release rollback: {version}'
assert f"version:'{version}'" in policy,'Route version differs from browser config'
major,minor,patch,release=parts
cache=f'groundup-v{major}{minor}{patch}{release:02d}-public'
assert cache in sw,f'Cache version differs from browser config: {cache}'
site=(ROOT/'assets/js/site.js').read_text()
assert 'cfg.VERSION' in site and 'document.body.dataset.build=declaredRelease' in site
assert "'new-discussion'" in (ROOT/'assets/js/route-policy.js').read_text()
assert cache in (ROOT/'sw.js').read_text()
assert version in (ROOT/'config.js').read_text()
assert 'await sb.rpc(\'commons_create_reply\'' in (ROOT/'assets/js/v014018-forum-corrections.js').read_text()
assert 'e.stopImmediatePropagation()' in (ROOT/'assets/js/v014018-forum-corrections.js').read_text()
api=(ROOT/'functions/api/member-mentions.js').read_text()
assert "authorization:'Bearer '+token" in api
assert 'SUPABASE_SECRET_KEY' not in api
assert 'service_role' not in api
assert 'profile?' not in api
assert 'status=eq.published' in api
assert 'cache-control' in api and 'no-store' in api
assert '<form id="gu-new-discussion-form"' in (ROOT/'new-discussion.html').read_text()
for path in ['assets/css/sitewide-acceptance.css','new-discussion.html']:
    assert (ROOT/path).is_file(),path
print(f'PASS: v0.14.0.19 feature regression on active {version}: syntax, route protection, API boundaries, integration contracts.')
