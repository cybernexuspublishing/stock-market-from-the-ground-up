# Source recovery and archived materials

- **Existing owner GitHub backup:** required retention outside the repository; it includes the older upgrade notes, original project code and prior release documentation.
- **Prior draft PR #2:** changes are already integrated into the v0.13.5.7.1 branch-reconciled baseline; do not merge that PR separately.
- **Missing executed historical database migrations:** `supabase/migrations/v0.13.5.4_INTELLIGENT_CONTROL_CORE.sql` and `supabase/migrations/v0.13.5.5_OWNER_MANUAL_ENTITLEMENTS.sql` are absent from the supplied source. Do not recreate them from memory. Recover exact originals from previously delivered release ZIPs or compare schema/function definitions with the live Supabase project. The verifier `supabase/admin/v0.13.5.6_DATABASE_CONTRACT_READ_ONLY.sql` is in this baseline.
- **Immutable source evidence:** `lab-catalog.json` with 419 IDs, `data/interactive-labs.json` with the original 94 Foundations IDs, and `docs/repository-remediation/LAB_EVIDENCE_INVENTORY.csv` remain present for provenance auditing.
- **Historical site versions:** original 452-file snapshot and v0.13.5.6 candidate are preserved by Owner in the backed-up ZIP, not bloating the active repository.

- **Merged v0.13.4 skill/Showcase branch:** 16 commits behind `main`, zero unique ahead commits. Full reconciliation in `docs/BRANCH_RECONCILIATION_AND_COMPLETENESS.md`.
- **Legacy service-worker URL:** `sw-v0131.js` is a security-aware compatibility shim only. The historical broad-HTML-cache worker source remains archived in the original branch, not active in this baseline.
