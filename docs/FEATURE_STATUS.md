# v0.13.5.7 — What is actually implemented, and what is not

No fake features or invented live metrics are authorized. These are **source capabilities**, not live production certification.

| Functional system | Status in included source | Remaining acceptance/work |
|---|---|---|
| Responsive pages, account-aware header | Implemented | Production navigation and mobile/keyboard test; old clients cache upgrades |
| Member Lab Registry, book/site filters, paging | Implemented in v0.13.5.7 | Live Supabase RLS, role, and data count checks |
| Admin Historical Lab Registry, View and Edit | Implemented with 50-record collection paging | Role-based Owner editing test; preserve learning records |
| Learning Operations / Analytics scoped Lab rows | Collection-selective source reads | Live database and analytics aggregation verification |
| Accounts & Access, membership oversight, Dummy/Showcase | Existing v0.13.5.5 interfaces preserved | Provider billing distinct from manual grants; role-aware acceptance |
| Website Builder / CMS | Original text content pages | Full visual drag-drop builder not implemented |
| Design & Branding | Theme values and opt-in accent | Whole-site theming not verified |
| SEO | Page metadata, canonical and managed sitemap route | Existing global sitemap integration and external search verification |
| Marketing / Advertising | Existing controls and records | Provider-based outbound campaigns/analytics not fully implemented |
| Forms & Leads | Configurable intake, lead queue | Disabled until Owner enables; spam/consent/privacy testing |
| Integrations | Existing credential settings and readiness checks | Third-party credentials and live calls not verified |
| Security | Middleware/RBAC, endpoint checks, audits | Live RLS and incident monitoring; owner-chosen MFA-off risk |
| Automation | Disabled rule drafts only | Scheduler/automation execution NOT installed |
| System Health | On-demand readiness and recent logs | 24/7 uptime monitoring NOT installed |
| Backup/Recovery | Nonsecret configuration export | Full Supabase database backup and tested restore NOT included |
| Developer Tools | Diagnostics/inventory/version metadata | Client-specific modules/deployment flows are future work |
| E-commerce and memberships | Source implementation preserved | Payment checkout remains OFF; KDP/retailer state independent; live webhook acceptance pending |
| Market Tutor, journal, simulator, replay | Source implementation preserved | Broker licensing/data/time/session tests pending; not trading advice |

User-approved v0.13.5.6 source consolidations are included. No approved customer EPUB/manuscript was changed in creating this site ZIP. Features already present but not independently verified should be treated as **unverified**, not guaranteed ready.


> Consolidation notice: v0.13.5.7.2 replaces the duplicated frontend asset loaders listed in `CONSOLIDATION_v0.13.5.7.2.md`. This note is source-only; production verification remains pending.
