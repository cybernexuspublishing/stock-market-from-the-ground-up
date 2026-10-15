"""Static tests of v0.14.0.18 overlay when merged into the existing full repository."""
import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def source(p):
    f=ROOT/p
    assert f.is_file(),f'Missing: {p}'
    return f.read_text(encoding='utf-8')

assert "VERSION: '0.14.0.18'" in source('config.js')
assert "groundup-v014018-public" in source('sw.js')
assert "'new-discussion'" in source('assets/js/route-policy.js')
assert "'/assets/js/v014018-forum-corrections.js'" in source('assets/js/site.js')
assert "sb.rpc('commons_create_topic',args)" in source('assets/js/new-discussion.js')
assert "sb.from('commons_posts')" in source('assets/js/v014018-forum-corrections.js')
assert 'Payment verification pending' in source('assets/js/status-platform.js')
assert 'data-auth-required="true"' in source('new-discussion.html')
assert '<form id="gu-new-discussion-form"' in source('new-discussion.html')
for f in ['config.js','sw.js','assets/js/site.js','assets/js/route-policy.js','assets/js/status-platform.js',
          'assets/js/new-discussion.js','assets/js/v014018-forum-corrections.js']:
    subprocess.run(['node','--check',str(ROOT/f)],check=True,capture_output=True)
print('PASS: v0.14.0.18 source overlay contracts and Node syntax (not integrated browser sign-off).')
