# Admin dashboard charts and widgets

Project: The Stock Market: From the Ground Up
Branch: main
Status: Source and regression checks passed; authenticated live visual acceptance unverified.
Purpose: Add SaaS-style operational visualizations to the existing Admin dashboard.

## Implementation

The existing authorized dashboard summary supplies every count. New presentation modules add Commerce record bars, Learning/content record bars, moderation workload, audit total and learning-access widgets. No backend or provider changes, new queries, polling, credentials, payment operations, schema migrations or external services.

Counts describe records. Orders are not revenue; subscriptions are not necessarily active; entitlement records are not unique members. Library and content totals are separate record types. No line charts, historical trend, invented growth or conversion percentages are presented. Each bar is scaled to the largest count within its chart. Unknown/invalid values show Unavailable and zero counts remain zero.

Chart summaries have accessible names. Buttons delegate to the existing permission-aware Admin navigation. Existing eight KPI controls, priority checks and permission summary remain. A frozen aggregate snapshot avoids module loading races; no additional data request is introduced. Showcase counts are explicitly labeled synthetic.

## Validation

- JavaScript syntax, Pages build, whitespace validation.
- New chart-model tests: scaling, zeros, missing/negative/nonfinite values, accessible labels, Showcase display, no new API/storage/HTML injection, and original navigation delegation.
- Existing six-area Admin registry and marketing consolidation regressions passed.

Live authenticated visual verification has not been performed. No payment or production-data mutation test was performed.

## Rollback

Revert the source commit. No data/provider rollback required.
