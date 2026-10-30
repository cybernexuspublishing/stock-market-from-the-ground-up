/* Production growth endpoint smoke: GET only, no accounts and no writes. */
import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const page=await fetch(origin+'/owner-growth-funnel.html',{cache:'no-store'});
assert.equal(page.status,200,'Owner reporting page must load on deployed origin');
const html=await page.text();
assert(html.includes('noindex,nofollow'),'Owner report must be noindex');
assert(html.includes('data-route-access="staff"'),'Owner report must retain the access boundary');
assert(html.includes('owner-growth-funnel-v1.js'),'Owner report client must load');
const api=origin+'/api/owner-growth-funnel?days=7';
const anonymous=await fetch(api,{cache:'no-store'});
assert.equal(anonymous.status,401,'Anonymous access to private aggregate API must be denied');
const invalid=await fetch(api,{headers:{authorization:'Bearer invalid_growth_qa_token'},cache:'no-store'});
assert.equal(invalid.status,403,'Forged session must not access the private report');
const rejection=await invalid.text();
assert(!/email_confirmed_at|reflection_saved|user_id|username|service_role/i.test(rejection),'Private implementation data in rejection');
const endpoint=await fetch(origin+'/api/owner-growth-funnel?days=400',{cache:'no-store'});
assert.equal(endpoint.status,401,'Invalid query must not bypass authentication');
console.log('PASS production Owner growth privacy: owner page noindex, anonymous 401, forged token 403, no data leak');
