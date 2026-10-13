# v0.14.0.0 — Security, Reliability, and Launch Gaps (not production certified)

## Implemented local mitigations

1. New Owner-only membership controls separate `active`, `public_visible`, and pause checkout (`checkout_enabled=false`) via a SQL RPC that writes the change and audit record in one transaction; FREE account fallback stays active but may be hidden from marketing. Founding variants are created inactive/invisible/unpurchasable. The legacy `plan_save` mutation is blocked to prevent bypassing the new change controls.
2. Store and membership static plan fallback is suppressed on a failed real catalog response. Direct external membership/tool checkout links are not rendered during this OFF launch. Existing backend checkout endpoints still require `ENABLE_PAID_CHECKOUT=true` and item/provider flags. Old saved third-party checkout URLs must also be cancelled at the provider if necessary.
3. Sensitive book-authored 94 Lab bodies are removed from public `data/interactive-labs.json`, moved into an access-controlled Supabase table through a private Owner SQL artifact. The public `data/interactive-lab-index.json` contains IDs and high-level catalog metadata only. The first reviewed answer key is a separate private SQL seed not included in GitHub.
4. `member-tool-access` verifies the caller's Supabase identity, production member status, absence of suspension/restriction and server-side entitlement. Simulator and provider bars use this check; new reviewed grades use private, server-only SQL RPCs. No Showcase real entitlements are enabled.
5. Graded attempts pin reviewed rubric versions, reuse unfinished sessions, lock the row during each answer, require matching `expectedStep`, and return answer keys only after finalization (Guided mode provides the explanation after each locked answer). User-supplied scores are not trusted by the new engine.
6. `lab_progress.score` no longer copies legacy process-completeness percent, which is not a correctness score. The existing legacy `lab_attempts.process_score` remains correctly labeled as completion/process documentation rather than independently graded mastery.
7. Community report creation uses an advisory-locked SQL RPC to enforce duplicate report and per-user/day limits atomically. Owner/moderator UI remains subject to its existing permissions.
8. New GWS client drafts have service-role-only storage and authenticated OWNER-only API. **Client publishing and client-site hosting are disabled.**

## Unresolved — must not be represented as fully operational

- Full paid access audit across *every* legacy endpoint, browser CSV simulator and all resource types; browser-delivered JavaScript/CSV can be copied. Provider/API/private content must be protected on the server. A second complete external penetration review is still required.
- Every relevant account-status and commercial flow must honor actual suspension/retention/refund/legal policies, not just the new premium routes.
- Existing payment webhook idempotency, provider-side hidden product/checkout URLs, failed payment/grace handling, renewals, chargebacks, taxes and KDP Select format exclusivity require sandbox and provider integration tests before checkout is switched on.
- New reviewed grading covers **one** authored candle calculation exercise; 418 other catalog entries need individual answer/rubric reviews where gradable. There is no licensed historical event/tape/Level II validation and no trustworthy automatic historical trade-outcome branching yet.
- Legacy Lab Player Guided content and client CSV replay are not cryptographically secure no-look-ahead assessment paths; never label their displayed steps a hidden graded historical exam. Browser-interactive simulation results are not provider-verified fills.
- Graded attempt outcomes are not yet merged transactionally into the canonical 30-skill evidence/competency graph. Additional scoring modes (qualitative rubrics, partial credit, trade execution) remain necessary.
- Old forum direct writes, spam/abuse limits, moderation appeals, rate-limit store, data rights and Row Level Security need production policy review; the new reporting RPC does not secure every forum operation.
- Grant Web Solutions does not yet have isolated per-client tenant roles, domain provisioning, object/media storage, versioned releases, billing/CRM, safe previews or publishing rollback. Do not onboard real client-site hosting with this workspace.
- Admin automation runner, backup verification/restore drills, email deliverability, communication consent, disaster recovery RPO/RTO and financial legal reviews are incomplete.
- The original private encryption keys and missing older SQL migrations must be reconciled before live test-account credential recovery or future database changes.

## Production gates

Run actual Cloudflare Pages preview and Supabase integration tests after the manual SQL preflight/migration; verify user/OWNER/MODERATOR/SHOWCASE/TEST authorization and failures under concurrent requests. Keep paid checkout, direct digital KDP-Select sales, QR production activation and mandatory staff MFA/Turnstile OFF unless independently approved. Keep the current working site commit for rollback.
