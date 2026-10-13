# Current candidate: v0.13.5.7.5

This release **has not been deployed**. It includes the deployed v0.13.5.7.4 baseline and repairs to the Admin sidebar, Dashboard tabs, Market Commons, membership fallback, and checkout safeguards. It does **not** claim unimplemented promised backend systems are complete. See `PROMISES_AND_READINESS_MATRIX.csv` for itemized promises from this and branched conversations with evidence and outstanding acceptance criteria.

### Fixed filename policy
- Release identifier in ZIP filename and metadata, not in frontend asset names. Renamed 48 JavaScript files, 19 CSS files, one catalog, one canonical worker and TS source. More than one frontend file may still implement separate responsibilities; no new version-named JS/CSS added.
- Old asset URLs have temporary static HTTP redirects in `_redirects`. Existing `/api` endpoints, SQL migration provenance files and legacy service-worker aliases intentionally retain names. These exceptions prevent breaking deployed contracts.
- Cloudflare Pages **Build command change is required** to `bash scripts/build-pages.sh`; output `public`. Your prior command will fail against the renamed catalog.

### Preserved working controls
No account/user/role/membership records changed. No Supabase SQL executed. No checkouts, QR activation, mandatory MFA, mandatory Turnstile or synthetic Showcase issuing real entitlements were enabled. All prior approved titles and manuscripts unchanged.

### Known remaining gaps
The visual Site Builder is not implemented end-to-end; automated rule execution and database full backup restore are unfinished; v0.13.5.4 and v0.13.5.5 exact deployed SQL files are missing from repo; market-history provenance remains unverified for many Labs; all role-based writes require live acceptance. This release is infrastructure/source cleanup and keeps existing behavior.
