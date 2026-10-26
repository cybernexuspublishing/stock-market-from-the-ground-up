/* Member beta activity belongs in the existing access-controlled Founders
 * Commons, not a duplicate Dashboard workspace. Internal F600 identifiers
 * and commercial limits remain frozen and must not appear as member brands.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const dashboardHtml=read('dashboard.html');
const dashboardJS=read('assets/js/dashboard.js');
const commons=read('founders-commons.html');
const commonsJS=read('assets/js/founders-commons-v014178.js');
const academy=read('functions/api/bootcamp-academy.js');
const lab=read('functions/api/lab-player-context.js');

assert(dashboardHtml.includes('href="founders-commons.html"'),'Dashboard must link to the single Commons');
assert(!dashboardHtml.includes('id="member-beta-workspace"'),'Duplicated beta dashboard must be retired');
assert(!dashboardHtml.includes('src="assets/js/member-beta-workspace.js"'));
assert(!dashboardHtml.includes('href="assets/css/member-beta-workspace.css"'));
assert(!existsSync('assets/js/member-beta-workspace.js'));
assert(!existsSync('assets/css/member-beta-workspace.css'));
assert(dashboardJS.includes("get('tab') === 'beta'"),'Old beta bookmarks must resolve');
assert(dashboardJS.includes("window.location.replace('founders-commons.html')"),'Old links should redirect to Commons');
assert(dashboardJS.includes("activeTab === 'support'"),'Private Support remains independently available');
assert(!dashboardJS.includes('viewingBeta'),'No duplicate beta page render control');

for(const phrase of ['id="gu-f600-beta-center"','id="gu-f600-content" hidden',
 'href="market-commons.html?forum=F600_BUGS"',
 'href="market-commons.html?forum=F600_SUGGESTIONS"',
 'href="dashboard.html?tab=support"',
 'href="labs.html"','href="bootcamp-academy.html"',
 'href="bootcamp-academy.html?program=truth5"']){
 assert(commons.includes(phrase),'Missing real protected Commons test workflow '+phrase);
}
assert(commons.indexOf('id="gu-f600-beta-center"')>commons.indexOf('id="gu-f600-content" hidden'));
assert(commonsJS.includes("gu_founder_commons_access_v014174"),'Commons server entitlement must remain controlling');
assert(commonsJS.includes("gu_founder_noncommercial_qa_v014289"),'Existing limited QA privileges must remain distinct');
assert(commonsJS.includes('Authorized Beta Tester'),'Noncommercial QA must not impersonate paid founders');
assert(academy.includes("toolAccess(env,request,'ONDEMAND_TRAINING')"),'Academy checks member entitlement on the server');
assert(lab.includes('isBetaCandidateLab(id)'),'Labs preserve the 336/83 access scope');

for(const page of ['founders-commons.html','founding600.html','store.html',
  'market-commons.html','dashboard.html']){
 const html=read(page);
 assert.doesNotMatch(html,/Founding\s*600/i,page+' leaks internal cohort brand');
 assert.doesNotMatch(html,/\b600\s+(?:places|founder seats|founding places|shared places|original founding memberships)/i,
  page+' advertises internal numerical cap');
}
for(const path of ['dashboard.html','labs.html','bootcamp-academy.html',
 'journal.html','market-tutor.html','market-commons.html','founders-commons.html','store.html']){
 assert(existsSync(path),'Missing actual member destination '+path);
}
const approved=JSON.parse(read('data/founding600-terms-v014170.json'));
assert.equal(approved.capacity,600,'Internal founder cap must remain unchanged');
assert.deepEqual([approved.plans.FOUNDING_30.recurringCents,approved.plans.FOUNDING_60.recurringCents],[4999,5999]);
assert.deepEqual([approved.plans.FOUNDING_30.foundingDiscountBps,approved.plans.FOUNDING_60.foundingDiscountBps],[1000,1500]);
console.log('PASS: one real protected Founders Commons beta hub; old beta link redirects; founder commercial terms preserved; no member-visible Founding 600.');
