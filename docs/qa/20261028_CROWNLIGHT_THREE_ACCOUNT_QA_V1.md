# Crownlight Chart Studio — Three-Account Noncommercial QA
Date: 2026-10-28
Status: Source implementation; Owner-authenticated production provisioning and manual acceptance pending
Project: The Stock Market: From the Ground Up
Supabase: oxihglyfgzywsupnyicb
Cloudflare: stock-market-from-the-ground-up-d1r.pages.dev

## Purpose
Three real member identities allow comparison of Standard, Advanced and Professional Chart Studio engines without provider payments, fabricated founder paid cycles, founder reservations, buyer benefits, premium books or trading signals.

## Owner action required
From a signed-in OWNER session go to Admin > Site Settings > Membership Test Accounts.
Complete the existing Owner password step-up. Enter the requested password in the HTTPS password field and click **Create 3 Chart Studio QA Accounts**. This calls the same-origin Owner-verified endpoint with an exact confirmation phrase. Do not use "Create Test Accounts", which provisions nine identities.

| Engine | Username | Sign-in email | Illustrative public Lab |
| --- | --- | --- | --- |
| STANDARD | Test_Free | stockmarketfromthegroundup+test-free-20261027@gmail.com | F1-C02-L01 |
| ADVANCED | Test_Founding_30 | stockmarketfromthegroundup+test-founding-30-20261027@gmail.com | F2-C01-L01 |
| PROFESSIONAL | Test_Founding_60 | stockmarketfromthegroundup+test-founding-60-20261027@gmail.com | F3-C01-L01 |

## Authorization boundaries
The temporary chart tier is read from Supabase Auth Admin app_metadata and bound to an exact batch, verified email, user UUID, intended plan and fourteen-day expiry. No client-provided membership label is trusted. Any missing or expired QA claim falls back to ordinary membership evaluation. Restricted/deleted/showcase accounts are denied by the existing member access contract.
This chart entitlement grants no paid Labs, founder number, commerce, market data, journal limits, Sparks, historical OHLCV license or graded outcomes.
The three sample Labs are public samples; chart engine selection occurs in simulator.html and requires sign-in.

## Acceptance requirements
Actual Owner invocation, authentication with all three distinct identities, no active paid cycles or founder seats, server responses STANDARD/ADVANCED/PROFESSIONAL, drawing and indicator functionality, Talia Lab linking, private save/restore, user isolation, sign-out scrubbing, desktop/mobile behavior and membership downgrade.
No acceptance should be claimed on the basis of mock CI alone. Do not store passwords or bearer credentials in GitHub, logs, or screenshots.

## Cleanup
Delete the exact QA identities using Supabase Auth Admin after testing; do not delete production members by pattern. Retain nonsecret audit events.
