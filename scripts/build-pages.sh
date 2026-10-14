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
for directory in assets data learn; do
  test -d "$directory" || { echo "Missing public directory: $directory" >&2; exit 1; }
  cp -R -- "$directory" "$output"/
done
printf 'Cloudflare Pages static output: %s files\n' "$(find "$output" -type f | wc -l)"
