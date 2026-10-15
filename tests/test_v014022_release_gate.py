"""v0.14.0.22 exact-source regression and release identity consistency, no DB writes."""
from pathlib import Path
import re,subprocess
ROOT=Path(__file__).resolve().parents[1]
def read(p):return (ROOT/p).read_text(encoding='utf8')
config=read('config.js');policy=read('assets/js/route-policy.js');worker=read('sw.js');site=read('assets/js/site.js')
assert "VERSION: '0.14.0.22'" in config
assert "version:'0.14.0.22'" in policy
assert 'groundup-v014022-public' in worker
assert 'cfg.VERSION' in site
assert 'document.body.dataset.build=declaredRelease' in site
assert "loadOnce('/assets/js/commons-follow-v01421.js','commonsFollow')" in site
assert "loadOnce('/assets/js/member-notification-preferences-v01421.js','memberNotificationPreferences')" in site
assert "'/api/community-notification-preferences'" in read('assets/js/member-notification-preferences-v01421.js')
assert "'/api/commons-subscriptions-v01421?topicId='" in read('assets/js/commons-follow-v01421.js')
follow=read('assets/js/commons-follow-v01421.js')
pref=read('assets/js/member-notification-preferences-v01421.js')
for src in (follow,pref):
    assert "await api('GET')" in src or "await preference('GET')" in src
    assert 'status could not be confirmed' in src or 'Could not confirm the saved preference' in src
for path in ['config.js','sw.js','assets/js/site.js','assets/js/route-policy.js',
             'assets/js/commons-follow-v01421.js','assets/js/member-notification-preferences-v01421.js',
             'functions/api/commons-subscriptions-v01421.js','functions/api/community-notification-preferences.js']:
    result=subprocess.run(['node','--check',str(ROOT/path)],capture_output=True,text=True)
    assert result.returncode==0,(path,result.stderr)
assert 'SUPABASE_SECRET_KEY' not in read('functions/api/commons-subscriptions-v01421.js')
assert 'SUPABASE_SECRET_KEY' not in read('functions/api/community-notification-preferences.js')
assert 'p_subscribe:input.subscribe' in read('functions/api/commons-subscriptions-v01421.js')
assert 'gu_commons_subscription_set_v01421' in read('supabase/migrations/v0.14.0.21_COMMONS_SUBSCRIPTIONS_REVIEW_REQUIRED.sql')
print('PASS: v0.14.0.22 source: strict identity, RPC contract, syntax, ambiguity recovery, no service-role in member endpoints.')
