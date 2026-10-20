import {checkMutationOrigin,boundedForumJson,isForumId} from '../_lib/forum-request-guards-v014105.js';
/* Report an actual Market Commons topic/reply via the established forum_reports table.
 * This endpoint verifies user identity, account class, destination and a daily quota.
 * No public storage access to private moderation reports is provided.
 */
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const safe=x=>String(x??'').trim();
export async function onRequestPost({request,env}){
 try{
 const url=safe(env.SUPABASE_URL).replace(/\/$/,''),pub=safe(env.SUPABASE_PUBLISHABLE_KEY),secret=safe(env.SUPABASE_SECRET_KEY);
 if(!url||!pub||!secret)return out({ok:false,error:'Report service unavailable.'},503);
 const contentLength=Number(request.headers.get('content-length')||0);if(contentLength>4096)return out({ok:false,error:'Report request too large.'},413);
 const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)return out({ok:false,error:'Sign in to report content.'},401);
 const serviceHeaders={apikey:secret};if(/^eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(secret))serviceHeaders.authorization='Bearer '+secret;
 const get=async(path,admin=false)=>{const key=admin?secret:pub,r=await fetch(url+path,{headers:admin?serviceHeaders:{apikey:key,authorization:'Bearer '+token},cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Report backend unavailable.'),{status:r.status});return r.json()};
 const rpcMember=async(name,args)=>{const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:pub,authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(args),cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Report target cannot be verified.'),{status:r.status});return r.json()};
 const me=await get('/auth/v1/user');if(!me?.id)return out({ok:false,error:'Invalid session.'},401);
 const profile=(await get('/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(me.id)+'&limit=1',true))?.[0];const flags=(await get('/rest/v1/admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(me.id)+'&limit=1',true))?.[0];
 if(profile?.account_kind!=='member'||['suspended','restricted'].includes(safe(flags?.status).toLowerCase()))return out({ok:false,error:'Only eligible production members may report production content.'},403);
 checkMutationOrigin(request);
 const b=await boundedForumJson(request,4096),id=Number(b?.id),type=safe(b?.type),reason=safe(b?.reason),details=safe(b?.details),scope=safe(b?.scope)||'commons';
 if(!Number.isSafeInteger(id)||id<1||!['commons','legacy'].includes(scope)||!['topic','post'].includes(type)||!['spam','harassment','scam','privacy','misinformation','other'].includes(reason)||details.length>500)return out({ok:false,error:'Invalid report details.'},400);
 let contentId;
 if(scope==='commons'){
   const source=type==='topic'?'commons_topics':'commons_posts';
   // Member JWT + RLS gate: never verify report visibility with service_role.
   const exists=await get('/rest/v1/'+source+'?select='+(type==='post'?'id,topic_id':'id')+'&status=eq.published&id=eq.'+id+'&limit=1');
   if(!exists?.length)return out({ok:false,error:'Content is not available.'},404);
   if(type==='post'){
     const parent=await get('/rest/v1/commons_topics?select=id&status=eq.published&id=eq.'+Number(exists[0].topic_id)+'&limit=1');
     if(!parent?.length)return out({ok:false,error:'Content is not available.'},404);
   }
   contentId='commons:'+type+':'+id;
 }else{
   // /forum-topic.html is an older, distinct forum schema. Never accept its
   // unverified topic/post ID as a commons_posts ID: numeric IDs can collide.
   const topicId=Number(b?.topicId);
   if(!Number.isSafeInteger(topicId)||topicId<1||
      (type==='topic'&&topicId!==id))return out({ok:false,error:'Invalid legacy report target.'},400);
   // These RPCs are also used by the member-facing legacy forum. They enforce
   // that the current authenticated learner can see the topic and its replies,
   // including historical-lab discussion gates. Service-role reads would
   // defeat this authorization boundary.
   const topics=await rpcMember('forum_get_topic',{target_topic_id:topicId});
   if(!Array.isArray(topics)||topics.length!==1||topics[0].discussion_unlocked===false)
     return out({ok:false,error:'Content is not available.'},404);
   if(type==='post'){
     const posts=await rpcMember('forum_list_posts',{target_topic_id:topicId});
     if(!Array.isArray(posts)||!posts.some(p=>Number(p.post_id)===id))
       return out({ok:false,error:'Content is not available.'},404);
   }
   contentId='legacy:'+type+':'+id;
 }
 // Quota, de-duplication and insert MUST happen in one SQL transaction.
 const r=await fetch(url+'/rest/v1/rpc/v014_community_report',{method:'POST',headers:{...serviceHeaders,'content-type':'application/json'},body:JSON.stringify({p_actor:me.id,p_type:type,p_content:contentId,p_reason:reason,p_details:details}),cache:'no-store'});
 if(!r.ok){
   const responseBody=await r.json().catch(()=>({}));
   const message=String(responseBody?.message||'');
   const codeMap={
    REPORT_DUPLICATE:['DUPLICATE_REPORT','You have already reported this content within the configured duplicate window.',409],
    REPORT_QUOTA_REACHED:['REPORT_QUOTA_REACHED','You have reached the configured report allowance. Try again after the reporting window.',429],
    REPORT_SAFETY_CEILING:['REPORT_SAFETY_LIMIT','The reporting safety limit has been reached. Contact support if you need to report urgent content.',429],
    REPORT_NOT_AUTHORIZED:['REPORT_NOT_AUTHORIZED','Your account is not permitted to submit this report.',403],
    REPORT_INVALID:['INVALID_REPORT','The report could not be accepted. Review the details and try again.',400]
   };
   const found=Object.entries(codeMap).find(([prefix])=>message===prefix)?.[1];
   if(found)return out({ok:false,code:found[0],error:found[1]},found[2]);
   return out({ok:false,code:'REPORT_BACKEND_FAILURE',error:'Report could not be processed. Please try again later.'},503);
 }
 return out({ok:true,message:'Report submitted for moderator review.'});
 }catch(e){return out({ok:false,error:e.status===401?'Sign in to report content.':e.status===413?'Report request too large.':e.status===403?'Cross-origin report submission is not permitted.':e.status===400?'Invalid report request.':'Report service temporarily unavailable.'},[400,401,403,413].includes(e.status)?e.status:503)}
}
