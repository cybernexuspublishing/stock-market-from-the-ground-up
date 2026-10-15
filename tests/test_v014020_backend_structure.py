from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
MIGRATION = (ROOT/'supabase/migrations/v0.14.0.20_COMMONS_SUBSCRIPTION_NOTIFICATIONS_REVIEW_REQUIRED.sql').read_text()
PREFLIGHT = (ROOT/'supabase/admin/v0.14.0.20_BACKEND_PREFLIGHT_READ_ONLY.sql').read_text()
POSTFLIGHT = (ROOT/'supabase/admin/v0.14.0.20_BACKEND_POSTFLIGHT_READ_ONLY.sql').read_text()
OWNER = (ROOT/'functions/api/backend-contract-v01420.js').read_text()
PREFS = (ROOT/'functions/api/community-notification-preferences.js').read_text()
assert 'BEGIN TRANSACTION READ ONLY;' in PREFLIGHT and 'ROLLBACK;' in PREFLIGHT
assert 'BEGIN TRANSACTION READ ONLY;' in POSTFLIGHT and 'ROLLBACK;' in POSTFLIGHT
assert 'MANUAL REVIEW REQUIRED' in MIGRATION and 'BEGIN;' in MIGRATION and 'COMMIT;' in MIGRATION
for guard in ['f.book_code IS NULL','f.tool_code IS NULL','s.user_id<>NEW.author_user_id',
              "NEW.status IS DISTINCT FROM 'published'", "coalesce(pref.subscribed_replies_enabled,true)=true",
              'pg_advisory_xact_lock','ON CONFLICT DO NOTHING','clock_timestamp()-interval \'15 minutes\'','RAISE WARNING']:
    assert guard in MIGRATION, guard
assert 'REVOKE ALL ON TABLE public.gu_commons_notification_prefs_v01420 FROM PUBLIC,anon,authenticated;' in MIGRATION
assert re.search(r'gu_commons_notice_pref_save_v01420\(boolean\).*TO authenticated',MIGRATION,re.S)
assert 'service_role' not in PREFS.lower() and 'SUPABASE_SECRET_KEY' not in PREFS
assert 'role_code' in OWNER and "row.role_code==='OWNER'" in OWNER and "account_kind!=='member'" in OWNER
assert 'user_notifications' in MIGRATION and 'notification_type' in MIGRATION
# There is no bulk data rewrite, DROP TABLE or forced paid entitlement.
assert not re.search(r'\b(DROP TABLE|TRUNCATE|DELETE FROM|UPDATE public\.(user_library|site_subscriptions))\b',MIGRATION,re.I)
print('v0.14.0.20: SQL structure, privacy, scope and migration safety contracts PASS')
