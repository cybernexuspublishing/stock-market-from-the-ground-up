// v0.14.0.96: zero-cost 419-source completeness and private six-collection access.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/interactive-training.js';
const catalog=JSON.parse(readFileSync(new URL('../lab-catalog.json',import.meta.url),'utf8'));
assert.equal(catalog.counts.total,419);
assert.equal(catalog.labs.length,419);
assert.equal(new Set(catalog.labs.map(x=>x.lab_id)).size,419);
const groups=Object.groupBy(catalog.labs,x=>x.book_code);
assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),{
 FOUNDATION_BOOK_1:15,FOUNDATION_BOOK_2:46,FOUNDATION_BOOK_3:33,
 DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100});
assert.equal(catalog.labs.filter(x=>Array.isArray(x.metadata?.how)&&x.metadata.how.length).length,325);
const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.96_419_ORIGINAL_CONCEPTUAL_ASSESSMENT_DRAFTS_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
for(const c of ["419","distinct_collections<>6","ON CONFLICT(lab_id,version) DO NOTHING",
 "'draft'","'original_hypothetical_unreviewed_v01496'",
 "lab_training_sets_v014","lab_instruction_v014","ORIGINAL hypothetical","numeric_key",
 "EVIDENCE","FOCUS","ORIGINAL_MATH","BOUNDARY"])
 assert(sql.includes(c),'SQL source/cost/safety check missing '+c);
assert(!/CREATE TABLE|INSERT INTO public.market_datasets|INSERT INTO public.gu_replay_bars_v01492|DELETE FROM/i.test(sql),'No duplicate database, fictional historical tape or destructive writes');
assert(!/review_state,'reviewed'/.test(sql),'Auto-approving 419 is prohibited');
const ui=readFileSync(new URL('../assets/js/site-lab-experience.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../site-lab.html',import.meta.url),'utf8');
assert(ui.includes("GroundUpInteractiveTraining.begin(LAB.lab_id,'guided',training)"));
assert(ui.includes('Complete Reflection (Ungraded)'));
assert(html.includes('assets/js/interactive-training.js'));
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummy',
 SUPABASE_SECRET_KEY:'sb_secret_dummy'};
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',grants=new Set();
let access=true,showcase=false,registryVisible=true;
let current='DT-C01-L01',code='DAY_TRADING_BOOK_1';
const old=globalThis.fetch,requests=[];
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(u,opts={})=>{
 const path=String(u);requests.push({path,opts});
 if(path.endsWith('/auth/v1/user'))return json({id:member});
 if(path.includes('/profiles?'))return json([{account_kind:showcase?'showcase':'member'}]);
 if(path.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(path.includes('/rpc/user_has_tool_access'))return json(access);
 if(path.includes('/lab_instruction_v014?'))return json([]);
 if(path.includes('/platform_labs?'))return json([{lab_id:current,book_code:code,active:true,registry_visible:registryVisible}]);
 if(path.includes('/user_library?'))return json(grants.has(code)?[{product_code:code,expires_at:null}]:[]);
 if(path.includes('/book_key_redemptions?'))return json([]);
 if(path.includes('/user_plan_grants?'))return json([]);
 if(path.includes('/site_subscriptions?'))return json([]);
 if(path.includes('/admin_user_roles?'))return json([]);
 if(path.includes('/lab_training_sets_v014?'))return json([{lab_id:current,version:96,review_state:'reviewed',
  source_status:'original_hypothetical_unreviewed_v01496',questions:[{id:'EVIDENCE',prompt:'Decision observation',
  kind:'choice',options:['Observed first','Guess future','Fabricate']}]}]);
 throw Error('Unexpected mock '+path);
};
async function probe(lab,collection){
 current=lab;code=collection;
 const r=await onRequest({request:new Request('https://site.test/api/interactive-training?action=available&labId='+lab,
 {headers:{authorization:'Bearer logged-in'}}),env});return[r.status,await r.json()];
}
try{
 let [s]=await probe('DT-C01-L01','DAY_TRADING_BOOK_1');assert.equal(s,403,'Day Trading needs purchased book rights');
 grants.add('DAY_TRADING_BOOK_1');[s]=await probe('DT-C01-L01','DAY_TRADING_BOOK_1');assert.equal(s,200);
 grants.clear();[s]=await probe('TAPE-C01-L01','READING_THE_TAPE');assert.equal(s,403);
 grants.add('READING_THE_TAPE');[s]=await probe('TAPE-C01-L01','READING_THE_TAPE');assert.equal(s,200);
 grants.clear();[s]=await probe('SITE-001','SITE_EXCLUSIVE');assert.equal(s,200,'Site Lab uses existing tool entitlement');
 registryVisible=false;[s]=await probe('SITE-001','SITE_EXCLUSIVE');assert.equal(s,404);
 registryVisible=true;access=false;[s]=await probe('SITE-001','SITE_EXCLUSIVE');assert.equal(s,403);
 access=true;showcase=true;[s]=await probe('SITE-001','SITE_EXCLUSIVE');assert.equal(s,403);
 for(const x of requests.filter(x=>x.path.includes('/rest/v1/'))){
  assert.equal(x.opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(x.opts.headers.authorization,undefined);
 }
 console.log('PASS v96: canonical 419 IDs, 325 existing authored narratives, original draft-only private rubric, six-book gate, SITE tool access, Showcase denial and ungraded self-report labeling.');
}finally{globalThis.fetch=old}
