/* Free Dashboard UX and private usage contract, zero provider credentials. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=src('dashboard.html'),js=src('assets/js/dashboard.js');
for(const id of ['free-learning-launchpad','free-learning-title','free-learning-journal-usage',
 'free-learning-sim-usage','free-learning-usage-status'])
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Free dashboard ID must be unique '+id);
assert(html.includes('id="free-learning-launchpad"')&&
 html.includes('aria-labelledby="free-learning-title" hidden'),'Free learning plan must not appear before session');
assert(html.includes('simulator.html?practice=free'),'actual working fictional practice direct link');
assert(html.includes('assets/css/free-member-launchpad.css'),'real responsive design stylesheet');
assert(html.includes('class="free-learning-boundaries"'),'Community and upgrade explanations must be built in');
assert(html.includes('market-commons.html?forum=START_HERE'),'Use actual available Start Here community board');
assert(html.includes('community-guidelines.html'),'Published community rules discoverable');
assert(html.includes('A paid entitlement does not create a licensed dataset'),'Do not imply paid membership makes unavailable historical data real');
assert(html.includes('Explanations, examples and guided teaching never require Lumens.'),'Free teaching never costs Lumens');
assert(js.includes('if (!active.length) {')&&js.includes('void renderFreeLearningDashboard(sb);'),'paid tier remains distinct from Free launchpad');
assert(js.includes('renderFreeFoundationEvidence(sb,user.id);'),'Free skills must use private Academy progress');
assert(js.includes('renderRecentFreeJournal(sb,user.id);'),'weekly learning overview includes actual saved Journal data');
assert(html.includes('Not Yet Assessed'),'never invent assessed skills for Free reflections');
assert(!js.includes("sb.rpc('gu_v014121_my_free_week_usage', {"),'user ID must never be supplied to owner-scoped usage RPC');
const match=js.match(/async function renderFreeLearningDashboard\(sb\) \{[\s\S]*?\n\}\n\nasync function initDashboard/);
assert(match,'Free dashboard usage function must exist');
const fn=match[0].slice(0,-'\n\nasync function initDashboard'.length);
function environment(reply){
 const nodes=Object.fromEntries(['free-learning-launchpad','free-learning-usage-status',
  'free-learning-journal-usage','free-learning-sim-usage'].map(k=>[k,{id:k,hidden:true,textContent:''}]));
 const calls=[];
 const context={document:{getElementById:n=>nodes[n]||null},
  setText:(id,text)=>{if(nodes[id])nodes[id].textContent=text},
  Date,Number,Error};
 const method=runInNewContext('('+fn+')',context);
 const sb={rpc:async(name,...args)=>{calls.push({name,args});return reply}};
 return {nodes,calls,run:()=>method(sb)};
}
const okay=environment({data:{journalUsed:3,journalLimit:15,simulatorSavesUsed:2,simulatorSaveLimit:10,
 journalUnlimited:false,simulatorUnlimited:false,resetsAtUtc:'2026-11-02T00:00:00Z'},error:null});
await okay.run();
assert.equal(okay.nodes['free-learning-launchpad'].hidden,false);
assert.equal(okay.nodes['free-learning-journal-usage'].textContent,'3 / 15');
assert.equal(okay.nodes['free-learning-sim-usage'].textContent,'2 / 10');
assert.match(okay.nodes['free-learning-usage-status'].textContent,/Resets/);
assert.deepEqual(okay.calls,[{name:'gu_v014121_my_free_week_usage',args:[]}]);
const unavailable=environment({data:null,error:{code:'503'}});
await unavailable.run();
assert.equal(unavailable.nodes['free-learning-journal-usage'].textContent,'Unavailable');
assert.match(unavailable.nodes['free-learning-usage-status'].textContent,/server-side weekly limits still apply/);
console.log('PASS Free Dashboard: real linked simulator, account-scoped true 15/10 weekly meter, no cross-member IDs, fail-closed usage errors.');
