# Legal & Transparency Release Manifest

Document ID: SMFGU-LEGAL-EXT-20261027-001
Project: The Stock Market: From the Ground Up
Filename: docs/legal/2026-10-27_LEGAL_TRANSPARENCY_V22_RELEASE.md
File type: Markdown
Version: 1.0
Prepared: October 27, 2026 (America/Chicago)
Status: Engineering source release; live database, deployment, counsel and checkout acceptance must be confirmed separately
Google Drive location: Not assigned; authoritative source is GitHub main
Google Drive document ID: Not assigned; create a new Drive file only if archival synchronization is authorized
Purpose: Add five disclosure categories, a policy directory and prospective updates to Terms and Refunds.
Dependencies: GitHub main, Cloudflare Pages production, Supabase legal_documents and private history, actual processor/merchant relationships, consent records, applicable consumer law and licensed legal review.

## Changes
- Terms and Refunds: published v2.1 -> proposed v2.2, preserving the existing owner-approved $500 *discretionary* refund standard and mandatory exceptions.
- Five new v1.0 policies: EDITORIAL, AFFILIATE, RELATED_ENTITIES, DMCA, AI_USE.
- Existing Subscription, Privacy, Cookies, Disclaimer, Copyright, Advertising, Accessibility and product-specific documents remain unchanged.
- Main entry point: /legal.html; per-policy pages use the established legal-platform.js Supabase renderer.
- SQL release: supabase/migrations/20261027_legal_transparency_terms_refunds_v22.sql.
- Private history must archive prior v2.1 Terms/Refunds before updating; live payment settings and product prices remain untouched.

## Controlling constraints
Latest published Founder rules describe Starter 14-day, Standard 30-day and Extended 60-day; this release does not change plans or resolve owner-approval conflicts in price/benefit records. thinkorswim/Charles Schwab are descriptive independent third-party references, not presumed affiliates. No unverified corporate registration or DMCA agent registration is asserted. This document neither certifies legal compliance nor authorizes LIVE payments.

## Acceptance checks
1. Verify new records, versions, policy routes and archive snapshots.
2. Verify all new pages render anonymously and while signed in after production deployment.
3. Confirm footer link and related-policy navigation, keyboard access and mobile layout.
4. Confirm existing subscriber entitlements/terms and all other policy records are unchanged.
5. Complete counsel review, business-name verification, privacy data map and versioned checkout-assent acceptance before a separate LIVE sales decision.

## Revision history
| Version | Date | Summary |
| --- | --- | --- |
| 1.0 | 2026-10-27 | Initial coordinated transparency and terms extension |

Footer: SMFGU-LEGAL-EXT-20261027-001 • v1.0 • Engineering release; independent legal/deployment verification required.
