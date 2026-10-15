# v0.14.0.30 — PRIVATE DIGITAL EBOOK SALES & DOWNLOADS — DIRECT UPLOAD

**GitHub baseline:** `main` at `1947fc04f0ff77690c97adeca015d0db997d4f80` (v0.14.0.29).  
**Status:** Development source candidate; no live ebook sales or authorized downloads until all gating conditions are met.  
**Method:** Overlay complete source files into their existing matching GitHub paths. **Preserve everything else.** This is not a standalone site replacement.  

## Requested controls — built now, not deferred

OWNER/Admin → Commerce shows per-book controls for: KDP Select active/inactive (website status only), verified exclusivity end, explicit rights confirmation, **enable/disable website digital sales**, **enable/disable paid-order downloads**, and **upload private EPUB or PDF**. All are initially OFF as appropriate for KDP Select.

Website My Books shows *separately purchased* website eBooks and a Download button, available only after a genuine recorded paid digital order and database authorization. Signed Supabase file links expire in 60 seconds. Companion keys and Amazon/physical purchases do not unlock ebook files.

The storefront lists direct digital edition purchases only when backend rights, edition metadata, private file, actual payment-enablement controls, and Amazon-contract guards allow. Lemon Squeezy remains for permitted digital goods, not printed books. Lulu is optional; signed author-copy operations remain a separate development track.

## Installation order

1. Upload ZIP files to GitHub; preserve unrelated repository paths. Check GitHub Actions. The previous v0.14.0.29 workflow had **missing PyYAML** and the included replacement fixes it without bypassing old regression tests.
2. **Staging only:** run `supabase/admin/v0.14.0.30_DIGITAL_PREFLIGHT_READ_ONLY.sql` and assess policies. Review the new SQL migration, then run once in staging. GitHub deploy **does not** execute SQL. Verify `supabase/admin/v0.14.0.30_DIGITAL_POSTFLIGHT_READ_ONLY.sql` and negative-role E2E.
3. In Admin → Commerce sign in as OWNER with MFA AAL2. Upload finalized EPUB/PDF. Assign verified Amazon KDP Select expiration and ownership attestations. **Do not turn off KDP Select's website flag until Amazon exclusivity actually ends**, and never assume flipping it alters Amazon's contract.
4. Configure Lemon Squeezy digital book product variant, prices and signed webhooks. Complete sandbox refund/checkout/delivery/replay verification before enabling global payment switches. No original book bytes were supplied in this release.
5. Test direct purchases into My Books: verified payment + intent -> download, refund -> denied, role/cross-user negative, KDP flag ON -> denied, toggle OFF -> denied, private bucket SELECT denied for customers.

**No digital manuscripts or sales activation are shipped inside this ZIP.** Amazon KDP Select exclusivity requires waiting until each title's current term expires; building the system now is safe because all fulfillment paths fail closed.

## Files

- Private title metadata, OWNER roles/rights/switch RPCs, purchased-order checks, Storage policies and public digital catalog SQL.
- OWNER digital upload/rights UI, Store edition buttons, My Books purchased downloads.
- Authenticated Cloudflare short-lived signed-download endpoint and book checkout rights gate.
- Read-only SQL audits, GitHub workflows and regression tests.

**Existing website content, Market Commons, print options and historical trading lessons are not intentionally changed.** Live CI, production auth and Supabase behavior still need verification.
