# Membership Product Artwork and Verified Forum/Profile Badges — V1
Project: The Stock Market: From the Ground Up
Version: 1.0 | Date: 2026-10-30
Status: Owner-approved artwork; production acceptance pending
Repository: cybernexuspublishing/stock-market-from-the-ground-up (main)
Files: assets/images/memberships/*.webp, functions/api/member-badges.js, assets/js/membership-badges-v1.js

## Scope
Free, Founding 14-Day, Founding 30-Day, Founding 60-Day product images and distinct forum emblems. Store founder and Free cards and public catalog visuals; forum-topic, Market Commons, Founders Commons, Dashboard profile.

## Controls
Read-only verification against live user_plan_grants, site_subscriptions, non-revoked gu_founder_members_v014173 and active profiles. Paid founder badge requires current entitlement and Founder ledger. No commercial or entitlement changes. No new customer data writes.

## Acceptance
Verify all eight WebP URLs, Store merchandising, badge display across four membership cases, paid badge removal on expiry/revocation, session invalidity, no founder badge for QA or staff overrides, CI checks, Cloudflare SHA.
