/* Enhanced Journal plan/actual comparison and provenance register.
 * Reads existing member-owned rows only; no broker verification, no
 * retroactive changes to an immutable plan snapshot.
 */
(()=>{'use strict';
 const page=new URLSearchParams(location.search),id=page.get('id');
 if(!/^[1-9][0-9]{0,15}$/.test(id||''))return;
 const host=document.getElementById('entry-content');if(!host)return;
 const panel=document.createElement('section');panel.className='journal-card journal-section';
 panel.id='journal-source-variance';
 const title=document.createElement('h2');title.textContent='Research provenance & locked-plan execution variance';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const values=document.createElement('div');values.className='journal-kpis';
 const history=document.createElement('ul');history.className='analytics-list';
 const caveat=document.createElement('p');caveat.className='journal-small';
 caveat.textContent='All prices and outcomes are member-entered. An original plan snapshot is not a broker fill; stop triggers are not guaranteed execution prices. An unknown field remains unknown, not zero.';
 panel.append(title,status,values,history,caveat);host.append(panel);
 let current=null,epoch=0;
 const finite=v=>v===null||v===undefined||String(v).trim()===''?null:
  Number.isFinite(Number(v))?Number(v):null;
 const val=x=>x===null?'Not measured':x.toLocaleString(undefined,{maximumFractionDigits:4});
 function compare(plan,actual){
  if(!plan)return[];
  const entry=finite(plan.planned_entry),stop=finite(plan.planned_stop),shares=finite(plan.share_quantity),
   target=finite(plan.planned_target),actualEntry=finite(actual.actual_entry),
   actualExit=finite(actual.actual_exit),actualNet=finite(actual.net_pnl);
  const side=plan.direction==='SHORT'?-1:1;
  const riskPerShare=entry!=null&&stop!=null?Math.abs(entry-stop):null;
  const loss=riskPerShare!=null&&shares!=null?riskPerShare*shares:null;
  const fillDifference=actualEntry!=null&&entry!=null?side*(actualEntry-entry):null;
  const targetDeviation=actualExit!=null&&target!=null?side*(actualExit-target):null;
  const capital=entry!=null&&shares!=null?entry*shares:null;
  const described=actualNet!=null&&loss!=null&&loss>0?actualNet/loss:null;
  return [
   ['Original modeled risk / share',riskPerShare===null?'Not measured':'$'+val(riskPerShare)],
   ['Original modeled loss at stop',loss===null?'Not measured':'$'+val(loss)],
   ['Original intended position cost',capital===null?'Not measured':'$'+val(capital)],
   ['Actual entry deviation / share (positive = adverse)',fillDifference===null?'Not measured':'$'+val(fillDifference)],
   ['Actual exit vs original target / share',targetDeviation===null?'Not measured':'$'+val(targetDeviation)],
   ['Recorded net / original planned loss',described===null?'Not measured':val(described)+'R'],
   ['Member-reported plan compliance',actual.plan_followed||'Not recorded'],
   ['Recorded process grade',actual.process_grade||'Not recorded']
  ];
 }
 function clear(){epoch++;current=null;values.replaceChildren();history.replaceChildren();status.textContent='Private research cleared after account change.'}
 async function render(){
  const seq=++epoch;
  try{
   const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
   if(!session?.user?.id||!session?.access_token)throw Error('Sign in to view your private Journal.');
   const uid=session.user.id;current=uid;
   const [journal,snapshot,linked]=await Promise.all([
    sb.from('decision_journal').select('id,planned_entry,planned_stop,planned_target,share_quantity,actual_entry,actual_exit,net_pnl,plan_followed,process_grade,status').eq('id',id).eq('user_id',uid).maybeSingle(),
    sb.from('trade_plan_snapshots').select('snapshot,locked_at').eq('journal_id',id).eq('user_id',uid).maybeSingle(),
    fetch('/api/journal-research-links-v1?journalId='+id,{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'})
   ]);
   const data=await linked.json().catch(()=>null);
   const verify=(await sb.auth.getSession()).data?.session;
   if(seq!==epoch||verify?.user?.id!==uid)return;
   if(journal.error||!journal.data)throw Error('Private Journal record cannot be verified.');
   values.replaceChildren();history.replaceChildren();
   const plan=snapshot?.data?.snapshot||null;
   for(const [name,value] of compare(plan,journal.data)){
    const box=document.createElement('div');box.className='journal-kpi';
    const strong=document.createElement('strong');strong.textContent=value;
    const label=document.createElement('span');label.textContent=name;
    box.append(strong,label);values.append(box);
   }
   if(!plan){const p=document.createElement('li');p.textContent='No original locked plan exists yet. Draft values are not treated as immutable evidence.';history.append(p)}
   if(linked.ok&&data?.ok===true){
    for(const l of data.links||[]){
     const item=document.createElement('li');
     item.textContent='Workbench version #'+l.workbench_record_id+
      ' · observed '+l.source_observed_at+
      ' · published '+(l.source_published_at||'not documented')+
      ' · original saved '+l.original_saved_at+
      ' · linked '+l.linked_at+' · '+l.source_label;
     history.append(item);
    }
    status.textContent=(data.links||[]).length+' original saved research version(s) linked to this Journal; sources have not been independently authenticated.';
   }else status.textContent='Research source history unavailable; Journal metrics remain displayed. Do not assume source verification.';
  }catch(e){if(seq!==epoch)return;clear();status.textContent=e.message||'Research history unavailable.'}
 }
 window.addEventListener('gu-journal-record-loaded',()=>void render());
 window.addEventListener('gu-journal-plan-saved',()=>void render());
 window.addEventListener('pagehide',clear);
 void (async()=>{try{const sb=await window.getSupabaseClient();
  sb.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'||(current&&s?.user?.id!==current))clear()})
 }catch{}})();
})();
