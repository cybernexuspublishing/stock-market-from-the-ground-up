# Sitewide Role and Configurable Policy Contract

Production authorization must derive from existing authenticated account state and backend permission grants, **not** from a role label, UI visibility or a user-supplied body parameter. The following are controlling implementation constraints, not a declaration that all workflows have passed live verification.

| Function | Owner | Administrator | Moderator | Member | Showcase |
| --- | --- | --- | --- | --- | --- |
| Configure security-sensitive limits or sitewide policy ceiling | **Sole ordinary authority** | No, unless explicitly approved future scope that cannot weaken Owner safeguards | No | No | No writes |
| Configure payments, membership pricing, integrations, private credentials | **Owner** | Separate explicit approved permissions for ordinary commerce admin; global financial policy Owner-only | No | No | No writes |
| Configure ordinary community limits within enforced safety floor/ceiling | Full | Delegated granular rights | Delegated narrow operational limits only, with audited scope and bounded duration | No | No writes |
| Inspect forum moderation cases | Yes | With `forum.moderate` or equivalent | With `forum.moderate` or equivalent | Only own report status | Synthetic / read-only |
| Hide/restore/lock/unlock forum content | Yes | Delegated | Delegated | Own content only, per configured windows | No writes |
| Manage forum categories, posts, user rights | Yes | Explicit domain grants | Case-specific moderation grants only | Limited own-content actions | No writes |
| View audit logs | Complete authorized scope | Explicit scope | Assigned moderation scope | Own account/export where appropriate | Synthetic-only |
| Create/edit member posts | Own content | Own content plus authorized moderation edits | Own content plus authorized moderation edits | Own content and rules | No real records |

### Operational policy record contract

Every dynamically editable policy has a stable unique key, display name, description, domain, owner, data type, unit, minimum, maximum, default, current value, eligibility/scope, precedence, enabled flag, effective timestamp, validation, audit actor/reason, optimistic concurrency version and transactionally enforced behavior. Interface values are authoritative **only after the enforcing API/RPC reads the same validated policy**.

Quotas include a documented rolling/fixed window, time zone, retry/reservation behavior, duplicate semantics, account exemptions, and whether staff actions count. Exceptions expire and are auditable. Never let a generic settings endpoint overwrite restricted keys.

### Rules for immutable ceilings

Cloudflare and Supabase provider ceilings, payment-provider controls, security floors, authentication/credential safety, retention/legal holds, and database integrity constraints are not arbitrary sliders. Owner-authorized policy can choose among safe operating bounds, but may not overrule external infrastructure or unsafe constraints. When the user requests additional override authority, provide controlled change management and necessary infrastructure upgrades rather than a fake override.
