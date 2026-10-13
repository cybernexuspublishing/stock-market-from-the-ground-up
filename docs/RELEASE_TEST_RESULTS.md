# v0.14.0.0 Local verification — NOT live production certification

- **Source base:** exact user-uploaded v0.13.5.7.7 ZIP; 401 original files; 383 unchanged, 17 modified and the former public `data/interactive-labs.json` moved to private SQL.
- **Source inventory:** `docs/RELEASE_FILE_AUDIT.csv`, `docs/FILE_HASHES.csv`; hashes exclude each other and this test report to avoid self-reference.
- **No live changes made:** GitHub, Cloudflare, Supabase, Lemon Squeezy and KDP were not written.
- JavaScript syntax and JSON parsing: PASS (source script; see `tests/v014_release_audit.py`).
- Active HTML static asset references: PASS in local source.
- Public market-lab metadata: 419 unique IDs, 94 original Foundations IDs preserved in private seed.
- Cloudflare Pages static build `bash scripts/build-pages.sh`: PASS — 260 public files; private SQL, `functions/`, development docs and tests excluded from the public output.
- `node tests/v014_api_contracts.mjs`: PASS local mocked requests for Owner-only plan writes, disabled checkout, Showcase denial, suspended-user denial, server tool access, pre-answer privacy and training answer routing.
- `python tests/v014_browser_contracts.py`: PASS local Chromium fixtures at 1440, 860 and 390px, responsive membership controls and XSS-escaped labels; GWS draft text is rendered as text.
- `python tests/release-browser-smoke.py`: PASS local CMS/form fixtures (unmodified legacy tests).
- `node tests/release-api-authorization.mjs`: PASS local forum/Owner authorization mocks.
- `node tests/release-frontend-contracts.mjs`: PASS, updated for new atomic forum reporting RPC.

## Unverified and release-blocking

- Supabase live schema (v0.13.5.4 and v0.13.5.5 migration source absence), new v0.14 migration application and service-role-only seed verification.
- SQL end-to-end transaction behavior, RLS grants, real concurrent requests, Grade and Owner identity verification.
- Hosted Cloudflare preview/production, real browser logins, payment-provider sandbox, email delivery, object store, operational backup restore, licensed historical data.
- Trading simulator outcome correctness with real market data; only one book-derived numerical grading rubric exists, with external historical evidence unverified.
- Grant Web Solutions tenant/public client hosting; currently draft-only.

**Do not invite paying customers based on these local tests alone.**
