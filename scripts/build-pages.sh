#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
output="public"
# Reproducible Pages output: do NOT publish database SQL, source, test fixtures or docs.
rm -rf "$output"
mkdir -p "$output"
for must in index.html config.js sw.js lab-catalog.json manifest.webmanifest _headers _redirects; do
  test -f "$must" || { echo "Missing required public asset: $must" >&2; exit 1; }
done
cp -- ./*.html config.js sw.js sw-v*.js manifest.webmanifest lab-catalog.json _headers _redirects "$output"/
# Security boundary: authored/book instructional source must NEVER be published.
# A stale Git-tracked data/interactive-labs.json has been observed on main.
if [[ -e data/interactive-labs.json ]]; then
  echo 'SECURITY BUILD BLOCK: data/interactive-labs.json is present in the repository.' >&2
  echo 'Back up private source outside Git, then remove the tracked file before deploying.' >&2
  exit 4
fi
for directory in assets learn; do
  test -d "$directory" || { echo "Missing public directory: $directory" >&2; exit 1; }
  cp -R -- "$directory" "$output"/
done
# Publish only audited, deliberately public data files, never an entire data directory.
mkdir -p "$output/data"
for file in books.json challenges.json commerce-config.json environments.json interactive-lab-index.json journal-taxonomy.json labs.json releases.json simulator_csv_template.csv skills.json store-products.json tutor-index.json; do
  test -f "data/$file" || { echo "Missing allowlisted public data file: data/$file" >&2; exit 1; }
  cp -- "data/$file" "$output/data/$file"
done
printf 'Cloudflare Pages static output: %s files\n' "$(find "$output" -type f | wc -l)"
