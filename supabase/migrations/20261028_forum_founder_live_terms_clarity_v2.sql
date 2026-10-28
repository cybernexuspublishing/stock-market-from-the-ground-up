-- Market Commons official policy corrections: topic #96 and #97.
-- DML-only, idempotent, preserves all original editorial exercises, IDs,
-- member replies, author associations, founder restricted permissions.
-- No checkout, Stripe payments, entitlement awards or plan-release changes.
WITH inputs(id,expected_prefix,revised_body) AS (
 VALUES
 (96::bigint,'The planned Standard founder renewal is'::text,$FORUM_TIER_V2$## Founding Standard and Extended: what the catalogue actually authorizes
Founding 30-Day (Standard) is catalogued at $49.99 every 30 days and grants 15 included, nonexpiring Crownlight Sparks after a verified qualifying paid cycle. Its eligible separate-purchase discount is 10% when earned. Founding 60-Day (Extended) is catalogued at $59.99 every 60 days and grants 20 included, nonexpiring Sparks after a verified qualifying paid cycle. Extended's eligible purchase discount is 15% while the term is active; permanent eligibility requires a completed, non-refunded qualifying Extended term.

Founding 14-Day (Starter), separately catalogued at $22.99 every 14 days with 10 included nonexpiring Sparks and a 5% eligible-purchase discount while active, currently has checkout DISABLED. Starter does not include Extended Design Council voting. The three plans share the same maximum 600 numbered founder seats.

**Availability is a separate condition.** The overall public Founder launch remains closed. The 30- and 60-day listings are labelled coming soon in the official Store; catalogue prices and individual flags are not permission to initiate a charge. An enrolled member receives services only to the extent verified and enabled for that member. Consult the signed-in Store and Membership terms for changes; do not post private payment or account information here.$FORUM_TIER_V2$::text),
 (97::bigint,'Eligible founder purchase discounts are'::text,$FORUM_TIER_V2$## Founder purchase discounts and Lifetime Membership: eligibility versus checkout
A verified 14-Day Starter can have 5% off eligible separate first-party purchases **only while that paid Starter term is active**, although Starter checkout is currently disabled. Standard (30-Day) offers 10% when earned from a verified qualifying payment. Extended (60-Day) offers 15% while actively qualified; permanent 15% eligibility requires a completed non-refunded qualifying term. Reversed/refunded payment evidence and current eligibility must be considered. These discounts do not reduce the Founding recurring membership price and cannot be stacked.

The Lifetime Membership catalogue lists $2,499 before tax. For illustration only, a fully eligible 10% discount would be $2,249.10 and a fully eligible 15% discount would be $2,124.15 before tax. **These are not live checkout quotes or guarantees.** The Lifetime plan is currently not publicly visible. The production checkout intentionally blocks an eligible Founder's purchase rather than collecting the full list price when an earned discount cannot yet be implemented safely.

The member-specific entitlement and discount calculation is authoritative, not a Forum message. Check the official Store for product availability, signed-in Account for earned eligibility, and verified checkout before making a purchase. Do not share transaction IDs or account details in a discussion.$FORUM_TIER_V2$::text)
), matched AS (
 SELECT c.id,c.body,i.revised_body FROM public.commons_topics c JOIN inputs i ON i.id=c.id
 WHERE c.forum_code='F600_MEMBERSHIP' AND c.is_official AND c.status='published'
 AND left(c.body,length(i.expected_prefix))=i.expected_prefix
 AND position('## EDITORIAL FIELD EXERCISE — 2026-10-28' in c.body)>0
 FOR UPDATE OF c
), updated AS (
 UPDATE public.commons_topics c
 SET body=m.revised_body||E'\n\n'||substring(m.body from position('## EDITORIAL FIELD EXERCISE — 2026-10-28' in m.body)),
     updated_at=now()
 FROM matched m WHERE c.id=m.id
 RETURNING c.id,length(c.body) new_chars
), audit AS (
 INSERT INTO public.admin_audit_log(actor_user_id,action,target_type,target_id,details)
 SELECT (SELECT user_id FROM public.admin_user_roles
  WHERE role_code='OWNER' AND (expires_at IS NULL OR expires_at>now())
  ORDER BY granted_at LIMIT 1),
 'forum.editorial.founder_terms_v2','commons_topic',u.id::text,
 jsonb_build_object('revision','founder_commercial_v2_20261028','new_chars',u.new_chars,
 'checkout_activated',false,'reason','Correct 14-day staged offer, 30/60 tier and Lifetime founder discount checkout limitations')
 FROM updated u RETURNING id
)
SELECT (SELECT count(*) FROM matched) matched,
 (SELECT count(*) FROM updated) updated,
 (SELECT count(*) FROM audit) audit_entries,
 (SELECT array_agg(id ORDER BY id) FROM updated) updated_topic_ids;
