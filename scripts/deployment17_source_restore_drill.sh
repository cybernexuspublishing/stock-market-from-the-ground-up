#!/usr/bin/env bash
# D17 source restore drill. Independent of Cloudflare, Supabase, and Stripe.
# A successful source restore is NOT a PostgreSQL or runtime recovery drill.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
sha="$(git rev-parse HEAD)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/recovered"
git archive --format=tar "$sha" | tar -xf - -C "$tmp/recovered"
for path in release-manifest.json scripts/build-pages.sh scripts/build-public-seo.mjs   functions/_middleware.js assets/js/route-policy.js _headers _redirects; do
  test -s "$tmp/recovered/$path" || { echo "RESTORE FAIL missing $path" >&2; exit 1; }
  cmp -s "$path" "$tmp/recovered/$path" || { echo "RESTORE FAIL mismatch $path" >&2; exit 1; }
done
if test -e "$tmp/recovered/data/interactive-labs.json"; then
  echo "RESTORE FAIL private assessment bundle embedded in repository" >&2
  exit 1
fi
(
  cd "$tmp/recovered"
  bash scripts/build-pages.sh
  test -s public/index.html
  test -s public/release-manifest.json
  test -s public/assets/js/route-policy.js
  test ! -e public/data/interactive-labs.json
  test ! -d public/supabase
  test ! -d public/functions
)
printf 'D17 source-archive restore PASS for commit %s; database/provider restore NOT TESTED.\n' "$sha"
