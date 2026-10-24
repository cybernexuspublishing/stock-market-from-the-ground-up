import {checkMutationOrigin,boundedForumJson} from '../_lib/forum-request-guards-v014105.js';
/* Owner-only Founders Commons moderation: server verified session & OWNER role.
 * No client credentials, no checkout, and no public writes.
 */
const j=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private,no-store','vary':'Authorization','x-content-type-options':'nosniff'}});
const safe=x=>String(x??'').trim();
const fail=(msg,status)=>Object.assign(new Error(msg),{status});
function settings(env){
 const base=safe(env.SUPABASE_URL).replace(/\/+$/,''),pub=safe(env.SUPABASE_PUBLISHABLE_KEY),secret=safe(env.SUPABASE_SECRET_KEY);
 if(!/^https:\/\/[^/]+$/.test(base)||!pub||!secret)throw fail('Administration is unavailable.',503);
 return {base,pub,secret};
}
async function http(url,{headers,method='GET',body,prefer}={}){
 const h={...headers,accept:'application/json'};
 if(body!==undefined)h['content-type']='application/json';
 if(prefer)h.prefer=prefer;
 const r=await fetch(url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 if(!r.ok)throw fail('Unable to complete the verified administrative operation.',r.status===401||r.status===403?403:503);
 return r.status===204?null:r.json().catch(()=>null);
}
async function owner(env,request){
 const {base,pub,secret}=settings(env);
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)throw fail('Sign in as the Owner.',401);
 const user=await http(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+jwt}});
 if(!user?.id)throw fail('Invalid session.',401);
 const key={apikey:secret};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))key.authorization='Bearer '+secret;
 const read=path=>http(base+'/rest/v1/'+path,{headers:key});
 const [roles,profiles,flags]=await Promise.all([
   read('admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(user.id)),
   read('profiles?select=account_kind,deleted_at&id=eq.'+encodeURIComponent(user.id)+'&limit=1'),
   read('admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1')
 ]);
 if(profiles?.[0]?.account_kind!=='member'||profiles?.[0]?.deleted_at
   ||['suspended','restricted'].includes(flags?.[0]?.status)||roles?.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))
   ||!roles?.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
  throw fail('Owner authority required.',403);
 return {user,base,key,read,write:(path,body,method='POST')=>http(base+'/rest/v1/'+path,{headers:key,body,method,prefer:'return=representation'})};
}
const states=new Set(['submitted','under_review','accepted','in_development','released','deferred','declined']);
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return j({ok:false,error:'Method not supported.'},405);
  const a=await owner(env,request);
  if(request.method==='GET'){
   const [issues,ballots,votes]=await Promise.all([
    a.read('gu_founder_issues_v014176?select=topic_id,issue_kind,issue_state,staff_response,updated_at&order=updated_at.desc&limit=100'),
    a.read('gu_founder_design_ballots_v014176?select=id,title,description,choices,state,opens_at,closes_at,created_at&order=created_at.desc&limit=60'),
    a.read('gu_founder_design_votes_v014176?select=ballot_id,choice&limit=1000')
   ]);
   const sums={};
   for(const vote of votes||[]){const bucket=(sums[vote.ballot_id]??={});bucket[vote.choice]=(bucket[vote.choice]||0)+1}
   return j({ok:true,issues:issues||[],ballots:ballots||[],voteCounts:sums});
  }
  checkMutationOrigin(request);
  const input=await boundedForumJson(request,4096),action=safe(input.action);
  if(action==='update_issue'){
   const id=Number(input.topicId),state=safe(input.state),note=safe(input.staffResponse);
   if(!Number.isSafeInteger(id)||id<1||!states.has(state)||note.length>2000)
    return j({ok:false,error:'Invalid issue details.'},400);
   const result=await a.write('gu_founder_issues_v014176?topic_id=eq.'+id,
    {issue_state:state,staff_response:note||null,updated_at:new Date().toISOString(),updated_by:a.user.id},'PATCH');
   if(!Array.isArray(result)||result.length!==1)return j({ok:false,error:'Issue not found.'},404);
   return j({ok:true,topicId:id,state});
  }
  if(action==='create_ballot'){
   const title=safe(input.title),description=safe(input.description),choices=input.choices,
   opens=safe(input.opensAt),closes=safe(input.closesAt);
   const start=Date.parse(opens),end=Date.parse(closes);
   if(title.length<8||title.length>160||description.length<20||description.length>2000
      ||!Array.isArray(choices)||choices.length<2||choices.length>5||choices.some(x=>typeof x!=='string'||x.trim().length<2||x.trim().length>100)
      ||new Set(choices.map(x=>x.trim().toLowerCase())).size!==choices.length||!Number.isFinite(start)||!Number.isFinite(end)
      ||end<=start||end<=Date.now()||end-start>1000*60*60*24*90)
      return j({ok:false,error:'Invalid design ballot, choices, or voting period.'},400);
   const created=await a.write('gu_founder_design_ballots_v014176',
    {title,description,choices:choices.map(x=>x.trim()),state:'open',opens_at:new Date(start).toISOString(),closes_at:new Date(end).toISOString()});
   if(!Array.isArray(created)||created.length!==1)return j({ok:false,error:'Ballot was not confirmed.'},503);
   return j({ok:true,id:created[0].id});
  }
  if(action==='close_ballot'){
   const id=safe(input.id);
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return j({ok:false,error:'Invalid ballot.'},400);
   const result=await a.write('gu_founder_design_ballots_v014176?id=eq.'+encodeURIComponent(id)+'&state=eq.open',
    {state:'closed'},'PATCH');
   if(!Array.isArray(result)||result.length!==1)return j({ok:false,error:'Open ballot not found.'},404);
   return j({ok:true,id});
  }
  return j({ok:false,error:'Unknown administrative operation.'},400);
 }catch(e){return j({ok:false,error:e.status===403||e.status===401?e.message:'Operation could not be verified.'},[400,401,403,413].includes(e.status)?e.status:503)}
}
