/* Source-linked, read-only Workbench -> existing Journal draft.
 * A source plan id is not an authorization credential. The server verifies
 * Auth, premium workbench rights and snapshot ownership on every read.
 * No plan or Journal record is automatically locked or marked executed.
 */
(()=>{'use strict';
 const q=new URLSearchParams(location.search),raw=q.get('source_plan')||'';
 if(!/^[1-9][0-9]{0,15}$/.test(raw)||!Number.isSafeInteger(Number(raw)))return;
 let applied=false,pending=false,sourcePending=null;
 const by=id=>document.getElementById(id);
 const entry=location.pathname.endsWith('journal-entry.html');
 const list=location.pathname.endsWith('journal.html');
 if(!entry&&!list)return;
 const create=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
 function notice(parent,body){
  const panel=create('section');panel.className='journal-card journal-section';
  panel.id='journal-plan-transfer-panel';
  const h=create('h2','Saved Workbench plan — Journal handoff');
  const status=create('p',body);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=create('div');actions.className='journal-actions';
  panel.append(h,status,actions);
  parent?.prepend(panel);
  return {status,actions,panel};
 }
 const root=entry?by('entry-content'):by('journal-content');
 if(!root)return;
 const ui=notice(root,'Verify your source plan before copying it. No trade, position, or outcome is created by the transfer.');
 async function loadPlan(){
  const sb=await window.getSupabaseClient();
  const ses=(await sb.auth.getSession()).data?.session;
  if(!ses?.user?.id||!ses.access_token)throw Error('Sign in to import your private saved Workbench plan.');
  const r=await fetch('/api/journal-plan-prefill?planId='+encodeURIComponent(raw),{
   headers:{authorization:'Bearer '+ses.access_token},credentials:'same-origin',cache:'no-store'});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true||d.planId!==Number(raw)||!d.journalDraft)throw Error(d?.error||'Saved plan could not be verified.');
  const verify=(await sb.auth.getSession()).data?.session;
  if(verify?.user?.id!==ses.user.id)throw Error('Account changed while loading the plan.');
  return {sb,userId:ses.user.id,...d};
 }
 const input=(id,value)=>{
  const x=by(id);
  if(!x||value===undefined||value===null||typeof value==='object')return;
  x.value=String(value);
  x.dispatchEvent(new Event('change',{bubbles:true}));
 };
 function setup(value,id,customId){
  const selector=by(id);
  if(!selector)return;
  const match=[...selector.options].find(o=>o.value.toLowerCase()===String(value||'').toLowerCase());
  if(match){input(id,match.value);return}
  input(id,'__CUSTOM__');input(customId,String(value||'Research plan').slice(0,120));
 }
 async function makeCreatePrefill(){
  if(applied||pending)return;pending=true;
  try{
   const d=await loadPlan(),p=d.journalDraft;
   input('new-ticker',p.ticker);input('new-date',p.trade_date);
   input('new-type','observation');input('new-timeframe','Research plan');
   setup(p.setup,'new-setup','new-setup-custom');
   by('new-journal-panel').hidden=false;
   ui.status.textContent='Private saved plan #'+d.planId+' from '+d.asOf+
    ' loaded into the New Journal Record form. You may edit the type and details. '+
    'Select Create & Open Record to use your normal Journal allowance and continue; no trade has been recorded.';
   applied=true;
  }catch(e){ui.status.textContent=e.message||'Unable to load saved plan.'}
  finally{pending=false}
 }
 async function makeEntryPrefill(){
  if(applied||pending)return;pending=true;
  try{
   const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
   const id=Number(q.get('id')||0);
   if(!id||!session?.user?.id)throw Error('Current private Journal draft is unavailable.');
   const {data:row,error}=await sb.from('decision_journal')
    .select('id,user_id,status,plan_locked_at,thesis,evidence,ticker')
    .eq('id',id).eq('user_id',session.user.id).maybeSingle();
   if(error||!row||row.status!=='draft'||row.plan_locked_at||row.thesis||row.evidence)
    throw Error('Import requires a new, empty, unlocked Journal draft. Existing decisions are never overwritten.');
   const d=await loadPlan(),p=d.journalDraft;
   const button=create('button','Apply saved plan to this draft (review before saving)');
   button.type='button';button.className='btn secondary';
   button.addEventListener('click',async()=>{
    if(applied)return;
    const current=(await sb.auth.getSession()).data?.session;
    if(current?.user?.id!==d.userId){ui.status.textContent='Account changed. Reload your private Journal.';return}
    const {data:check}=await sb.from('decision_journal')
     .select('status,plan_locked_at,thesis,evidence')
     .eq('id',id).eq('user_id',d.userId).maybeSingle();
    if(!check||check.status!=='draft'||check.plan_locked_at||check.thesis||check.evidence){
     ui.status.textContent='This draft is already populated or locked; import has been stopped.';return
    }
    const fields={
     'j-ticker':p.ticker,'j-date':p.trade_date,'j-direction':p.direction,
     'j-decision':p.decision,'j-catalyst':p.catalyst_context,
     'j-market-context':p.market_context,'j-evidence':p.evidence,
     'j-thesis':p.thesis,'j-trigger':p.entry_trigger,
     'j-invalidation':p.invalidation,'j-no-trade-condition':p.no_trade_condition,
     'j-planned-entry':p.planned_entry,'j-planned-stop':p.planned_stop,
     'j-planned-target':p.planned_target,'j-shares':p.share_quantity,
     'j-planned-exit':p.planned_exit_reason
    };
    for(const [field,value] of Object.entries(fields))input(field,value);
    setup(p.setup,'j-setup','j-setup-custom');
    sourcePending={journalId:id,planId:d.planId,userId:d.userId};
    applied=true;button.disabled=true;
    ui.status.textContent='Copied from saved Workbench plan #'+d.planId+
     ' into your CURRENT UNSAVED form. Review and correct values, then select Save Draft. '+
     'Your original plan is preserved; no execution or P&L has been recorded. Lock only if appropriate.';
   });
   ui.actions.append(button);
   ui.status.textContent='Verified member-owned Workbench plan #'+d.planId+
    '. This draft has not been changed yet. Apply it when ready, then Save Draft.';
  }catch(e){ui.status.textContent=e.message||'Plan import unavailable.'}
  finally{pending=false}
 }
 if(list)window.addEventListener('gu-journal-ready',()=>void makeCreatePrefill(),{once:true});
 if(entry)window.addEventListener('gu-journal-record-loaded',()=>void makeEntryPrefill(),{once:true});
 window.addEventListener('gu-journal-plan-saved',async()=>{
  if(!sourcePending||!entry)return;
  const link=sourcePending;
  try{
   const client=await window.getSupabaseClient(),session=(await client.auth.getSession()).data?.session;
   if(session?.user?.id!==link.userId)throw Error('Session changed.');
   const r=await fetch('/api/journal-research-links-v1',{method:'POST',cache:'no-store',
    credentials:'same-origin',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},
    body:JSON.stringify({journalId:link.journalId,planId:link.planId})});
   const response=await r.json().catch(()=>null);
   if(!r.ok||response?.ok!==true)throw Error(response?.error||'Source linking unavailable.');
   sourcePending=null;
   window.dispatchEvent(new CustomEvent('gu-journal-research-linked',{detail:{journalId:link.journalId}}));
   ui.status.textContent='Saved Journal draft and linked the original Workbench research version. The source timestamp and version remain in your private research history.';
  }catch(e){ui.status.textContent='Draft saved. Research source link was not confirmed: '+(e.message||e)+'. Do not mistake an unlinked draft for verified historical research.'}
 });
 window.addEventListener('pagehide',()=>{ui.panel?.replaceChildren()});
})();
