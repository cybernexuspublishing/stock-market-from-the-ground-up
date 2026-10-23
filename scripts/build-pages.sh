#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
output="public"
rm -rf "$output"
mkdir -p "$output"
for must in index.html config.js sw.js release-manifest.json lab-catalog.json manifest.webmanifest _headers _redirects; do
  test -f "$must" || { echo "Missing public asset: $must" >&2; exit 1; }
done
cp -- ./*.html config.js sw.js release-manifest.json manifest.webmanifest lab-catalog.json _headers _redirects "$output"/
if [[ -e data/interactive-labs.json ]]; then
  echo 'SECURITY BUILD BLOCK: data/interactive-labs.json is present in repository.' >&2
  exit 4
fi
for directory in assets learn; do
  test -d "$directory" || { echo "Missing directory: $directory" >&2; exit 1; }
  cp -R -- "$directory" "$output"/
done
mkdir -p "$output/data"
for file in books.json challenges.json commerce-config.json stripe-product-registry-v01437.json environments.json interactive-lab-index.json journal-taxonomy.json labs.json releases.json simulator_csv_template.csv skills.json store-products.json tutor-index.json competency-study-guides-v01499.json competency-lab-paths-v01499.json; do
  test -f "data/$file" || { echo "Missing public data: data/$file" >&2; exit 1; }
  cp -- "data/$file" "$output/data/$file"
done
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
node scripts/build-public-seo.mjs
printf 'Cloudflare Pages static output: %s files\n' "$(find "$output" -type f | wc -l)"
