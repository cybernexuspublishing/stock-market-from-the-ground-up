# The Stock Market: From the Ground Up — Frontend v0.14.0.18

## PACKAGE TYPE: DIRECT SOURCE FILE OVERLAY (NO PATCH SCRIPTS)

**Company:** Cyber Nexus  
**Project:** The Stock Market: From the Ground Up / Companion Learning Website  
**Source repository:** `cybernexuspublishing/stock-market-from-the-ground-up`  
**Audited source baseline:** `ded55fc7955b52779bd52a8da2cfc79bf67288e3` (main, 2026-10-14)  
**Release:** v0.14.0.18  
**Status:** Development candidate — **NOT DEPLOYED; NOT FRONTEND SIGN-OFF**  
**Purpose:** Deliver immediately usable complete replacement/new source files at the real repository paths, without requiring a customer to run a patch script.

## WHAT TO DO WITH THIS ZIP

These are complete source files. As with the prior GitHub upload workflow, preserve their directory paths and merge them into the SAME existing GitHub repository checkout. Replace only paths supplied here. **Do not delete any other project files.** This ZIP is an upload-ready source overlay, not the 588-file full-repository snapshot and not a Cloudflare `/public` build.

**Do not upload the archive itself as a Cloudflare Pages build.** Deployments must be built from the full GitHub repository, including its existing `functions`, database-dependent APIs, assets, and Cloudflare configuration.

## FRONTEND CHANGES DELIVERED

1. Market Commons: `New Discussion` launches a dedicated, authenticated composer in a new tab. The original database RPC and forum permissions continue to govern publishing; old dialogs are not given extra privileges.
2. Composer: forum selection, title/body/ticker validation, keyword display, double-submit protection, error states, rich-text integration, and accessible labels.
3. Replies: on a successful existing reply submission and reload, the frontend resolves the published reply count and navigates to the final reply page; this does not modify the existing reply RPC.
4. Checkout/account status: querystring state cannot independently assert payment, refund, membership or account success.
5. Version and route policy: update frontend release label, add `new-discussion` to protected member routes, and advance the Service Worker cache namespace. The existing Cloudflare middleware continues to enforce the protected route classification based on the replaced route-policy file.
6. Static book links: when no verified Amazon URL is configured, the link navigates to Store availability instead of pretending to be a live Amazon listing.
7. Preserve preexisting reporting-policy integration, announcements loader, rich editor, account access, and KDP Select switches.

## NOT INCLUDED / NOT CERTIFIED

The unresolved findings from the v0.14.0.17 sitewide audit have NOT all been repaired. This overlay does **not** implement backend-controlled member-mention suggestions, authenticated report-policy database migrations, polling and upload infrastructure, notification delivery, provider-confirmed checkout UI, or full admin operations. It also does not prove the completeness of all 1,815 requirements register entries.

The existing Cloudflare middleware version string remains v0.14.0.14 in repository source; runtime display is normalized in this overlay. Full server/source metadata reconciliation requires replacing the entire middleware file from a verified full checkout, rather than overriding a partial file. Production API/RLS and mobile, accessibility, browser and database acceptance testing have not been executed.

## FILES

- `config.js` — release identification with preserved public configuration.
- `sw.js` — updated public cache namespace.
- `assets/js/site.js` — complete site bootstrap, existing loader behavior retained, additive correction loader.
- `assets/js/route-policy.js` — full protected-route classification including the new composer.
- `assets/js/status-platform.js` — authoritative-state disclaimer for unverified URL parameters.
- `assets/js/v014018-forum-corrections.js` — delegated Market Commons event and reply-navigation fixes.
- `new-discussion.html` — complete new HTML page.
- `assets/js/new-discussion.js` — complete standalone composition controller.
- `assets/css/new-discussion.css` — standalone responsive styling.
- `tests/test_v014018_overlay.py` — deterministic source and syntax checks.
- `docs/FRONTEND_RELEASE_NOTES_v0.14.0.18.md` — detailed defects and open acceptance criteria.

## NEXT GATE

Before calling the frontend finished, run the existing build and full authenticated role-based/browser regressions with live staging Supabase contracts and verify deployment commit parity. Do not infer that SQL migrations have run because matching UI files exist.

**New file required:** `new-discussion.html` and the three new front-end test/asset files shown above. There is no Google Drive document created by this delivery. Project source of truth remains GitHub.
