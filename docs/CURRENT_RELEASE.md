# Current Source Candidate — v0.14.0.7 (October 13, 2026)

**Source-tested security remediation candidate, NOT production accepted.** Base: complete v0.14.0.6 ZIP. No site deployment or production SQL changes were performed by the assistant.

- Implemented a unified browser-reporting path through `/api/commons-report`, protecting both the old `/forum-topic.html` route and Market Commons while distinguishing their independent databases with typed `legacy` and `commons` namespaces.
- Prepared **TWO NEW WRITE SQL MIGRATIONS** to be manually applied in order: **A before the frontend deployment** and **B after the new frontend is working in production**. B revokes unauthorized member direct report INSERT. DO NOT swap the order.
- Reasserted service-only EXECUTE for `user_has_tool_access`, already manually verified by the Owner in the current database.
- Hardened suspended/restricted and Showcase checks and preserved all 419 historical Lab identifiers, active stable asset filenames, Admin interface, GWS drafts, membership pricing and checkout-off policy.

**Mandatory guide:** `docs/v0.14.0.7_FORUM_SECURITY_REPAIR.md`.

**The 77-task roadmap remains unfinished.** Source presence does not equal live permission or payment verification. No 419-Lab answer verification or licensed historical market-data acceptance is claimed.
