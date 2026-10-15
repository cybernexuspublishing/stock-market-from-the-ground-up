# v0.14.0.21 — Backend Phase 2: Market Commons notification integration and subscriptions

| Control | Value |
| --- | --- |
| Product | The Stock Market: From the Ground Up |
| Company | Cyber Nexus |
| Controlling source baseline | GitHub `main` `759aabd8cf2bc328235e822906893d5cb075fba5` (v0.14.0.20) |
| Delivery | Direct-upload source overlay ZIP: full nested file replacements, NO patch scripts |
| Date | October 14, 2026 — America/Chicago |
| Database status supplied by Owner | v0.14.0.20 eight installation/permission checks `true` |
| Status | **Development release candidate; NOT production acceptance** |
| Migration execution | None performed during packaging |
| Owner authorization for v0.14.0.21 SQL | Not recorded; production SQL must NOT be auto-executed |
| File placement | Repository overlay; source docs/SQL stay out of public/ build output |
| Project Drive location | Not specified |

## Concrete defects identified in current source

**B21-001 — P0, nonfunctional notification Settings controls.**
`assets/js/production-completion.js`, `memberSettings()`, renders three checkbox toggles for `Notifications`; no handlers persist those toggles. The existing `frontend-complete.js` owns the site's real Alerts center. The v0.14.0.21 frontend integration replaces these misleading checked placeholders only while the Notification subtab is active, shows the authoritative server state, handles RPC failures without false success, and reverts on failed save. Existing Alerts center and identity settings remain intact. No unimplemented email/release opt-outs are shown as active.

**B21-002 — P0, missing canonical subscription write contract.**
`commons_topic_subscriptions` exists, but old `forum-interactions.js` depends on `gu_forum_toggle_subscription(text,bigint)` in **optional, review-gated** v0.14.0.17 advanced interactions migration, whose production installation was not verified. Thus an installed v0.14.0.20 notification trigger does not guarantee members can subscribe. New additive v0.14.0.21 RPCs implement explicit SET / GET and do not depend on the optional v0.14.0.17 RPC. The new companion API accepts only a caller's JWT and explicit boolean state, not a user_id from the browser. No auto-DML in GitHub packaging.

**B21-003 — P1, race-prone toggle interface.** The older optional RPC is a state flip; retries or two tabs can revert user intention. `gu_commons_subscription_set_v01421` is idempotent (`ON CONFLICT DO NOTHING` for subscribe, actor-scoped DELETE for unsubscribe). Unsubscribing is allowed even after a discussion becomes unavailable. Concurrent subscription calls still need live two-session acceptance.

**B21-004 — P1, privacy/entitlement mismatch.** v0.14.0.20 publishes in-app replies only for *ungated* forums (`book_code IS NULL AND tool_code IS NULL`). v0.14.0.21 refuses to follow gated, inactive, or unpublished topics, matching that delivery scope. It does not claim support for gated book/course alerts, @mention delivery or email. It does not expose member emails or private posts.

**B21-005 — P1, duplicate controls.** Optional advanced interaction toolbar may show Subscribe alongside new control. Scoped CSS hides only the duplicate button while the v0.14.0.21 follow control exists. Other toolbar functionality stays intact. Backwards compatibility must be checked if the v0.14.0.17 advanced migration is later installed.

**B21-006 — P1, service-worker public cache build drift.** Cache and shared route-policy version are moved to v0.14.0.21; existing protected routes and all API requests still bypass CacheStorage. `functions/_middleware.js` retains older injected build metadata and `PROJECT_MANIFEST.json` retains 0.14.0.16; this remaining metadata debt is **not** falsely treated as reconciled. Cloudflare deploy SHA cannot be derived from browser version labels.

## Implemented runtime files

