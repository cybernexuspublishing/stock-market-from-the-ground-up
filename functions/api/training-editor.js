/* Owner-reviewed Lab question authoring. Answer keys remain in the server-only
 * database, never exported to public JSON files or generic member APIs.
 */
const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});
const problem=(m,s=400)=>Object.assign(new Error(m),{status:s}),str=x=>String(x??'').trim(),enc=encodeURIComponent;
function cfg(env){const base=str(env.SUPABASE_URL).replace(/\/$/,''),secret=env.SUPABASE_SECRET_KEY,pub=env.SUPABASE_PUBLISHABLE_KEY;if(!base||!secret||!pub)throw problem('Backend unavailable.',503);return{base,secret,pub}}
async function json(u,init){const r=await fetch(u,{...init,cache:'no-store'}),text=await r.text();if(!r.ok)throw problem('Instruction database request failed.',503);return text?JSON.parse(text):[]}
async function db(env,path,method='GET',body){const c=cfg(env),headers={apikey:c.secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;return json(c.base+'/rest/v1/'+path,{method,headers:{...headers,...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body)})}
async function owner(env,request){const t=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];if(!t)throw problem('Sign in required.',401);const c=cfg(env),user=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+t}});if(!user?.id)throw problem('Invalid session.',401);const [p,r,flags]=await Promise.all([
 db(env,'profiles?select=account_kind&id=eq.'+enc(user.id)+'&limit=1'),
 db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+enc(user.id)),
 db(env,'admin_user_flags?select=status&user_id=eq.'+enc(user.id)+'&limit=1')]);
 if(p[0]?.account_kind!=='member'||['restricted','suspended'].includes(str(flags?.[0]?.status).toLowerCase())||
 !r.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
 throw problem('Eligible active OWNER required; Showcase and restricted accounts cannot edit private answer keys.',403);if(env.REQUIRE_STAFF_AAL2_V135==='true'){let a='';try{a=JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal}catch{}if(a!=='aal2')throw problem('Staff MFA required.',403)}return user.id}
