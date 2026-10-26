/* Founding 600 continuous beta center.
 * Existing member routes only; no test-account impersonation, payment unlocks,
 * grades or duplicated progress storage. Individual backend authorization
 * remains authoritative for every linked feature.
 */
(()=>{'use strict';
 if(new URLSearchParams(location.search).get('tab')!=='beta')return;
 const $=id=>document.getElementById(id);
 const panel=$('member-beta-workspace'),status=$('member-beta-status'),
  labs=$('member-beta-labs-summary'),programs=$('member-beta-programs');
 if(!panel||!status||!labs||!programs)return;
 const expected=new Map([
  ['truth5',{days:5,title:'5-Day Truth Behind the Ticker',route:'bootcamp-academy.html?program=truth5'}],
  ['watchlist7',{days:7,title:'7-Day Watchlist',route:'bootcamp-academy.html?program=watchlist7'}],
  ['scanners10',{days:10,title:'10-Day Scanners',route:'bootcamp-academy.html?program=scanners10'}],
  ['foundations30',{days:30,title:'30-Day Trading Foundations',route:'bootcamp.html'}],
  ['charts45',{days:45,title:'45-Day Chart Reading',route:'bootcamp-academy.html?program=charts45'}],
  ['risk60',{days:60,title:'60-Day Risk and Execution',route:'bootcamp-academy.html?program=risk60'}],
  ['practicum90',{days:90,title:'90-Day Advanced Practicum',route:'bootcamp-academy.html?program=practicum90'}]
 ]);
 let sb=null,memberId='',generation=0;
 function clearMember(){
  generation++;memberId='';panel.hidden=true;programs.replaceChildren();
  labs.textContent='Lab publication and account access must be confirmed again under your current session.';
 }
 function setStatus(value){status.textContent=value}
 async function json(url){
  const c=new AbortController(),timeout=setTimeout(()=>c.abort(),8500);
  try{
   const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:c.signal});
   if(!response.ok)throw Error('Release service temporarily unavailable');
   const body=await response.json();
   if(body?.ok!==true)throw Error('Release response not verified');
   return body;
  }finally{clearTimeout(timeout)}
 }
 function courseList(catalog){
  programs.replaceChildren();
  const valid=Array.isArray(catalog?.programs)&&catalog.programs.length===7&&
   new Set(catalog.programs.map(p=>p.code)).size===7&&
   catalog.programs.every(p=>expected.has(p.code)&&expected.get(p.code).days===p.days);
  for(const [code,entry] of expected){
   const record=valid?catalog.programs.find(p=>p.code===code):null;
   const link=document.createElement('a');
   link.href=entry.route;link.className='member-beta-program';
   const name=document.createElement('strong');name.textContent=record?.title||entry.title;
   const details=document.createElement('span');
   details.textContent=entry.days+' days · '+(record?'Curriculum listed; verify your training access inside':
    'Open the Academy to verify available content and access');
   const note=document.createElement('small');
   note.textContent='Beta study and feedback · no official assessment credit from reflections';
   link.append(name,details,note);programs.append(link);
  }
  return valid;
 }
 async function mount(){
  try{
   sb=await window.getSupabaseClient?.();
   if(!sb)throw Error('Member sign-in service unavailable.');
   const auth=await sb.auth.getUser();
   const user=auth.data?.user;
   if(auth.error||!user?.id)throw Error('Sign in with your own member account to open the Beta Workspace.');
   memberId=user.id;const current=++generation;
   panel.hidden=false;
   // Always show real navigation first. A catalog service outage must
   // never stop independent checks by the destination service.
   courseList(null);
   setStatus('Checking current learning release information…');
   const results=await Promise.allSettled([
    json('/api/lab-beta-scope'),
    json('/api/lab-release-availability'),
    json('/api/bootcamp-academy?action=catalog')
   ]);
   if(current!==generation)return;
   const fresh=await sb.auth.getUser();
   if(fresh.error||fresh.data?.user?.id!==memberId){clearMember();return}
   const [scope,release,courses]=results.map(r=>r.status==='fulfilled'?r.value:null);
   const scopeValid=scope?.targetSelected===336&&scope?.targetUpcoming===83&&
    Array.isArray(scope.selectedForPrebeta)&&scope.selectedForPrebeta.length===336&&
    Array.isArray(scope.upcoming)&&scope.upcoming.length===83&&
    new Set([...scope.selectedForPrebeta,...scope.upcoming]).size===419;
   const releaseValid=scopeValid&&Array.isArray(release?.guidedBetaIds)&&
    Array.isArray(release?.publishedIds)&&
    [...release.guidedBetaIds,...release.publishedIds].every(id=>scope.selectedForPrebeta.includes(id))&&
    release.guidedBetaIds.every(id=>!release.publishedIds.includes(id));
   if(releaseValid){
    const guided=release.guidedBetaIds.length,reviewed=release.publishedIds.length;
    labs.textContent=guided+' Labs listed for ungraded guided beta study; '+
     reviewed+' with reviewed-exercise listing. The remaining '+scope.upcoming.length+
     ' canonical Labs are Upcoming. Matching authenticated entitlement is verified when you open the lesson.';
   }else if(scopeValid){
    labs.textContent='336 selected Lab candidates and 83 Upcoming Labs. Live teaching-release status is temporarily unavailable; the Lab player independently checks each authorized attempt. No grade or saved progress is inferred.';
   }else{
    labs.textContent='Current Lab release counts could not be verified. Open the Lab Registry to check available study activities. No Lab progress or assessment result is inferred.';
   }
   const listed=courseList(courses);
   setStatus((releaseValid?'Current Lab study listing verified. ':'Lab status requires a fresh check. ')+
    (listed?'Seven Academy course routes verified. ':'Course routes remain available; the live Academy listing could not be verified. ')+
    'This workspace does not grant access or certify assessments.');
  }catch(error){
   clearMember();
   setStatus(error?.message||'Sign-in service unavailable. Open the Account page to verify your session.');
  }
 }
 async function init(){
  sb=await window.getSupabaseClient?.();
  if(!sb){setStatus('Sign-in service unavailable.');return}
  sb.auth.onAuthStateChange?.((event,session)=>{
   if(event==='SIGNED_OUT'||memberId&&session?.user?.id!==memberId){
    clearMember();setStatus('Account changed. Sign in again to use the Beta Workspace.');
   }
  });
  await mount();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
 else void init();
})();