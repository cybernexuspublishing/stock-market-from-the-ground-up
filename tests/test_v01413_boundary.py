from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
assert json.loads((root/'PROJECT_MANIFEST.json').read_text())['version']=='0.14.0.13'
assert 'v0.14.0.13' in (root/'admin.html').read_text()
assert "groundup-v014013-public" in (root/'sw.js').read_text()
assert 'if [[ -e data/interactive-labs.json ]]' in (root/'scripts/build-pages.sh').read_text()
assert 'for directory in assets learn' in (root/'scripts/build-pages.sh').read_text()
assert not (root/'data/interactive-labs.json').exists()
assert not (root/'public/data/interactive-labs.json').exists()
assert 'src="/assets/js/admin-navigation.js"' not in (root/'functions/_middleware.js').read_text()
assert 'el.append(\'<link rel="stylesheet" href="/assets/css/admin-navigation.css"' not in (root/'functions/_middleware.js').read_text()
print('PASS v0.14.0.13: source boundary, stable public data allowlist, service worker release, admin metadata and stylesheet ownership')
