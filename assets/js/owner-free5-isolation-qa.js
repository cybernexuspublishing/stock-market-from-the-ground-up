/* SMFGU Owner Free5 privacy acceptance — genuine Owner browser, read-only.
 * NO passwords, bearer values, member IDs, emails or private reflections in UI/report.
 * Every request uses the existing member/Owner authorization path.
 * This is not a mock/impersonated session or a backend acceptance assertion.
 */
(()=>{'use strict';
 const results=document.getElementById('owner-free5-qa-results');
 const status=document.getElementById('owner-free5-qa-status');
 const rerun=document.getElementById('owner-free5-qa-run');
 const copy=document.getElementById('owner-free5-qa-copy');
 if(!results||!status||!rerun||!copy)return;
 let safeReport='',running=false;
 const resultsRecord=[];
 function record(label,pass){
  resultsRecord.push({check:label,result:pass?'PASS':'FAIL'});
  const li=document.createElement('li');
  li.textContent=(pass?'PASS — ':'FAIL — ')+label;
  li.style.margin='0.6rem 0';
  results.append(li);
 }
 async function read(url,token){
  const r=await fetch(url,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/json'},cache:'no-store',credentials:'same-origin'});
  const body=await r.json().catch(()=>({}));
  return {status:r.status,body};
 }
 async function run(){
  if(running)return;
  running=true;rerun.disabled=true;copy.disabled=true;
  results.replaceChildren();resultsRecord.length=0;safeReport='';
  status.textContent='Verifying the genuine Owner session and private-record boundary…';
  let overall='BLOCKED';
  try{
   if(typeof window.getSupabaseClient!=='function')throw Error('The authentication client is unavailable.');
   const sb=await window.getSupabaseClient();
   if(!sb)throw Error('The authentication client is unavailable.');
   const [sessionResult,identityResult]=await Promise.all([sb.auth.getSession(),sb.auth.getUser()]);
   const session=sessionResult.data?.session;
   const user=identityResult.data?.user;
   if(sessionResult.error||identityResult.error||!session?.access_token||!user||user.id!==session.user?.id)
    throw Error('There is no verified Owner session. Sign in as Owner using the normal website sign-in page.');
   const token=session.access_token;
   const context=await read('/api/admin?action=context',token);
   const roles=Array.isArray(context.body.roles)?context.body.roles:[];
   const ownerVerified=context.status===200&&context.body.ok===true&&
    context.body.user?.id===user.id&&roles.includes('OWNER')&&!roles.includes('SHOWCASE_VIEWER');
   record('Authenticated identity is independently verified by the server as OWNER',ownerVerified);
   if(!ownerVerified)throw Error('The signed-in account is not verified as OWNER. No private tests were attempted.');
   const ordinary=await read('/api/bootcamp-academy?program=free5',token);
   const correctProgram=ordinary.status===200&&ordinary.body.ok===true&&ordinary.body.program?.code==='free5'&&
     ordinary.body.progressAvailable===true&&Array.isArray(ordinary.body.progress)&&ordinary.body.enrolled===true;
   record('Owner can read only their own Free Foundations study record',correctProgram);
   if(!correctProgram)throw Error('Owner Free Foundations data is unavailable or not enrolled; privacy cannot be accepted.');
   const ownProgress=ordinary.body.progress;
   const jamesMarker='FICTIONAL QA DAY 1 REFLECTION:';
   const noOtherReflection=!ownProgress.some(x=>typeof x.reflection==='string'&&x.reflection.startsWith(jamesMarker));
   record('Owner result does not contain the James_Test fictional QA reflection',noOtherReflection);
   // Untrusted user-id selectors must not switch the server's identity filter.
   const cross=await read('/api/bootcamp-academy?program=free5&user_id=00000000-0000-4000-8000-000000000000&member_id=00000000-0000-4000-8000-000000000000',token);
   const selectorsIgnored=cross.status===200&&cross.body.ok===true&&
     cross.body.progressAvailable===true&&JSON.stringify(cross.body.progress)===JSON.stringify(ownProgress);
   record('Member-ID query manipulation cannot change the returned Owner records',selectorsIgnored);
   // This table is service-only. Even Owner browser credentials must not grant direct SELECT.
   const direct=await sb.from('gu_bootcamp_academy_progress_v014168').select('day_number').limit(1);
   const tableDenied=Boolean(direct.error)&&(!Array.isArray(direct.data)||direct.data.length===0);
   record('Direct member-client access to private Academy progress is denied',tableDenied);
   overall=resultsRecord.every(r=>r.result==='PASS')?'PASS':'FAIL';
   status.textContent=overall==='PASS'
    ?'PASS — All read-only Owner-session privacy checks succeeded.'
    :'FAIL — At least one Owner-session privacy check did not pass.';
  }catch(error){
   if(resultsRecord.some(r=>r.result==='FAIL'))overall='FAIL';
   status.textContent=(overall==='FAIL'?'FAIL':'BLOCKED')+' — '+String(error?.message||'Test unavailable.').slice(0,200);
  }finally{
   const timestamp=new Date().toISOString();
   safeReport=['SMFGU OWNER FREE5 PRIVACY QA', 'Checked at (UTC): '+timestamp,
    'Owner session: '+(resultsRecord.some(r=>r.check.startsWith('Authenticated identity')&&r.result==='PASS')?'VERIFIED':'NOT VERIFIED'),
    ...resultsRecord.map(r=>r.result+' — '+r.check),'Overall: '+overall,
    'Scope: read-only production Owner browser; no password, identity, token or learning content recorded',
    'James_Test prior separate browser check: see release acceptance report'].join('\n');
   copy.disabled=!resultsRecord.length;
   rerun.disabled=false;running=false;
  }
 }
 rerun.addEventListener('click',run);
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(safeReport);status.textContent+=' Safe report copied.';}
  catch{
   // Never display private data. Safe report contains only fixed check labels.
   status.textContent+=' Your browser blocked clipboard access. The results above remain visible.';
  }
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
 else run();
})();
