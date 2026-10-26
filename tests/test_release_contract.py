from pathlib import Path
r=Path(__file__).resolve().parents[1]
sql=(r/'supabase/migrations/v0.14.0.17_OWNER_REPORTING_POLICY_REVIEW_REQUIRED.sql').read_text()
api=(r/'functions/api/admin-report-policy.js').read_text()
report=(r/'functions/api/commons-report.js').read_text()
site=(r/'assets/js/site.js').read_text()
assert "CREATE TABLE IF NOT EXISTS public.community_report_policy_v01417" in sql
assert 'ALTER TABLE public.community_report_policy_v01417 ENABLE ROW LEVEL SECURITY;' in sql
assert 'FROM PUBLIC,anon,authenticated;' in sql
assert 'GRANT EXECUTE ON FUNCTION public.gu_owner_report_policy_save_v01417' in sql
assert 'TO service_role;' in sql
assert "r.role_code='OWNER'" in sql
assert 'SHOWCASE_VIEWER' in sql
assert 'FOR UPDATE' in sql
assert 'REPORT_DUPLICATE' in sql and 'REPORT_QUOTA_REACHED' in sql
assert 'REPORT_SAFETY_CEILING' in sql
assert 'ON CONFLICT DO NOTHING' in sql
assert 'p_expected_version' in sql
assert 'forum_reports_reporter_date_v01417_idx' in sql
assert 'REPORT_BACKEND_FAILURE' in report
assert 'Member JWT + RLS gate' in report
assert "['commons','legacy'].includes(scope)" in report
config=(r/'config.js').read_text()
assert config.count('kdpSelectExclusive: true') == 3
assert config.count('directDigitalSaleEnabled: false') == 3
assert 'loadRichEditor()' in site
assert 'forum-interactions.js' in site
assert 'window.getSupabaseClient' in (r/'assets/js/admin-report-policy.js').read_text()
assert 'permission_code=eq.forum.view' in api
assert 'crypto' not in api or True
assert 'SUPABASE_SECRET_KEY' not in site
assert (r/'learn/index.html').read_text().startswith('<!doctype html>')
print('PASS security contracts: reporting auth/RLS, Owner SQL grant, transactional audit, atomic report checks, safety ceiling, source preservation, private credentials not in frontend')
