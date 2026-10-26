/* Founding 600 partial-release resilience tests (Node 22; no credentials).
 * If a nonauthoritative status endpoint fails, beta candidates may navigate
 * to independently authorized server checks; the other 83 never get Start.
 * A private progress read failure must not be translated into fake "0%" work.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';

const source=readFileSync('assets/js/lab-registry.js','utf8');
const marker="if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();";
assert(source.includes(marker),'Cannot instrument registry safely: init contract changed');
const injected=source.replace(marker,
 "globalThis.__betaRegistryTestHooks={verifyBetaScope,card};"+marker);
let responseMode='down';
const response=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json'}});
const scope={
 ok:true,targetSelected:336,targetUpcoming:83,
 selectedForPrebeta:BETA_CANDIDATE_IDS,upcoming:BETA_UPCOMING_IDS
};
const seen=[];
const mockFetch=async (url,options={})=>{
 seen.push(String(url));
 assert.equal(options.cache,'no-store');
 if(url==='/api/lab-beta-scope')
  return response(responseMode==='invalid_scope'?{ok:false}:scope,responseMode==='offline_scope'?503:200);
 if(url==='/api/lab-release-availability'){
  if(responseMode==='down')return response({ok:false},503);
  if(responseMode==='invalid_publication')return response({ok:true,publishedIds:[BETA_UPCOMING_IDS[0]],guidedBetaIds:[]});
  return response({ok:true,publishedIds:[],guidedBetaIds:[BETA_CANDIDATE_IDS[0]]});
 }
 throw Error('Unexpected URL '+url);
};
const context={
 globalThis:null,
 location:{pathname:'/labs.html',origin:'https://course.example'},
 document:{readyState:'loading',addEventListener(){}},
 fetch:mockFetch,URL,URLSearchParams,Response,Set,Map,encodeURIComponent,
 console
};
context.globalThis=context;
runInNewContext(injected,context,{filename:'assets/js/lab-registry.js'});
const {verifyBetaScope,card}=context.__betaRegistryTestHooks;
const entry=id=>({lab_id:id,title:'Evidence verification lesson',
 metadata:{difficulty:'beginner'},chapter_number:1,lab_type:'core'});
const candidate=BETA_CANDIDATE_IDS[0],upcoming=BETA_UPCOMING_IDS[0];
await verifyBetaScope();
let candidateCard=card(entry(candidate));
let upcomingCard=card(entry(upcoming));
assert.match(candidateCard,/Verify Guided Beta Access in Lab/);
assert.match(candidateCard,/href="lab-player.html\?lab=F1-C02-L01"/,
 'Only canonical Lab player may independently check a candidate');
assert(!candidateCard.includes('Reviewed exercise'));
assert(!candidateCard.includes('Concept 100%'));
assert.match(upcomingCard,/Upcoming · No Start/);
assert(!upcomingCard.includes('href='),
 'The 83 Upcoming Labs cannot be started during availability outages');

responseMode='healthy';await verifyBetaScope();
assert.match(card(entry(candidate)),/Open Guided Beta · Ungraded/);
assert(!card(entry(upcoming)).includes('href='));

responseMode='invalid_publication';await verifyBetaScope();
assert.match(card(entry(candidate)),/Verify Guided Beta Access in Lab/);
assert(!card(entry(upcoming)).includes('href='),
 'A corrupted publication response must not unlock an Upcoming Lab');

for(const mode of ['offline_scope','invalid_scope']){
 responseMode=mode;
 await assert.rejects(()=>verifyBetaScope(),'Unverified 336/83 selection must not become a Start list');
}

// The real member-progress data is private and queried by RLS. If that
// read fails, the registry intentionally keeps the collection renderable.
assert(source.includes('progressVerified=false;'));
assert(source.includes('progressVerified,gradedScore:grades.get(x.lab_id)'));
assert(source.includes("status=progressKnown?(l.progress?.status||'not_started'):'unverified'"));
assert(source.includes('Private progress unavailable; no completion status is inferred.'));
assert(source.includes('if(p.error||!Array.isArray(p.data))'));
assert(!source.includes('if(p.error)throw p.error;'),
 'A private-progress outage must not abort discovery for every Lab');
assert(seen.some(x=>x==='/api/lab-release-availability'));

console.log('PASS Founding beta registry: candidate navigation survives status outage, 83 Upcoming excluded, corrupt scope fails closed, progress outage does not invent status.');
