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
assert "version:'0.14.0.19'" in (ROOT/'assets/js/route-policy.js').read_text()
assert "'new-discussion'" in (ROOT/'assets/js/route-policy.js').read_text()
assert 'v014019-public' in (ROOT/'sw.js').read_text()
assert "VERSION: '0.14.0.19'" in (ROOT/'config.js').read_text()
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
print('PASS: v0.14.0.19 source syntax, route protection, API visibility boundaries, integration contracts.')
