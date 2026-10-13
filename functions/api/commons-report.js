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
 const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!token)return out({ok:false,error:'Sign in to report content.'},401);
 const get=async(path,admin=false)=>{const key=admin?secret:pub,r=await fetch(url+path,{headers:{apikey:key,authorization:'Bearer '+(admin?secret:token)},cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Report backend unavailable.'),{status:r.status});return r.json()};
 const me=await get('/auth/v1/user');if(!me?.id)return out({ok:false,error:'Invalid session.'},401);
 const profile=(await get('/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(me.id)+'&limit=1',true))?.[0];if(['showcase','test'].includes(profile?.account_kind))return out({ok:false,error:'This account cannot report production content.'},403);
 const b=await request.json().catch(()=>null),id=Number(b?.id),type=safe(b?.type),reason=safe(b?.reason),details=safe(b?.details);
 if(!Number.isSafeInteger(id)||id<1||!['topic','post'].includes(type)||!['spam','harassment','scam','privacy','misinformation','other'].includes(reason)||details.length>500)return out({ok:false,error:'Invalid report details.'},400);
 const source=type==='topic'?'commons_topics':'commons_posts';
 const exists=await get('/rest/v1/'+source+'?select='+(type==='post'?'id,topic_id':'id')+'&status=eq.published&id=eq.'+id+'&limit=1',true);
 if(!exists?.length)return out({ok:false,error:'Content is not available.'},404);
 if(type==='post'){const parent=await get('/rest/v1/commons_topics?select=id&status=eq.published&id=eq.'+Number(exists[0].topic_id)+'&limit=1',true);if(!parent?.length)return out({ok:false,error:'Content is not available.'},404);}
 const since=new Date(Date.now()-86400000).toISOString();
 const history=await get('/rest/v1/forum_reports?select=id,content_id&reporter_user_id=eq.'+encodeURIComponent(me.id)+'&created_at=gte.'+encodeURIComponent(since)+'&limit=11',true);
 if(history.length>=10)return out({ok:false,error:'Report limit reached for the last 24 hours.'},429);
 const contentId='commons:'+type+':'+id;
 if(history.some(x=>x.content_id===contentId))return out({ok:false,error:'You have already reported this content recently.'},409);
 const r=await fetch(url+'/rest/v1/forum_reports',{method:'POST',headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify({reporter_user_id:me.id,content_type:type,content_id:contentId,reason,details,status:'open'}),cache:'no-store'});
 if(!r.ok)return out({ok:false,error:'Unable to record the report.'},503);
 return out({ok:true,message:'Report submitted for moderator review.'});
 }catch(e){return out({ok:false,error:'Report service temporarily unavailable.'},e.status===401?401:503)}
}
