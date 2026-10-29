-- Crownlight Lumens promotional and temporary trial disclosures — prospective only.
-- Does not create credits, alter ledger entries, change prices or enable billing.
BEGIN;
DO $pre$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents
      WHERE (document_code='TERMS' AND version='2.2' AND status='published')
         OR (document_code='PRIVACY' AND version='2.0.2' AND status='published')
         OR (document_code='CROWNLIGHT_SPARKS' AND version='2.1' AND status='published')
         OR (document_code='SUBSCRIPTION' AND version='2.2' AND status='published')) <> 4
 THEN RAISE EXCEPTION 'Public legal publication versions changed; no update applied'; END IF;
 IF EXISTS (
 SELECT 1 FROM public.legal_documents
 WHERE document_code IN ('TERMS','PRIVACY','CROWNLIGHT_SPARKS','SUBSCRIPTION')
 AND body_markdown LIKE '%Welcome Lumen promotion — prospective release%')
 THEN RAISE EXCEPTION 'Welcome promotion text already present'; END IF;
END $pre$;

INSERT INTO public.legal_documents_publication_history_v2(document_code,version,title,slug,body_markdown,effective_at)
SELECT document_code,version,title,slug,body_markdown,effective_at
FROM public.legal_documents
WHERE document_code IN ('TERMS','PRIVACY','CROWNLIGHT_SPARKS','SUBSCRIPTION')
ON CONFLICT(document_code,version) DO NOTHING;

UPDATE public.legal_documents SET
 body_markdown = body_markdown || $t$

### Welcome Lumen promotion — prospective release
When the sign-up promotion is separately activated and displayed on the registration page, an eligible new member who completes account registration and email verification may receive **200 complimentary Crownlight Lumens** one time per qualifying account. At the separately displayed, authorized discount rate of $0.10 per Lumen, these 200 promotional credits may provide up to $20.00 off eligible platform purchases. This is **not a $20 cash payment**, deposit, withdrawable balance, gift card, or guarantee of a purchase at no charge. The discount feature, eligible products, any applicable combination limits and total due must be shown before checkout confirmation. The registration bonus and checkout-credit discount are **not activated merely by these Terms**; no bonus should be advertised as already granted before it is actually posted.

Crownlight Lumens are the proposed member-facing name for the platform credits previously called Crownlight Sparks. Until wallet and checkout user interfaces complete their coordinated transition, references to Sparks identify the same existing credit program, not an additional balance or a second reward. Promotional, purchased, earned and membership-included credit origins are to be tracked separately. Unused credits remain non-expiring under the existing credit policy; a time-limited trial, pass or service redeemed with them ends at its displayed expiration. No credits are convertible to cash or usable as brokerage trading funds.

### Paid trials and existing member benefits
Where an individually priced limited-term product trial is offered, the product and checkout must identify the trial cost, accepted payment method or credit amount, access period, expiration date/time, and features included. **A standalone trial ends at its stated end time and does not automatically renew or convert to a paid subscription.** Any separate renewable membership requires its own clearly disclosed authorization. Members will not be separately charged Lumens or cash for a benefit already included in their currently active Founding Member entitlement. No purchase, grant, renewal, or credit deduction is authorized by this policy section alone.
$t$,
 version='2.3',effective_at=now(),updated_at=now()
WHERE document_code='TERMS' AND status='published' AND version='2.2';

UPDATE public.legal_documents SET
 title='Crownlight Lumens (formerly Sparks) Purchase & Use Terms',
 body_markdown = body_markdown || $s$

### Welcome Lumen promotion — prospective release
When activated, the welcome promotion awards a qualifying new, email-verified member **200 complimentary Crownlight Lumens**, once per eligible account. They are promotional platform credits, not $20 cash. If a separately activated eligible checkout offers a $0.10 discount per redeemed Lumen, the 200 credits can produce **up to $20.00 in checkout discounts** for eligible products; restrictions and remaining amount payable appear before final purchase confirmation. Promotional award eligibility, available checkout discounts, and credit issuance require actual server-side approval. This written policy does not itself start a welcome campaign, issue a credit, or open checkout.

Each wallet entry must identify its origin as promotional, purchased, earned or included. Promotional credits must be independently auditable and must not be confused with purchased value or Founding Member term benefits. Unused credits are non-expiring under the current policy. Purchased benefits and trial access periods may be time-limited and expire at their disclosed end time. No redemption may duplicate an already included active membership benefit. Lumens cannot be withdrawn, transferred for money or converted to trading funds.

The store's previously announced 25-credit-for-$5 package is **not** a $0.10-per-credit purchase price; package checkout is disabled while bundle pricing and the separate discount program are reviewed. No redemption-to-cash exchange rate is implied. Package prices and applied eligible checkout discounts must be displayed separately and accurately.
$s$,
 version='2.2',effective_at=now(),updated_at=now()
WHERE document_code='CROWNLIGHT_SPARKS' AND status='published' AND version='2.1';

UPDATE public.legal_documents SET
 body_markdown=body_markdown || $p$

### Promotional wallet accounting and eligibility checks
If a Crownlight Lumens welcome promotion is activated, we may use account registration time, email-verification status, eligibility and anti-duplicate indicators, account status and credit-ledger transaction records to determine whether a qualifying new account has already received the once-per-account award. The ledger should identify promotional credits separately from earned, purchased and membership-included credits. Wallet history and correction records may be retained for reconciliations, support, antifraud and lawful financial records; collecting or using these records does not give marketing consent. The specific registration promotion, if offered, will explain the relevant conditions beside the offer, with links to these terms and the credit policy.
$p$,
 version='2.0.3',effective_at=now(),updated_at=now()
WHERE document_code='PRIVACY' AND status='published' AND version='2.0.2';

UPDATE public.legal_documents SET
 body_markdown=body_markdown || $u$

### Standalone paid or credit-funded trial access
A separately purchased, time-limited product trial (including a trial funded with Crownlight Lumens) is a **non-recurring purchase** and expires automatically at its stated end time. It does not automatically become a subscription, make a recurring charge or debit additional credits. An optional later membership or recurring subscription requires a separate, clearly priced and affirmatively authorized checkout. The purchase confirmation must state the actual trial duration, exact expiration and any restrictions; a promotional policy statement cannot activate or create paid access.
$u$,
 version='2.3',effective_at=now(),updated_at=now()
WHERE document_code='SUBSCRIPTION' AND status='published' AND version='2.2';

DO $post$
BEGIN
 IF (SELECT count(*) FROM public.legal_documents
 WHERE (document_code='TERMS' AND version='2.3')
    OR (document_code='PRIVACY' AND version='2.0.3')
    OR (document_code='CROWNLIGHT_SPARKS' AND version='2.2')
    OR (document_code='SUBSCRIPTION' AND version='2.3')) <> 4
 THEN RAISE EXCEPTION 'Legal publication verification failed; rollback'; END IF;
END $post$;
COMMIT;
