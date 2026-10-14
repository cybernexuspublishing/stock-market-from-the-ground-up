# v0.14.0.17 — Sitewide Owner Rules and Engineering Foundation

This is an **add-only governance and engineering foundation**, not a complete website update. It begins execution against the Owner's new two-document standard without overwriting the existing codebase or databases. It is not a claim that the entire website has been rebuilt.

**Open first:** `PROJECT_SITEWIDE_RULES.md`, `docs/sitewide/ADOPTION_AND_RELEASE_INSTRUCTIONS.md`, and `docs/sitewide/CURRENT_REPOSITORY_AUDIT.md`.

**Owner's exact specifications:** complete original texts in `docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md` and `docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md`. No sections omitted.

**AI/developer rule entry point:** `AGENTS.md`. **Optional concise ChatGPT Project Instructions:** `PROJECT_INSTRUCTIONS_FOR_CHATGPT.txt` (can be pasted in project configuration; this ZIP cannot itself change ChatGPT Project settings).

**Automated gate:** `.github/workflows/sitewide-engineering-governance.yml` and `scripts/sitewide_governance_audit.py` detect missing/mutated requirements, private instructional source, unexpected lab count changes and other release boundary problems. The GitHub Actions workflow runs only once committed; it does not deploy or write to Supabase.

**Read-only database inspection:** `supabase/admin/SITEWIDE_GOVERNANCE_PREFLIGHT_READ_ONLY.sql`. It does not apply migrations or change data.

**Change control:** The current GitHub `main` commit reports v0.14.0.17 while the existing manifest is v0.14.0.16. Do not overwrite active website files with the older uploaded source archives. This ZIP's files can be overlaid onto the exact current checkout; the old `PROJECT_ADVANCED_ENGINEERING_RULES.md` is included **byte-for-byte identical** to the current GitHub version.

**Status:** Staged locally, not uploaded to GitHub, not executed against production Supabase, not deployed to Cloudflare. See release manifest and audit for limitations.

**Auto-deployment caution:** GitHub-to-Cloudflare integration may deploy any pushed change. Do not push this add-only change to a production-connected branch until you intend the site to redeploy.
