/* Personalized FREE study preferences. Uses existing free5 Academy study progress
 * without inventing mastery or a second learning-progress ledger.
 * All private access via verified Auth and the established member suspension guard.
 */
import {toolAccess} from './member-tool-access.js';
import {freeFoundationsProgram} from '../_lib/bootcamp-academy-v014168.js';
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const respond=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:HEAD});
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
const focuses=['START_BASICS','CANDLES','VERIFY_SOURCES','WATCHLIST','RISK'];
const experiences=['NEW','SOME_BASICS','RETURNING'];
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(base)||!key)throw bad('Private learning settings unavailable.',503);
 return {base,headers:{apikey:key,accept:'application/json',...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)?{authorization:'Bearer '+key}:{})}};
}
async function db(env,path,method='GET',body){
 const c=cfg(env);
 let result;
 try{result=await fetch(c.base+'/rest/v1/'+path,{
   method,cache:'no-store',signal:AbortSignal.timeout(12000),
   headers:{...c.headers,...(method==='GET'?{}:{prefer:'return=representation'}),
    ...(body===undefined?{}:{'content-type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)})
 })}catch{throw bad('Private learning preferences storage unavailable.',503)}
 if(!result.ok){
  if(result.status===409||result.status===23505)throw bad('Another tab saved your preferences. Reload and try again.',409);
  throw bad('Private learning preferences storage unavailable.',503);
 }
 const rows=await result.json().catch(()=>null);
 if(!Array.isArray(rows))throw bad('Private learning preferences returned invalid data.',503);
 return rows;
}
function sameOrigin(request){
 const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
 if(origin&&origin!==new URL(request.url).origin||site&&!['none','same-origin'].includes(site))
  throw bad('Cross-origin study preference changes are denied.',403);
}
async function input(req){
 if(Number(req.headers.get('content-length')||0)>1300)throw bad('Request too large.',413);
 const raw=await req.text();if(raw.length>1300)throw bad('Request too large.',413);
 let x;try{x=JSON.parse(raw)}catch{throw bad('Invalid preference JSON.')}
 if(!x||typeof x!=='object'||Array.isArray(x)||
  !focuses.includes(x.focus)||!experiences.includes(x.experience)||
  ![5,10,15,20].includes(x.sessionMinutes)||
  !Number.isSafeInteger(x.expectedRevision)||x.expectedRevision<0)
  throw bad('Choose a learning focus, starting experience and a 5–20 minute study session.');
 return x;
}
function normalize(row,user){
 if(row.user_id!==user||!focuses.includes(row.focus)||!experiences.includes(row.experience)||
   ![5,10,15,20].includes(row.session_minutes)||
   !Number.isSafeInteger(row.revision)||row.revision<1)
  throw bad('Private preference integrity check failed.',503);
 return {focus:row.focus,experience:row.experience,sessionMinutes:row.session_minutes,
  revision:row.revision,updatedAt:row.updated_at,saved:true};
}
function suggestion(pref,progress){
 const curriculum=freeFoundationsProgram.curriculum;
 if(curriculum.length!==5||!Array.isArray(progress)||progress.length>5)
  throw bad('Free Foundations curriculum or progress is unavailable.',503);
 const seen=new Set();
 for(const p of progress){
  if(!Number.isSafeInteger(p.day_number)||p.day_number<1||p.day_number>5||
   seen.has(p.day_number)||!['in_progress','reflection_saved'].includes(p.status))
    throw bad('Member learning progress is inconsistent.',503);
  seen.add(p.day_number);
 }
 const completed=progress.filter(p=>p.status==='reflection_saved').length;
 const next=curriculum.find(day=>!progress.some(p=>p.day_number===day.day&&p.status==='reflection_saved'))||curriculum[4];
 const practice={
  START_BASICS:{title:'Learn what a share and a displayed quote mean',url:'bootcamp-academy.html?program=free5&day=1'},
  CANDLES:{title:'Reveal a fictional five-minute candle, one at a time',url:'verified-replay.html?scope=fictional'},
  VERIFY_SOURCES:{title:'Check published evidence and timestamps',url:'bootcamp-academy.html?program=free5&day=3'},
  WATCHLIST:{title:'Organize a private research watchlist',url:'free-watchlist.html'},
  RISK:{title:'Practice a defensible no-trade decision',url:'bootcamp-academy.html?program=free5&day=5'}
 }[pref.focus];
 return {day:next.day,title:next.title,objective:next.objective,
  url:'bootcamp-academy.html?program=free5&day='+next.day,
  savedReflections:completed,totalDays:5,
  pace:pref.sessionMinutes<=5?'short_session':pref.sessionMinutes>=15?'extended_session':'standard_session',
  teachingDepth:pref.experience==='NEW'?'absolute_beginner':pref.experience==='RETURNING'?'refresher':'guided',
  practice,
  notice:completed===5?'All five study reflections are saved. Review Day 5; they are ungraded and do not certify mastery.':
   'Resume the earliest uncompleted prerequisite. Your interest informs optional practice, not official grades or permissions.'};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))throw bad('Method not allowed.',405);
  const access=await toolAccess(env,request,'ONDEMAND_TRAINING');
  if(!access.userId||access.freeEligible!==true)throw bad(access.reason||'Eligible member access required.',403);
  const user=access.userId;
  if(request.method==='POST'){
   sameOrigin(request);
   const form=await input(request);
   const row={focus:form.focus,experience:form.experience,session_minutes:form.sessionMinutes};
   const path='gu_free_learning_preferences_v1?select=user_id,focus,experience,session_minutes,revision,updated_at';
   let saved;
   if(form.expectedRevision===0){
    saved=await db(env,path,'POST',{...row,user_id:user});
   }else{
    saved=await db(env,path+'&user_id=eq.'+encodeURIComponent(user)+'&revision=eq.'+form.expectedRevision,
     'PATCH',{...row,revision:form.expectedRevision+1});
   }
   if(saved.length!==1)throw bad('Preferences changed in another tab; reload to continue.',409);
   return respond({ok:true,preferences:normalize(saved[0],user),notice:'Saved your study preferences, not a grade or membership change.'});
  }
  const [preferences,progress]=await Promise.all([
   db(env,'gu_free_learning_preferences_v1?select=user_id,focus,experience,session_minutes,revision,updated_at&user_id=eq.'+encodeURIComponent(user)+'&limit=1'),
   db(env,'gu_bootcamp_academy_progress_v014168?select=day_number,status&user_id=eq.'+encodeURIComponent(user)+'&program_code=eq.free5&order=day_number.asc&limit=5')
  ]);
  if(preferences.length>1)throw bad('Duplicate private study preferences.',503);
  const pref=preferences.length?normalize(preferences[0],user):
   {focus:'START_BASICS',experience:'NEW',sessionMinutes:10,revision:0,updatedAt:null,saved:false};
  return respond({ok:true,preferences:pref,recommendation:suggestion(pref,progress),
   disclaimer:'Talia study suggestions are educational and ungraded. No investment advice, trading fills, or certified mastery.'});
 }catch(e){
  const code=[400,401,403,404,405,409,413].includes(e.status)?e.status:503;
  return respond({ok:false,error:code===503?'Private learning recommendations are temporarily unavailable. No progress or mastery is assumed.':
   e.message||'Learning preferences unavailable.'},code);
 }
}
