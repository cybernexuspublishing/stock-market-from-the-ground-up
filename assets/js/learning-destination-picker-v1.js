/* SMFGU-LAB-PICKER-001 v1.0
 * Public searchable discovery only. Entitlements remain in authenticated APIs.
 * No private Lab answer keys, protected content or checkout sessions are loaded.
 */
(()=>{
 'use strict';
 const search=document.getElementById('player-catalog-search');
 const host=document.getElementById('player-catalog-results');
 const status=document.getElementById('player-catalog-status');
 if(!search||!host||!status)return;
 const browse=new URLSearchParams(location.search).get('browse')==='bootcamp'?'bootcamp':'lab';
 const selected=new URLSearchParams(location.search).get('lab')||'';
 const retry=document.getElementById('player-catalog-retry');
 const title=document.getElementById('player-catalog-label');
 const allLink=document.getElementById('player-lab-id');
 let records=[],release=null,rights=null,account='',epoch=0,loaded=false;
 const text=(tag,value,className)=>{
  const el=document.createElement(tag);el.textContent=String(value);
  if(className)el.className=className;return el;
 };
 const normalize=x=>String(x||'').normalize('NFKD').toLowerCase().replace(/[_-]/g,' ');
 const url=(code)=>'store-tool-interactive-learning.html';
 const academySale='store-membership-ondemand-monthly.html';
 const errorMsg=message=>{status.textContent=message;retry.hidden=false;};
 const read=async endpoint=>{
  const controller=new AbortController(),time=setTimeout(()=>controller.abort(),8500);
  try{const response=await fetch(endpoint,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Catalog request failed');
   return await response.json();
  }finally{clearTimeout(time);}
 };
 const loadRights=async()=>{
  const thisEpoch=++epoch;rights=null;account='';
  render();
  try{
   const sb=await window.getSupabaseClient?.();
   if(!sb?.auth?.getSession)return;
   const initial=await sb.auth.getSession(),session=initial?.data?.session;
   if(thisEpoch!==epoch)return;
   if(!session?.access_token||!session?.user?.id)return;
   const response=await fetch('/api/lab-registry-access',{cache:'no-store',
    headers:{authorization:'Bearer '+session.access_token}});
   const json=await response.json().catch(()=>({}));
   if(thisEpoch!==epoch)return;
   if(!response.ok||json.ok!==true||json.freeEligible!==true||
      !Array.isArray(json.bookCodes)||!Array.isArray(json.freeSampleIds))throw Error('Access unverified');
   account=session.user.id;rights=json;
  }catch{rights=null;account='';}
  if(thisEpoch===epoch)render();
 };
 const classification=row=>{
  if(browse==='bootcamp'){
   if(!rights?.freeEligible||rights.training!==true)return 'locked';
   return 'available';
  }
  if(!release||!release.released.has(row.id))return 'upcoming';
  if(!rights?.freeEligible)return 'locked';
  const bookCodes={1:'FOUNDATION_BOOK_1',2:'FOUNDATION_BOOK_2',3:'FOUNDATION_BOOK_3',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'};
  const trainingOnly=release.trainingOnly.has(row.id)||Number(row.book)===6;
  const hasRight=rights.freeSampleIds.includes(row.id)||
    (trainingOnly?rights.training===true:(
      rights.interactive===true||rights.training===true||
      (bookCodes[row.book]&&rights.bookCodes.includes(bookCodes[row.book]))));
  return hasRight?'available':'locked';
 };
 function render(){
  host.replaceChildren();
  if(!loaded)return;
  const tokens=normalize(search.value).trim().split(/\s+/).filter(Boolean);
  const matches=records.filter(row=>tokens.every(term=>normalize(
   [row.id,row.title,row.skill,row.ticker,row.theme,row.summary,row.days].filter(Boolean).join(' ')
  ).includes(term)));
  status.textContent='Showing '+matches.length+' of '+records.length+' '+(browse==='lab'?'Labs':'Boot Camps')+
   (rights?' · Member access checked':' · Locked until membership access can be verified')+
   '. Search by ID, title, skill or ticker.';
  if(!matches.length){host.append(text('p','No matches. Try a broader skill, ticker, title or ID.','gu-picker-empty'));return;}
  const list=document.createElement('div');list.className='gu-picker-list';
  for(const row of matches){
   const state=classification(row),locked=state!=='available';
   const item=document.createElement('article');
   item.className='gu-picker-item'+(locked?' gu-picker-locked':'');
   item.dataset.access=state;
   const info=document.createElement('div');info.className='gu-picker-info';
   const line=document.createElement('div');line.className='gu-picker-heading';
   line.append(text('strong',row.title));
   const id=text('span',row.id,'gu-picker-id');line.append(id);
   const badge=text('span',state==='available'?'Available':state==='upcoming'?'Not released':'Locked','gu-picker-access');
   if(locked){const lock=text('span','🔒','gu-picker-lock');lock.setAttribute('aria-hidden','true');badge.prepend(lock);}
   line.append(badge);info.append(line);
   const meta=[row.skill?('Skill: '+row.skill):'',row.ticker?('Ticker: '+row.ticker):'',
    row.days?(row.days+' days'):'',row.book?('Book '+row.book):''].filter(Boolean);
   info.append(text('p',meta.join(' · '),'gu-picker-meta'));
   const destination=locked?(browse==='lab'?url(row.id):academySale):
     browse==='lab'?'lab-player.html?lab='+encodeURIComponent(row.id):
     row.id==='foundations30'?'bootcamp.html':'bootcamp-academy.html?program='+encodeURIComponent(row.id);
   const link=text('a',locked?(state==='upcoming'?'View upcoming access options':'View access options'):'Open '+(browse==='lab'?'Lab':'Boot Camp'),'gu-picker-action');
   link.href=destination;
   link.setAttribute('aria-label',(locked?'Restricted: view access options for ':'Open ')+row.title);
   if(state==='upcoming')link.title='Upcoming Lab. The product page determines whether a purchase is currently possible.';
   item.append(info,link);list.append(item);
  }
  host.append(list);
 }
 async function load(){
  retry.hidden=true;loaded=false;status.textContent='Loading public '+(browse==='lab'?'Lab':'Boot Camp')+' titles…';
  const requests=browse==='lab'?
   [read('/data/competency-lab-paths-v01499.json'),read('/data/labs.json'),read('/api/lab-release-availability')]:
   [read('/api/bootcamp-academy?action=catalog')];
  const all=await Promise.allSettled(requests);
  if(browse==='lab'){
   const canonical=all[0].status==='fulfilled'?all[0].value:null;
   const details=all[1].status==='fulfilled'&&Array.isArray(all[1].value)?all[1].value:[];
   if(canonical?.totalCanonicalLabs!==419||!canonical.byLab||
      Object.keys(canonical.byLab).length!==419){
    errorMsg('The authoritative 419-Lab catalog could not be loaded. Retry or open the Lab Registry. No access has been granted.');
    return;
   }
   const detailMap=new Map(details.map(x=>[x.id,x]));
   records=Object.entries(canonical.byLab).map(([id,row])=>{
    const extra=detailMap.get(id)||{};
    const skills=Array.isArray(row.relatedCompetencies)?row.relatedCompetencies:[];
    return{id,title:String(extra.concept||row.title||id),skill:[extra.skill,...skills.map(x=>String(x).replaceAll('_',' '))].filter(Boolean).join(' · '),
     ticker:String(extra.ticker||row.ticker||''),
     book:Number(extra.book||({F1:1,F2:2,F3:3,DT:4,TAPE:5,SITE:6}[id.split('-')[0]]||0)),
     theme:String(extra.chapterTitle||'')};
   }).sort((a,b)=>a.id.localeCompare(b.id));
   const availability=all[2].status==='fulfilled'?all[2].value:null;
   release=availability?.ok===true&&Array.isArray(availability.publishedIds)&&
    Array.isArray(availability.guidedBetaIds)?{
     released:new Set([...availability.publishedIds,...availability.guidedBetaIds]),
     trainingOnly:new Set(Array.isArray(availability.trainingOnlyIds)?availability.trainingOnlyIds:[])
    }:null;
  }else{
   const data=all[0].status==='fulfilled'?all[0].value:null;
   if(data?.ok!==true||!Array.isArray(data.programs)||data.programs.length!==7){
    errorMsg('The seven-program Academy catalog is unavailable. Retry or open Boot Camp Academy.');return;
   }
   records=data.programs.map(p=>({id:p.code,title:p.title,days:p.days,
    skill:String(p.theme||p.level||''),theme:p.theme,summary:p.summary})).sort((a,b)=>a.days-b.days);
  }
  loaded=true;render();void loadRights();
 }
 function initialize(){
  title.textContent=browse==='lab'?'Choose a Lab':'Choose a Boot Camp';
  search.placeholder=browse==='lab'?'Search Lab ID, title, skill or ticker (e.g., VWAP)':
   'Search Boot Camp ID, title, skill or subject (e.g., charts)';
  if(allLink){allLink.textContent=browse==='lab'?'All 419 Labs':'Boot Camp Academy';
   allLink.href=browse==='lab'?'labs.html':'bootcamp-academy.html';}
  if(browse==='bootcamp'){
   const jump=document.querySelector('.gu-learning-picker-toolbar a[href="bootcamp-academy.html"]');
   if(jump)jump.hidden=true;
  }
  if(selected&&browse==='lab')document.getElementById('player-catalog-browser')?.classList.add('gu-picker-initial-compact');
  search.addEventListener('input',()=>{document.getElementById('player-catalog-browser')?.classList.remove('gu-picker-initial-compact');render();});
  search.addEventListener('focus',()=>document.getElementById('player-catalog-browser')?.classList.remove('gu-picker-initial-compact'));
  retry?.addEventListener('click',()=>void load());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)void loadRights()});
  void load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
