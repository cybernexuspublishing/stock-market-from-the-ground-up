-- Reproducible source for the audited Oct 28 production replacement of Commons topic #98.
-- Idempotent: old obsolete-prefix guard prevents repeat updates and duplicate audit.
-- Already applied through an atomic DML/audit transaction. This source is maintained
-- for schema restoration or review, not to be re-run against unrelated forum data.
WITH previous AS (
 SELECT id,body FROM public.commons_topics
 WHERE id=98 AND forum_code='F600_MEMBERSHIP'
  AND body LIKE 'Included Sparks are granted on verified paid cycles and expire under%'
 FOR UPDATE
), changed AS (
 UPDATE public.commons_topics t
 SET body=$SPARKS_V2$## WHAT CHANGED
Crownlight Sparks are nonexpiring learning credits under the approved V2 policy. This applies to Free monthly Sparks, included member Sparks and purchased Sparks. The former Standard/Extended rules describing expiration 90 or 150 days after a membership term are obsolete and must not be used.

## HOW CREDITS ARE EARNED
Free eligible members receive five Sparks per monthly grant window. Founding membership Spark quantities depend on the verified qualifying payment cycle and the applicable plan; do not assume that an unpaid, failed or cancelled payment issues a new grant. Purchased Sparks require a separately confirmed transaction. The account balance is authoritative for grants and redemptions.

## WHAT SPENDING MEANS
An eligible ungraded reveal or skip costs four Sparks under the approved V2 policy. Core explanations, normal guided practice and ordinary retries remain free. A reveal or skip is marked Study Only; it does not establish independent mastery or a passing grade. An eligible early final-assessment retake during the 36-hour cooldown costs five Sparks. These optional actions must not be necessary to access foundational instruction.

An optional ad-free pass is a timed benefit, not expiring Sparks: 5 Sparks for 24 hours, 18 for 7 days or 50 for 30 days, where the account is eligible. A pass expires at its stated end time, but unused Sparks do not.

## IMPORTANT BOUNDARIES
The V2 migration removed expiration dates from existing credit buckets without restoring credits already expired and removed before that migration. A membership cancellation may end subscription benefits without deleting already issued, unused Sparks. Never publish balances, payment receipts, account identifiers or private support messages in the forum. For a discrepancy, use private Account/Support and include only the date and a redacted transaction reference.

## DISCUSSION EXERCISE
A member has nine Sparks and chooses a four-Spark ungraded reveal. What is the remaining balance? Does the reveal count as proof of mastery? Compare that to a five-Spark 24-hour ad-free pass: which resource expires, and when?

## SOURCE AND VERIFICATION
Owner-approved Crownlight V2 policies and the production migration sources dated October 28, 2026: `20261028_crownlight_nonexpiring_policy_v2.sql`, `20261028_founder_sparks_never_expire_v2.sql`, `20261028_crownlight_free_five_grants_v2.sql`. Current balance and feature eligibility must be checked in the member's authenticated account; this discussion does not guarantee a transaction or subscription entitlement.$SPARKS_V2$,updated_at=now()
 FROM previous p WHERE t.id=p.id RETURNING t.id,length(p.body) prior_chars,length(t.body) new_chars
), audit AS (
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 SELECT (SELECT user_id FROM public.admin_user_roles WHERE role_code='OWNER'
    AND (expires_at IS NULL OR expires_at>now()) LIMIT 1),
  'forum.editorial.policy_correction','commons_topic',c.id::text,
  jsonb_build_object('editorial_revision','2026-10-28-v2','previous_characters',c.prior_chars,
  'new_characters',c.new_chars,'reason','Approved nonexpiring Sparks V2')
 FROM changed c RETURNING id
)
SELECT (SELECT count(*) FROM changed) AS updated,(SELECT count(*) FROM audit) AS audit_rows;
