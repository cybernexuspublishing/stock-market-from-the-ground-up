/* v0.13.5.7 - member registry loads exactly one named book/site collection at a
   time, with bounded pages and progress scoped to the visible lab IDs. */
(()=>{'use strict';
const path=location.pathname.toLowerCase();if(!/^\/labs(?:\.html)?$/.test(path))return;
const q=(s,r=document)=>r.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLLECTIONS=[['FOUNDATION_BOOK_1','Foundations Book I'],['FOUNDATION_BOOK_2','Foundations Book II'],['FOUNDATION_BOOK_3','Foundations Book III'],['DAY_TRADING_BOOK_1','Day Trading'],['READING_THE_TAPE','Reading the Tape'],['SITE_EXCLUSIVE','Site-Exclusive Labs']];
const PAGE_SIZE=50;let client=null,root=null,selected='',page=0,seq=0,targetLab='',betaScope=null,publishedLabs=null,guidedBetaLabs=null;
async function verifyBetaScope(){
 const response=await fetch('/api/lab-beta-scope',{cache:'no-store'});
 if(!response.ok)throw Error('Lab release availability cannot be verified.');
 const data=await response.json();
 if(data.ok!==true||data.targetSelected!==336||data.targetUpcoming!==83||
  !Array.isArray(data.selectedForPrebeta)||data.selectedForPrebeta.length!==336||
  !Array.isArray(data.upcoming)||data.upcoming.length!==83||
  new Set([...data.selectedForPrebeta,...data.upcoming]).size!==419)
  throw Error('Lab release scope is inconsistent; no Labs will be started.');
 const approvedResponse=await fetch('/api/lab-release-availability',{cache:'no-store'});
 if(!approvedResponse.ok)throw Error('Reviewed-Lab publication status cannot be verified.');
 const approved=await approvedResponse.json();
 if(approved.ok!==true||!Array.isArray(approved.publishedIds)||!Array.isArray(approved.guidedBetaIds)||
   [...approved.publishedIds,...approved.guidedBetaIds].some(id=>typeof id!=='string'||!data.selectedForPrebeta.includes(id))||
   approved.guidedBetaIds.some(id=>approved.publishedIds.includes(id)))
  throw Error('Reviewed-Lab publication status is inconsistent.');
 betaScope=new Set(data.selectedForPrebeta);
 publishedLabs=new Set(approved.publishedIds);
 guidedBetaLabs=new Set(approved.guidedBetaIds);
}
const label=code=>COLLECTIONS.find(x=>x[0]===code)?.[1]||'Historical Labs';
async function supabase(){for(let i=0;i<50;i++){if(typeof window.getSupabaseClient==='function')try{return await window.getSupabaseClient()}catch{}await new Promise(r=>setTimeout(r,80))}throw Error('Sign-in service unavailable.')}
function safeHref(l){const fallback='lab-player.html?lab='+encodeURIComponent(l.lab_id);if(!l.custom_href)return fallback;try{const u=new URL(l.custom_href,location.origin);return u.origin===location.origin&&['https:','http:'].includes(u.protocol)?u.pathname+u.search+u.hash:fallback}catch{return fallback}}
function card(l){const m=l.metadata||{},status=l.progress?.status||'not_started',tag=status==='completed'?'Reflection Saved (Ungraded)':status==='in_progress'?'Reflection In Progress':l.lab_type==='core'?'Book Lab':'Not started';const grade=Number.isInteger(l.gradedScore)&&l.gradedScore>=0&&l.gradedScore<=100?' · Concept '+l.gradedScore+'%':'';const details=[l.chapter_number?'Chapter '+l.chapter_number:'',m.chapter_title||'',l.ticker?[l.ticker,l.historical_date].filter(Boolean).join(' · '):'',m.skill_group||''].filter(Boolean).join(' · ');
 const content=`<span class="v133-lab-id">${esc(l.lab_id)}</span><span><strong>${esc(l.title||l.lab_id)}</strong><small>${esc(details)}</small></span><span class="v133-hide-mid">${esc(m.difficulty||l.lab_type||'')}</span><span class="v133-hide-mid">${esc(m.mode||'')}</span>`;
 if(!betaScope?.has(l.lab_id))
  return `<article class="v133-lab-row v133-lab-upcoming" data-lab-record data-lab-id="${esc(l.lab_id)}" aria-label="${esc(l.title||l.lab_id)} — Upcoming, not released">${content}<span class="v133-lab-status v133-lab-chip">Upcoming · No Start</span></article>`;
 if(guidedBetaLabs?.has(l.lab_id))
  return `<a class="v133-lab-row v133-lab-beta" data-lab-record data-lab-id="${esc(l.lab_id)}" href="${esc(safeHref(l))}" aria-label="Open ungraded beta practice for ${esc(l.title||l.lab_id)}">${content}<span class="v133-lab-status v133-lab-chip">Open Guided Beta · Ungraded</span></a>`;
 if(!publishedLabs?.has(l.lab_id))
  return `<article class="v133-lab-row v133-lab-editorial" data-lab-record data-lab-id="${esc(l.lab_id)}" aria-label="${esc(l.title||l.lab_id)} — Learning source awaiting publication">${content}<span class="v133-lab-status v133-lab-chip">Teaching review · No Start yet</span></article>`;
 return `<a class="v133-lab-row" data-lab-record data-lab-id="${esc(l.lab_id)}" href="${esc(safeHref(l))}" aria-label="Open reviewed study for ${esc(l.title||l.lab_id)}">${content}<span class="v133-lab-status v133-lab-chip">${esc(tag+grade)} · Reviewed exercise</span></a>`;
}
function layout(){root.innerHTML=`<section class="v133-lab-hero"><div><div class="eyebrow">Member Learning Environment</div><h1>Historical Lab Registry</h1><p>Choose Foundations Book I, II, III, Day Trading, Reading the Tape, or the Site-Exclusive collection. All 419 canonical Lab IDs are retained. The selected 336 have existing teaching sources and may be studied in Guided Beta mode with authorized access. Ungraded study does not award assessment credit. The other 83 remain Upcoming without a Start link.</p></div></section><div class="v133-lab-filters v1357-collection-picker"><label for="v1357-member-book"><strong>Book / collection</strong><select id="v1357-member-book" data-lab-book><option value="">Choose a book or Site-Exclusive Labs…</option>${COLLECTIONS.map(([id,title])=>`<option value="${esc(id)}">${esc(title)}</option>`).join('')}</select></label><label for="v1357-member-search"><strong>Filter this page</strong><input id="v1357-member-search" data-search type="search" disabled placeholder="Lab ID, title, ticker, skill…"></label></div><p role="status" aria-live="polite" data-message>Select a collection above to view Labs.</p><div data-list></div><nav class="v1357-page-nav" data-pager aria-label="Lab Registry pages" hidden><button class="btn secondary" type="button" data-prev>Previous</button><span data-page></span><button class="btn secondary" type="button" data-next>Next</button></nav>`;
 q('[data-lab-book]',root).onchange=e=>{selected=e.target.value;page=0;load()};q('[data-prev]',root).onclick=()=>{page=Math.max(0,page-1);load()};q('[data-next]',root).onclick=()=>{page++;load()};q('[data-search]',root).oninput=e=>{const needle=e.target.value.trim().toLowerCase();root.querySelectorAll('[data-lab-record]').forEach(row=>{row.hidden=!!needle&&!row.textContent.toLowerCase().includes(needle)})}}
async function load(){const id=++seq,msg=q('[data-message]',root),host=q('[data-list]',root),pager=q('[data-pager]',root),filter=q('[data-search]',root);host.replaceChildren();pager.hidden=true;filter.disabled=true;filter.value='';if(!selected){msg.textContent='Select one collection. No Lab records have been requested.';return}
 msg.textContent='Loading '+label(selected)+' (page '+(page+1)+')…';try{
   const {data:{session}}=await client.auth.getSession();if(!session){location.replace('signin.html?next='+encodeURIComponent('/labs.html'+location.search+location.hash));return}
   const from=page*PAGE_SIZE,to=from+PAGE_SIZE;
   const {data,error}=await client.from('platform_labs').select('lab_id,title,book_code,chapter_number,ticker,historical_date,lab_type,custom_href,metadata,sort_order').eq('active',true).eq('registry_visible',true).eq('book_code',selected).order('sort_order',{ascending:true}).order('lab_id',{ascending:true}).range(from,to);
   if(error)throw error;if(id!==seq)return;
   const records=Array.isArray(data)?data:[],more=records.length>PAGE_SIZE,labs=records.slice(0,PAGE_SIZE);
   let pmap=new Map();if(labs.length){const ids=labs.map(x=>x.lab_id);const p=await client.from('site_lab_progress').select('lab_id,status,updated_at').eq('user_id',session.user.id).in('lab_id',ids);if(p.error)throw p.error;pmap=new Map((p.data||[]).map(x=>[x.lab_id,x]));}
   // Official server-graded record does NOT mean this Lab reflection was graded.
   let grades=new Map();
   try{
    const res=await fetch('/api/interactive-training?action=progress',{
      cache:'no-store',headers:{authorization:'Bearer '+session.access_token}});
    if(res.ok){const body=await res.json();if(body.ok&&Array.isArray(body.latestByLab))
     grades=new Map(body.latestByLab.map(row=>[row.labId,row.score]));}
   }catch{/* Basic registry remains accessible if premium grades are unavailable. */}
   if(id!==seq)return;host.innerHTML=labs.length?`<section class="v133-lab-collection"><div class="v133-lab-collection-head"><h2>${esc(label(selected))}</h2><span>${labs.length} on this page</span></div><div class="v133-lab-list">${labs.map(x=>card({...x,progress:pmap.get(x.lab_id)||null,gradedScore:grades.get(x.lab_id)})).join('')}</div></section>`:'<p class="v133-lab-empty">No visible Labs in this collection or page.</p>';
   msg.textContent=`${label(selected)}: ${labs.length} Labs on page ${page+1}. Results are loaded only for this collection.`;
   if(targetLab){const selectedRow=[...host.querySelectorAll('[data-lab-id]')].find(x=>x.dataset.labId===targetLab);
     if(selectedRow){selectedRow.setAttribute('aria-current','location');selectedRow.style.outline='2px solid currentColor';selectedRow.scrollIntoView({block:'center'});}
   }filter.disabled=!labs.length;pager.hidden=!(page>0||more);q('[data-prev]',pager).disabled=page===0;q('[data-next]',pager).disabled=!more;q('[data-page]',pager).textContent='Page '+(page+1);
 }catch(e){if(id!==seq)return;msg.textContent='Unable to load this collection: '+(e.message||'Unknown error');const b=document.createElement('button');b.className='btn secondary';b.textContent='Retry';b.onclick=load;host.append(b)}}
async function init(){try{client=await supabase();const s=(await client.auth.getSession()).data?.session;if(!s){location.replace('signin.html?next='+encodeURIComponent('/labs.html'+location.search+location.hash));return}
// The current Labs page already hosts an inline v3.2/v3.3 workstation for
// ?open=LAB-ID. Do not replace its DOM with the secondary collection renderer
// after the authenticated inline host starts; keep the original workspace.
// Both renderers still require the normal Auth/entitlement boundary.
if(document.body.classList.contains('gu-inline-lab-active')){
 document.getElementById('v011-lab-registry-gate')?.remove();
 document.body.style.visibility='visible';
 return;
}
document.getElementById('v011-lab-registry-gate')?.remove();document.body.style.visibility='visible';const main=q('main .wrap')||q('main');if(!main)return;main.innerHTML='<div class="v133-labs"></div>';root=q('.v133-labs',main);await verifyBetaScope();layout();const params=new URLSearchParams(location.search),code=params.get('book');
 const query=String(params.get('q')||params.get('lab')||params.get('open')||'').trim().toUpperCase();
 let inferred='';
 if(/^F1-C[0-9]{2}-L[0-9]{2}$/.test(query))inferred='FOUNDATION_BOOK_1';
 else if(/^F2-C[0-9]{2}-L[0-9]{2}$/.test(query))inferred='FOUNDATION_BOOK_2';
 else if(/^F3-C[0-9]{2}-L[0-9]{2}$/.test(query))inferred='FOUNDATION_BOOK_3';
 else if(/^DT-C[0-9]{2}-L[0-9]{2}$/.test(query))inferred='DAY_TRADING_BOOK_1';
 else if(/^TAPE-C[0-9]{2}-L[0-9]{2}$/.test(query))inferred='READING_THE_TAPE';
 else if(/^SITE-[0-9]{3}$/.test(query))inferred='SITE_EXCLUSIVE';
 if(COLLECTIONS.some(x=>x[0]===(inferred||code))){
  selected=inferred||code;q('[data-lab-book]',root).value=selected;
  targetLab=inferred?query:'';
  if(targetLab){
   const record=await client.from('platform_labs').select('sort_order').eq('lab_id',targetLab).eq('book_code',selected).eq('active',true).eq('registry_visible',true).maybeSingle();
   if(!record.error&&record.data?.sort_order!=null){
    const ranked=await client.from('platform_labs').select('lab_id',{head:true,count:'exact'}).eq('book_code',selected)
     .eq('active',true).eq('registry_visible',true).lt('sort_order',record.data.sort_order);
    if(!ranked.error&&Number.isInteger(ranked.count))page=Math.floor(ranked.count/PAGE_SIZE);
   }
  }load();
 }else if(query){q('[data-message]',root).textContent='Select a collection to find '+query+'. Browsing is limited to one collection at a time.'}}
 catch(e){document.getElementById('v011-lab-registry-gate')?.remove();document.body.style.visibility='visible';const main=q('main .wrap')||q('main');if(main)main.textContent='The Lab Registry is temporarily unavailable: '+e.message}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