// Enumerate existing rubric versions, without truncating the 419-ID review queue.
// No private keys are selected; the existing Owner ACL remains the gate.
async function listAllReviewSummaries(env){
 const batch=500,limit=5000,all=[];
 for(let offset=0;offset<=limit;offset+=batch){
  const rows=await db(env,'lab_training_sets_v014?select=lab_id,version,title,review_state,source_status,reviewed_at,updated_at&order=lab_id.asc,version.desc&limit='+batch+'&offset='+offset);
  if(!Array.isArray(rows)||rows.length>batch)throw problem('Owner instructional review query returned an invalid page.',503);
  all.push(...rows);
  if(rows.length<batch)return all;
 }
 throw problem('Too many rubric versions to enumerate safely; review database pagination policy.',503);
}
const validLab=x=>/^[A-Za-z0-9_-]{3,90}$/.test(str(x));
// Private generic v96 rubric items are arithmetic practice, not proof of a
// distinct Lab-specific learning outcome. Require an independently authored
// additional topic question before Owner can approve a v96-origin rubric.
const V96_SEED_QUESTION_IDS=new Set(['EVIDENCE','FOCUS','ORIGINAL_MATH','BOUNDARY']);
function isUnamendedV96Rubric(set){
 const source=str(set.source_status);
 if(source.startsWith('original_hypothetical_b01_')){
  // All six concepts must be genuinely individualized before an Owner can
  // review this rubric. Do not let old v96 evidence/focus/boundary templates
  // pass because just two application questions were appended.
  const qs=set.questions,keys=set.answer_key;
  const ids=['EVIDENCE','FOCUS','ORIGINAL_MATH','BOUNDARY','B01_APPLICATION','B01_LIMITATION'];
  if(!Array.isArray(qs)||qs.length!==6||!keys||typeof keys!=='object')return true;
  if(qs.some((q,index)=>str(q?.id)!==ids[index]))return true;
  const legacy=[
   /^In ".+"[,]? which learning method/i,
   /^Which study objective is appropriate BEFORE acting/i,
   /^For this ".+" exercise, which final action/i,
   /^ORIGINAL hypothetical observed price interval/i
  ];
  for(const [index,id] of ids.entries()){
   const q=qs[index];
   if(!q||str(q.prompt).length<30||str(q.explanation).length<80)return true;
   if([0,1,2,3].some(j=>legacy[j].test(str(q.prompt))))return true;
   if(index===2){
    if(q.kind!=='number'||!/^FICTIONAL:/i.test(str(q.prompt))||
     !Number.isFinite(Number(keys[id]))||!Number.isFinite(Number(q.tolerance))||
     Number(q.tolerance)<0||Number(q.tolerance)>1000)return true;
    continue;
   }
   if(q.kind!=='choice'||!Array.isArray(q.options)||q.options.length!==3||
    q.options.some(v=>typeof v!=='string'||!v.trim()||v.length>=100))return true;
   const unique=q.options.map(v=>v.trim().toLowerCase());
   if(new Set(unique).size!==3||unique.filter(v=>v===str(keys[id]).toLowerCase()).length!==1)return true;
  }
  if(!/^FICTIONAL:/i.test(str(qs[4].prompt))||str(qs[4].prompt).length<80||
   str(qs[5].prompt).length<40)return true;
  return false;
 }
 if(!source.startsWith('original_hypothetical_unreviewed_v01496'))return false;
 return !Array.isArray(set.questions)||!set.questions.some(q=>
  !V96_SEED_QUESTION_IDS.has(str(q?.id))&&
  str(q?.prompt).length>=80&&str(q?.explanation).length>=120);
}
function validate(qs,answers){if(!Array.isArray(qs)||qs.length<1||qs.length>40||!answers||typeof answers!=='object'||Array.isArray(answers))throw problem('Provide 1–40 questions and an answer for each.');const ids=new Set();for(const q of qs){if(!/^[A-Za-z][A-Za-z0-9_]{1,40}$/.test(str(q.id))||ids.has(q.id)||!['choice','number'].includes(q.kind)||str(q.prompt).length<12||str(q.prompt).length>1000||str(q.explanation).length<15||str(q.explanation).length>1600)throw problem('Invalid question, answer explanation, or duplicate ID.');ids.add(q.id);if(q.kind==='choice'&&(!Array.isArray(q.options)||q.options.length<2||q.options.length>7||!q.options.every(x=>typeof x==='string'&&x.length<100)))throw problem('Choice questions require 2–7 clear options.');
if(q.kind==='choice'){
 const normalized=q.options.map(v=>v.trim().toLowerCase());
 if(normalized.some(x=>!x)||new Set(normalized).size!==normalized.length)
  throw problem('Choice options must be distinct, nonblank answers; duplicate distractors are not valid.');
}
const a=answers[q.id];if(a===undefined||a===null||String(a).length>200)throw problem('Missing answer key for '+q.id);if(q.kind==='choice'&&(!String(a).trim()||String(a)!==String(a).trim()||!q.options.some(x=>String(x).trim().toUpperCase()===String(a).trim().toUpperCase())))throw problem('Choice answer must exactly match one nonblank reviewed option.');if(q.kind==='number'&&(!Number.isFinite(Number(a))||!Number.isFinite(Number(q.tolerance))||Number(q.tolerance)<0||Number(q.tolerance)>1000))throw problem('Invalid numeric answer or tolerance.');
if(q.criticalOnWrong!==undefined&&typeof q.criticalOnWrong!=='boolean')
 throw problem('Critical-error grading must be explicitly true or false.');
if(q.partialTolerance!==undefined||q.partialCreditPct!==undefined){
 if(q.kind!=='number'||typeof q.partialTolerance!=='number'||
   !Number.isFinite(q.partialTolerance)||typeof q.partialCreditPct!=='number'||
   !Number.isInteger(q.partialCreditPct)||q.partialCreditPct<1||
   q.partialCreditPct>99||q.partialTolerance<=Number(q.tolerance)||
   q.partialTolerance>1000)
  throw problem('Partial credit requires a numeric question, wider numeric tolerance and an integer percentage between 1 and 99.');
}}if(Object.keys(answers).length!==qs.length)throw problem('Every answer key must match exactly one question.');}
export async function onRequest({request,env}){try{const actor=await owner(env,request),u=new URL(request.url),action=u.searchParams.get('action')||'list';
 if(request.method==='GET'&&action==='list'){const sets=await listAllReviewSummaries(env);return out({ok:true,sets,allVersionsIncluded:true})}
 if(request.method==='GET'&&action==='knowledge-map'){
  const id=u.searchParams.get('labId')||'';
  if(!validLab(id))throw problem('Valid canonical Lab ID required.');
  const [maps,definitions]=await Promise.all([
   db(env,'gu_lab_competency_knowledge_map_v014105?select=lab_id,competency_code,mapping_method,review_state,rubric_version,reviewed_at&lab_id=eq.'+enc(id)+'&limit=1'),
   db(env,'competency_definitions?select=competency_code,name&active=eq.true&order=sort_order.asc&limit=35')
  ]);
  if(!maps?.[0])return out({ok:false,error:'No canonical knowledge-mapping candidate exists for this Lab.'},404);
  return out({ok:true,mapping:maps[0],definitions,scope:'knowledge_only_ungraded_source_mapping_until_owner_approval'});
 }
 if(request.method==='GET'&&action==='get'){const id=u.searchParams.get('labId')||'',ver=Number(u.searchParams.get('version'));if(!validLab(id)||!Number.isSafeInteger(ver))throw problem('Valid Lab/version required.');const rows=await db(env,'lab_training_sets_v014?select=*&lab_id=eq.'+enc(id)+'&version=eq.'+ver+'&limit=1');if(!rows[0])return out({ok:false,error:'Rubric not found.'},404);return out({ok:true,set:rows[0]})}
 if(request.method!=='POST')return out({ok:false,error:'Unsupported method.'},405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==u.origin)throw problem('Cross-origin Owner curriculum changes are denied.',403);
 if(Number(request.headers.get('content-length')||0)>60000)throw problem('Instructional payload too large.',413);
 const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>60000)throw problem('Instructional payload too large.',413);
 let b;try{b=JSON.parse(raw)}catch{throw problem('Invalid instructional JSON.')}
 if(!b||typeof b!=='object'||Array.isArray(b))throw problem('Invalid instructional payload.');
 const id=str(b.labId),title=str(b.title);if(!validLab(id))throw problem('Valid Lab ID required.');
 if(action==='approve-map'){
  const version=Number(b.version),code=str(b.competencyCode);
  if(!Number.isSafeInteger(version)||version<1||
   !/^[A-Z][A-Z0-9_]{3,80}$/.test(code)||b.confirmPhrase!=='APPROVE KNOWLEDGE ONLY')
   throw problem('Select an official competency, an exact reviewed rubric version and explicit Owner approval.');
  const saved=await db(env,'rpc/gu_v014105_approve_lab_knowledge_map','POST',
   {p_actor:actor,p_lab:id,p_rubric:version,p_competency:code,p_confirm:'APPROVE KNOWLEDGE ONLY'});
  if(saved?.ok!==true)throw problem('Knowledge-mapping approval rejected: '+str(saved?.reason||'unavailable'),409);
  return out({ok:true,...saved,notice:'One approved Lab/rubric/competency mapping. Graded conceptual attempts can provide KNOWLEDGE-only evidence after server reconciliation; other three dimensions and historical validity remain unverified.'});
 }
 if(title.length<10||title.length>200)throw problem('Descriptive instructional title is required.');
 if(action==='draft'){
  validate(b.questions,b.answerKey);
  const existing=await db(env,'lab_training_sets_v014?select=version,review_state,source_status,updated_at&lab_id=eq.'+enc(id)+'&order=version.desc&limit=1');
  const last=existing[0],expected=str(b.expectedUpdatedAt);
  if(last&&(!last.updated_at||!expected||expected!==String(last.updated_at)))
   throw problem('Rubric changed since it was loaded. Reload the latest version before saving.',409);
  if(!last&&expected)throw problem('A rubric was added in another session. Reload.',409);
  const version=last?.review_state==='draft'?last.version:(last?.version||0)+1;
  const row={lab_id:id,version,title,questions:b.questions,answer_key:b.answerKey,
   review_state:'draft',source_status:last?.source_status||'book_authored_unverified_market',updated_at:new Date().toISOString()};
  const saved=last?.review_state==='draft'
   ?await db(env,'lab_training_sets_v014?lab_id=eq.'+enc(id)+'&version=eq.'+version+
     '&review_state=eq.draft&updated_at=eq.'+enc(expected),'PATCH',row)
   :await db(env,'lab_training_sets_v014','POST',row);
  if(saved.length!==1)throw problem('Another revision or review intervened; reload and recheck this rubric.',409);
  return out({ok:true,labId:id,version,updatedAt:saved[0].updated_at,reviewState:'draft',
   notice:'Draft stored privately. It cannot grade members until reviewed.'});
 }
 if(action==='review'){const version=Number(b.version);if(!Number.isSafeInteger(version)||b.confirmPhrase!=='REVIEW BOOK RUBRIC')throw problem('Explicit Owner rubric review required.');const rows=await db(env,'lab_training_sets_v014?select=*&lab_id=eq.'+enc(id)+'&version=eq.'+version+'&limit=1'),set=rows[0];if(!set)return out({ok:false,error:'Rubric not found.'},404);if(set.review_state!=='draft')throw problem('Only draft versions can be approved.');
 if(!set.updated_at)throw problem('Rubric revision cannot be verified. Reload.',409);
 validate(set.questions,set.answer_key);
 if(isUnamendedV96Rubric(set))throw problem(
 'Original hypothetical grading drafts require individual topic-specific evidence and subject review. Batch B01 requires both complete application and limitation questions before the Owner approves this exact rubric.',409);const saved=await db(env,'lab_training_sets_v014?lab_id=eq.'+enc(id)+'&version=eq.'+version+'&review_state=eq.draft&updated_at=eq.'+enc(String(set.updated_at)),'PATCH',{review_state:'reviewed',reviewed_by:actor,reviewed_at:new Date().toISOString()});if(saved.length!==1)throw problem('Rubric changed during review; reload and independently recheck its content.',409);return out({ok:true,labId:id,version,reviewState:'reviewed',notice:set.source_status?.startsWith('original_hypothetical')?'Original hypothetical rubric reviewed for conceptual grading only; NOT historical market evidence or trading mastery.':'Book-authored rubric approved for mechanical grading. Market-data verification is still pending.'})}
 return out({ok:false,error:'Unknown action.'},404);
}catch(e){return out({ok:false,error:e.message||'Instruction management unavailable.'},e.status||500)}}
