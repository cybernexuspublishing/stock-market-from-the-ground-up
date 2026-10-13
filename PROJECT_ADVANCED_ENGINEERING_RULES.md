# Project-Wide Advanced Engineering & Product Standards

Status: OWNER RULE — applies to the entire Stock Market: From the Ground Up platform unless the owner explicitly reopens or overrides a rule.

## Core standard
Build each feature to the highest practical professional standard supported by the current free/owned infrastructure. Advanced means secure, maintainable, testable, accessible, fast, data-aware, and genuinely useful — not complexity for its own sake. If a required capability normally costs money, first evaluate whether an original implementation or a lawful free/open source component can meet the requirement. Do not compromise data licensing, payment security, privacy, accessibility, or user safety merely to avoid a vendor cost.

## Mandatory professional viewpoints
Every material feature is reviewed from the relevant combination of: product architect; technical program manager; frontend engineer; backend/API engineer; database architect; cloud/DevOps engineer; cybersecurity engineer; privacy engineer; accessibility specialist; UX/UI designer; UX researcher; QA/release engineer; observability/SRE engineer; data engineer; market-data engineer; quantitative analyst; professional/self-directed trader; execution/risk specialist; market-microstructure/tape specialist; instructional designer; curriculum architect; assessment designer; adult-learning specialist; publishing/KDP manager; payments/commerce specialist; ad-operations specialist; moderation/community safety specialist; customer-support specialist; legal/compliance/licensing reviewer; and analytics/product-growth specialist.

## Mandatory non-professional viewpoints
Also review from the perspective of: absolute beginner; book-only reader; paper trader; first live trader; experienced independent trader; user recovering from repeated trading mistakes; mobile user; low-bandwidth user; keyboard-only user; screen-reader user; Free member; Pick What You Want member; Monthly member; Annual member; Lifetime member; moderator; community helper; advertiser; and beta tester.

## Architecture rules
1. One account identity and one authoritative entitlement engine. Membership, book access, tool passes, and staff authority remain separate concepts.
2. Routine operations belong in the Admin Control Center, not source-code edits. Add/disable/archive books, labs, tools, posts, ads, plans, navigation, and member access from Admin wherever possible.
3. Prefer disable/archive over destructive deletion when historical orders, analytics, entitlements, URLs, or audit records may depend on the object.
4. Secrets never enter browser JavaScript, GitHub, public tables, logs, or screenshots. Least privilege and server-side authorization are mandatory.
5. Important administrative actions are auditable. OWNER-only controls protect destructive/security-sensitive operations.
6. Responsive design, keyboard navigation, reduced-motion support, semantic HTML, clear focus states, and WCAG 2.2 AA are release requirements.
7. Performance budgets matter: avoid unnecessarily heavy frameworks, duplicated datasets, blocking scripts, and wasteful API calls.
8. Data-source provenance, license/redistribution rights, timestamps, session scope, corporate actions, and RAW/adjusted state must be explicit for market-data teaching.
9. No-look-ahead/hindsight controls must be preserved in replay, Labs, assessments, and journal review.
10. The website is companion software, not a browser copy of KDP Select books. Teach, practice, assess, simulate, analyze, and reference — do not reproduce complete enrolled digital books.
11. Advertising must be clearly labeled, frequency-controlled, independently managed, and excluded from decision-critical trading controls and Tutor answers. Ads never influence educational scoring or recommendations.
12. Payment architecture may be built in-house around checkout, entitlements, receipts, subscriptions, billing state, webhooks, and account management; raw card processing/acquiring is not reinvented. Use a PCI-compliant processor/Merchant of Record for card/payment rails.
13. Every release gets schema-compatibility review, syntax/static QA, regression tests for auth/navigation/RBAC, and a rollback-aware migration plan.
14. User-facing labels remain consistent site-wide. Current membership labels: Free Membership, Pick What You Want Membership, Monthly Membership, Annual Membership, Lifetime Membership.
15. Build extensible interfaces for future equities/options and future data providers rather than hard-coding one vendor.


# v0.13 Project-Wide Engineering Rule — Maximum Practical Capability

For every website, platform, simulator, journal, Tutor, market-data, commerce, forum, admin, and publishing-system decision, use the strongest practical architecture available within the project constraints. "Advanced" means secure, maintainable, accessible, testable, modular, data-consistent, auditable, responsive, and resilient — not unnecessary complexity.

Before implementing a material feature, evaluate it through all applicable roles: product architect, frontend engineer, backend engineer, database architect, cybersecurity engineer, privacy engineer, accessibility specialist, UX researcher, QA/release engineer, cloud/DevOps engineer, payment/commerce engineer, ad-operations specialist, community/moderation specialist, market-data engineer, quantitative analyst, trader/execution/risk specialist, instructional designer, curriculum architect, publishing/KDP manager, compliance reviewer, customer-support operator, and the relevant non-professional user viewpoints (beginner, paper trader, first live trader, experienced self-directed trader, mobile user, accessibility user, Free member, Pick What You Want member, Monthly member, Annual member, Lifetime member, moderator, advertiser, beta tester).

