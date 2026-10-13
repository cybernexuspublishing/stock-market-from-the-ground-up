# Deploy v0.13.5.7.2 — Whole-Repository Clean Baseline

**Status: CANDIDATE — no live deployment or live DB verification.** This document supersedes earlier baseline upload instructions, without deleting their historical audit documents.

## If you recreated an EMPTY GitHub repository

1. Preserve the original GitHub and Supabase backups. Download `Stock_Market_From_The_Ground_Up_v0.13.5.7.2_JS_CSS_CONSOLIDATED_CLEAN_BASELINE.zip`.
2. Extract locally; use GitHub Desktop to clone `cybernexuspublishing/stock-market-from-the-ground-up` and copy **all extracted contents** directly into its root. Do not upload the ZIP as a single file; do not nest everything under a version-number folder. Do not copy over `.git`.
3. Before publishing publicly, verify no private `.env`, keys, backend secrets or credentials were accidentally included. Public frontend Supabase keys are not server service-role secrets.
4. Commit `v0.13.5.7.2 - Consolidated repository clean baseline` and push to `main` (or a preview branch if one is available). If possible, obtain a Cloudflare preview first.
5. Keep the existing **Cloudflare Pages project** and **existing Supabase project** unchanged. Re-creation of GitHub changes the repository identity; check and, if necessary, reconnect Cloudflare's Git integration rather than deleting the Cloudflare project.
6. Confirm that `index.html`, `assets/`, `functions/`, `supabase/`, `data/`, and `docs/` are in the GitHub root. Cloudflare Pages should deploy static root assets and file-based Functions as before; preserve build/output directory settings from the old project.
7. Check the Cloudflare deployment logs for Success. Refresh browser using Ctrl+Shift+R. If old SW is active, check Service Workers under Developer Tools and verify that the newest `/sw-v0135.js` takes control without exposing cached private pages.

## Do not reinstall Supabase

You are only replacing GitHub. Previously executed database migrations and Auth users are not touched by the repository upload. **Do not rerun the full historical SQL set.** Run the *read-only* `supabase/admin/v0.13.5.6_DATABASE_CONTRACT_READ_ONLY.sql` and resolve any missing object/ACL before relying on Owner grants or checkout. If verification reports missing migrations, obtain the exact original SQL and compare it with production before applying anything.

## Required acceptance before calling this release live

- Home `/`: actual member totals/online panel appears to the left of the current Home hero (unless Owner configured it hidden), with one fetch/one scheduled refresh, and custom metrics clearly labeled.
- Signed-in Header: **one Dashboard link** under username, with correct Owner/Admin link, keyboard focus/hover/touch, and one mobile drawer.
- Registration: password guidance appears once; 10–120 chars, upper/lowercase and approved special symbol; confirm password; check Supabase server password policy matches.
- Admin → Accounts & Access: existing Full Account editor launches; role and membership records remain authorized and unchanged.
- Books & Sales / Store / Membership: same product details, promotional price controls, and Replay monthly price; checkout remains disabled and KDP Select safeguards remain enforced.
- Site Lab Registry: book-specific 50-Lab server pagination; shared WHAT/WHY/WHEN/OBJECTIVE/HOW renderer displays correctly for learner Lab and read-only Owner Lab Preview. The latter must not save anything.
- Learning Operations: Book-specific lists and 50-per-page pagination; existing snapshots and feature controls still visible.
- Security: no mandatory staff MFA/CAPTCHA/QR activation/paid checkout activated, Showcase synthetic-only, no production member entitlement grants by Showcase.
- Role, mobile, service-worker, browser console/network and DB contract tests MUST be performed on live Cloudflare/Supabase; local mocked tests do not prove their outcomes.

## Recovery

Because you recreated GitHub, preserve the old repository ZIP locally. To recover from a failed Cloudflare deployment, restore the previous working source as a Git commit and redeploy; this does not reverse database changes. Never delete your Supabase/Cloudflare projects as a shortcut.
