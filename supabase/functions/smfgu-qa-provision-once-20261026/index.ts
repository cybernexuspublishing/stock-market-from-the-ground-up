// One-use, owner-approved 2026-10-26 QA provisioning; no public administration.
// A 256-bit secret is generated in Postgres and sent only via an internal HTTPS
// call. SHA-256 match + atomic status transition prevents replay.
// After verification this function is replaced with a permanent deny-all stub.
const REF='oxihglyfgzywsupnyicb';
const BATCH='SMFGU-QA-7-20261026';
const ROSTER=[
 {name:'QaAdmin26',role:'ADMIN',kind:'member',slug:'admin'},
 {name:'QaMod26',role:'MODERATOR',kind:'member',slug:'moderator'},
 {name:'QaSupport26',role:'SUPPORT',kind:'member',slug:'support'},
 {name:'QaFree26',role:null,kind:'member',slug:'free'},
 {name:'QaPaid26',role:null,kind:'member',slug:'paid-access'},
 {name:'QaRestricted26',role:null,kind:'member',slug:'restricted'},
 {name:'QaShowcase26',role:'SHOWCASE_VIEWER',kind:'showcase',slug:'showcase'}
];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const url=Deno.env.get('SUPABASE_URL')?.replace(/\/$/,'');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY');
const headers=(body,prefer)=>({
 apikey:key,
 ...(key?.startsWith('eyJ')?{authorization:'Bearer '+key}:{}),
 ...(body===undefined?{}:{'content-type':'application/json'}),
 ...(prefer?{prefer}:{})
});
async function api(path,method='GET',body,prefer){
 const response=await fetch(url+path,{method,headers:headers(body,prefer),
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw fail('Admin provider rejected '+method+' '+path.split('?')[0]+' ('+response.status+')',response.status>=500?503:500);
 const raw=await response.text();return raw?JSON.parse(raw):null;
}
async function digest(raw){
 const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
 return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function password(){
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789_-';
 const bytes=crypto.getRandomValues(new Uint8Array(44));
 return 'Q7!a'+[...bytes].map(x=>alphabet[x%alphabet.length]).join('');
}
async function finish(id,status,summary){
 await api('/rest/v1/qa_provision_once_20261026?id=eq.'+encodeURIComponent(id),
  'PATCH',{status,completed_at:new Date().toISOString(),summary},'return=minimal');
}
Deno.serve(async req=>{
 if(req.method!=='POST')return json({ok:false},405);
 if(url!=='https://'+REF+'.supabase.co'||!key)return json({ok:false,error:'QA provider identity unavailable'},503);
 let runId='',claimed=false,completed=[];
 try{
  const b=await req.json();
  if(b.batch!==BATCH||typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token)||
   typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id))return json({ok:false},403);
  runId=b.id;
  const hash=await digest(b.token);
  // Status predicate and token hash are checked in the SAME SQL UPDATE.
  const accepted=await api('/rest/v1/qa_provision_once_20261026?id=eq.'+encodeURIComponent(runId)+
    '&token_hash=eq.'+hash+'&status=eq.pending',
    'PATCH',{status:'running',consumed_at:new Date().toISOString()},'return=representation');
  if(!Array.isArray(accepted)||accepted.length!==1)return json({ok:false},403);
  claimed=true;
  for(const a of ROSTER){
   const email='stockmarketfromthegroundup+smfguqa-'+a.slug+'-20261026@gmail.com';
   // Auth Admin API handles password hashing, identity initialization and
   // Auth triggers. No direct writes to auth.users / auth.identities.
   const result=await api('/auth/v1/admin/users','POST',{
    email,password:password(),email_confirm:true,
    user_metadata:{username:a.name,display_name:a.name,qa_account:true},
    app_metadata:{smfgu_qa_only:true,noncommercial:true,qa_batch:BATCH}
   });
   const id=result?.user?.id||result?.id;
   if(!/^[a-f0-9-]{36}$/i.test(id||''))throw fail('Auth Admin did not return a valid QA user ID');
   await api('/rest/v1/profiles?on_conflict=id','POST',{
    id,username:a.name,display_name:a.name,first_name:'QA',
    last_name:a.slug,account_kind:a.kind,updated_at:new Date().toISOString()
   },'resolution=merge-duplicates,return=minimal');
   if(a.role)await api('/rest/v1/admin_user_roles','POST',{user_id:id,role_code:a.role,granted_by:null},'return=minimal');
   if(a.kind==='showcase')await api('/rest/v1/test_account_profiles?on_conflict=user_id','POST',{
    user_id:id,preset_code:'SHOWCASE',label:'Synthetic QA Showcase',created_by:null,
    metadata:{qa_batch:BATCH,synthetic_entitlements_only:true,display_plan:'FREE'}
   },'resolution=merge-duplicates,return=minimal');
   await api('/rest/v1/admin_audit_log','POST',{
    actor_user_id:null,action:'qa.noncommercial_account_provisioned',
    target_type:'qa_account',target_id:id,
    details:{qa_batch:BATCH,username:a.name,role:a.role||'NONE',
      authorization:'owner_2026-10-26_chat',commerce:'none',synthetic_dob:'not_stored'}
   },'return=minimal');
   completed.push({name:a.name,role:a.role||'NONE',kind:a.kind});
  }
  await finish(runId,'complete',{count:completed.length,accounts:completed,commercial_grants:0,
   date_of_birth_proofs:'not_asserted',login_passwords:'random_not_persisted'});
  return json({ok:true,count:completed.length,roles:completed.map(c=>c.role)});
 }catch(error){
  if(claimed){
   try{await finish(runId,'failed',{count:completed.length,accounts:completed,
    error:'Provider operation failed; inspect sanitized admin logs before retrying'})}catch{}
  }
  return json({ok:false,error:'Provisioning stopped without automatic retry',created:completed.length},503);
 }
});