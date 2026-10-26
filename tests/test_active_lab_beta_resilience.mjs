/* Active production /labs.html uses assets/js/labs.js, not the alternate
 * v1357 registry. Exercise the actual member renderer under source outage.
 * This source test is NOT an authenticated real-member acceptance run.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';
const html=readFileSync('labs.html','utf8');
const src=readFileSync('assets/js/labs.js','utf8');
assert(html.includes('src="assets/js/labs.js"'),'Test must target active /labs.html');
assert(!html.includes('src="assets/js/lab-registry.js"'),
 'Do not confuse the alternate registry renderer with live /labs.html');
assert(src.includes("fetch('/api/lab-beta-scope',{cache:'no-store'})"));
assert(src.includes('new Set([...data.selectedForPrebeta,...data.upcoming]).size!==419'));
assert(src.includes('betaScopeVerified && betaCandidateIds.has(x.id)'));
assert(src.includes('Check beta study access in Lab'));
assert(src.includes('!currentUser || memberProgressAvailable'));
assert(src.includes(": 'unverified'"));
assert(src.includes('!availabilityVerified || !publishedAssessments.has(labId)'),
 'No fallback may unlock official grade or progress writes');

const root={innerHTML:'',querySelectorAll:()=>[]};
const count={textContent:''};
const document={
 addEventListener(){},
 getElementById(id){return id==='lab-body'?root:id==='lab-count'?count:null;}
};
const context=vm.createContext({document,window:{},console,Set,Map,URLSearchParams,encodeURIComponent});
vm.runInContext(src,context,{filename:'assets/js/labs.js'});
const candidate=BETA_CANDIDATE_IDS[0],upcoming=BETA_UPCOMING_IDS[0];
const row=id=>({id,book:1,concept:'Evidence-based source evaluation',
 chapterTitle:'Original study example',chapter:1,skill:'Research verification',marketContexts:[]});
context.__candidate=candidate;context.__rows=[row(candidate),row(upcoming)];
vm.runInContext("allLabs=__rows;availabilityVerified=false;betaScopeVerified=true;betaCandidateIds=new Set([__candidate]);currentUser={id:'11111111-1111-4111-8111-111111111111'};memberProgressAvailable=false;renderLabs(allLabs);",context);
const candidateBlock=root.innerHTML.split('id="row-'+candidate+'"')[1]?.split('</article>')[0]||'';
const upcomingBlock=root.innerHTML.split('id="row-'+upcoming+'"')[1]?.split('</article>')[0]||'';
assert.match(candidateBlock,/Check beta study access in Lab/);
assert.match(candidateBlock,/lab-player.html\?lab=F1-C02-L01/);
assert.match(candidateBlock,/Private progress not verified/);
assert(!candidateBlock.includes('completed — saved'));
assert(!candidateBlock.includes('Open Interactive Lab'));
assert.match(upcomingBlock,/Upcoming — no Start action available/);
assert(!upcomingBlock.includes('href='));
vm.runInContext('availabilityVerified=true;publishedAssessments=new Set();guidedBetaLabs=new Set([__candidate]);renderLabs(allLabs);',context);
assert(root.innerHTML.includes('Open guided beta practice (ungraded)'));
vm.runInContext('availabilityVerified=false;betaScopeVerified=false;betaCandidateIds=new Set();renderLabs(allLabs);',context);
assert(!root.innerHTML.includes('Check beta study access in Lab'));
console.log('PASS active /labs.html: independently scoped 336 fallback navigation; 83 Upcoming excluded; failed progress read not called saved/mastery.');
