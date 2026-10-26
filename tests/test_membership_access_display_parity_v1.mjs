/* Member access summary must use actual server entitlement decision, not stale labels.
 * Source-only test; the migration also includes a live transactional preflight.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261026_membership_access_display_parity_v1.sql',import.meta.url),'utf8');
for(const token of [
 "MEMBERSHIP_ACCESS_DISPLAY_FUNCTION_DRIFT","CREATE OR REPLACE FUNCTION public.my_platform_access_before_v135()",
 "SET search_path TO ''", "p.active=true", "public.user_has_tool_access(v_uid,t.tool_code)",
 "p.account_kind='member' and p.deleted_at is null", "lower(f.status) in ('restricted','suspended')",
 "(up.ends_at is null or up.ends_at>now())","(up.current_period_end is null or up.current_period_end>now())",
 "(up.provider is null or up.ends_at is not null or up.current_period_end is not null)",
 "REVOKE ALL ON FUNCTION public.my_platform_access_before_v135() FROM PUBLIC,anon,authenticated",
 "GRANT EXECUTE ON FUNCTION public.my_platform_access_before_v135() TO service_role",
 "DISPLAY_ENTITLEMENT_PARITY_POSTFLIGHT_FAILED",
 'INSERT INTO public.admin_audit_log','COMMIT;'
]) assert(sql.includes(token),'Missing member access display security rule: '+token);
assert(!sql.includes("(v_has_all_tools and t.status<>'retired')"),'Broad plan label must not mark planned or unauthorized tool as delivered');
assert(!sql.includes("(coalesce(up.current_period_end,up.ends_at) is null"),'Independent pass end boundaries required');
console.log('PASS member account access display source parity: active plans, effective terms, server tool rights and service-only helper.');
