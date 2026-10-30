/* Free research watchlist: one signed-in member, account-scoped backend,
 * no localStorage of private notes, no real-time quotes, no order placement.
 */
(()=>{'use strict';
 const byId=id=>document.getElementById(id);
 if(!byId('free-watchlist-content'))return;
 const state={client:null,userId:'',busy:false,epoch:0,entries:[],editing:null};
 const say=(id,msg)=>{const n=byId(id);if(n)n.textContent=msg};
 const setBusy=busy=>{
  state.busy=busy;
  byId('free-watchlist-save').disabled=busy;
  byId('free-watchlist-reset').disabled=busy;
 };
 function clearPrivate(){
  state.userId='';state.entries=[];state.editing=null;++state.epoch;
  window.GroundUpFreeWatchlistReviewV1?.clear?.();
  byId('free-watchlist-content').hidden=true;
  byId('free-watchlist-list').replaceChildren();
  say('free-watchlist-count','— / 20');
  byId('free-watchlist-form').reset();
  setBusy(false);
 }
 function item(tag,content,className){
  const el=document.createElement(tag);
  if(content!==undefined)el.textContent=String(content);
  if(className)el.className=className;
  return el;
 }
 async function request(payload=null){
  const {data:{session}}=await state.client.auth.getSession();
  if(!session?.access_token||session.user?.id!==state.userId)
   throw Error('Your account changed. Sign in again.');
  const member=state.userId,epoch=state.epoch;
  const response=await fetch('/api/free-watchlist',{
   method:payload?'POST':'GET',cache:'no-store',credentials:'same-origin',
   headers:{authorization:'Bearer '+session.access_token,...(payload?{'content-type':'application/json'}:{})},
   ...(payload?{body:JSON.stringify(payload)}:{})
  });
  const data=await response.json().catch(()=>({}));
  if(member!==state.userId||epoch!==state.epoch)throw Error('Account changed during loading.');
  if(!response.ok||data.ok!==true)throw Error(data.error||'Watchlist service unavailable.');
  return data;
 }
 function render(){
  const root=byId('free-watchlist-list');root.replaceChildren();
  say('free-watchlist-count',state.entries.length+' / 20');
  window.GroundUpFreeWatchlistReviewV1?.update?.(state.entries);
  if(!state.entries.length){
   root.append(item('p','No research entries saved yet. Try the original fictional GUSIM example, or enter a symbol you want to investigate.'));
   return;
  }
  for(const row of state.entries){
   const card=item('article',undefined,'free-watchlist-entry');
   const head=item('div',undefined,'free-watchlist-entry-head');
   head.append(item('h3',row.symbol));
   head.append(item('span',row.status.replaceAll('_',' '),'free-watchlist-entry-status'));
   card.append(head,item('p','Source classification: '+row.sourceKind.replaceAll('_',' ')));
   card.append(item('p','Your research: '+row.researchNote));
   if(row.sourceNote)card.append(item('p','Source to check: '+row.sourceNote));
   const when=new Date(row.updatedAt);
   if(Number.isFinite(when.getTime())){
    const t=item('small','Updated '+when.toLocaleString());card.append(t);
   }
   const actions=item('div',undefined,'free-watchlist-entry-actions');
   const edit=item('button','Review / edit','btn secondary');edit.type='button';
   edit.addEventListener('click',()=>{
    if(state.busy)return;
    state.editing=row.symbol;
    byId('free-watchlist-symbol').value=row.symbol;
    byId('free-watchlist-symbol').readOnly=true;
    byId('free-watchlist-status').value=row.status;
    byId('free-watchlist-source-kind').value=row.sourceKind;
    byId('free-watchlist-source-note').value=row.sourceNote;
    byId('free-watchlist-research-note').value=row.researchNote;
    byId('free-watchlist-save').textContent='Update research entry';
    byId('free-watchlist-symbol').scrollIntoView({block:'center'});
    byId('free-watchlist-research-note').focus();
    say('free-watchlist-save-status','Editing '+row.symbol+'. Save updates or clear the form to cancel.');
   });
   const remove=item('button','Remove entry','btn secondary');remove.type='button';
   remove.addEventListener('click',async()=>{
    if(state.busy||!window.confirm('Remove your saved research note for '+row.symbol+'? This cannot be undone.'))return;
    setBusy(true);
    try{await request({action:'remove',symbol:row.symbol});
     state.entries=state.entries.filter(x=>x.symbol!==row.symbol);
     render();say('free-watchlist-save-status',row.symbol+' removed from your private research list.');
     if(state.editing===row.symbol)resetForm();
    }catch(e){say('free-watchlist-save-status',e.message)}
    finally{setBusy(false)}
   });
   const continueLink=item('a','Continue in Advanced Watchlist','btn secondary');
   continueLink.href='advanced-tool.html?tool=WATCHLIST_WORKBENCH&free_symbol='+encodeURIComponent(row.symbol);
   continueLink.setAttribute('aria-label','Continue '+row.symbol+' in Advanced Watchlist');
   actions.append(edit,continueLink,remove);card.append(actions);root.append(card);
  }
 }
 function resetForm(){
  state.editing=null;byId('free-watchlist-form').reset();
  byId('free-watchlist-symbol').readOnly=false;
  byId('free-watchlist-save').textContent='Save research entry';
  say('free-watchlist-save-status','Ready for a new research note. No entry has been changed.');
 }
 async function load(){
  const result=await request();
  if(!Array.isArray(result.entries)||result.entries.length>20)throw Error('Invalid account-specific watchlist response.');
  state.entries=result.entries;
  render();say('free-watchlist-live-status',result.entries.length+
   ' private research entries loaded. This list contains no verified quote, order or trading signal.');
 }
 async function submit(event){
  event.preventDefault();if(state.busy||!state.userId)return;
  const symbol=byId('free-watchlist-symbol').value.trim().toUpperCase();
  const researchNote=byId('free-watchlist-research-note').value.trim();
  const sourceNote=byId('free-watchlist-source-note').value.trim();
  if(!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)||researchNote.length<30||
   researchNote.length>600||sourceNote.length>400){
   say('free-watchlist-save-status','Enter a valid symbol and 30–600 characters of research reasoning.');return;
  }
  const action=state.editing?'update':'add';
  if(action==='update'&&symbol!==state.editing){say('free-watchlist-save-status','Clear the form to add a different symbol.');return}
  setBusy(true);say('free-watchlist-save-status','Saving your private research…');
  try{
   const {entry}=await request({action,symbol,researchNote,sourceNote,
    sourceKind:byId('free-watchlist-source-kind').value,status:byId('free-watchlist-status').value});
   if(!entry||entry.symbol!==symbol)throw Error('Saved research could not be verified.');
   const i=state.entries.findIndex(x=>x.symbol===symbol);
   if(i<0)state.entries.unshift(entry);else state.entries[i]=entry;
   state.entries.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
   render();resetForm();say('free-watchlist-save-status',
    symbol+' saved to your private member research watchlist. No verified market claim or grade was recorded.');
  }catch(e){say('free-watchlist-save-status',e.message)}
  finally{setBusy(false)}
 }
 async function init(){
  try{
   window.GroundUpFreeWatchlistReviewV1?.mount?.();
   state.client=await window.getSupabaseClient();
   state.client.auth.onAuthStateChange((_event,session)=>{
    const id=session?.user?.id||'';
    if(id!==state.userId){
     clearPrivate();
     say('free-watchlist-gate',id?'Your account changed. Refresh your private research list.':'Signed out. Private research cleared from this screen.');
    }
   });
   const {data:{user}}=await state.client.auth.getUser();
   if(!user){say('free-watchlist-gate','Sign in to open your private Free watchlist.');return}
   state.userId=user.id;++state.epoch;
   await load();
   byId('free-watchlist-content').hidden=false;
   say('free-watchlist-gate','Research workspace ready. Your entries are private and synced through the account database.');
  }catch(e){say('free-watchlist-gate',String(e.message||'Private watchlist unavailable. No research was changed.'))}
 }
 const prepare=byId('free-research-prepare');
 if(prepare)prepare.addEventListener('click',()=>{
  const fields=[['Why', 'free-research-why'],['Review trigger', 'free-research-trigger'],
   ['Invalidation or NO TRADE', 'free-research-risk'],['Review time', 'free-research-review']];
  const parts=fields.map(([label,id])=>[label,byId(id)?.value.trim()||'']).filter(([,val])=>Boolean(val));
  const marked=Array.from(document.querySelectorAll('#free-research-checklist input[data-research-check]:checked'))
   .map(input=>input.getAttribute('data-research-check'))
   .filter(label=>typeof label==='string'&&label.length<=30);
  if(marked.length)parts.push(['Member-reported research checks',marked.join(', ')]);
  const result=byId('free-research-guide-status');
  if(!parts.length){result.textContent='Enter at least one research observation first.';return}
  const note=byId('free-watchlist-research-note');
  const addition=parts.map(([label,val])=>label+': '+val).join(' | ');
  // Pressing the helper twice should not duplicate identical checklist notes.
  const alreadyIncluded=note.value.includes(addition);
  const combined=alreadyIncluded?note.value.trim():
   [note.value.trim(),addition].filter(Boolean).join(' | ');
  if(combined.length>600){
   result.textContent='The combined research note exceeds 600 characters. Shorten the fields or remove older notes before adding.';return;
  }
  note.value=combined;result.textContent=(alreadyIncluded?'Those observations are already in your note. ':'Structured observations added to your note. ')+ 'Select Save research entry to store them privately.';
  note.focus();
 });
 byId('free-watchlist-form').addEventListener('submit',event=>void submit(event));
 byId('free-watchlist-reset').addEventListener('click',resetForm);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
 else void init();
})();
