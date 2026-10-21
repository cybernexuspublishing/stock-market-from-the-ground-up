/* Deployment 04 of 08 — existing training entitlement, canonical competencies,
 * server-owned member progress. No author answer keys or historical data bundled.
 */
import {toolAccess} from './member-tool-access.js';
import {bootcampCurriculumV014144 as curriculum} from '../_lib/bootcamp-curriculum-v014144.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!secret)throw fail('Bootcamp storage unavailable.',503);
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {base,headers};
}
async function store(env,path,method='GET',body){
 const c=config(env),r=await fetch(c.base+'/rest/v1/'+path,{
  method,cache:'no-store',headers:{...c.headers,...(body===undefined?{}:{'content-type':'application/json'})},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(!r.ok)throw fail('Bootcamp progress storage or required private migration is not available.',503);
 try{return await r.json()}catch{throw fail('Bootcamp progress response is invalid.',503)}
}
function originCheck(request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)throw fail('Cross-origin progress updates are not allowed.',403);
 const site=request.headers.get('sec-fetch-site');
 if(site&& !['same-origin','none'].includes(site))throw fail('Cross-site write denied.',403);
}
async function requestBody(request){
 const size=Number(request.headers.get('content-length')||0);
 if(size>5000)throw fail('Request too large.',413);
 const raw=await request.text();
 if(raw.length>5000)throw fail('Request too large.',413);
 let b;try{b=JSON.parse(raw)}catch{throw fail('Invalid request JSON.')}
 if(!b||typeof b!=='object'||Array.isArray(b))throw fail('Invalid request.');
 if(!Number.isSafeInteger(b.day)||b.day<1||b.day>30||!['start','save_reflection'].includes(b.action))
   throw fail('Unknown study day or action.');
 if(b.action==='save_reflection'&&(typeof b.reflection!=='string'||
    b.reflection.trim().length<80||b.reflection.trim().length>2000))
   throw fail('Reflection must contain 80–2000 characters.');
 if(b.action==='start'&&b.reflection!==undefined)throw fail('A start action cannot invent a reflection.');
 return {day:b.day,action:b.action,reflection:b.action==='save_reflection'?b.reflection.trim():null};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw fail('Method not allowed.',405);
  const auth=await toolAccess(env,request,'ONDEMAND_TRAINING');
  if(!auth.authorized)throw fail(auth.reason||'Active training access required.',403);
  if(request.method==='GET'){
   const url=new URL(request.url);
   if(url.searchParams.get('action')&&url.searchParams.get('action')!=='curriculum')
    throw fail('Unsupported Bootcamp action.',404);
   // Missing schema cannot become a reported 0% member record.
   let progress=null,progressAvailable=true,error=null;
   try{
    const rows=await store(env,'gu_bootcamp_progress_v014144?select=day_number,status,reflection,started_at,first_reflected_at,updated_at&user_id=eq.'+
      encodeURIComponent(auth.userId)+'&order=day_number.asc&limit=30');
    if(!Array.isArray(rows)||rows.some(x=>!Number.isInteger(x.day_number)||x.day_number<1||x.day_number>30))
      throw Error('Unreliable member progress response');
    progress=rows.map(x=>({day:x.day_number,status:x.status,reflection:x.reflection,
     startedAt:x.started_at,firstReflectedAt:x.first_reflected_at,updatedAt:x.updated_at}));
   }catch{
    progressAvailable=false;error='Private Bootcamp progress has not been verified; saved status cannot be displayed or written until the Owner installs and validates the migration.';
   }
   return respond({ok:true,curriculum,progressAvailable,progress,error,
    disclaimer:'Self-reported reflections are separate from reviewed Lab scores and the existing 30 official competencies. Never invent historical data or trade results.'});
  }
  originCheck(request);
  const b=await requestBody(request);
  const result=await store(env,'rpc/gu_bootcamp_save_progress_v014144','POST',{
   p_user:auth.userId,p_day:b.day,p_action:b.action,p_reflection:b.reflection
  });
  if(!result||result.day!==b.day||!['in_progress','reflection_saved'].includes(result.status)||
     result.graded!==false||result.competencyMasteryAwarded!==false)
    throw fail('Private Bootcamp write did not return verified evidence.',503);
  return respond({ok:true,progress:result,disclaimer:'Reflection saved as member self-report. No Lab grade, competency mastery, stock execution or verified market outcome was awarded.'});
 }catch(e){
  const status=[400,401,403,404,405,413].includes(e.status)?e.status:503;
  return respond({ok:false,error:status===503?'Bootcamp service or private progress storage unavailable.':e.message||'Bootcamp unavailable.'},status);
 }
}
