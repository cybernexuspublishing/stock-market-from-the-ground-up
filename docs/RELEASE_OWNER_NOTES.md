# v0.13.5.7.7 — Controlled website and Market Commons release

**Source:** v0.13.5.7.6 full candidate ZIP, based on original 387 files; compared against the 387-file GitHub `main` tree (`c4035da6ddf64f6cfbe3470e926d75ff275e6ff0`) and sampled original Git blob SHAs. All packaged source files were inventoried and parsed where supported; this is not a live inspection of each runtime feature. No GitHub push, Cloudflare deployment, Supabase migration, publication-book change, or checkout activation was performed.

## Changes with actual working source implementations

1. **Website Page Composer:** Owner Pages & SEO dialog now supports a constrained visual block editor (heading, paragraph, bulleted list, callout, internal link). Blocks can be reordered, removed, and edited. Saves JSON in existing `site_pages_v1354.body_text`, with an explicit prefix; existing plain-text pages remain readable. Public `/p/[slug]` Pages Function renders permitted blocks as escaped semantic HTML and a separate accessible stylesheet, not arbitrary HTML. Protected by the existing Owner API. Previews never execute HTML. The original plain-text preview and block-composer preview now coordinate, rather than overwriting each other during keystrokes. Requires the existing v0.13.5.4 site page table and `PAGE_BUILDER` public enablement. This is an **operational limited block composer**, not full drag-and-drop with media storage, layout templates, or change-history.
2. **Visual public form field editor:** Owner Forms & Leads dialog now has a graphical form-field editor: add/remove, reorder, label, field code, required, approved field type. It writes the existing JSON field contract; the backend continues enforcing 1–12 fields and rejects sensitive field names. No database changes.
3. **Market Commons reporting:** Signed-in eligible members have a Report discussion and Report reply action on the current `market-commons.html` thread interface, using the new `/api/commons-report` Cloudflare Function. It verifies Supabase identity and genuine active content, blocks demo/Showcase account writes, enforces a best-effort per-account 24h quota and duplicate check, and stores reports in existing `forum_reports` protected table. Abuse/rate limits are **not atomic** and require edge rate limiting/provider verification to be fraud-resistant at scale.
4. **Moderation queue:** A Market Commons moderation queue is accessible from the Admin Control Center Directory. Existing `forum.moderate` permission checked by `admin-v0133`, owner protection for official guides, read-only incident review plus audited Review / Resolve / Dismiss and Lock / Pin / Hide / Restore operations. Topic updates use optimistic concurrency against `updated_at`; report resolution uses status preconditions; does not hard-delete posts or teach unverified content. Other legacy forum pages remain for compatibility; separate migration to one forum backend is still outstanding.
5. **Educational accuracy:** Legacy Labs without independent instructions are now explicitly identified as book-companion references, not presented with invented WHAT/WHY/HOW prose. Reference-only Labs without questions require a substantive personal reflection before marking complete. Unknown requested IDs no longer silently load the first interactive Lab.
6. **PWA upgrade:** Public service-worker cache incremented to invalidate the earlier frontend asset versions, preserving the private-page no-cache strategy.

## Required deployment

- Download the full ZIP, preserve current `main` for rollback, extract into a **preview branch**. Same names for JS/CSS files, no one-time filename cleanup.
- GitHub remains controlled by the Owner; do not push/merge from this automated review.
- Cloudflare Pages existing command **`bash scripts/build-pages.sh`** and output **`public`**, root blank, production branch main. No configuration changes needed for local preview.
- **NO new DDL or migrations to apply for these source changes**. The new endpoints depend on existing `public.forum_reports`, `public.commons_topics/posts`, `public.admin_user_roles/admin_role_permissions`, `public.site_pages_v1354`, `public.site_forms_v1354`, and their column/privilege/RLS contracts. Verify with `supabase/admin/release-contract-preflight-read-only.sql` before enabling editing/reporting in production. If missing objects are found, stop and reconcile live schema; do not rerun all historical migrations.
- Keep `ENABLE_PAID_CHECKOUT` UNSET; remain OFF: KDP Select direct digital sales, mandatory Turnstile CAPTCHA, required staff AAL2, activation QR, Showcase production entitlements.

## Manual acceptance before production

- As OWNER: Admin → Control Center Directory → Pages & SEO → Create Draft; use block editor, create text with `<script>` characters and internal link; save, reopen, confirm block structure; publish only a separate disposable page after private preview; verify HTML escaping, page title and server responses.
- As OWNER: Site Operations → Forms → edit disposable form; add 2 fields with unique codes; save; verify public form and private lead queue; do not use real contact data in staging.
- As genuine member: open Commons topic with and without replies, report content; confirm duplicates/quotas and moderation queue, and that missing/locked topic cannot be reported.
- As Moderator with `forum.moderate`: can manage ordinary topics but not official guides; as member/Test/Showcase: API and UI mutations fail. Test 2 simultaneous moderator changes; ensure conflict returns 409 and a refresh is needed.
- Existing dashboard 9 tabs, Owner Account Management, Labs per book (50/page), 30 skill cards, enrollment display, profile dropdown, checkout OFF must regress cleanly.
- CSS at 390/768/1440px, keyboard and screen reader access, escaped user content, no multi-second private-page flash. Test an actual deployed Cloudflare preview with live Supabase *test accounts*.

## Known dependencies and remaining commitments

The admin workflow directory is navigation, not evidence of operational backend completion. The complete drag-and-drop media website builder, server-backed version history/reversion, workflow automation execution, actual encrypted database backup/restoration, live campaign billing and financial settlement, correct historical chart sourcing and licensed intraday tape/Level II replay are **not implemented** by this package. Similarly, account CRUD across all roles, data provider integrations, webhook reconciliation, moderation spam protection, anonymous auth boundaries and 419 individual Labs require independent live testing. See `docs/FRONTEND_REQUIREMENTS_TRACE.csv` for granular statuses.

## Local QA reproducibility (not production confirmation)

- `python tests/release-sitewide-audit.py` checks source references, syntax, SVGs and the locked Lab count.
- `node tests/release-frontend-contracts.mjs` exercises escaped block content and release code contracts.
- `node tests/release-api-authorization.mjs` tests authentication/role cases against mocked Supabase responses.
- `python tests/release-browser-smoke.py` tests the visual page builder and forms on 1440/860/390px fixtures.
- Existing regression tests also passed locally: header geometry, 30 skill illustrations, Owner navigation, Dashboard tabs, member/admin Lab collection gates, forum pagination, MFA rollout and checkout safeguards.
- `bash scripts/build-pages.sh` creates the static public assets without publishing SQL or internal documentation.

**Database preflight:** The read-only SQL is not a migration. It should be run in the original Supabase project *before* enabling the new reporting and CMS operations. The frontend does not use new schema objects beyond historical migrations, but a repo file is not proof those objects were installed.
