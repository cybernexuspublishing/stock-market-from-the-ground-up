#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Journal V1 critical financial, policy-source and guided UI regressions.
# This test is deterministic: it uses fictional inputs and no database/payment action.
node tests/test_journal_guided_integrity_v1.mjs
# Journal V2 must pass before any main-branch production publication.
node tests/test_journal_v2.mjs
# Professional Journal V3: visual data integrity and no fabricated historical candles.
node tests/test_journal_visual_v3.mjs
node tests/test_journal_calendar_setup_replay_v3.mjs
node --check assets/js/journal-market-calendar-v3.js
node --check assets/js/simulator-mode-v014112.js
node --check assets/js/verified-replay-v01492.js
for asset in assets/js/journal-visual-v3.js assets/js/journal-trade-story-v3.js; do
  node --check "$asset"
done
for asset in assets/js/journal-v2-logic.js assets/js/journal-guided-v2.js assets/js/journal-weekly-v2.js; do
  node --check "$asset"
done
for asset in assets/js/journal-common.js assets/js/journal-entry.js assets/js/journal-guided-v1.js assets/js/journal-evidence-v1.js assets/js/journal-actual-history-v1.js assets/js/journal-weekly-v1.js; do
  node --check "$asset"
done
# Owner-authorized release state may build on main. A webhook must remain
# deployable independently of new checkout so renewals/refunds are processed even
# when the Owner pauses new sales. This is a safety boundary, NOT a prelaunch lock.
if [[ "${CF_PAGES_BRANCH:-main}" == "main" ]]; then
  for forbidden in GU72_ZERO_MONTHLY_FULFILLMENT_ENABLED GU72_ZERO_MONTHLY_QA_ENABLED; do
    if [[ "${!forbidden:-false}" == "true" ]]; then
      echo "SECURITY BUILD BLOCK: retired zero-dollar entitlement QA cannot run in production ($forbidden)." >&2
      exit 9
    fi
  done
  if [[ "${GU58_LIVE_CHECKOUT_ENABLED:-false}" == "true" || "${GU_F600_LIVE_CHECKOUT_ENABLED:-false}" == "true" ]]; then
    if [[ "${GU_PAYMENT_LIVE_LAUNCH_APPROVED:-false}" != "true" ]]; then
      echo 'LIVE BUILD BLOCK: checkout requires explicit global Owner launch approval.' >&2
      exit 9
    fi
  fi
  if [[ "${GU58_LIVE_CHECKOUT_ENABLED:-false}" == "true" ]]; then
    for requirement in GU58_LIVE_DB_CONTRACT_APPROVED GU58_LIVE_FULFILLMENT_APPROVED GU58_LIVE_WEBHOOK_ENABLED; do
      if [[ "${!requirement:-false}" != "true" ]]; then
        echo "LIVE BUILD BLOCK: GU58 checkout requires $requirement." >&2
        exit 9
      fi
    done
  fi
  if [[ "${GU_F600_LIVE_CHECKOUT_ENABLED:-false}" == "true" ]]; then
    for requirement in GU_F600_LIVE_FULFILLMENT_APPROVED GU_F600_LIVE_WEBHOOK_ENABLED; do
      if [[ "${!requirement:-false}" != "true" ]]; then
        echo "LIVE BUILD BLOCK: Founding checkout requires $requirement." >&2
        exit 9
      fi
    done
  fi
fi
output="public"
rm -rf "$output"
mkdir -p "$output"
for must in index.html config.js sw.js release-manifest.json lab-catalog.json manifest.webmanifest _headers _redirects _routes.json; do
  test -f "$must" || { echo "Missing public asset: $must" >&2; exit 1; }