When a secure mature external rail is required (for example card acquiring or licensed market data), the platform should own the first-party user experience, data model, access logic, analytics, and administration while delegating only the regulated or licensed rail. Never weaken security or compliance merely to say a component was built in-house.


## v0.13.1 permanent frontend completion rule

The project MUST treat the frontend as a production application, not a collection of static pages. New work must reuse the design system and interaction architecture rather than introducing page-specific one-off styling.

Mandatory review perspectives include, without limit: principal/staff software architecture, frontend engineering, backend engineering, database architecture, security engineering, privacy engineering, accessibility, UX research, visual/product design, design systems, responsive/mobile design, performance engineering, cloud/DevOps, QA/release engineering, observability, payments, fraud/abuse prevention, subscription commerce, advertising operations, publishing/KDP operations, market-data engineering/licensing, quantitative analysis, trading/risk/execution/microstructure, instructional design, curriculum architecture, learning analytics, moderation/community operations, customer support, legal/compliance review, marketing/communications, analytics, and business operations.

The same work must be challenged from non-professional perspectives: first-time visitor, absolute beginner, paper trader, first live trader, experienced self-directed trader, mobile-only member, keyboard-only user, screen-reader user, low-vision user, member with reduced-motion needs, Free member, Pick What You Want member, Monthly member, Annual member, Lifetime member, Book Companion user, trial user, moderator, support staff, content editor, advertiser, beta tester, and future staff member learning the system for the first time.

Advanced means: secure, semantically correct, accessible, responsive, composable, data-driven, testable, observable, fault-tolerant, maintainable, performant, auditable, and understandable. Complexity must earn its place.

## v0.13.2 locked production-completion rules

16. **Correct technology for the workload.** Programming languages, frameworks, protocols, databases, and infrastructure are selected according to the technical requirements of the workload—not because they are easiest, most familiar, or already present. Adding technologies without a demonstrable engineering advantage is equally prohibited. TypeScript is preferred for complex browser/edge application logic; PostgreSQL/PLpgSQL for relational integrity and database-side operations; Python for quantitative/data-engineering/research workloads; Web Workers/WASM/Rust only when performance or isolation requirements justify them; mature regulated/licensed external rails remain appropriate for card acquiring and licensed market data.
17. **Admin-first operations.** All ordinary site administration, configuration, publishing, account management, memberships, Tool Passes, book/library access, Store/catalog state, Labs, forum structure/moderation, advertising, legal/policy publication, navigation, support, announcements, feature controls, provider configuration, QA/test accounts, and acceptance testing must be operable through the Admin Control Center. Manual database access is break-glass engineering only: migrations, disaster recovery, or incident remediation.
18. **Destructive account confirmation.** Every member-initiated or staff-initiated final account-deletion flow requires the exact confirmation phrase `DELETE ACCOUNT`. The action remains disabled/cancelled when the phrase does not match exactly. Real customer deletion preserves legally/operationally required transaction, fraud, tax, dispute, security, and audit records in minimized form where appropriate; disposable test accounts may be deeply purged.
19. **Test accounts are explicit QA objects.** OWNER and authorized Admin staff can create, configure, inspect, and delete individual disposable test accounts. Test accounts are clearly marked `TEST ACCOUNT`; their membership, tools, book access, dates, notification states, and other QA states are configurable without database work.
20. **Username-searchable member audit.** Authorized staff can search member activity/change history by username and distinguish member, staff, system automation, payment/webhook, and security actors. Normal members see only their own simplified activity history.
21. **Dashboard is the member control center.** A separate general-purpose Profile must not duplicate Dashboard functionality. Community identity may expose username and an optional member-chosen name only where useful. Dashboard tabs own Membership & Access, My Books, Purchases & Billing, Settings, Activity, Help/Documentation, and Support.
22. **Feature entitlements are organized.** Member `Your Features` is grouped by Learning, Trade Labs, and Research. Included features show ✓ and unavailable features show ✕. Only the member access view links included features directly to tools; public membership-comparison feature labels remain non-interactive.
23. **First-party support queue.** Members can create and track support tickets. Authorized staff have a searchable, assignable, auditable Admin queue with public replies, internal notes, priorities, statuses, escalation, and account linkage.
24. **Secure member credential management.** Member-supplied API/token credentials are entered only through Dashboard → Settings → Connections & API Keys, transported over HTTPS, validated server-side, encrypted server-side, and associated with the member UUID. Plaintext secrets are never stored in public profile records, logs, URLs, analytics, screenshots, or returned after persistence. Full Show/Hide is supported while entering/replacing a secret; after Save, only a masked fingerprint/last characters are shown with Test, Replace, and Remove controls.
25. **18+ account eligibility.** Account creation and purchasing are restricted to people age 18 or older. Create Account requires first name, last name, and DOB displayed as DD/MM/YYYY. Eligibility is enforced server-side before account creation using exact birthday-aware age calculation. Full DOB is restricted/private account data and must not appear in public profiles, Market Commons, analytics, URLs, ordinary browser APIs, or moderator views.
26. **Real name privacy.** Username remains the primary public/community identity. First/last name are private account/support/billing information by default and are not publicly displayed unless the member deliberately opts into a future supported disclosure setting.
27. **No production filler.** Customer-visible production pages must not contain placeholder policies, fake metrics, pending developer URLs, fake testimonials, unfinished developer notes, or controls that appear functional when they are not. Incomplete functions are hidden or deliberately labeled Coming Soon/Beta/Unavailable.
28. **Dependency-aware safeguards.** Business rules such as KDP Select versus direct digital delivery are represented as explicit dependencies. Administrators control the underlying business state, but the UI/server reject contradictory configurations rather than relying on memory.

