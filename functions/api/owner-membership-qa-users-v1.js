/* Owner-only one-click membership QA identity provisioning.
 * Uses GoTrue Auth Admin; passwords are never stored in code, logs, or metadata.
 * No LIVE payments, plan grants, Founding seats, fake DOB or user-role elevation.
 */
const BATCH='SMFGU-MEMBERSHIP-9-20261027';
const CHART_BATCH='SMFGU-CHART-3-20261028';
const CHART_CONFIRM='CREATE_THREE_CROWNLIGHT_QA_ACCOUNTS';
const CHART_TIERS={FREE:'STANDARD',FOUNDING_30:'ADVANCED',FOUNDING_60:'PROFESSIONAL'};
const BASE='https://oxihglyfgzywsupnyicb.supabase.co';
const MAIL='stockmarketfromthegroundup';
const ROSTER=[
 ['FREE','Test_Free','free'],
 ['PICK_WHAT_YOU_WANT','Test_Pick_What_You_Want','pick-what-you-want'],
 ['FULL_MONTHLY','Test_Full_Monthly','full-monthly'],
 ['ONDEMAND_MONTHLY','Test_Historical_Replay','historical-replay'],
 ['FULL_ANNUAL','Test_Annual','annual'],
 ['LIFETIME','Test_Lifetime','lifetime'],
 ['FOUNDING_14','Test_Founding_14','founding-14'],
 ['FOUNDING_30','Test_Founding_30','founding-30'],
 ['FOUNDING_60','Test_Founding_60','founding-60']
];
const header={'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:header});
const err=(m,s=503)=>Object.assign(new Error(m),{status:s});
const email=(tag)=>MAIL+'+test-'+tag+'-20261027@gmail.com';
function cfg(env){
 if(env.SUPABASE_URL!==BASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY)
  throw err('Owner account service not configured');
 return{pub:env.SUPABASE_PUBLISHABLE_KEY,secret:env.SUPABASE_SECRET_KEY};
}
async function json(url,opts={}){
 const r=await fetch(url,{cache:'no-store',...opts}),value=await r.json().catch(()=>null);
 if(!r.ok||value===null)throw err('Account service rejected the request ('+r.status+')',r.status===401?401:r.status===403?403:503);
 return value;
}
function headers(key){
 return{apikey:key,...(!key.startsWith('sb_secret_')?{authorization:'Bearer '+key}:{}),
  'content-type':'application/json'};
}
async function owner(req,c,stepup){
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!jwt)throw err('Owner sign-in required',401);
 const h={apikey:c.pub,authorization:'Bearer '+jwt,'content-type':'application/json'};
 const u=await json(BASE+'/auth/v1/user',{headers:h});
 if(!/^[0-9a-f-]{36}$/i.test(u.id||''))throw err('Owner sign-in required',401);
 const role=await json(BASE+'/rest/v1/rpc/gu_staff_role_v01432r1',{method:'POST',headers:h,body:'{}'});
 if(role?.ok!==true||role.role!=='OWNER')throw err('Only Owner can manage test accounts',403);
 if(stepup){
  const active=await json(BASE+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{method:'POST',headers:h,body:'{}'});
  if(active!==true)throw err('Owner password confirmation required',403);
 }
 return u.id;
}
async function api(c,path,opts){
 return json(BASE+path,{...opts,headers:{...headers(c.secret),...(opts?.headers||{})}});
}
async function audit(c,user,action,target,details){
 const created=await api(c,'/rest/v1/admin_audit_log',{method:'POST',
  headers:{prefer:'return=representation'},
  body:JSON.stringify({actor_user_id:user,action,target_type:'user',target_id:target,details})});
 if(!Array.isArray(created)||created.length!==1)throw err('Audit event could not be verified');
}
async function target(c,uuid){
 const person=await api(c,'/auth/v1/admin/users/'+encodeURIComponent(uuid));
 return person?.user||person;
}
async function rosterStatus(c){
 const rows=await api(c,'/rest/v1/profiles?select=id,username,email,email_verified,account_kind&username=in.('+
  ROSTER.map(x=>x[1]).join(',')+')');
 const byName=new Map((Array.isArray(rows)?rows:[]).map(x=>[x.username,x]));
 const result=[];
 for(const [plan,username,tag] of ROSTER){
  const profile=byName.get(username);
  let ready=false,chartReady=false;
  if(profile){
   const user=await target(c,profile.id),meta=user?.app_metadata||{};
   if(user?.id!==profile.id||meta.qa_batch!==BATCH||meta.smfgu_qa_only!==true||
    meta.qa_target_plan!==plan||user.email!==email(tag))
    throw err('Existing username conflicts with noncommercial test roster',409);
   ready=profile.email_verified===true&&profile.account_kind==='member';
   var expiry=Date.parse(meta.qa_chart_expires_at||'');
   chartReady=ready&&meta.qa_chart_batch===CHART_BATCH&&
    Object.hasOwn(CHART_TIERS,plan)&&meta.qa_chart_tier===CHART_TIERS[plan]&&
    Number.isFinite(expiry)&&expiry>Date.now();
  }
  result.push({plan,username,email:email(tag),created:ready,chartReady:!!chartReady,
   chartTier:chartReady?CHART_TIERS[plan]:null});
 }
 return result;
}
export async function onRequestGet({request,env}){
 try{
  const c=cfg(env);
  await owner(request,c,false);
  const roster=await rosterStatus(c);
  return out({ok:true,total:ROSTER.length,ready:roster.filter(x=>x.created).length,
   chartReady:roster.filter(x=>x.chartReady).length,roster});
 }catch(e){return out({ok:false,error:e.message||'QA roster unavailable'},e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw err('Same-origin Owner request required',403);
  if(Number(request.headers.get('content-length')||0)>512)throw err('Invalid request',413);
  const raw=await request.text();if(raw.length>512)throw err('Invalid request',413);
  let body;try{body=JSON.parse(raw)}catch{throw err('Invalid request',400)}
  const chartMode=body?.confirm===CHART_CONFIRM;
  if(!chartMode&&body?.confirm!=='CREATE_NINE_NONCOMMERCIAL_QA_ACCOUNTS'||
   typeof body?.password!=='string'||body.password.length<12||body.password.length>128||
   Object.keys(body).length!==2)
   throw err('Password and explicit Owner confirmation required',400);
  const c=cfg(env),actor=await owner(request,c,true);
  // Fail closed for unknown username collisions BEFORE creating any accounts.
  const prior=await rosterStatus(c);
  const selected=chartMode?prior.filter(x=>Object.hasOwn(CHART_TIERS,x.plan)):prior;
  if(chartMode&&selected.length!==3)throw err('Chart QA roster integrity failure',503);
  const expires=new Date(Date.now()+14*86400000).toISOString();
  const completed=[];
  for(const entry of selected){
   if(entry.created){
    if(chartMode&&!entry.chartReady)throw err('Existing QA account needs Owner reconciliation; no automatic privilege change',409);
    completed.push({...entry,existing:true});continue}
   const spec=ROSTER.find(x=>x[1]===entry.username);
   const created=await api(c,'/auth/v1/admin/users',{method:'POST',
    body:JSON.stringify({email:entry.email,password:body.password,email_confirm:true,
     user_metadata:{username:entry.username},
     app_metadata:{provider:'email',providers:['email'],smfgu_qa_only:true,
      noncommercial:true,qa_batch:BATCH,qa_target_plan:entry.plan,
      ...(chartMode?{qa_chart_batch:CHART_BATCH,qa_chart_tier:CHART_TIERS[entry.plan],
       qa_chart_expires_at:expires}:{})}})});
   if(!/^[0-9a-f-]{36}$/i.test(created?.id||''))
    throw err('Supabase Auth Admin did not confirm account creation');
   const user=await target(c,created.id);
   const profile=await api(c,'/rest/v1/profiles?select=id,username,email,email_verified,account_kind&id=eq.'+created.id);
   if(user?.app_metadata?.qa_batch!==BATCH||
    (chartMode&&(user?.app_metadata?.qa_chart_batch!==CHART_BATCH||
     user?.app_metadata?.qa_chart_tier!==CHART_TIERS[entry.plan]))||
    !Array.isArray(profile)||profile.length!==1||
    profile[0].username!==entry.username||profile[0].email!==entry.email||
    profile[0].account_kind!=='member'||profile[0].email_verified!==true)
     throw err('QA account was created but profile verification failed; reconcile before retrying');
   await audit(c,actor,'qa.membership.noncommercial_identity_provisioned',created.id,
    {batch:BATCH,username:entry.username,plan:entry.plan,noncommercial:true,
     chartOnly:chartMode,chartTier:chartMode?CHART_TIERS[entry.plan]:null,
     customer_payment:false,plan_entitlement_granted:false});
   completed.push({...entry,created:true,existing:false,chartReady:chartMode,
    chartTier:chartMode?CHART_TIERS[entry.plan]:null});
  }
  return out({ok:true,total:selected.length,created:completed.length,
   chartReady:completed.filter(x=>x.chartReady).length,noncommercial:true,roster:completed});
 }catch(e){return out({ok:false,error:e.message||'QA account creation did not complete; check roster and retry after review'},e.status||503)}
}
