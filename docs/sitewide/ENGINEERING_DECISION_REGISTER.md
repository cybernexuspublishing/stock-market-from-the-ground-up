# Engineering Decision Register — Sitewide Implementation

**Baseline:** GitHub `main` commit `fd378aa221a4e352c08e797617d262127e87348a`, inspected 2026-10-14. These decisions can be revised only through a documented engineering assessment and, where necessary, explicit Owner approval.

| Decision | Existing approach | Decision | Benefit | Security / cost / migration condition | Verification |
| --- | --- | --- | --- | --- | --- |
| ED-001 | Cloudflare Pages/Functions + Supabase/PostgreSQL + GitHub | **Preserve** as primary stack | Low operational cost and continuity | No disruptive migration without benchmarked functional need | Cloudflare build + live DB acceptance |
| ED-002 | Several role-guarded administration modules | **Centralize configurable policy metadata** without creating a second entitlement system | Real Owner/Admin/Moderator control across modules | Enforce scope in backend/RLS; Owner-only for security/financial settings; audit and locking | Negative-role and transaction tests |
| ED-003 | BBCode and client-side renderer | **Use a structured, safe rendering pipeline** with server-side validation | Rich community/teaching experiences | No arbitrary HTML/JS, uploads or private member exposure | XSS regression, CSP, clipboard tests |
| ED-004 | Distinct forum and member interfaces | **Reuse verified editor, notification, identity and permission services** | Fewer contradictory interactions | Preserve historical forum IDs and RLS; no unauthorized member visibility | Legacy/new forum integration tests |
| ED-005 | Existing member-dashboard implementation | **Improve information architecture from educational task flows** rather than add generic cards | Reduced friction and consistent learning navigation | Keep actual data and 419 lab identifiers | Member journey tests |
| ED-006 | No GitHub Actions workflows at inspected head | **Add an inexpensive nondeploying integrity workflow** | Early detection of private-file publication and rule drift | Least-privilege read-only action; no paid tools or tokens | Rule audit and build output test |
| ED-007 | Existing service worker + Pages static assets | **Preserve protected-route network-only policy** | Faster public pages without private leakage | Revalidate every newly protected member/admin route | Cache poisoning/offline tests |
| ED-008 | Proposed AI moderation, tutor and search | **Prefer deterministic/indexed PostgreSQL methods first** | Auditability and predictable cost | Require human review and privacy assessment for AI | Offline precision/recall benchmark |
| ED-009 | Current published versions differ across HEAD/manifest | **Reconcile, do not overwrite with old source** | Reproducible release history | Exact-source hashes and Owner release sign-off | Tree checksum and deployment revision |
| ED-010 | Existing SQL migration history | **Read-only preflight → reviewed migration → read-only postflight** | Safe repeatability and rollback planning | Never rerun unverified migration blindly | Database schema, policies and RPC tests |

**Excluded as unsupported claims:** guaranteed 99.99% uptime, guaranteed concurrency, universal AI moderation correctness, fully WCAG-compliant status, live historical market accuracy, completed SQL migrations, universal payment support, or total feature parity. Evidence is required before each claim.
