# v0.13.5.7.6 — Owner-controlled deployment and rollback

1. Preserve the v0.13.5.7.4 `main` commit and the unuploaded v0.13.5.7.5 candidate ZIP. **Do not upload v0.13.5.7.5 separately** if you are using this complete v0.13.5.7.6 repository ZIP; all source modifications from .5 are included.
2. Extract the package and copy all file contents into the **existing** GitHub Desktop repository root (never upload ZIP itself, never copy an enclosing directory, never touch `.git`). Version prefixes are on ZIP names only; `assets/js` and `assets/css` filenames are stable.
3. Prefer a new branch `release/v013576-learning-admin-visuals` to preview. Run `bash scripts/build-pages.sh` locally. Compare GitHub Desktop changes against `docs/CHANGESET_v013576.csv` and inspect any unexpected deletion.
4. Push the branch and verify Cloudflare Pages preview; use the existing Build command `bash scripts/build-pages.sh`, output `public`. **Do not switch to Cloudflare Workers**. The deployed Pages Functions still come from repository-root `functions/`.
5. Check sign-in (existing account), protected URLs (signed out), exactly one profile Dashboard link, Account Management from the sidebar, Admin Control Center Directory workflows, desktop/tablet/mobile skill cards (all 30 with icons), source-grounded skill detail links, Lab collection filter, Market Commons index/subforum/thread pages and >50 replies.
6. Compare authorized Owner/Admin/Moderator/Dummy/Showcase read and write behavior. Do not test live destructive operations against real member data. Client-side disabling is **not** a security boundary; Cloudflare Functions/RLS must deny unauthorized writes.
7. Merge/promote only after review; confirm actual Cloudflare production deployment and test. If broken, revert GitHub commit and redeploy previous tested version; **no Supabase or Cloudflare project recreation**.

### Important limitations

- No SQL migration is needed for this source update. Use the **optional read-only** contract diagnostic only if reconciling the existing database.
- 30 SVGs are visual mnemonic illustrations and are **not historic chart/data evidence**. Price-action Labs must still reference original, licensed, date/time/ticker-verified historical charts, not fabricated plots.
- An existing CMS page editor supports live *plain-text* preview; it is not a finished drag-and-drop builder or proof of live publication success.
- Read-only config snapshots are not backups of Supabase databases. Automation draft configuration does not execute rules.

This canonical file supersedes the previous v0.13.5.7.4 one-time-rename instructions. Do **not** rerun the retirement script for this release.
