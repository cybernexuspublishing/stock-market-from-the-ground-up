# Legal Footer Navigation — Consolidation and Sitewide Correction
Document ID: SMFGU-WEB-FOOTER-LEGAL-20261027-001
Project: The Stock Market: From the Ground Up
Filename: docs/releases/2026-10-27_LEGAL_FOOTER_NAVIGATION_CONSOLIDATION.md
File type: Markdown
Version: 1.0
Prepared: October 27, 2026 (America/Chicago)
Status: Source correction; deployment and responsive browser acceptance to verify
Google Drive location: Not assigned; GitHub main is source of truth
Google Drive document ID: Not assigned; new Google Drive archive record if separately authorized
Purpose: Ensure every canonical footer exposes the policy hub and relevant legal disclosures without detached or overwritten navigation.
Dependencies: GitHub main, Cloudflare Pages, site.js, navigation.js, frontend-freeze.js, sitewide-runtime.js, current published legal documents and policy shells.

## Cause
navigation.js rebuilt a five-column footer that offered only Terms and Privacy; it overwrote a separate Legal & Policies link inserted by site.js. A second footer builder in frontend-freeze.js was inconsistent. sitewide-runtime.js appended four philosophy anchor links beneath the copyright row, producing an unintended detached-looking strip.

## Changes
- Standardize both footer generators to the same seven-column design: Brand, Learn, Platform, Account, Company, Legal and Transparency.
- Add direct links to Terms, Privacy, Refunds, Subscription, Cookies, Disclaimer, DMCA, Editorial, Affiliate, Related Entities, AI, Advertising, Community and Accessibility, plus all policies.
- Retain sign-in-sensitive Account links and use /market-commons.html.
- Preserve a compact sitewide legal-directory fallback only for legacy footer surfaces.
- Replace the detached four-link philosophy strip with a plain-text version of the locked series tagline in the copyright row; place Teaching Philosophy in Learn navigation.
- Responsive layout: 7 columns at wide desktop, 4 at intermediate, 2 at tablets, 1 at narrow screens. Preserve visible focus styles.
- No changes to legal wording, financial terms, entitlements, payment controls or Supabase.

## Acceptance
1. Confirm both scripts produce links to /legal.html and core policies after they run in either order.
2. Confirm no duplicate legal link strip or detached philosophy row.
3. Confirm links render for signed-out and signed-in visitors and update Account links on auth changes.
4. Verify production Page deployment commit, smartphone/tablet/desktop layout, keyboard access and missing-link checks.

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-10-27 | Consolidated footer builder navigation and philosophy presentation |

Footer: SMFGU-WEB-FOOTER-LEGAL-20261027-001 • v1.0 • Source correction; live acceptance pending.
