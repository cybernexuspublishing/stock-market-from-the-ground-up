/* Boot Camp Academy: one authenticated progress service for six additional
 * approved course durations. Thirty-day controller remains /api/bootcamp.
 * No payment, credit, grade, independent mastery or historical-bar invention.
 */
import {toolAccess} from './member-tool-access.js';
import {academyCatalog,academyByCode,ACADEMY_VERSION} from '../_lib/bootcamp-academy-v014168.js';
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'};
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fault=(reason,status=400)=>Object.assign(new Error(reason),{status});
const allowed=code=>Object.hasOwn(academyByCode,code)&&code!=='foundations30';
function database(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!secret)
  throw fault('Academy member storage is unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 return {base,headers};
}
async function db(env,path,method='GET',body){
 const cfg=database(env);
 const res=await fetch(cfg.base+'/rest/v1/'+path,{
  method,cache:'no-store',
  headers:{...cfg.headers,...(body===undefined?{}:{'content-type':'application/json'})},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 if(!res.ok)throw fault('Private Academy progress database is unavailable or its migration is pending.',503);
 try{return await res.json()}catch{throw fault('Private Academy storage returned an invalid response.',503)}
}
function sameOrigin(request){
 const expected=new URL(request.url).origin,origin=request.headers.get('origin');
 if(origin&&origin!==expected)throw fault('Cross-origin changes are denied.',403);
 const site=request.headers.get('sec-fetch-site');
 if(site&&!['same-origin','none'].includes(site))throw fault('Cross-site changes are denied.',403);
}
async function readInput(request){
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>5000)throw fault('Request is too large.',413);
 const body=await request.text();
 if(body.length>5000)throw fault('Request is too large.',413);
 let data;
 try{data=JSON.parse(body)}catch{throw fault('Invalid JSON request.')}
 if(!data||typeof data!=='object'||Array.isArray(data))throw fault('Invalid Academy request.');
 if(!allowed(data.program))throw fault('Unknown Academy program. The existing 30-day course has a separate route.');
 const plan=academyByCode[data.program];
 if(!['enroll','start','save_reflection'].includes(data.action))throw fault('Unknown progress action.');
 if(data.version!==ACADEMY_VERSION)throw fault('Curriculum version changed. Refresh before saving.',409);
 if(data.action==='enroll'&&data.day!==0)throw fault('Enrollment must not specify a study day.');
 if(data.action!=='enroll'&&(!Number.isSafeInteger(data.day)||data.day<1||data.day>plan.days))
  throw fault('Unknown day for this Boot Camp.');
 if(data.action==='save_reflection'&&(!Number.isSafeInteger(data.expectedRevision)||data.expectedRevision<0||
  typeof data.reflection!=='string'||data.reflection.trim().length<80||data.reflection.trim().length>2000))
  throw fault('A reflection of 80–2,000 characters and a known revision are required.');
 if(data.action!=='save_reflection'&&(data.reflection!==undefined||data.expectedRevision!==undefined))
  throw fault('This operation cannot overwrite a reflection.');
 return {program:data.program,day:data.day,action:data.action,
  reflection:data.action==='save_reflection'?data.reflection.trim():null,
  expectedRevision:data.action==='save_reflection'?data.expectedRevision:null};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw fault('Method not allowed.',405);
  const url=new URL(request.url);
  if(request.method==='GET'&&(url.searchParams.get('action')==='catalog'||!url.searchParams.has('program'))){
   return respond({ok:true,version:ACADEMY_VERSION,programs:academyCatalog,
    notice:'Study-only curriculum listings; course completion never awards an official competency or trade result.'});
  }
  const auth=await toolAccess(env,request,'ONDEMAND_TRAINING');
  if(!auth.authorized||!auth.userId)throw fault(auth.reason||'Authorized member training access required.',403);
  if(request.method==='GET'){
   const code=url.searchParams.get('program');
   if(!allowed(code)){
    if(code==='foundations30')return respond({ok:true,existingRoute:'bootcamp.html',program:academyByCode.foundations30});
    throw fault('Unknown Academy program.',404);
   }
   const program=academyByCode[code];
   const curriculum=program.curriculum;
   let progressAvailable=true,rows=[],enrolled=false;
   try{
    const enrollment=await db(env,'gu_bootcamp_academy_enrollments_v014168?select=program_code,status,program_version&user_id=eq.'+
     encodeURIComponent(auth.userId)+'&program_code=eq.'+encodeURIComponent(code)+'&limit=1');
    if(!Array.isArray(enrollment)||enrollment.length>1)throw Error('Invalid enrollment data');
    enrolled=enrollment.length===1&&enrollment[0].status==='active'&&enrollment[0].program_version===ACADEMY_VERSION;
    const stored=await db(env,'gu_bootcamp_academy_progress_v014168?select=day_number,status,revision,reflection,started_at,updated_at&user_id=eq.'+
     encodeURIComponent(auth.userId)+'&program_code=eq.'+encodeURIComponent(code)+'&order=day_number.asc&limit='+program.days);
    // A verified number of saved notes requires valid, unique revisions.
    // Reject corrupt or partial backend data instead of inventing a count.
    if(!Array.isArray(stored)||new Set(stored.map(x=>x.day_number)).size!==stored.length||
     stored.some(x=>!Number.isSafeInteger(x.day_number)||x.day_number<1||x.day_number>program.days||
      !Number.isSafeInteger(x.revision)||x.revision<1||
      !['in_progress','reflection_saved'].includes(x.status)||
      (x.status==='reflection_saved'&&
       (typeof x.reflection!=='string'||x.reflection.trim().length<80||x.reflection.trim().length>2000))||
      (x.status==='in_progress'&&x.reflection!==null)))
     throw Error('Invalid private progress data');
    rows=stored.map(x=>({day:x.day_number,status:x.status,revision:x.revision,reflection:x.reflection,
     startedAt:x.started_at,updatedAt:x.updated_at}));
   }catch{progressAvailable=false;enrolled=false;rows=[]}
   return respond({ok:true,version:ACADEMY_VERSION,program,curriculum,
    progress:progressAvailable?rows:null,progressAvailable,enrolled,
    disclaimer:progressAvailable?'Member study progress is ungraded and does not grant official mastery.':
     'Private Academy storage is unavailable; no enrollment or completed-day status can be confirmed.'});
  }
  sameOrigin(request);
  const form=await readInput(request);
  const result=await db(env,'rpc/gu_bootcamp_academy_save_v014168','POST',{
   p_user:auth.userId,p_program:form.program,p_day:form.day,p_action:form.action,
   p_reflection:form.reflection,p_expected_revision:form.expectedRevision,p_version:ACADEMY_VERSION
  });
  if(result?.conflict===true)return respond({ok:false,error:'Your progress changed in another tab. Reload before saving again.'},409);
  if(form.action==='enroll'){
   if(result?.ok!==true||result?.program!==form.program||result.enrollment!=='active'||
     result.graded!==false||result.competencyMasteryAwarded!==false)
    throw fault('The Academy enrollment could not be verified.',503);
   return respond({ok:true,version:ACADEMY_VERSION,enrolled:true,program:form.program});
  }
  if(!result||result.program!==form.program||result.day!==form.day||
     !Number.isSafeInteger(result.revision)||result.revision<1||
     !['in_progress','reflection_saved'].includes(result.status)||
     result.graded!==false||result.competencyMasteryAwarded!==false||result.marketOutcomeClaimed!==false)
    throw fault('The Academy progress update could not be verified.',503);
  return respond({ok:true,progress:result,disclaimer:'Saved as your own study reflection, not an official assessment or market transaction.'});
 }catch(error){
  const status=[400,401,403,404,405,409,413].includes(error.status)?error.status:503;
  return respond({ok:false,error:status===503?'Academy service or member storage unavailable.':
    error.message||'Academy service is unavailable.'},status);
 }
}