# v0.13.3 Frontend Freeze and Lab Provenance Rules

1. After v0.13.3 passes the live Acceptance Console, the foundational frontend shell is frozen. Future frontend changes must be driven by a verified defect, a backend capability that needs an interface, accessibility/security requirements, or a newly approved product feature. Do not restart broad shell redesigns without explicit owner approval.
2. The existing 94 Foundations Historical Lab IDs are immutable curriculum identifiers. They must never be renumbered, repurposed, silently replaced, or reassigned to a different historical example.
3. New Lab families use separate namespaces: `DT-` for Day Trading, `TAPE-` for Reading the Tape, and `SITE-` for site-exclusive practice. New work must not collide with locked Foundations IDs.
4. Every supplemental Lab must record provenance in metadata: source kind/reference, teaching objective, data requirement, difficulty/mode, and any external source URLs used to verify mechanics.
5. Historical exercises preserve no-look-ahead discipline. The learner must make the decision from information available at the frozen decision point before revealing later bars/outcomes.
6. A historical candle chart must never be represented as a reconstruction of historical Level II, queue state, Time & Sales, hidden liquidity, participant identity, or participant motive. Tape-specific exercises require live, recorded, licensed historical, or explicitly simulated tape/depth evidence.
7. In tape-reading content, separate OBSERVATION from INFERENCE. Never teach hidden participant intent as directly observable fact.
8. Corporate actions, session times, exchange/market mechanics, order behavior, and historical anchors used in Labs must be verified against appropriate source material before publication. Source/feed scope and adjusted-versus-raw state must be explicit when relevant.
9. Market Commons official guides must teach WHAT, WHY, WHEN, WHEN NOT TO RELY, HOW, COMMON FAILURE, and a discussion/application prompt. The Commons remains connected to the full member navigation; it is not an isolated application.
10. Lab Registry organization is by source collection: Foundations Book I, Foundations Book II, Foundations Book III, Day Trading, Reading the Tape, and Site-Exclusive Labs. Search/filter may span collections, but source identity must remain visible.
11. Admin Control Center is the routine operating surface for Lab visibility, official Market Commons guides, books, cover metadata, and other normal content operations. Direct database editing remains a migration/recovery/break-glass engineering path only.
12. Book cover files used by the site must be derived from owner-authorized book artwork and optimized for web delivery. Site display assets do not replace or modify the publication master cover files.
13. KDP publication state and website catalog state remain distinct. Website deployment must never automatically claim that a book has passed KDP review or change KDP Select/direct-digital safeguards.
14. Live acceptance remains mandatory. Static QA can establish structural readiness, but it cannot substitute for browser, authentication, responsive, accessibility, and production-Supabase checks.

## v0.13.4 locked rules — competency, test credentials, showcase
- Competency scores must be evidence-based. Completion alone never creates a mastery score. Process quality and outcome are separate; no-look-ahead controls remain mandatory.
- Skill reporting must expose the evidence behind the score: sample size, sub-scores, trend, critical errors, pass streak, and remediation resources.
- Real member passwords are never viewable by OWNER, ADMIN, support staff, or application code. Only passwords generated specifically for disposable TEST/SHOWCASE accounts may be stored in the dedicated encrypted test credential vault and revealed to OWNER; every reveal/reset is audited.
- SHOWCASE_VIEWER is a server-enforced read-only role. It may demonstrate all member surfaces and the Admin Control Center, but Admin data is synthetic and production writes are rejected server-side. UI-disabled controls are supplemental, never the security boundary.
- Routine account creation, access changes, suspension, exceptional identity correction, test-account management, and deletion are performed through Admin. Permanent account deletion requires the exact phrase `DELETE ACCOUNT` and the server independently verifies it.
- Market Commons must retain a visible route back to Dashboard, Skill Development, Labs, Simulator, Journal, Market Tutor, Tools, Store, and Help even if forum data fails to load.
