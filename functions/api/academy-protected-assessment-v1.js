/* Three new Academy Boot Camps — private, day-specific, protected assessments.
 * All grading remains in the established server-owned competency RPC.
 * No new classes, rates, marks or client-side answer keys are introduced.
 */
import {toolAccess} from './member-tool-access.js';
const codes=Object.freeze({tape10:10,indicators10:10,filings7:7});
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:H});
const reject=(message,status=400)=>Object.assign(new Error(message),{status});
const enc=encodeURIComponent;
function settings(env){
 const base=String(env?.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env?.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!secret)throw reject('Protected assessment storage unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 return {base,headers};
}
async function read(env,path,body){
 const cfg=settings(env),isPost=body!==undefined;
 const response=await fetch(cfg.base+'/rest/v1/'+path,{method:isPost?'POST':'GET',cache:'no-store',
  headers:{...cfg.headers,...(isPost?{'content-type':'application/json'}:{})},
  body:isPost?JSON.stringify(body):undefined});
 if(!response.ok)throw reject('Protected assessment storage unavailable.',503);
 return response.json().catch(()=>{throw reject('Invalid protected assessment response.',503)});
}
function gate(request,env){
 if(env?.ACADEMY_THREE_CAMPS_ENABLED!=='true')throw reject('This course is not released.',404);
 const url=new URL(request.url),program=url.searchParams.get('program');
 const day=Number(url.searchParams.get('day'));
 if(!Object.hasOwn(codes,program)||!Number.isSafeInteger(day)||day<1||day>codes[program])
  throw reject('Unknown Academy assessment.',404);
 return {program,day};
}
function originCheck(request){
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==new URL(request.url).origin)throw reject('Cross-origin assessment submission denied.',403);
 if(site&&!['same-origin','none'].includes(site))throw reject('Cross-site assessment submission denied.',403);
}
function safeCase(c){
 if(!Array.isArray(c?.questions)||c.questions.length<4||c.questions.length>40)return null;
 const seen=new Set(),dims=new Set(),questions=[];
 for(const q of c.questions){
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(String(q?.id||''))||seen.has(q.id)||
   !['knowledge','recognition','decision','process'].includes(q.dimension)||
   typeof q.prompt!=='string'||q.prompt.length<8||q.prompt.length>1800||
   !Array.isArray(q.options)||q.options.length<2||q.options.length>8)return null;
  seen.add(q.id);dims.add(q.dimension);
  const used=new Set(),options=[];
  for(const o of q.options){
   if(!/^[A-Za-z0-9_-]{1,30}$/.test(String(o?.code||''))||used.has(o.code)||
    typeof o.label!=='string'||o.label.length<1||o.label.length>700)return null;
   used.add(o.code);options.push({code:o.code,label:o.label});
  }
  questions.push({id:q.id,dimension:q.dimension,prompt:q.prompt,options});
 }
 if(dims.size!==4)return null;
 return{caseCode:c.case_code,title:c.title,description:c.description,competencyCode:c.competency_code,
  version:c.version,questions};
}
async function nextCase(env,userId,program,day){
 const mapped=await read(env,'gu_academy_protected_cases_v1?select=case_code,variant,source_status&program_code=eq.'+
  enc(program)+'&day_number=eq.'+day+'&order=variant.asc&limit=5');
 if(!Array.isArray(mapped)||mapped.length>5)throw reject('Assessment mapping could not be verified.',503);
 if(mapped.length===0)return{reason:'assessment_not_authored',attempts:0};
 const attempts=await read(env,'competency_attempts_v135?select=case_code,submitted_at,final_score&user_id=eq.'+
  enc(userId)+'&case_code=in.('+mapped.map(m=>enc(m.case_code)).join(',')+')&limit=5');
 if(!Array.isArray(attempts)||attempts.length>5)throw reject('Assessment attempt history unavailable.',503);
 const used=new Set(attempts.map(a=>a.case_code));
 for(const m of mapped){
  if(used.has(m.case_code))continue;
  if(m.source_status!=='approved')return{reason:'assessment_not_reviewed',attempts:attempts.length};
  const rows=await read(env,'competency_cases_v135?select=case_code,title,description,competency_code,questions,version,reviewed_by,reviewed_at,active&case_code=eq.'+
   enc(m.case_code)+'&limit=1');
  if(!Array.isArray(rows)||rows.length!==1)throw reject('Assessment case linkage invalid.',503);
  const c=rows[0];
  if(c.active!==true||!c.reviewed_by||!c.reviewed_at)return{reason:'assessment_not_reviewed',attempts:attempts.length};
  const projected=safeCase(c);
  if(!projected)return{reason:'assessment_invalid',attempts:attempts.length};
  return{case:projected,attempts:attempts.length};
 }
 return{reason:mapped.length?'no_fresh_reviewed_case':'assessment_not_authored',attempts:attempts.length};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw reject('Method not allowed.',405);
  const {program,day}=gate(request,env);
  // Same server-side paid-training entitlement and account restrictions as Academy.
  const a=await toolAccess(env,request,'ONDEMAND_TRAINING');
  if(!a.userId||!a.authorized)throw reject(a.reason||'Eligible training access required.',403);
  // An eligible user must also have enrolled in this specific Boot Camp.
  const enrollment=await read(env,'gu_bootcamp_academy_enrollments_v014168?select=status&user_id=eq.'+
   enc(a.userId)+'&program_code=eq.'+enc(program)+'&status=eq.active&limit=1');
  if(!Array.isArray(enrollment)||enrollment.length!==1)throw reject('Active Boot Camp enrollment required.',403);
  const state=await nextCase(env,a.userId,program,day);
  if(request.method==='GET'){
   return reply({ok:true,program,day,officialAssessment:!!state.case,
    ...(state.case?{assessment:state.case}:{reason:state.reason}),
    priorSubmissions:state.attempts});
  }
  originCheck(request);
  const raw=await request.text();
  if(raw.length>7000)throw reject('Assessment submission too large.',413);
  let input;try{input=JSON.parse(raw)}catch{throw reject('Invalid assessment submission.')}
  if(!state.case)throw reject('No reviewed independent assessment is available.',409);
  if(input?.caseCode!==state.case.caseCode||!input.answers||Array.isArray(input.answers)||
   typeof input.answers!=='object'||Object.keys(input.answers).length!==state.case.questions.length)
   throw reject('Wrong or incomplete independent assessment.',400);
  for(const q of state.case.questions){
   const answer=input.answers[q.id];
   if(typeof answer!=='string'||!q.options.some(o=>o.code===answer))
    throw reject('Invalid answer selection.',400);
  }
  const result=await read(env,'rpc/submit_competency_case_v135',{
   p_user:a.userId,p_case:state.case.caseCode,p_answers:input.answers});
  if(result?.ok!==true)return reply({ok:false,reason:result?.reason||'assessment_rejected'},result?.reason==='already_submitted'?409:400);
  return reply({ok:true,program,day,result});
 }catch(e){
  const status=[400,401,403,404,405,409,413].includes(e.status)?e.status:503;
  return reply({ok:false,error:status===503?'Protected assessment service unavailable.':e.message},status);
 }
}
