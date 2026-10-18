/* Private Owner briefing. Import into Functions only; do not place milestone
 * details in public owner-roadmap.html. v0.14.0.61.
 */
export const roadmapOperationalBrief=Object.freeze({
  "version": "0.14.0.61",
  "reviewedOn": "2026-10-18",
  "intro": "All preserved commitments, the latest payment and entitlement evidence, and agreed product work remain under Owner control. Tests and checkmarks do not enable purchases or certify live production.",
  "phases": [
    {
      "status": "Database evidence scoped",
      "title": "Eight-product reference catalog",
      "text": "The Owner-provided Supabase CSV reports eight database catalog records and matching TEST-reference prices. Four membership checkout switches stay locked; this is not a LIVE Stripe account validation."
    },
    {
      "status": "TEST evidence",
      "title": "Stripe isolated shadow acceptance",
      "text": "The GU39 TEST path, signed test event and isolated shadow entitlement have been documented. Shadow access must never be confused with real member access."
    },
    {
      "status": "Disposable SQL acceptance",
      "title": "Membership lifecycle",
      "text": "v0.14.0.60 exercised GU58 membership logic in disposable PostgreSQL 16. Staging webhook-to-real-member access and production installed-SQL validation remain separate."
    },
    {
      "status": "Implemented · Owner QA pending",
      "title": "Owner checklist and private tracking",
      "text": "Role-checked Cloudflare endpoint, delegated evidence, Owner task switches, revision-protected writes and historical trace are available in source. Live signed-in persistence and negative roles need acceptance."
    },
    {
      "status": "Blocked · production gate",
      "title": "LIVE payment clearance",
      "text": "Independently verify LIVE Stripe catalog, checkout flags, signed webhooks, cancellation, disputes, tax disclosures and real membership access. LIVE checkout must stay disabled."
    },
    {
      "status": "Remaining work",
      "title": "Education and sitewide operations",
      "text": "Complete historical charts, professionally reviewed rubrics, retrieval-grounded AI Tutor, licensed replay data, journal, community notifications, accessibility, backups and Grant Web Solutions scope."
    }
  ],
  "priorities": [
    {
      "title": "Release parity",
      "description": "Confirm the actual GitHub build SHA, deployed Cloudflare manifest, installed Supabase schema, rollback plan and all Owner-account boundaries."
    },
    {
      "title": "Supabase security",
      "description": "Complete read-only preflight and independently verify RLS, exposed grants, Owner/ADMIN/MODERATOR/TEST/SHOWCASE restrictions, session expiry and audit logs."
    },
    {
      "title": "Single integrated payment control",
      "description": "Retain the mutually exclusive TEST/LIVE switch and Run Complete Payment Review — No Charge. Never bypass Owner checkout locks."
    },
    {
      "title": "Stripe-to-real-member staging",
      "description": "Verify eight price/product bindings, recurring renewals, cancellations, dunning, Lifetime, refunds, disputes and idempotent entitlement decisions in a separate isolated environment."
    },
    {
      "title": "Learning and recorded trade accuracy",
      "description": "Protect 419 catalog IDs, 94 original Foundations Labs, rubric provenance, historical market data rights, simulator execution and private journal accuracy."
    },
    {
      "title": "Market Commons and administration",
      "description": "Verify moderated posting, reporting policy, scoped notifications, approved admin mutations, page revisioning and safeguards with real role tests."
    },
    {
      "title": "Publishing and GWS",
      "description": "Preserve KDP Select digital exclusivity, book keys/companion rights, signed-print fulfillment, optional print channels, and client tenant isolation before publication."
    },
    {
      "title": "Launch readiness",
      "description": "Perform end-to-end acceptance only after source construction: security, accessibility, recovery, monitoring, legal/tax/privacy review and explicit Owner release signoff."
    }
  ],
  "scopeNote": "This brief is delivered ONLY by the Owner-authenticated API. It is private project planning information, not customer-facing copy, and does not confer authority to deploy or charge.",
  "auditStatus": "Audit logging is best-effort in the current schema; true atomic task+audit transactions require a separately reviewed Supabase change."
});
