# The Stock Market: From the Ground Up — Sitewide Controlling Development Rules

**Owner directive authorized:** 2026-10-14

**Project:** The Stock Market: From the Ground Up  
**Company:** Cyber Nexus  
**Scope:** The entire website and every current or future integrated system, including Grant Web Solutions within the existing authorized Admin Control Center.  
**Approval status:** Owner-directed development requirements; deployment and individual feature acceptance remain unverified.  
**Controlling source specifications:**

- [`docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md`](docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md) — complete 40-section Master Website Development, Design, Engineering, and Implementation Prompt (unaltered).
- [`docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md`](docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md) — complete advanced engineering, innovation and future-readiness requirements, numbered 37–49 (unaltered).
- [`PROJECT_ADVANCED_ENGINEERING_RULES.md`](PROJECT_ADVANCED_ENGINEERING_RULES.md) — previously established sitewide Owner standard, remains effective. This delivery **does not replace** it.

These specifications are binding **engineering and acceptance requirements**, not a statement that all capabilities presently exist. Both original texts are included verbatim so that no requested function is discarded, compressed, or reinterpreted as an implemented feature.

## Interpretation and governance

1. All products must meet the same standard: public site, authentication, member Dashboard, books and commerce, learning, lab registry, simulator, journal, tutor, progress and skills, Market Commons, notifications, administrative management, permissions, Grant Web Solutions, security, integrations, background workflows and operations.
2. Favor complete, working, distinctive, maintainable functionality within approved low-cost Cloudflare/Supabase/GitHub infrastructure. Do not select newer technology solely for novelty; do not substitute styling or UI mockups for backend behavior.
3. Preserve frozen business/product decisions until expressly reopened: membership types and prices, separate visibility/checkout/entitlement switches, KDP Select digital exclusivity, 419 Lab ID continuity, no-hindsight historical exercises, synthetic/read-only SHOWCASE_VIEWER access, secure Auth passwords, and production SQL/security lockdown.
4. Owner remains the ultimate authority for security, financial, credentials, global quota policy and destructive governance. Admin and Moderator scope is **granular, delegated and backend-verified**, with least privilege, audit and revocation. Browser-only controls are not authorization.
5. Each adjustable operational limit is represented by an authoritative, typed, validated, permission-controlled, auditable policy and used by the enforcing server/database; application display values alone do not constitute implementation. Immutable provider/runtime limits cannot be falsely overridden.
6. User content must never execute arbitrary HTML/JavaScript. Require safely parsed, allowlisted formats, server-side validation, ownership checks, checked file uploads and correct published rendering. Mention selection resolves actual permitted users; mention notifications require preference, privacy and deduplication controls.
7. Every read and write must preserve authentication, authorization, RLS, category/book/learning permissions, retention and data minimization. Never cache private responses in a public service-worker cache or publish private instructional source files.
8. Every feature must include appropriate failure states, server contracts, deterministic behavior, consistent navigation, keyboard/touch/screen-reader use, stable unversioned runtime filenames, versioned release archives, real testing and documented rollback.
9. Identify and evaluate other appropriate advancements proactively with documented benefits, risk, performance and cost. Distinguish implemented-now work from architected future support or rejected proposals; approved mandatory work may not be mislabeled delivered.
10. Where established code and a new aspirational requirement conflict, inspect the production code and record a compatibility decision. Destructive changes or deviations from frozen decisions require explicit Owner approval; routine non-destructive engineering choices may proceed under the current authorization.

## Delivery rules

All development releases must identify current commit SHA and source branch, status, modified filenames, implementation evidence, database dependencies, SQL preflight/migration/postflight, security and design effects, test outcomes, remaining work and deployment status. Do not claim deployment without action and confirmation. Produce complete current-source files and a correctly named ZIP that the Owner can download and manually upload; do not overwrite unrelated repository files.

## Traceability

`docs/sitewide/REQUIREMENTS_REGISTER.csv` includes the enumerated headings and requirement lines from both complete unmodified source documents. Each requirement begins as **UNVERIFIED/NOT YET ACCEPTED** until paired with source-code and acceptance evidence. This is intentional and prevents an attractive but disconnected screen from being marked complete.

`docs/sitewide/CURRENT_REPOSITORY_AUDIT.md` records the actual accessible GitHub `main` state and blockers. If later changes supersede these findings, inspect the new commit before applying updates.
