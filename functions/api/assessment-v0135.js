/* Authenticated, entitlement-checked, trusted competency assessments.
 * Only reviewed, active cases can be graded. The server NEVER returns answer keys. */
const respond=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const clean=x=>String(x??'').trim();const fail=(s,c=400)=>Object.assign(new Error(s),{status:c});
function cfg(env){const base=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!base||!pub||!secret)throw fail('Assessment service unavailable.',503);return{base,pub,secret}}
async function requestJson(url,init){const r=await fetch(url,{...init,cache:'no-store'}),t=await r.text();if(!r.ok)throw fail('Assessment request rejected.',r.status>=500?503:r.status);try{return t?JSON.parse(t):null}catch{return null}}
async function db(env,p,{method='GET',body,userToken}={}){
 const c=cfg(env),key=userToken?c.pub:c.secret;
 const headers={apikey:key,accept:'application/json',
  ...(body!==undefined?{'content-type':'application/json'}:{})};
 // A modern sb_secret_* API key is NOT a JWT and must not be put in the
 // Authorization Bearer header. The verified user JWT is used only for
 // user-scoped access; legacy service-role JWTs retain compatibility.
 if(userToken)headers.authorization='Bearer '+userToken;
 else if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))
  headers.authorization='Bearer '+c.secret;
 return requestJson(c.base+'/rest/v1/'+p,{method,headers,
  body:body===undefined?undefined:JSON.stringify(body)});
}
async function auth(env,req){const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw fail('Sign in to practice.',401);const c=cfg(env),u=await requestJson(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});if(!u?.id)throw fail('Invalid session.',401);const p=(await db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1'))?.[0];if(p?.account_kind!=='member')throw fail('Synthetic or test accounts cannot generate scored evidence.',403);
const flags=(await db(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1'))?.[0];if(['suspended','restricted'].includes(String(flags?.status||'').toLowerCase()))throw fail('Account access is restricted.',403);
const a=await db(env,'rpc/my_platform_access',{method:'POST',body:{},userToken:token});const eligible=Boolean(a?.allTools||['LIFETIME','FULL_MONTHLY','FULL_ANNUAL','BOOK_TRIAL'].includes(a?.planCode)||a?.tools?.some(x=>x.toolCode==='INTERACTIVE_LEARNING'&&x.included));return{user:u,eligible}}
/* Only these public fields may reach the browser. Cases may later acquire
 * scoring rubric, critical-error rationale, option weights, or other privileged
 * metadata INSIDE questions: passing through that JSON leaks answer evidence.
 * A malformed published case is withheld rather than presented as gradable.
 */
function safe(c){
 const original=Array.isArray(c?.questions)?c.questions:[];
 if(original.length<4||original.length>40)return null;
 const seen=new Set(),questions=[];
 for(const question of original){
  const id=typeof question?.id==='string'?question.id:'';
  const dimension=typeof question?.dimension==='string'?question.dimension:'';
  const prompt=typeof question?.prompt==='string'?question.prompt:'';
  if(!/^[A-Za-z0-9_-]{1,50}$/.test(id)||seen.has(id)||
    !['knowledge','recognition','decision','process'].includes(dimension)||
    prompt.trim().length<5||prompt.length>1800||
    !Array.isArray(question?.options)||question.options.length<2||question.options.length>8)
   return null;
  const options=[],codes=new Set();
  for(const option of question.options){
   const code=typeof option?.code==='string'?option.code:'';
   const label=typeof option?.label==='string'?option.label:'';
   if(!/^[A-Za-z0-9_-]{1,30}$/.test(code)||codes.has(code)||
    label.trim().length<1||label.length>700)return null;
   codes.add(code);
   options.push({code,label}); // omit "correct", key, weight and private details
  }
  seen.add(id);questions.push({id,dimension,prompt,options});
 }
 return{code:c.case_code,title:c.title,description:c.description,
  competencyCode:c.competency_code,version:c.version,questions,
  alreadySubmitted:!!c.alreadySubmitted};
}
export async function onRequest({request,env}){try{const a=await auth(env,request),url=new URL(request.url),action=clean(url.searchParams.get('action'))||'list';if(!a.eligible)return respond({ok:false,error:'Graded assessments require eligible learning access.'},403);
 if(action==='list'&&request.method==='GET'){
 const cases=await db(env,'competency_cases_v135?select=case_code,title,description,competency_code,questions,version&active=eq.true&reviewed_at=not.is.null&limit=200');const attempts=await db(env,'competency_attempts_v135?select=case_code,final_score,submitted_at&user_id=eq.'+encodeURIComponent(a.user.id)+'&limit=200');const submitted=new Set((attempts||[]).map(x=>x.case_code));return respond({ok:true,cases:(cases||[]).filter(c=>!String(c.case_code||'').startsWith('BC3_')).map(c=>safe({...c,alreadySubmitted:submitted.has(c.case_code)})).filter(Boolean),attempts:(attempts||[]).filter(a=>!String(a.case_code||'').startsWith('BC3_'))})}
 if(action==='submit'&&request.method==='POST'){
 const body=await request.json().catch(()=>({})),caseCode=clean(body.caseCode).toUpperCase(),answers=body.answers;
 if(caseCode.startsWith('BC3_'))throw fail('Use the authorized Academy day assessment route.',403);
 if(!/^[A-Z0-9_\-]{3,90}$/.test(caseCode)||!answers||Array.isArray(answers)||typeof answers!=='object'||Object.keys(answers).length>40||JSON.stringify(answers).length>7000)throw fail('Invalid assessment submission.');
 const r=await db(env,'rpc/submit_competency_case_v135',{method:'POST',body:{p_user:a.user.id,p_case:caseCode,p_answers:answers}});if(!r?.ok)return respond({ok:false,error:'Assessment could not be recorded.',reason:r?.reason||'rejected'},r?.reason==='already_submitted'?409:400);return respond({ok:true,result:r})}
 return respond({ok:false,error:'Unsupported assessment action.'},404);
 }catch(e){return respond({ok:false,error:e.message||'Assessment failed.'},e.status||500)}}
