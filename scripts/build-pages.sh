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
for file in books.json challenges.json commerce-config.json environments.json interactive-lab-index.json journal-taxonomy.json labs.json releases.json simulator_csv_template.csv skills.json store-products.json tutor-index.json; do
  test -f "data/$file" || { echo "Missing public data: data/$file" >&2; exit 1; }
  cp -- "data/$file" "$output/data/$file"
done
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
printf 'Cloudflare Pages static output: %s files\n' "$(find "$output" -type f | wc -l)"
