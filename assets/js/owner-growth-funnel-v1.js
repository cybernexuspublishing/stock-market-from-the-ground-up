/* Owner growth funnel V1 — aggregate UI, safe DOM, no local data cache. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),range=$('gu-growth-range'),refresh=$('gu-growth-refresh');
 const copy=$('gu-growth-copy'),status=$('gu-growth-status'),asof=$('gu-growth-asof');
 if(!range||!refresh||!copy||!status||!asof)return;
 const labels=[
  ['registered','Accounts created'],['verified','Email verified'],
  ['free5_enrolled','Free5 enrolled'],['day1_started','Day 1 started'],
  ['day1_saved','Day 1 reflection saved'],['day5_saved','Day 5 reflection saved']
 ];
 let lastReport='';
 const renderMetric=(target,object)=>{
  target.replaceChildren();
  for(const [key,label] of labels){
   const item=document.createElement('article');item.className='gu-owner-growth-metric';
   const name=document.createElement('span');name.textContent=label;
   const value=document.createElement('strong');value.textContent=Number.isSafeInteger(object[key])?object[key].toLocaleString():'Unavailable';
   const detail=document.createElement('small');detail.textContent=key==='verified'?'Email confirmation, not just registration':key==='day1_saved'||key==='day5_saved'?'Ungraded private reflection':key==='free5_enrolled'?'Academy program enrollment record':'Account-level distinct count';
   item.append(name,value,detail);target.append(item);
  }
 };
 async function read(){
  refresh.disabled=true;copy.disabled=true;status.textContent='Reading actual verified member data…';
  $('gu-growth-cohort').replaceChildren();$('gu-growth-existing').replaceChildren();
  $('gu-growth-rows').replaceChildren();asof.textContent='';$('gu-growth-exclusions').textContent='Waiting for provider…';
  try{
   const sb=await window.getSupabaseClient();if(!sb)throw Error('Supabase authentication is unavailable.');
   const [session,user]=await Promise.all([sb.auth.getSession(),sb.auth.getUser()]);
   const token=session.data?.session?.access_token;
   if(!token||user.error||session.error||user.data?.user?.id!==session.data?.session?.user?.id)
    throw Error('Sign in as Owner before viewing the growth report.');
   const request=await fetch('/api/owner-growth-funnel?days='+encodeURIComponent(range.value),{
    headers:{authorization:'Bearer '+token,accept:'application/json'},cache:'no-store'});
   const result=await request.json().catch(()=>({}));
   if(!request.ok||result.ok!==true)throw Error(result.error||'The provider report is unavailable.');
   if(!result.cohort||!result.all_time||!Array.isArray(result.registration_days))
    throw Error('The report was incomplete.');
   renderMetric($('gu-growth-cohort'),result.cohort);
   renderMetric($('gu-growth-existing'),result.all_time);
   const rows=$('gu-growth-rows');rows.replaceChildren();
   result.registration_days.forEach(r=>{
    const tr=document.createElement('tr');
    for(const key of ['day','registered','verified_to_date','day1_started_to_date','day1_saved_to_date']){
     const td=document.createElement('td');td.textContent=String(r[key]??'Unavailable');tr.append(td);
    }rows.append(tr);
   });
   asof.textContent='Verified read as of '+result.as_of_utc+' (UTC). Requested period: '+result.days+' days.';
   const excluded=result.exclusions||{};
   $('gu-growth-exclusions').textContent='Known staff/QA identities excluded: '+(excluded.staff_and_known_qa??'Unavailable')+
    '. Accounts awaiting an eligible member profile: '+(excluded.unclassified_profiles??'Unavailable')+'.';
   status.textContent='Source verified. Showing distinct accounts and private learning outcomes; no visitor attribution claimed.';
   lastReport=[
    'SMFGU OWNER MEMBER GROWTH REPORT','As of UTC: '+result.as_of_utc,
    'Window: '+result.days+' days','New-cohort counts',
    ...labels.map(([k,v])=>v+': '+result.cohort[k]),
    'All-time eligible counts',
    ...labels.map(([k,v])=>v+': '+result.all_time[k]),
    'Known staff/QA excluded: '+excluded.staff_and_known_qa,
    'Unclassified profiles: '+excluded.unclassified_profiles,
    'No personal identifiers, private lesson text or visitor-to-member attribution included.'
   ].join('\n');
   copy.disabled=false;
  }catch(e){
   lastReport='';
   status.textContent='Unavailable — '+String(e.message||'Report could not be verified.').slice(0,165);
   $('gu-growth-cohort').textContent='No counts displayed because the source could not be verified.';
   $('gu-growth-existing').textContent='No counts displayed because the source could not be verified.';
   $('gu-growth-rows').textContent='Reporting unavailable.';
   $('gu-growth-exclusions').textContent='Unable to confirm QA exclusions.';
  }finally{refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>void read());
 range.addEventListener('change',()=>void read());
 copy.addEventListener('click',async()=>{
  if(!lastReport)return;
  try{await navigator.clipboard.writeText(lastReport);status.textContent='Aggregate report copied; no identifiers or reflection text included.';}
  catch{status.textContent='Browser blocked clipboard access; the aggregate counts remain on this page.';}
 });
 void read();
})();