/* No live customer mutation: check the entitlement migration's controlling contract. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261026_membership_entitlement_period_boundaries_v1.sql',import.meta.url),'utf8');
for(const term of ['FREE_PLAN_POLICY_DRIFT','PRIVATE_ENTITLEMENT_RPC_EXPOSED',
 'CREATE OR REPLACE FUNCTION public.user_has_tool_access(target_user uuid,target_tool text)',
 "SET search_path TO ''","p.account_kind='member' AND p.deleted_at IS NULL",
 "lower(f.status) IN ('suspended','restricted')","r.role_code='SHOWCASE_VIEWER'",
 "p.active=true","public.plan_tool_access", "g.starts_at<=now()",
 "s.current_period_end IS NOT NULL AND s.current_period_end>now()", 
 "up.current_period_end>now()","up.provider IS NULL OR up.ends_at IS NOT NULL OR up.current_period_end IS NOT NULL",
 "REVOKE ALL ON FUNCTION public.user_has_tool_access(uuid,text) FROM PUBLIC,anon,authenticated",
 "GRANT EXECUTE ON FUNCTION public.user_has_tool_access(uuid,text) TO service_role",
 '_smfgu_entitlement_before','EXISTING_CURRENTLY_VALID_MEMBER_TOOL_ENTITLEMENT_LOST_COUNT_',
 'NONEXISTENT_MEMBER_GAINED_TOOL','INSERT INTO public.admin_audit_log','COMMIT;'])
 assert(sql.includes(term),'Missing SQL contract: '+term);
assert(!/\b(?:update|delete)\s+public\.(?:user_plan_grants|user_tool_passes|site_subscriptions|entitlements)\b/i.test(sql),'Forbidden member grant mutation');
console.log('PASS membership DB source: scoped tools, active terms, no free escalation and private service-only function.');
