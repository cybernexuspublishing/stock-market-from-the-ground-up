"""Source-only regression checks; not live DB tests or claims of RLS coverage."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
api = (ROOT/'functions/api/commons-subscriptions-v01421.js').read_text()
sql = (ROOT/'supabase/migrations/v0.14.0.21_COMMONS_SUBSCRIPTIONS_REVIEW_REQUIRED.sql').read_text()
site = (ROOT/'assets/js/site.js').read_text()

for p in [ROOT/'assets/js/site.js',ROOT/'assets/js/commons-follow-v01421.js',ROOT/'assets/js/member-notification-preferences-v01421.js',ROOT/'functions/api/commons-subscriptions-v01421.js']:
    subprocess.run(['node','--check',str(p)],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
assert 'SUPABASE_SECRET_KEY' not in api and 'service_role' not in api
assert "typeof input.subscribe!=='boolean'" in api
assert "cache:'no-store'" in api
assert 'gu_commons_subscription_get_v01421' in api
assert 'gu_commons_subscription_set_v01421' in api
assert 'p_actor' not in api and 'target_user' not in api
assert 'auth.uid()' in sql
assert 'SECURITY DEFINER' in sql and 'pg_temp' in sql
assert 'ON CONFLICT(user_id,topic_id) DO NOTHING' in sql
assert 'AND f.book_code IS NULL AND f.tool_code IS NULL' in sql
assert "status='published'" in sql and 'f.active IS TRUE' in sql
assert 'DELETE FROM public.commons_topic_subscriptions' in sql and 'WHERE user_id=actor AND topic_id=p_topic_id' in sql
assert 'REVOKE ALL ON FUNCTION' in sql and 'FROM PUBLIC,anon,authenticated' in sql
assert 'TO authenticated' in sql
assert 'CREATE TABLE' not in sql and 'DROP TABLE' not in sql and 'TRUNCATE' not in sql
assert 'backend-community-v01421.css' in site and 'sitewide-runtime.js' in site
assert 'admin-report-policy.js' in site and 'forum-interactions.js' in site
assert 'member-mentions.js' in site and 'v014018-forum-corrections.js' in site
assert 'member-notification-preferences-v01421.js' in site and 'commons-follow-v01421.js' in site
prefs=(ROOT/'assets/js/member-notification-preferences-v01421.js').read_text()
assert 'community-notification-preferences' in prefs and 'data-settings-body' in prefs
assert 'Learning releases' not in prefs and 'Notification preference saved' in prefs
assert 'replaceChildren(panel)' in prefs
follow=(ROOT/'assets/js/commons-follow-v01421.js').read_text()
assert 'commons-subscriptions-v01421' in follow
assert "method==='POST'" in follow
print('v0.14.0.21 structural/security/build preservation checks: PASS')

# Release metadata and private data cache boundaries remain aligned.
# This regression protects v0.14.0.21 features in all subsequent releases.
# Pinning the entire production app to an old build would break on every update.
conf=(ROOT/'config.js').read_text()
release_match=re.search(r"VERSION:\s*'((?:\d+\.){3}\d+)'",conf)
assert release_match, 'Public release metadata missing'
release_version=release_match.group(1)
maj,mi,patch,rev=map(int,release_version.split('.'))
assert (maj,mi,patch,rev)>=(0,14,0,21), f'Unexpected release rollback {release_version}'
assert f"version:'{release_version}'" in (ROOT/'assets/js/route-policy.js').read_text()
sw=(ROOT/'sw.js').read_text()
assert f'groundup-v{maj}{mi}{patch}{rev:02d}-public' in sw
assert "POLICY.isProtected(p)" in sw and "p.startsWith('/api/')" in sw
assert "cache:'no-store'" in sw
config=(ROOT/'config.js').read_text()
assert config.count('kdpSelectExclusive: true')==3
assert config.count('directDigitalSaleEnabled: false')==3
assert 'SUPABASE_SECRET_KEY' not in config
