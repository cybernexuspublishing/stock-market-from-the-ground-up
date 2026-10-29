/* Owner release readiness — always derived from server gates; never a
 * manually "passed" checkbox, payment switch or member entitlement grant.
 */
(()=>{'use strict';
 const host=document.getElementById('admin-release-register');
 if(!host)return;
 const el=(tag,text)=>{const v=document.createElement(tag);if(text!==undefined)v.textContent=text;return v};
 const title=el('h3','Website Readiness & Beta Release Register');
 const intro=el('p','An item stays open until every applicable verified gate passes and the release is accepted. Stages track progress; completing a source file or passing one CI job does not activate sales.');
 const summary=el('p','Verifying current Owner session…');summary.setAttribute('role','status');
 const tabs=el('div');tabs.className='admin-actions';
 const openButton=el('button','Open work');openButton.className='btn secondary';openButton.type='button';
 const closedButton=el('button','Accepted archive');closedButton.className='btn secondary';closedButton.type='button';
 const refreshButton=el('button','Refresh verified status');refreshButton.className='btn secondary';refreshButton.type='button';
 tabs.append(openButton,closedButton,refreshButton);
 const body=el('div');body.className='admin-grid';
 host.append(title,intro,summary,tabs,body);
 let mode='open';
 async function request(payload){
  const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner sign-in required');
  const r=await fetch('/api/owner-release-register',{method:payload?'POST':'GET',cache:'no-store',
   credentials:'same-origin',headers:{authorization:'Bearer '+session.access_token,
    ...(payload?{'content-type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true)throw Error(d?.error||'Unable to verify release register.');
  return d;
 }
 function itemCard(item){
  const card=el('article');card.className='admin-card';
  card.append(el('h4',item.title));
  card.append(el('p',item.area+' · '+item.phase.replaceAll('_',' ').toUpperCase()+
   ' · '+item.passedGates.length+'/'+item.gateTotal+' release gates verified'));
  if(item.missingGates?.length){
   const cap=el('p','Missing acceptance: '+item.missingGates.map(x=>x.replaceAll('_',' ')).join('; '));
   cap.className='small';card.append(cap);
  }else card.append(el('p',item.accepted?'Independently accepted and moved to archive.':'Gate evidence awaits final signed release acceptance.'));
  const source=item.sourcePath?el('p','Source/route: '+item.sourcePath):null;
  if(source)card.append(source);
  if(mode==='accepted')return card;
  const form=el('form');
  const label=el('label','Progress stage ');
  const stage=el('select');
  for(const name of ['research','draft','started','implemented','beta_candidate']){
   const opt=el('option',name.replaceAll('_',' '));opt.value=name;stage.append(opt);
  }stage.value=['research','draft','started','implemented','beta_candidate'].includes(item.phase)?item.phase:'implemented';
  if(!['research','draft','started','implemented','beta_candidate'].includes(item.phase)){
   stage.disabled=true;
  }
  label.append(stage);
  const next=el('textarea');next.rows=2;next.maxLength=1000;
  next.value=item.nextAction||'';next.setAttribute('aria-label','Required next action and notes');
  const submit=el('button','Save progress');submit.className='btn secondary';submit.type='submit';
  if(stage.disabled)submit.disabled=true;
  const state=el('p','');state.setAttribute('role','status');state.className='small';
  form.append(label,el('p','Next action'),next,submit,state);
  form.addEventListener('submit',async e=>{
   e.preventDefault();submit.disabled=true;state.textContent='Saving…';
   try{
    await request({code:item.code,version:item.version,phase:stage.value,nextAction:next.value.trim()});
    await load();
   }catch(error){state.textContent=error.message;submit.disabled=stage.disabled}
  });
  card.append(form);return card;
 }
 async function load(){
  body.replaceChildren();summary.textContent='Refreshing independently verified release status…';
  try{
   const data=await request(),list=mode==='open'?data.open:data.accepted;
   summary.textContent=data.summary.open+' open · '+data.summary.accepted+' accepted · '+
    data.summary.betaTesting+' in beta testing · '+data.summary.implemented+' implemented, awaiting additional acceptance';
   for(const item of list)body.append(itemCard(item));
   if(!list.length)body.append(el('p',mode==='accepted'?
    'No products have met every applicable release acceptance criterion yet.':
    'No unresolved products remain.'));
  }catch(e){summary.textContent=e.message||'Release status unavailable.'}
 }
 openButton.addEventListener('click',()=>{mode='open';void load()});
 closedButton.addEventListener('click',()=>{mode='accepted';void load()});
 refreshButton.addEventListener('click',()=>void load());
 void load();
})();
