# Membership Plan QA Accounts — Creation and Cleanup Register
Date: October 27, 2026
Project: The Stock Market: From the Ground Up
Supabase: oxihglyfgzywsupnyicb (correct production project)
Batch identifier: SMFGU-MEMBERSHIP-9-20261027

## Scope: nine active membership plans
| Username | Intended plan | Sign-in email |
| --- | --- | --- |
| Test_Free | FREE | stockmarketfromthegroundup+test-free-20261027@gmail.com |
| Test_Pick_What_You_Want | PICK_WHAT_YOU_WANT | stockmarketfromthegroundup+test-pick-what-you-want-20261027@gmail.com |
| Test_Full_Monthly | FULL_MONTHLY | stockmarketfromthegroundup+test-full-monthly-20261027@gmail.com |
| Test_Historical_Replay | ONDEMAND_MONTHLY | stockmarketfromthegroundup+test-historical-replay-20261027@gmail.com |
| Test_Annual | FULL_ANNUAL | stockmarketfromthegroundup+test-annual-20261027@gmail.com |
| Test_Lifetime | LIFETIME | stockmarketfromthegroundup+test-lifetime-20261027@gmail.com |
| Test_Founding_14 | FOUNDING_14 | stockmarketfromthegroundup+test-founding-14-20261027@gmail.com |
| Test_Founding_30 | FOUNDING_30 | stockmarketfromthegroundup+test-founding-30-20261027@gmail.com |
| Test_Founding_60 | FOUNDING_60 | stockmarketfromthegroundup+test-founding-60-20261027@gmail.com |

Inactive legacy FOUNDING_MONTHLY and FOUNDING_ANNUAL are deliberately excluded.

## Provisioning status
- GitHub `main` provides `/api/owner-membership-qa-users-v1` and the Admin Site Settings membership test account creator.
- User inputs the requested test password once through the Owner-only HTTPS Admin form; password is not committed or shown in logs/metadata.
- Server requires authenticated OWNER, recent password step-up, same-origin request, and exact one-action confirmation.
- Supabase Auth Admin creates nine email-confirmed noncommercial QA identities, with profile usernames and `app_metadata.smfgu_qa_only=true`, `qa_batch`, and intended plan identifiers.
- The account creator does NOT grant paid plan entitlements, fabricate signed payment events, consume Founding 600 seats, or disable CAPTCHA.
- On October 27, 2026, at the latest database check: **0/9 identities exist**. Code-level CI passed, while actual Owner Admin invocation is still required. Do not mark identities created until a fresh `auth.users` and `profiles` join confirms all nine.
- An attempted temporary Edge provisioning path was blocked before invocation. It was retired as deny-all, JWT verification restored, and the unused pg_net/nonce table removed.

## Cleanup after acceptance
- Confirm no active provider subscriptions, LIVE orders, refunds, disputes, Founding reservations, active entitlement grants, Journal records or other account data require retention.
- Revoke Auth sessions, cancel/refund any TEST-provider fixtures as appropriate, clear QA-only grants and Founding seat reservations, then remove only matching QA batch identities using Supabase Auth Admin deleteUser, not raw SQL and not broad username patterns.
- Retain audit entries and no-secret verification record. Do not delete production customer data or other legacy QA accounts.
- No passwords, API keys, or signing secrets are present in this document.