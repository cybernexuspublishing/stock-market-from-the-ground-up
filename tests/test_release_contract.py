from pathlib import Path
import re,hashlib
root=Path(__file__).resolve().parents[1]
js=(root/'assets/js/forum-composer.js').read_text()
site=(root/'assets/js/site.js').read_text()
interactions=(root/'assets/js/forum-interactions.js').read_text()
sql=(root/'supabase/migrations/v0.14.0.17_ADVANCED_FORUM_INTERACTIONS_REVIEW_REQUIRED.sql').read_text()
sw=(root/'sw.js').read_text()
assert 'groundup-v014017-public' in sw
assert 'data/interactive-labs.json' not in site and 'SUPABASE_SECRET_KEY' not in (js+site+interactions)
assert 'kdpSelectExclusive' in site and 'MEMBERSHIP_CHECKOUT_URL' in site, 'commerce guards must be preserved'
for name in ['gu_forum_poll_create','gu_forum_poll_get','gu_forum_poll_vote','gu_forum_toggle_thanks','gu_forum_thanks_for_topic','gu_forum_rate_topic','gu_forum_toggle_subscription','gu_forum_interaction_state']:
 assert f'FUNCTION public.{name}(' in sql, name
 assert name in interactions or name=='gu_forum_poll_create' and name in interactions
assert re.search(r'REVOKE ALL ON TABLE[\s\S]{1,400}FROM PUBLIC,anon,authenticated;',sql), 'all new direct tables are private'
assert 'v0143_commons_can_open' in sql, 'paid book/tool entitlement access must be enforced server side'
assert "to_jsonb(t)->>'lab_id'" in sql and "forum_code<>'HISTORICAL_LABS'" in sql
assert 'SHOWCASE_VIEWER' in sql and "IN ('suspended','restricted')" in sql
assert 'FOR UPDATE' in sql and 'already voted' in sql
assert 'token' not in (root/'docs/FILES_TO_REPLACE.txt').read_text().lower()
print('PASS release static contracts: private SQL tables, authenticated RPCs, paid gating, LAB gating, no privileged credentials in browser, stable commerce guard, cache update')