done
cp -- ./*.html config.js sw.js release-manifest.json manifest.webmanifest lab-catalog.json _headers _redirects _routes.json "$output"/
if [[ -e data/interactive-labs.json ]]; then
  echo 'SECURITY BUILD BLOCK: data/interactive-labs.json is present in repository.' >&2
  exit 4
fi
for directory in assets learn; do
  test -d "$directory" || { echo "Missing directory: $directory" >&2; exit 1; }
  cp -R -- "$directory" "$output"/
done
# Pin and serve the full ECharts runtime from OUR OWN Pages origin.
# This removes runtime reliance on a third-party CDN and keeps the Apache-2.0
# package license beside the published asset. No proprietary TV assets.
# Install in a throwaway directory outside public, never publish node_modules.
vendor_temp="$(mktemp -d)"
trap 'rm -rf "$vendor_temp"' EXIT
npm install --prefix "$vendor_temp" --no-save --no-package-lock --ignore-scripts --no-audit --no-fund --omit=optional echarts@6.1.0 >/dev/null
vendor_source="$vendor_temp/node_modules/echarts"
test -s "$vendor_source/dist/echarts.min.js" || { echo "ECharts 6.1.0 missing after installation" >&2; exit 7; }
mkdir -p "$output/assets/vendor/echarts/6.1.0"
cp -- "$vendor_source/dist/echarts.min.js" "$output/assets/vendor/echarts/6.1.0/echarts.min.js"
if [[ -f "$vendor_source/LICENSE" ]]; then
  cp -- "$vendor_source/LICENSE" "$output/assets/vendor/echarts/6.1.0/LICENSE"
else
  echo 'ECharts license missing from npm package; refusing build.' >&2; exit 7
fi
# The chart loader MUST reference this exact self-hosted version.
grep -Fq '/assets/vendor/echarts/6.1.0/echarts.min.js' assets/js/crownlight-echarts-loader-v1.js || {
 echo 'ECharts loader does not match published pinned bundle' >&2; exit 7;
}
printf 'Verified same-origin Apache ECharts 6.1.0 static asset (%s bytes)\n' "$(wc -c < "$output/assets/vendor/echarts/6.1.0/echarts.min.js")"
mkdir -p "$output/data"
for file in crownlight-sparks-store-v014167.json books.json challenges.json commerce-config.json stripe-product-registry-v01437.json environments.json interactive-lab-index.json journal-taxonomy.json labs.json releases.json simulator_csv_template.csv skills.json store-products.json tutor-index.json competency-study-guides-v01499.json competency-lab-paths-v01499.json lab-teaching-bridges-v014168.json bootcamp-formative-v014154.json bootcamp-source-cases-v014166.json; do
  test -f "data/$file" || { echo "Missing public data: data/$file" >&2; exit 1; }
  cp -- "data/$file" "$output/data/$file"
done
# Public display projection from canonical founder terms. Preserve the internal
# seat limit ONLY in protected commercial contracts, not public static JSON;
# never expose billing state or treat this artifact as checkout authority.
python3 - "$output/data/founding-catalog.json" <<'PYFOUNDERS'
import json,sys
from pathlib import Path
terms=json.loads(Path('data/founding600-terms-v014170.json').read_text())
fields=('name','billingIntervalDays','recurringCents','foundingDiscountBps','incSparks','includedSparksNeverExpire')
public={'plans':{code:{key:terms['plans'][code][key] for key in fields} for code in ('FOUNDING_14','FOUNDING_30','FOUNDING_60')}}
Path(sys.argv[1]).write_text(json.dumps(public,separators=(',',':'))+'\n')
PYFOUNDERS
# Both bootcamp lesson sources contain original, non-secret, ungraded teaching
# references. Do not publish private rubrics or authenticated research exports.
test -s "$output/data/bootcamp-formative-v014154.json"
test -s "$output/data/bootcamp-source-cases-v014166.json"
# All 419 original public teaching bridges must ship, without any private rubric.
test -s "$output/data/lab-teaching-bridges-v014168.json"
test -f "$output/bootcamp-academy.html"
test -f "$output/assets/js/bootcamp-academy-v014168.js"
test ! -e "$output/supabase/migrations/v0.14.0.168_BOOTCAMP_ACADEMY_OWNER_REVIEW_REQUIRED.sql"
# In an explicitly marked preview staging build, browser auth must use the SAME
# separate Supabase staging project as the Cloudflare Functions payment API.
# Never insert service keys. A missing/inconsistent preview config fails the build.
if [[ "${GU_STRIPE_V38_STAGING:-false}" == "true" || "${GU61_STAGING_ENABLED:-false}" == "true" ]]; then
  if [[ "${CF_PAGES_BRANCH:-main}" == "main" ]]; then
    echo 'Refusing to build staging checkout on production branch.' >&2; exit 5
  fi
  python3 - "$output/config.js" <<'PYSTAGE'
import os,re,sys
path=sys.argv[1]
ref=os.getenv('GU61_STAGING_PROJECT_REF','') if os.getenv('GU61_STAGING_ENABLED')=='true' else os.getenv('GU_STRIPE_V38_STAGING_PROJECT_REF','')
url=os.getenv('SUPABASE_URL','')
pub=os.getenv('SUPABASE_PUBLISHABLE_KEY','')
if not re.fullmatch('[a-z0-9]{20}',ref) or ref=='oxihglyfgzywsupnyicb' or url!=f'https://{ref}.supabase.co' or not pub:
 raise SystemExit('Staging Supabase URL, ref and public key must be configured consistently.')
s=open(path,encoding='utf8').read()
s,n1=re.subn(r"SUPABASE_URL: '[^']*'",f"SUPABASE_URL: '{url}'",s,count=1)
s,n2=re.subn(r"SUPABASE_ANON_KEY: '[^']*'",f"SUPABASE_ANON_KEY: '{pub}'",s,count=1)
if (n1,n2)!=(1,1):raise SystemExit('Expected frontend config fields missing.')
with open(path,'w',encoding='utf8') as f:f.write(s)
PYSTAGE
fi
# Build metadata is authoritative only if the deployment uses this build command.
python3 - "$output/release-manifest.json" <<'PYBUILD'
import json,sys,os,datetime,subprocess
p=sys.argv[1];data=json.load(open(p,encoding='utf-8'))
sha=os.environ.get('CF_PAGES_COMMIT_SHA','').strip() or subprocess.getoutput('git rev-parse HEAD').strip()
if len(sha)==40 and all(c in '0123456789abcdefABCDEF' for c in sha):data['gitCommit']=sha.lower()
data['builtAtUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
data['status']='built-source-not-live-verified'
with open(p,'w',encoding='utf-8') as f:json.dump(data,f,indent=2);f.write('\n')
PYBUILD
node scripts/build-site-accessibility.mjs
node scripts/build-public-seo.mjs
printf 'Cloudflare Pages static output: %s files\n' "$(find "$output" -type f | wc -l)"
