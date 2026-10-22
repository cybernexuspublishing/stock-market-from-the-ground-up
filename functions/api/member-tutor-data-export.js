/* D09 portable user-owned Tutor transcripts. Does not require an active
 * paid entitlement; account identity is verified via Supabase Auth.
 * Export is explicitly a copy of ungraded notes, never grading evidence.
 */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return reply({ok:false,error:'GET required.'},405);
  const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return reply({ok:false,error:'Sign in to export your own Tutor notes.'},401);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[^/]+$/.test(base)||!pub||!secret)throw Error('not configured');
  const verified=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token},cache:'no-store'});
  if(!verified.ok)return reply({ok:false,error:'Your session is no longer valid.'},401);
  const identity=await verified.json().catch(()=>null);
  if(!UUID.test(identity?.id||''))return reply({ok:false,error:'Member identity unavailable.'},401);
  const dbHeaders={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   dbHeaders.authorization='Bearer '+secret;
  const suffix='&user_id=eq.'+encodeURIComponent(identity.id)+'&order=created_at.asc&limit=200';
  const table='gu_member_tutor_exchanges_v014102';
  const baseSelect='?select=id,question,learner_answer,mode,answer,generation,source_titles,created_at';
  let rows=null;
  for(const cols of [',conversation_id,feedback,feedback_note,feedback_at',',feedback,feedback_note,feedback_at','']){
   const r=await fetch(base+'/rest/v1/'+table+baseSelect+cols+suffix,{headers:dbHeaders,cache:'no-store'});
   if(r.ok){rows=await r.json();break}
   if(r.status!==400)throw Error('export storage');
   const e=await r.json().catch(()=>null);
   if(e?.code!=='42703')throw Error('export storage');
  }
  if(!Array.isArray(rows)||rows.length>200)throw Error('bad history');
  const body={kind:'ungraded_member_tutor_data_export',schema:'v0.14.0.149',
    exportedAt:new Date().toISOString(),exchanges:rows,graded:false,masteryAwarded:false,
    notice:'These records are private educational notes, not an assessed competency record.'};
  return new Response(JSON.stringify(body,null,2),{status:200,headers:{
   ...headers,'content-disposition':'attachment; filename="my-market-tutor-notes.json"'}});
 }catch{return reply({ok:false,error:'Private Tutor export is temporarily unavailable.'},503)}
}
