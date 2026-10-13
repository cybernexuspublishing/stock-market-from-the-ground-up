# Release verification — v0.13.5.7.6

**GitHub main inspected:** `16e351186032ce601d6dc9d0ddd07960b4990590`, 338 tracked files on v0.13.5.7.4. **Next source parent:** complete v0.13.5.7.5 ZIP. Not all GitHub version changes after that SHA can be assumed incorporated; check again before upload. Every release source file is enumerated in `FILE_AUDIT.csv` with its sha256, size and category; **enumeration is not manual behavioral validation of every API and SQL path**.

**Completed, reproducible local checks:** JavaScript syntax, all JSON parsing, all HTML-local resources, protected service worker and Showcase guards, 419 Lab IDs/94 canonical Foundations IDs, selected-book Lab records (50 per page), Dashboard responsive tabs, 30 illustrated skill tiles with no overflow at 1440/860/390, grouped/ungrouped admin directory click-through, Account Management link, Market Commons 30-topic paging, cloud build output excludes `supabase`, `docs`, `tests` and includes image assets. Run `python tests/test_skill_gallery_admin_directory.py`, `python tests/test_admin_forum.py`, `python tests/qa_clean_baseline.py`.

**Not exercised:** authenticated Owner/Moderator/Member writes on live Supabase; provider/commerce webhooks, live KDP restrictions, external licensed historical market data, Site Builder publish revisions/restore, true on-demand automation execution, full database backup/restore, forum moderation RLS and spam controls. These require real test accounts/provider credentials or backend work.

**Only source versions are changed.** No database migration is created or run. Existing Supabase keys and encryption keys are not in this archive.
