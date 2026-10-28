/* Validate the active /labs.html registry, not retired fallback navigation.
 * A failed release/entitlement check must never expose a Lab Start link.
 * Locally mocked curriculum and member rights only; no external writes.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';
const html=readFileSync('labs.html','utf8');
const src=readFileSync('assets/js/labs.js','utf8');
assert(/src="assets\/js\/labs\.js(?:\?[^"]*)?"/.test(html),'Test must target the versioned active /labs.html script');
assert(!html.includes('src="assets/js/lab-registry.js"'));
for(const term of [
 "fetch('/api/lab-beta-scope',{cache:'no-store'})",
 "new Set([...data.selectedForPrebeta,...data.upcoming]).size!==419",
 "betaScopeVerified && betaCandidateIds.has(x.id)",
 "fetch('/api/lab-release-availability',{cache:'no-store'})",
 "fetch('/api/lab-registry-access'",
 "!availabilityVerified || !publishedAssessments.has(labId)"
])assert(src.includes(term),'Registry fail-closed source contract missing: '+term);

const root={innerHTML:'',querySelectorAll:()=>[]};
const count={textContent:''};
const document={addEventListener(){},getElementById(id){return id==='lab-body'?root:id==='lab-count'?count:null;}};
const context=vm.createContext({document,window:{},console,Set,Map,URLSearchParams,encodeURIComponent});
vm.runInContext(src,context,{filename:'assets/js/labs.js'});
const candidate=BETA_CANDIDATE_IDS[0],upcoming=BETA_UPCOMING_IDS[0];
const row=id=>({id,book:1,concept:'Evidence-based source evaluation',
 chapterTitle:'Original study example',chapter:1,skill:'Research verification',marketContexts:[]});
context.__candidate=candidate;context.__rows=[row(candidate),row(upcoming)];
const block=id=>root.innerHTML.split('id="row-'+id+'"')[1]?.split('</article>')[0]||'';

vm.runInContext("allLabs=__rows;availabilityVerified=false;betaScopeVerified=true;betaCandidateIds=new Set([__candidate]);currentUser={id:'11111111-1111-4111-8111-111111111111'};memberProgressAvailable=false;registryRights=null;renderLabs(allLabs);",context);
assert.match(block(candidate),/Upcoming/);
assert(!block(candidate).includes('lab-open-btn'),'Candidate alone does not create authorization');
assert.match(block(upcoming),/Upcoming/);
assert(!block(upcoming).includes('lab-open-btn'),'Upcoming must not have a Start link');
assert(!root.innerHTML.includes('Open Interactive Lab'));
assert(root.innerHTML.includes('Private progress not verified'),'Unverified progress must not be invented');

vm.runInContext("availabilityVerified=true;publishedAssessments=new Set();guidedBetaLabs=new Set([__candidate]);registryRights={freeEligible:true,bookCodes:['FOUNDATION_BOOK_1'],freeSampleIds:[],interactive:false,training:false};renderLabs(allLabs);",context);
assert(block(candidate).includes('Open guided beta practice (ungraded)'),
 'Only independently verified release plus book rights may open guided study');
assert(block(candidate).includes('lab-open-btn'));
assert(!block(upcoming).includes('lab-open-btn'));
assert(!root.innerHTML.includes('official grade awarded'));

vm.runInContext("registryRights=null;renderLabs(allLabs);",context);
assert(!block(candidate).includes('lab-open-btn'),'Entitlement outage must relock even a released Lab');

vm.runInContext("availabilityVerified=false;betaScopeVerified=false;betaCandidateIds=new Set();renderLabs(allLabs);",context);
assert(!root.innerHTML.includes('lab-open-btn'),'Source outage must fail closed');
console.log('PASS active 419-Lab registry: no fallback launch under outage, verified guided rights only, Upcoming locked, ungraded study');
