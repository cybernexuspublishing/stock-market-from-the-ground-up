# Marketing & Social Media — zero-cost Owner social milestone

Date: 2026-10-26
Branch: main
Scope: Existing Admin Control Center → Commerce → Marketing & Social Media → Social media management.

## Existing systems preserved
- `admin-advertising.html` and `functions/api/ad-sales.js` remain the existing advertising authority.
- `assets/js/admin-marketing-workspace.js` mounts the social editor after the existing Owner advertising gate.
- The existing six-area Admin shell, payments, campaigns, rate cards and Stripe Sandbox were not changed by this social feature.

## Implemented in this milestone
- Owner-only Cloudflare Pages function: `functions/api/admin-social.js`.
- Browser editor: `assets/js/admin-social-zero-cost.js`; stylesheet `assets/css/admin-social-zero-cost.css`.
- Private posts, community records and transactional audit: migrations `v0.14.0.276_social_marketing_owner_only.sql` and forward repair `v0.14.0.277_social_audit_rowtype_repair.sql`.
- Standard X posts: draft, approved, internally planned, archived, and manually recorded external URL.
- Copy text and open X's standard compose intent: no X API request, no payment and no implied publication.
- Community directory: URL, name, membership status, policy, notes, and link to native X joining workflow.
- All database reads and mutations pass through a backend that validates a live Supabase user, active OWNER role, member account type, and account restrictions.
- Frontend has no browser/local storage of social records; content is handled using DOM text nodes, not dynamic innerHTML.
- New GitHub workflow: `.github/workflows/social-marketing-owner.yml`.
- New regression suite: `tests/test_admin_social_zero_cost.mjs`.

## Database acceptance evidence
- Both migrations applied successfully to the existing Supabase project `oxihglyfgzywsupnyicb`.
- Verified RLS enabled on posts, communities, audit.
- Verified both anon and authenticated database roles have **no SELECT grants** on all three tables; service_role has SELECT.
- A reversible SQL transaction inserting one post and one community identified a rowtype mismatch in the original shared audit trigger. The test transaction failed and rolled back.
- Forward migration 277 repaired the trigger using PL/pgSQL IF/ELSIF type-specific branches.
- Repeated reversible transaction verified both transactional audit triggers successfully. Explicit ROLLBACK left zero social posts, community records, and audit records.
- No ad, payment, price, checkout, member entitlement, or LIVE Stripe operation was activated.

## Acceptance and release restrictions
- GitHub Actions may be queued: do not claim those tests passed until the actual run reports success.
- Live Owner-browser acceptance of the new social editor and API remains outstanding.
- The backend intentionally provides no OAuth token, no X posting API call, and no automated X community joining.
- `manual_recorded` means an Owner entered a post URL. It is **not** provider-verified publication.
- `planned` means an internal calendar date. It is **not** automatic scheduling on X.
- Community `joined` status is Owner-entered and should never be represented as API-verified.
- Only the Owner can enter records; the public website does not expose social records.
- This is the first functional increment, not certification of the full Social Media Management system.

## Next engineering acceptance
1. Verify the dedicated GitHub workflow completes successfully.
2. Verify Cloudflare deployed the current source commit.
3. Owner-authenticated browser test of the marketing social tab, saving/reloading a draft, recording a manual X permalink and editing community membership.
4. Non-Owner and anonymous endpoint rejection against the deployed API.
5. Build and test richer calendar, campaign attribution, editorial approvals, provider adapters, and analytics without paid external API calls.
