import {isBetaCandidateLab} from '../_lib/lab-beta-scope-v014286.js';
/* Public Lab availability: reveal ONLY published Lab IDs; never serve grading
 * questions, answer keys, private lessons, member data, or implementation secrets.
 * Registry visibility does not imply an approved member assessment.
 */
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0',
 'x-content-type-options':'nosniff'}});
const goodId=/^[A-Za-z0-9_-]{3,90}$/;
async function rows(env,table,select,condition='',limit=1200){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw Error('Private readiness unavailable');
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 const url=base+'/rest/v1/'+table+'?select='+encodeURIComponent(select)+condition+'&limit='+limit;
 const res=await fetch(url,{headers,cache:'no-store'});
 if(!res.ok)throw Error('Readiness database unavailable');
 const data=await res.json();
 if(!Array.isArray(data)||data.length>=limit)throw Error('Readiness result unverified or truncated');
 return data;
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return reply({ok:false,error:'Method not allowed'},405);
 try{
  // Every requirement is taken from existing authoritative tables. A public
  // listing of an ID, or an unfinished draft, does not grant beta assessment.
  const [catalog,lessons,approved]=await Promise.all([
   rows(env,'platform_labs','lab_id,active,registry_visible','',700),
   rows(env,'lab_instruction_v014','lab_id,source_status','',700),
   rows(env,'lab_training_sets_v014','lab_id,review_state,reviewed_at,reviewed_by',
        '&review_state=eq.reviewed&reviewed_at=not.is.null&reviewed_by=not.is.null',1500)
  ]);
  const allowed=new Set(catalog.filter(r=>r.active===true&&r.registry_visible===true)
   .map(r=>r.lab_id).filter(id=>goodId.test(id)));
  // An instruction row is not an editorial approval. An unreviewed/draft row
  // must NEVER become Start-eligible solely because its rubric was reviewed.
  // Explicit status recognition is deliberately fail-closed until the
  // existing editorial approval workflow records the reviewed state.
  const reviewedLesson=new Set(lessons.filter(r=>
   /^(editorially_reviewed|approved|published|beta_ready)(?:_|$)/i.test(String(r.source_status||'')))
   .map(r=>r.lab_id).filter(id=>goodId.test(id)&&isBetaCandidateLab(id)));
  const ids=[...new Set(approved.map(r=>r.lab_id).filter(id=>
   goodId.test(id)&&isBetaCandidateLab(id)&&allowed.has(id)&&reviewedLesson.has(id)))].sort();
  return reply({ok:true,publishedIds:ids,scope:'approved_beta_candidate_with_editorially_reviewed_lesson_and_reviewed_assessment',
   betaReadyCertified:false});
 }catch{
  return reply({ok:false,error:'Lab availability cannot be verified. No unreleased Lab should be started.'},503);
 }
}
