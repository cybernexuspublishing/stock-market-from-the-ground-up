# v0.14.0.30 — Direct Digital Book Commerce & Private Library

**Project:** The Stock Market: From the Ground Up  
**Scope:** Owner-uploaded private EPUB/PDF + separately switchable sale and download controls + purchased-buyer delivery  
**Baseline:** GitHub `main` v0.14.0.29, commit `1947fc04f0ff77690c97adeca015d0db997d4f80`  
**State:** Development candidate; **does not** enable sales automatically; no live customer/payment test performed.

## Implemented source contracts

- Private Supabase Storage bucket `gu-digital-ebooks`, default nonpublic. Owner with authenticated AAL2 can **upload NEW files** only; no user-accessible Storage SELECT policies are added. Verify no **pre-existing broad storage policies** accidentally allow retrieval; Supabase RLS policies are additive.
- OWNER/AAL2 interface at Admin → Commerce: private EPUB/PDF upload (up to 50 MB, subject to Supabase project upload limits), Amazon KDP Select status, verified exclusivity end, distribution-rights attestation, digital sales **Enable/Disable**, purchased-book downloads **Enable/Disable**. Written to PostgreSQL with row lock, version check and audit record. This UI does **not** cancel Amazon enrollment.
- Backend fails closed unless rights are attested, recorded exclusivity end has passed, Kindle exclusivity website flag is OFF, file is present in the private bucket, title is published/active, payment variant and price are configured, and both digital sales and downloads are ON. Book-bundle digital checkout is intentionally not offered until a verified per-component fulfillment contract is built.
- Checkout quote AND create use `gu_digital_offer_status_v01430` before any intent/provider checkout; physical Lemon Squeezy blocking remains unchanged.
- Member's **My Books** displays ONLY paid digital orders from the verified Lemon Squeezy `site_orders`/`site_order_items` + `checkout_intents` chain, **not** companion book keys, Amazon Kindle purchases, physical books, or Lifetime plan access. Signed provider refunds/chargebacks must map to site order status changes before grants remain safe.
- Download API verifies caller JWT, derives entitlement in PostgreSQL under `auth.uid()`, signs an existing private file for **60 seconds** using a server-only Supabase secret. No reusable public asset URL is created. Private signed URLs are **bearer links until expiry**; they are not DRM and cannot prevent a recipient from saving/copying a downloaded work.
- Digital access can be switched OFF independently of disabling new sales, e.g. a publishing-rights problem. This blocks even previously paid customers; the OWNER must provide support/refund remediation. Do not claim an irreversible lifetime file access guarantee.

## Mandatory manual configuration / dependencies

1. **KDP Select remains ON until the real exclusivity term ends.** Confirm each title's 90-day term and opt out of renewal in Amazon; this website toggle is an internal declaration only. Amazon documentation: https://kdp.amazon.com/en_US/help/topic/GD9PMU58BV24QFZ7
2. Run read-only preflight on **staging**; inspect current Storage policies, schema and roles. Review SQL and create private bucket, permissions and functions in staging. **Production SQL is not auto-applied by GitHub.**
3. Run postflight and authenticated negative tests. Under no circumstances grant public SELECT on the private bucket. Validate an unauthenticated browser cannot enumerate, download or sign a file, even if it knows the object path.
4. Log in as OWNER with **MFA AAL2**. Upload a finalized publisher-approved eBook source, verify size and content, record true KDP expiration and rights, and leave flags OFF until legally permitted.
5. Configure **separate Lemon Squeezy digital book variants/prices** in `catalog_products.metadata.checkout_variants_v135.digital` and `metadata.website_price_by_format_cents_v135.digital`. Global `ENABLE_PAID_CHECKOUT` and `commerce.checkout_enabled` stay OFF until provider sandbox tests pass.
6. Provider sandbox: signed order webhook → `site_orders.status='paid'` + matching `checkout_intents.status='paid'` + digital format → My Books button → short-lived signed private file. Verify replay, canceled/partially-refunded/refunded order denial, cross-user denial, Showcase denial, token expiry, reactivation, and KDP toggle OFF/ON (each fail-closed).
7. Test direct Storage upload within actual Supabase max file size; for oversized PDFs use the Supabase Dashboard in the private bucket (path must meet `<CODE>/<UUID>.pdf`), or add resumable TUS once tested. Standard upload for files over 6 MB may need resumable transfer.
8. Actual eBook bytes **were not provided** and no assets are included in source ZIP. Price/service provider activation and real rights attestations require OWNER decisions. Never expose Amazon-enrolled titles' full EPUB/PDF directly or indirectly.

## Residual risks / known limits

- Amazon KDP Select enforcement depends on the Owner truthfully reporting contract termination; the database cannot query Amazon's legal enrollment state.
- Existing v0.13.5 webhook controls payment fulfillment separately and grants **companion** rights, not digital files. This release derives digital ownership from signed-payment ledger tables; no companion grant is treated as a download right.
- A later supported feature may include opt-in download watermarking, owner key rotation, paid-order audit summaries, bundle purchase distribution and resumable upload. These are **not** claimed to exist here.
- The public repo's branch was last observed unprotected; enforce mandatory CI and deployment parity separately. See acceptance gates.
- Bulk history/live user data changes are not performed. Digital offer functionality is additive and OFF by default.

## Post-deployment acceptance matrix

| Case | Expected result |
| --- | --- |
| Active KDP Select; owner tries enable | REJECT |
| Unknown select end; tries enable | REJECT |
| Exclusive term future; tries enable | REJECT |
| Unsigned rights confirmation | REJECT |
| Missing verified private asset | REJECT |
| Unapproved/normal member attempts control | REJECT |
| Owner without AAL2 | REJECT |
| Showcase account control | REJECT |
| Draft title or missing variant/price | NO OFFER |
| Refunded, canceled or physical order | NO DOWNLOAD |
| Member attempts other member's book | NO DOWNLOAD |
| Direct Storage public URL | DENIED |
| Verified paid digital sale with legal rights | 60-second download |
| Toggle downloads OFF after paid order | DENIED, clear support/refund policy |
| Replayed checkout webhook | NO duplicate grants |
| Existing unrelated pages | Regression tests PASS |

**No production activation is authorized based solely on SQL success or GitHub Actions green checks.**
