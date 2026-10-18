"""v0.14.0.52: real Admin HTML must request the current Stripe testing script.

Regression for stale '?v=014047' retained through 0.14.0.51. A successful
Cloudflare build is not proof that an Owner browser loaded the right JS.
"""
from pathlib import Path
import json
import re
R=Path(__file__).resolve().parents[1]
release=json.loads((R/"release-manifest.json").read_text())
admin=(R/"admin.html").read_text()
js=(R/"assets/js/admin-stripe-shadow-v01439.js").read_text()
sw=(R/"sw.js").read_text()
version=release["version"]
expected="".join(map(lambda x:x.zfill(2),version.split(".")[1:]))
# Historical asset key is 0.14.0.52 -> 014052, not the stale 014047.
expected="014"+version.split(".")[-1].zfill(3)
assert int(version.split(".")[-1])>=52
assert f'<meta name="application-version" content="v{version}">' in admin
match=re.findall(r'src="(assets/js/admin-stripe-shadow-v01439\.js\?v=([0-9]+))"',admin)
assert len(match)==1, f"Exactly one cached-bust Stripe bundle is required; found {match}"
assert match[0][1]==expected, f"Stale Stripe script query: expected {expected}, found {match[0][1]}"
assert "admin-stripe-shadow-v01439.js?v=014047" not in admin, "Never regress to the old script"
assert "const preflight=element('button','Run Payment Test Preflight')" in js
assert "controls.append(refresh,verify,preflight,modeControl,label,sel,audit,begin)" in js
assert "const audit=element('button','Audit Checkout — No Payment')" in js
assert "audit.addEventListener('click',auditCheckout)" in js
assert "preflight.addEventListener('click',runPreflight)" in js
assert f"Payment testing interface v{version}" in js, "Visible UI deploy signature required"
assert f"version:'{version}'" in js
assert f"groundup-v014{int(version.split('.')[-1]):03d}-public" in sw
assert release["customerCheckoutApproved"] is False
assert release["liveStripeFulfillmentEnabled"] is False
print("PASS v52: real Admin loads new Stripe bundle, visible version/preflight, no stale query or live payments.")
