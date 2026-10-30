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
 const browse='lab'; // The Academy has its own dedicated seven-program chooser.
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
 // Existing, reviewed product pages only. Book-linked Labs point to their
 // corresponding title; site-exclusive training and standalone Lab access
 // point to the already established products. No checkout is created here.
 const bookStore=Object.freeze({1:'store-book-foundation-1.html',2:'store-book-foundation-2.html',
  3:'store-book-foundation-3.html',4:'store-book-day-trading-1.html',
  5:'store-book-reading-the-tape.html'});
 const productPage=row=>release?.trainingOnly.has(row.id)||Number(row.book)===6?
  'store-membership-ondemand-monthly.html':
  bookStore[row.book]||'store-tool-interactive-learning.html';
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
  if(!release)return 'locked'; // Publication status unavailable: do not imply release or an upcoming date.
  if(!release.released.has(row.id))return 'upcoming';
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
  status.textContent='Showing '+matches.length+' of '+records.length+(records.length===419?' Labs':' publicly detailed Labs (full catalog unavailable)')+
   (rights?' · Access verified for your account':' · Locked until access can be verified')+
   (release?'':' · Publication verification unavailable; individual access remains restricted')+
   '. Search by Lab ID, title, skill or ticker.';
  if(!matches.length){host.append(text('p','No matches. Try a broader skill, ticker, title or ID.','gu-picker-empty'));return;}
  const list=document.createElement('div');list.className='gu-picker-list';
  for(const row of matches){
   const state=classification(row),locked=state!=='available';
   const item=document.createElement('article');
   item.className='gu-picker-item'+(locked?' gu-picker-locked':'');
   item.dataset.access=state;
   const info=document.createElement('div');info.className='gu-picker-info';
   const line=document.createElement('div');line.className='gu-picker-heading';
   if(locked){const nameLock=text('span','🔒','gu-picker-lock');nameLock.setAttribute('aria-hidden','true');line.append(nameLock)}
   line.append(text('strong',row.title));
   const id=text('span',row.id,'gu-picker-id');line.append(id);
   const badge=text('span',state==='available'?'Available':state==='upcoming'?'Not released':'Locked','gu-picker-access');

   line.append(badge);info.append(line);
   const meta=[row.skill?('Skill: '+row.skill):'',row.ticker?('Ticker: '+row.ticker):'',
    row.days?(row.days+' days'):'',row.book?('Book '+row.book):''].filter(Boolean);
   info.append(text('p',meta.join(' · '),'gu-picker-meta'));
   const destination=locked?productPage(row):'lab-player.html?lab='+encodeURIComponent(row.id);
   const link=text('a',locked?(state==='upcoming'?'View related product':'View Lab access options'):'Open Lab','gu-picker-action');
   link.href=destination;
   link.setAttribute('aria-label',(locked?'Locked Lab: view related product and access options for ':'Open Lab ')+row.title);
   if(state==='upcoming')link.title='Upcoming Lab. The product page determines whether a purchase is currently possible.';
   item.append(info,link);
   // Clicking the noninteractive portion of the result follows its existing
   // accessible action; no client-side permission is inferred from the click.
   item.addEventListener('click',event=>{
    if(event.target.closest('a,button,input'))return;
    window.location.assign(link.href);
   });
   list.append(item);
  }
  host.append(list);
 }
 async function load(){
  retry.hidden=true;loaded=false;status.textContent='Loading public '+(browse==='lab'?'Lab':'Boot Camp')+' titles…';
  // Public canonical metadata and the independent release service are read
  // separately. Failure of either service cannot strand the chooser on Loading.
  const requests=[read('/data/competency-lab-paths-v01499.json'),
   read('/data/labs.json'),read('/api/lab-release-availability')];
  const all=await Promise.allSettled(requests);
  const canonical=all[0].status==='fulfilled'?all[0].value:null;
  const details=all[1].status==='fulfilled'&&Array.isArray(all[1].value)?all[1].value:[];
  const goodCanonical=canonical?.totalCanonicalLabs===419&&canonical.byLab&&
   Object.keys(canonical.byLab).length===419;
  // A temporary failure of one public catalog endpoint must not erase the
  // other authoritative public 419-Lab dataset.
  const goodDetails=details.length>0&&details.every(x=>typeof x.id==='string');
  if(!goodCanonical&&!goodDetails){
   loaded=false;records=[];
   errorMsg('The Lab catalog could not be loaded. Select Retry to reconnect, or open the Lab Registry.');
   return;
  }
  const detailMap=new Map(details.map(x=>[x.id,x]));
  const source=goodCanonical?Object.entries(canonical.byLab):
   details.map(row=>[row.id,{title:row.concept||row.id,relatedCompetencies:[]}]);
  records=source.map(([id,row])=>{
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
  // Never hide matching rows simply because a member already opened a Lab.
  // The previous "initial compact" state made the selector look unloaded.
  const requested=new URLSearchParams(location.search).get('q')||'';
  if(requested&&!search.value)search.value=requested.slice(0,100);
  search.addEventListener('input',render);
  retry?.addEventListener('click',()=>void load());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)void loadRights()});
  void load();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
