# Published theme service failure handling

Project: The Stock Market: From the Ground Up. Date: 2026-10-25. Branch: main.
Status: reconstructed from previously tested local commit 30c8d21 after workspace expiration. This is a replacement commit on the current main baseline, not the original commit SHA.
Requirements: accessible error states and real production acceptance (Master §§5.3, 9.3; AGENTS engineering rules 8–10).

The earlier inspection confirmed the canonical theme API and root Functions probe returned static HTML 404 while Cloudflare reported a successful compiled Worker deployment. Earlier releases 261 and 264 also recorded this dispatch blocker. Those observations apply to the old deployment and do not certify the newly migrated account.

The theme client now validates JSON and revision, announces unavailability, disables activation during an outage, retains local previews and provides Retry Published Settings. Premium browser QA requires actual health/theme JSON contracts. Backend Owner permissions and atomic revision checks remain unchanged. No database, payment, entitlement or curriculum changes.

Browser fixture covers HTML failure, missing revision, disabled activation, accessible notice, local preview and retry recovery with zero writes. The original pass also ran 18 responsive checks; current reconstruction results are reported separately in the session and CI. Authenticated Owner save/readback and current production API behavior require separate verification.

Rollback: revert this replacement commit. Reverting does not repair Functions dispatch. Continue acceptance on the Owner-selected migrated production host; do not infer old-account results apply there.

## Master target verification

Cloudflare Live v 1.0 connector verified account `4fe9e562905cf607b6f004d2374299fc`, native GitHub `main`, build `bash scripts/build-pages.sh`, output `public` and master hostname `stock-market-from-the-ground-up-d1r.pages.dev`. Premium, storefront and authenticated Lab browser targets now use this master hostname. Historical mocked request origins and rollback smoke remain intentionally unchanged. No LIVE payment switches were changed.
