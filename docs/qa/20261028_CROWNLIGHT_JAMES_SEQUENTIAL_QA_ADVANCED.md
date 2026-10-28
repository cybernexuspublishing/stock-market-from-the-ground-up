# Crownlight Chart Studio — Sequential QA Account Transition
Project: The Stock Market: From the Ground Up
Document ID: SMFGU-CHART-QA-ADV-20261028
Filename: 20261028_CROWNLIGHT_JAMES_SEQUENTIAL_QA_ADVANCED.md
Type: Markdown
Version: 1.0
Status: Source implementation and database grant require CI and deployment verification
Date: October 28, 2026
Google Drive: Not created; GitHub is the source of record
Dependencies: existing James_Test member identity, Cloudflare Pages production, Supabase RLS and authorized service role
Purpose: Permit the existing James_Test account to test Advanced charts next, without creating new logins or paid entitlements.

## Owner test progression
- Standard: user reported tested on October 28, 2026. It is a Free feature and cannot be removed from Free membership.
- Advanced: noncommercial, chart-only, seven-day grant. Standard remains accessible. No Founding 600 membership is created.
- Professional: Not granted. When Advanced testing is confirmed, update the same QA grant's tier rather than assigning a paid plan. Revoke after testing.

## Implementation
Backend checks `crownlight_chart_qa_grants_v1` only after signed-in member eligibility. The table has no client policies, and only the service role has SELECT. It enforces a 14-day maximum, scope restriction, and revocation.
This grants no paid learning modes, grading, books, Market Tutor, Sparks, store discounts, market data rights, trading orders, or live checkout.

## Test links
Advanced chart engine: https://stock-market-from-the-ground-up-d1r.pages.dev/simulator.html
Guided sample Lab: https://stock-market-from-the-ground-up-d1r.pages.dev/lab-player.html?lab=F2-C01-L01

## Verification
The API must respond `tier: ADVANCED`, `allowed: [STANDARD,ADVANCED]` for James_Test and `PROFESSIONAL` must be unavailable. After revocation or expiry it must return Standard. CI fixtures are not proof of member-browser login. No password or JWT is recorded in this file.