- `functions/api/commons-subscriptions-v01421.js`: authenticated GET/POST contract, input validation, explicit caller-bound PostgREST RPC, no service secret, no-store; errors fail closed.
- `supabase/migrations/v0.14.0.21_COMMONS_SUBSCRIPTIONS_REVIEW_REQUIRED.sql`: two uniquely named functions, strict active-member/account checks, eligibility parity with v0.14.0.20, idempotent subscribe/unsubscribe, privileges restricted to `authenticated`, no table creation, no existing-RPC replacement, no changes to old notices.
- `assets/js/member-notification-preferences-v01421.js`: backend-backed notification Settings control, true GET/POST persistence and failure rollback. Reuses existing Alerts center; not an independent second Alerts widget.
- `assets/js/commons-follow-v01421.js`: load, follow, unfollow with truthful status and no duplicate RPC on a single click.
- `assets/js/site.js`, `config.js`, `assets/js/route-policy.js`, `sw.js`, `assets/css/backend-community-v01421.css`: additive integration/versioned runtime while preserving approved content, site navigation, store checkout disabled states, KDP Select eBook restrictions and existing component wiring.
- `supabase/admin/v0.14.0.21_BACKEND_PREFLIGHT_READ_ONLY.sql` and `...POSTFLIGHT_READ_ONLY.sql`: inspect object and privilege state with no changes.

## Deployment boundary — do not confuse stages

1. Extract ZIP over the SAME GitHub repository paths; preserve all unrelated files. Commit using existing versioned deployment process.
2. GitHub Actions run source/API and Pages build-boundary tests. They do **not** execute SQL and are not a substitute for integration tests.
3. Supabase v0.14.0.20 is known to have passed 8/8 installation checks supplied by Owner; the new v0.14.0.21 RPCs are **not installed by uploading to GitHub**.
4. Run supplied v0.14.0.21 *read-only* preflight against the correct staging Supabase project. Stage-review the `*REVIEW_REQUIRED.sql` script before any DDL, audit database owner/privilege assumptions, and verify absence of naming collisions.
5. Only after staging acceptance and explicit Owner production authorization should the reviewed v0.14.0.21 migration be considered for production. Run postflight; expected true: get_installed, set_installed, auth_can_get, auth_can_set; expected false: anon_can_get, anon_can_set.
6. Verify in Cloudflare preview with two eligible signed-in test members: A follows unrestricted topic, B publishes reply, A sees notification in existing Alerts center; A disables preferences and B replies again after cooldown, no new alert; self reply, gated forum, suspended/SHOWCASE accounts, two tabs/concurrency, locked/deleted topics, and unsubscribing must behave securely. **Avoid testing with real customer accounts.**
7. Compare Cloudflare deployed Git SHA and Pages build output with GitHub commit. Verify private API responses include `no-store` and auth failures do not leak data. If rollout is not yet authorized, new UI must fail closed rather than claim success.

## Tests actually executed for this ZIP

- `python tests/test_v014021_backend_contracts.py` — Node parse, structural and security requirements (source-only).
- `node tests/test_v014021_subscription_api.mjs` — isolated mocked identity + subscription RPC positive/negative cases.
- `python tests/test_v014021_browser.py` — offline isolated Chromium DOM exercise (Settings fetch/update/reopen, follow/unfollow).
- ZIP CRC, nested path and source SHA256 file validation.

**No live Supabase credentials, private customer data, payment-provider calls, SQL writes or browser interactions with production have been used in these tests.**

## Sitewide backend readiness and blockers

The backend is broader than Market Commons. Identity/roles/RLS, Admin Owner controls, reporting policy installation, account lifecycle, moderation and ownership workflows, per-member privacy, memberships, checkout/webhooks/refunds, KDP format restrictions, 419 private historical Labs and answer provenance, supervised no-lookahead replay, simulator data entitlements, journal/analytics, AI tutor rate and content limits, Grant Web Solutions tenant/domain segregation, and observability all remain scoped into the continuing work. See `docs/BACKEND_SITEWIDE_FINDINGS_v0.14.0.21.csv` for specific obligations and classification. A source module's existence is not proof of live business capability.
