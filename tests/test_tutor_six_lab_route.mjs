import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/market-tutor-v01492.js';

const cases=[
 ['F2-C07-L01','Construct an Up / Bullish Candle','open, high, low, and close'],
 ['DT-C11-L01','VWAP as a session reference','session reference'],
 ['DT-C19-L02','Share Volume','shares traded'],
 ['DT-C34-L01','Define the Box','upper and lower boundary'],
 ['DT-C45-L01','Failed breakout','predeclared boundary'],
 ['DT-C05-L01','Risk per trade','Risk per share']
];
const byLab=Object.fromEntries(cases.map(([id,title])=>[id,{title}]));
const bySkill={CANDLE_READING:['F2-C07-L01'],VWAP_CONTEXT:['DT-C11-L01'],VOLUME_ANALYSIS:['DT-C19-L02'],
 BREAKOUT_RECOGNITION:['DT-C34-L01','DT-C45-L01'],FAILED_BREAKOUT:['DT-C45-L01'],RISK_PER_SHARE:['DT-C05-L01']};
const expectedGuide={
 'F2-C07-L01':'CANDLE_READING','DT-C11-L01':'VWAP_CONTEXT','DT-C19-L02':'VOLUME_ANALYSIS',
 'DT-C34-L01':'CHART_STRUCTURE','DT-C45-L01':'FAILED_BREAKOUT','DT-C05-L01':'RISK_PER_SHARE'
};
const publicGuides=JSON.parse(readFileSync(new URL('../data/competency-study-guides-v01499.json',import.meta.url),'utf8'));
const env={SUPABASE_URL:'https://test123.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_synthetic',
 ASSETS:{fetch:async request=>new Response(JSON.stringify(String(request.url).includes('competency-study-guides')
  ?publicGuides:{totalCanonicalLabs:419,byLab,bySkill}))}};
const original=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let modelCalls=0;const paths=[];
globalThis.fetch=async url=>{
 const path=String(url);
 paths.push(path);
 if(path.endsWith('/auth/v1/user'))return json({id:'00000000-0000-4000-8000-000000000001'});
 if(path.includes('/rest/v1/profiles?'))return json([{account_kind:'member'}]);
 if(path.includes('/rest/v1/admin_user_flags?'))return json([{status:'active'}]);
 if(path.includes('/rest/v1/admin_user_roles?'))return json([]);
 if(path.includes('/rest/v1/rpc/user_has_tool_access'))return json(true);
 if(path.includes('/rest/v1/rpc/'))return json(false,404);
 modelCalls++;throw Error('Unexpected external request: '+path);
};
try{
 for(const [id,,cue] of cases){
  const request=new Request('https://school.test/api/market-tutor',{method:'POST',
   headers:{authorization:'Bearer member-session','content-type':'application/json'},
   body:JSON.stringify({question:`For canonical Lab ${id}. Learning Journey stage: Practice. Explain this concept.`,
    mode:'explain',allowModel:false,saveHistory:false})});
  const response=await onRequest({request,env});
  const data=await response.json();
  assert.equal(response.status,200,`${id}: ${data.error||'unexpected status'}; ${paths.join(', ')}`);
  assert.equal(data.generation,'original-competency-guide');
  assert.equal(data.labContext.labId,id);
  assert.equal(data.labContext.learningStage,'Practice');
  assert(data.answer.includes(cue),id);
  assert(data.answer.includes('Approved public competency guide:'),id);
  assert(data.answer.includes('Public reference for further study:'),id);
  assert.equal(data.sources.find(source=>source.sourceLabel==='Original public competency study guide')?.id,expectedGuide[id],id);
  assert.equal(data.graded,false);
  assert.equal(data.masteryAwarded,false);
 }
 assert.equal(modelCalls,0);
 console.log('PASS six authenticated source-only Tutor API routes with stage context');
}finally{globalThis.fetch=original}

