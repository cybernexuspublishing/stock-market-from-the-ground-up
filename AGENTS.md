# Development Rules — The Stock Market: From the Ground Up

**Owner-approved project development standard.** Applies to every website component, not only Market Commons. This file is a concise agent entry point. The complete requirements are incorporated by reference in `PROJECT_SITEWIDE_RULES.md`, `docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md`, and `docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md`. Do not truncate either source or represent individual bullets as optional merely because this entry point is short.

## Owner release workflow (2026-10-24)

- Apply authorized website source changes directly to `main` in the existing `cybernexuspublishing/stock-market-from-the-ground-up` repository; do not create additional feature/release branches unless the Owner explicitly reverses this instruction.
- The default destination for authorized website changes is production, but acceptance requires successful build, permission, regression, and deployed-behavior verification. Report source commits separately from deploy acceptance.
- Stripe products, prices, subscriptions, billing configuration, live charges, and refunds are excluded from automatic changes; obtain separate authorization for payment writes and owner-controlled live checkout testing.
- Do not report the 419 Labs, Boot Camps, navigation or Talia redesign as complete merely because theme infrastructure was deployed.
- Require ONE consolidated Owner Acceptance Test only after the entire authorized website release is independently verified as member-ready and production-ready. Do not request Owner testing of incomplete incremental builds, and do not mark any partial functionality as completed.

## Non-negotiable engineering conduct

1. Before editing, read the complete rules and inspect actual code, architecture, migrations, permissions, and frontend/backend contracts. Identify the real currently deployed baseline; do not assume version numbers are synchronized.
2. Treat Owner-frozen decisions and production data as controlling. Never silently rename canonical assets, remove approved features, rerun historic SQL indiscriminately, or introduce a second system for the same records.
3. Implement working end-to-end functionality: UI, authenticated API, authorization, validation, transactionally consistent storage, audit, errors, and role tests. No placeholder buttons or invented data.
4. Security by design: Supabase RLS, server-enforced permissions, narrow SECURITY DEFINER EXECUTE grants, strict trust boundaries, private teaching-source exclusion, role/scope verification, Showcase synthetic/read-only isolation, verified historical no-lookahead protections, and KDP/e-commerce safeguards.
5. Admin Control Center is a fully engineered product. Routine settings, quotas, notices, permissions, moderation, feature availability and member management belong in functional, auditable administrative workflows; security-sensitive and financial changes are Owner-only by default and must not become editable through generic settings writes.
6. Build a distinctive, cohesive, responsive, WCAG 2.2 AA-targeted design across public pages, accounts, education, commerce, Market Commons, and administration. Prefer clarity, originality, accessibility, and performance over decoration or technology novelty.
7. Prefer established Cloudflare Pages/Workers, Supabase/PostgreSQL and GitHub architecture; use proven extensions only with documented technical benefit, realistic cost, migration and rollback. Keep version prefixes on release ZIPs but stable, unversioned filenames within ZIPs.
8. Separate historical/factual market data, synthetic simulations, educated estimates and instructional examples. Preserve 419 registered historical lab identifiers, authenticated learning boundaries and verified answer-key requirements.
9. Perform actual syntax, build, unit, API-contract, authorization, accessibility, migration, and regression testing where possible; report exactly what passed, failed, was blocked, or needs production verification.
10. Never claim work completed, deployed, secure, compliant, paid, or live without evidence. Maintain manifest, changelog, file hashes, SQL preflight/migration/postflight, release notes, known defects and rollback procedures. Provide actual clickable artifacts if asked.

## Rule precedence and conflict handling

Current explicit Owner direction > later Owner-approved frozen project decisions > the two attached source specifications, read together > existing `PROJECT_ADVANCED_ENGINEERING_RULES.md` > implementation conventions. Where two Owner requirements materially conflict, flag and seek resolution before a destructive change. Do not infer that a pasted proposal is already implemented or that it overrides a specific frozen feature without review. The existing rules are cumulative, not replaced.

## Required progress protocol

For each change, record requirement ID(s), current implementation evidence, defect/risk, database/API dependencies, role/permission impacts, implementation, tests and final verified status. If requirements cannot be completed within the same release, mark **NOT IMPLEMENTED** or **BLOCKED**, not simulated. Do not silently move mandatory work out of scope. Changes must be safe to overlay on the actual current repository rather than an obsolete branch.
