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
   const [issues,ballots,votes,improvementPolls,improvementVotes,caseProposals,learningReleases,foundingMembers,founderCertificates,verifiedIncidents,targetedNotices]=await Promise.all([
    a.read('gu_founder_issues_v014176?select=topic_id,issue_kind,issue_state,staff_response,updated_at&order=updated_at.desc&limit=100'),
    a.read('gu_founder_design_ballots_v014176?select=id,title,description,choices,state,opens_at,closes_at,created_at&order=created_at.desc&limit=60'),
    a.read('gu_founder_design_votes_v014176?select=ballot_id,choice&limit=1000'),
    a.read('gu_founder_improvement_polls_v014188?select=id,title,description,choices,state,opens_at,closes_at,created_at&order=created_at.desc&limit=60'),
    a.read('gu_founder_improvement_votes_v014188?select=poll_id,choice&limit=1000'),
    a.read('gu_founder_case_submissions_v014190?select=id,user_id,title,scenario,review_state,created_at,staff_reply,opted_in_attribution&order=created_at.desc&limit=100'),
    a.read('gu_founder_educational_releases_v014190?select=id,slug,title,category,audience,review_state,rights_cleared,available_from&order=updated_at.desc&limit=60'),
    a.read('gu_founder_members_v014173?select=user_id,founder_number,earned_plan_code&order=founder_number.asc&limit=600'),
    a.read('gu_founder_certificates_v014192?select=id,user_id,track,issued_at,revoked_at&limit=600'),
    a.read('gu_founder_verified_incidents_v014203?select=id,incident_key,title,service_area,started_at,ended_at,verified_at&order=verified_at.desc&limit=60'),
    a.read('gu_founder_targeted_notices_v014206?select=id,notice_code,title,body,audience,priority,publication_state,created_at,published_at&order=created_at.desc&limit=100')
   ]);
   const sums={};
   for(const vote of votes||[]){const bucket=(sums[vote.ballot_id]??={});bucket[vote.choice]=(bucket[vote.choice]||0)+1}
   const improvementSums={};
   for(const vote of improvementVotes||[]){const bucket=(improvementSums[vote.poll_id]??={});bucket[vote.choice]=(bucket[vote.choice]||0)+1}
   return j({ok:true,issues:issues||[],ballots:ballots||[],voteCounts:sums,improvementPolls:improvementPolls||[],improvementVoteCounts:improvementSums,caseProposals:caseProposals||[],learningReleases:learningReleases||[],foundingMembers:foundingMembers||[],founderCertificates:founderCertificates||[],verifiedIncidents:verifiedIncidents||[],targetedNotices:targetedNotices||[]});
  }
  checkMutationOrigin(request);
  const input=await boundedForumJson(request,4096),action=safe(input.action);
  if(action==='publish_founder_notice'){
   const code=safe(input.noticeCode),title=safe(input.title),body=safe(input.body),
      audience=safe(input.audience),priority=safe(input.priority);
   if(!/^[A-Z0-9_-]{8,80}$/.test(code)||title.length<10||title.length>160
     ||body.length<35||body.length>2400||!['shared','council'].includes(audience)
     ||!['normal','important'].includes(priority))
    return j({ok:false,error:'Reviewed, correctly targeted announcement details are required.'},400);
   const x=await a.write('gu_founder_targeted_notices_v014206',{
    notice_code:code,title,body,audience,priority,
    publication_state:'published',published_at:new Date().toISOString(),authored_by:a.user.id
   });
   if(!Array.isArray(x)||x.length!==1)return j({ok:false,error:'Notice publication not confirmed.'},503);
   return j({ok:true,id:x[0].id,scope:audience});
  }
  if(action==='withdraw_founder_notice'){
   const id=safe(input.id);
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return j({ok:false,error:'Invalid notice reference.'},400);
   const x=await a.write('gu_founder_targeted_notices_v014206?id=eq.'+encodeURIComponent(id)+'&publication_state=eq.published',
   {publication_state:'withdrawn',updated_at:new Date().toISOString()},'PATCH');
   if(!Array.isArray(x)||x.length!==1)return j({ok:false,error:'Published notice no longer available.'},404);
   return j({ok:true,withdrawn:true,id});
  }
  if(action==='issue_certificate'){
   const id=safe(input.userId);
   if(!/^[0-9a-f]{8}-[0-9a-f-]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return j({ok:false,error:'Invalid founding member.'},400);
   const result=await a.write('rpc/gu_founder_issue_certificate_v014192',{p_actor:a.user.id,p_user:id});
   if(!result?.ok)return j({ok:false,error:result?.error||'Certificate evidence could not be verified.',competency:result?.competency||null},409);
   return j({ok:true,certificateId:result.certificateId,track:result.track});
  }
  if(action==='record_service_incident'){
   const code=safe(input.incidentKey),title=safe(input.title),area=safe(input.serviceArea),
   summary=safe(input.impactSummary),start=Date.parse(safe(input.startedAt)),end=Date.parse(safe(input.endedAt));
   if(!/^[A-Z0-9_-]{8,80}$/.test(code)||title.length<12||title.length>160||summary.length<30||summary.length>1800
      ||!['labs','tutor','community','account_access','platform'].includes(area)
      ||!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end>Date.now()||end-start<1800000||end-start>604800000)
     return j({ok:false,error:'A qualifying verified service interruption with exact times is required.'},400);
   const result=await a.write('rpc/gu_founder_record_service_incident_v014203',
    {p_actor:a.user.id,p_incident_key:code,p_title:title,p_service_area:area,
    p_started_at:new Date(start).toISOString(),p_ended_at:new Date(end).toISOString(),p_summary:summary});
   if(!result?.ok)return j({ok:false,error:result?.error||'Incident could not be verified.'},409);
   return j({ok:true,incidentId:result.incidentId,creditedFounders:result.creditedFounders,appliedToBilling:false});
  }
  if(action==='review_case'){
   const id=safe(input.id),state=safe(input.state),reply=safe(input.staffReply);
   if(!/^[0-9a-f-]{36}$/i.test(id)||!['under_review','accepted','declined'].includes(state)||reply.length>1500)
    return j({ok:false,error:'Invalid editorial review.'},400);
   if(['accepted','declined'].includes(state)&&reply.length<20)
    return j({ok:false,error:'Include an explanatory editorial decision.'},400);
   const rows=await a.write('gu_founder_case_submissions_v014190?id=eq.'+encodeURIComponent(id)+'&review_state=in.(submitted,under_review)',{
     review_state:state,reviewer_id:a.user.id,reviewed_at:new Date().toISOString(),staff_reply:reply
   },'PATCH');
   if(!Array.isArray(rows)||rows.length!==1)return j({ok:false,error:'Case proposal is no longer reviewable.'},404);
   return j({ok:true,id,state});
  }
  if(action==='publish_teaching'){
   const slug=safe(input.slug),title=safe(input.title),body=safe(input.body),
   category=safe(input.category),audience=safe(input.audience),competency=safe(input.competencyCode);
   if(!/^[a-z0-9-]{8,90}$/.test(slug)||title.length<10||title.length>160||body.length<60||body.length>8000
     ||!['early_teaching','challenge','case_study'].includes(category)||!['shared','council'].includes(audience)
     ||(competency&&!/^[A-Z0-9_]{3,70}$/.test(competency))||input.rightsConfirmed!==true)
    return j({ok:false,error:'Provide reviewed original material with cleared distribution rights.'},400);
   const rows=await a.write('gu_founder_educational_releases_v014190',{
    slug,title,body,category,audience,competency_code:competency||null,
    review_state:'approved',rights_cleared:true,reviewed_by:a.user.id,available_from:new Date().toISOString()
   });
   if(!Array.isArray(rows)||rows.length!==1)return j({ok:false,error:'Reviewed release could not be confirmed.'},503);
   return j({ok:true,id:rows[0].id,slug});
  }
  if(action==='update_issue'){
   const id=Number(input.topicId),state=safe(input.state),note=safe(input.staffResponse);
   if(!Number.isSafeInteger(id)||id<1||!states.has(state)||note.length>2000)
    return j({ok:false,error:'Invalid issue details.'},400);
   const result=await a.write('gu_founder_issues_v014176?topic_id=eq.'+id,
    {issue_state:state,staff_response:note||null,updated_at:new Date().toISOString(),updated_by:a.user.id},'PATCH');
   if(!Array.isArray(result)||result.length!==1)return j({ok:false,error:'Issue not found.'},404);
   return j({ok:true,topicId:id,state});
  }
  if(action==='create_ballot'||action==='create_improvement_poll'){
   const title=safe(input.title),description=safe(input.description),choices=input.choices,
   opens=safe(input.opensAt),closes=safe(input.closesAt);
   const start=Date.parse(opens),end=Date.parse(closes);
   if(title.length<8||title.length>160||description.length<20||description.length>2000
      ||!Array.isArray(choices)||choices.length<2||choices.length>5||choices.some(x=>typeof x!=='string'||x.trim().length<2||x.trim().length>100)
      ||new Set(choices.map(x=>x.trim().toLowerCase())).size!==choices.length||!Number.isFinite(start)||!Number.isFinite(end)
      ||end<=start||end<=Date.now()||end-start>1000*60*60*24*90)
      return j({ok:false,error:'Invalid design ballot, choices, or voting period.'},400);
   const target=action==='create_improvement_poll'?'gu_founder_improvement_polls_v014188':'gu_founder_design_ballots_v014176';
   const created=await a.write(target,
    {title,description,choices:choices.map(x=>x.trim()),state:'open',opens_at:new Date(start).toISOString(),closes_at:new Date(end).toISOString()});
   if(!Array.isArray(created)||created.length!==1)return j({ok:false,error:'Ballot was not confirmed.'},503);
   return j({ok:true,id:created[0].id});
  }
  if(action==='close_ballot'||action==='close_improvement_poll'){
   const id=safe(input.id);
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return j({ok:false,error:'Invalid ballot.'},400);
   const target=action==='close_improvement_poll'?'gu_founder_improvement_polls_v014188':'gu_founder_design_ballots_v014176';
   const result=await a.write(target+'?id=eq.'+encodeURIComponent(id)+'&state=eq.open',
    {state:'closed'},'PATCH');
   if(!Array.isArray(result)||result.length!==1)return j({ok:false,error:'Open ballot not found.'},404);
   return j({ok:true,id});
  }
  return j({ok:false,error:'Unknown administrative operation.'},400);
 }catch(e){return j({ok:false,error:e.status===403||e.status===401?e.message:'Operation could not be verified.'},[400,401,403,413].includes(e.status)?e.status:503)}
}
