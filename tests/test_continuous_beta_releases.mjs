/* Founding 600 release-early contracts. Source-level guardrails,
 * exercised in Node 22 CI; no fabricated member sign-in or test payments.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync('dashboard.html','utf8');
const dashboard=readFileSync('assets/js/dashboard.js','utf8');
const beta=readFileSync('assets/js/member-beta-workspace.js','utf8');
const labRegistry=readFileSync('assets/js/lab-registry.js','utf8');
const labServer=readFileSync('functions/api/lab-player-context.js','utf8');
const academy=readFileSync('functions/api/bootcamp-academy.js','utf8');
for(const field of ['id="member-beta-workspace"','id="member-beta-status"',
 'id="member-beta-labs-summary"','id="member-beta-programs"',
 'href="dashboard.html?tab=beta"','href="dashboard.html?tab=support"',
 'src="assets/js/member-beta-workspace.js"','href="assets/css/member-beta-workspace.css"',
 'data-auth-required="true"']){
 assert(html.includes(field),'Missing beta member entry '+field);
}
assert(dashboard.includes("activeTab === 'beta'"));
assert(dashboard.includes('content.hidden = viewingSupport || viewingBeta'));
assert(dashboard.includes('if (viewingSupport || viewingBeta)'));
assert(beta.includes("get('tab')!=='beta'"));
assert(beta.includes("await sb.auth.getUser()"),'No unauthenticated member access assumption');
assert(beta.includes("onAuthStateChange"),'Identity changes must clear private workspace state');
assert(beta.includes("clearMember()"),'Member-specific screen must be scrubbed');
assert(beta.includes("Promise.allSettled("),'An optional release API cannot block the entire beta workspace');
for(const endpoint of ['/api/lab-beta-scope','/api/lab-release-availability',
 '/api/bootcamp-academy?action=catalog']){
 assert(beta.includes(endpoint),'Beta hub must consult authoritative existing source '+endpoint);
}
assert(beta.includes("Array.isArray(release?.guidedBetaIds)"));
assert(beta.includes('release.guidedBetaIds.every(id=>!release.publishedIds.includes(id))'));
assert(beta.includes('scope?.targetSelected===336')&&beta.includes('scope?.targetUpcoming===83'));
assert(beta.includes('new Set([...scope.selectedForPrebeta,...scope.upcoming]).size===419'));
assert(beta.includes('source')===false||!beta.includes('source_role_key'));
assert(!beta.includes('localStorage'),'No cached entitlements or member scores');
assert(!beta.includes('service_role'));
assert(!beta.includes('STRIPE_SECRET'));
assert(!beta.includes('innerHTML='));
assert(!beta.includes('betaReadyCertified:true'));
assert(!beta.includes('competencyMasteryAwarded:true'));
assert(labRegistry.includes('releaseStatusUnverified'));
assert(labServer.includes('isBetaCandidateLab(id)'));
assert(academy.includes("toolAccess(env,request,'ONDEMAND_TRAINING')"));
const known=[
 'dashboard.html','labs.html','bootcamp-academy.html','bootcamp.html',
 'journal.html','market-tutor.html','market-commons.html','skills.html',
 'advanced-tool.html','store.html','assets/css/member-beta-workspace.css'
];
for(const item of known)assert(existsSync(item),'Missing actual member route '+item);
const programs=new Map([
 ['truth5',5],['watchlist7',7],['scanners10',10],['foundations30',30],
 ['charts45',45],['risk60',60],['practicum90',90]
]);
for(const [code,days] of programs){
 assert(beta.includes("['"+code+"',{days:"+days+",title:"),
  'Missing approved '+days+'-day Academy destination');
}
const links=[...html.matchAll(/href="([^"]+)"/g)].map(v=>v[1])
 .filter(p=>!p.includes('://')&&!p.startsWith('#'));
for(const link of links){
 const route=link.split('?')[0].split('#')[0];
 if(!route||route.startsWith('/')||route.includes('{{'))continue;
 if(!route.endsWith('.html'))continue;
 assert(existsSync(route),'Broken Dashboard route '+route);
}
console.log('PASS Founding beta continuous release: existing real routes, 336/83 server source, seven days/durations, independent API fallbacks and no invented credit.');
