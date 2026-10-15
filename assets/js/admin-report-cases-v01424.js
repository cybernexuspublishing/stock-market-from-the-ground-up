/* v0.14.0.24 — additive audited report triage inside Admin > Market Commons.
 * Existing report inspection, moderation editor and legacy controls remain intact.
 * Only server-authorized case data is displayed; source SQL must be installed.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const $=(s,r=document)=>r.querySelector(s);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;
 if(cls)e.className=cls;return e};
let loaded=false,filter='open',page=1,pending=false;
async function query(method,body){
 const sb=await window.getSupabaseClient(),ses=(await sb.auth.getSession()).data?.session;
 if(!ses?.access_token)throw Error('Sign in with authorized administrative credentials.');
 const url=method==='GET'?`/api/admin-report-cases-v01424?status=${encodeURIComponent(filter)}&page=${page}`:
 '/api/admin-report-cases-v01424';
 const r=await fetch(url,{method,cache:'no-store',headers:{authorization:'Bearer '+ses.access_token,
  accept:'application/json',...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok||j.ok!==true)throw Error(j.error||'Moderation case service unavailable.');
 return j;
}
function build(){
 const host=$('.admin-panel[data-admin-panel="community"]');if(!host||$('#gu-mod-cases-v01424'))return false;
 const box=make('section',undefined,'admin-card gu-mod-cases-v01424');box.id='gu-mod-cases-v01424';
 const h=make('h2','Audited Report Case Management');
 const about=make('p','Review, dismiss, resolve or reopen reports with a required decision reason. Role permissions, report state, and audit records are enforced by Supabase. The existing moderation editor is retained.','small');
 const row=make('div',undefined,'gu-mod-actions');
 const label=make('label','Show cases: ');const selector=make('select');selector.setAttribute('aria-label','Report case status');
 for(const [value,title] of [['open','Open'],['reviewing','Under review'],['resolved','Resolved'],['dismissed','Dismissed'],['all','All']]){
  const opt=make('option',title);opt.value=value;selector.append(opt)}
 label.append(selector);const refresh=make('button','Refresh cases','btn secondary');refresh.type='button';row.append(label,refresh);
 const status=make('p','No case records loaded.','gu-mod-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=make('div');list.className='gu-mod-list';
 const pager=make('div',undefined,'gu-mod-actions');const prev=make('button','Previous','btn secondary');
 const next=make('button','Next','btn secondary');prev.type=next.type='button';
 const locationText=make('span','Page 1');pager.append(prev,locationText,next);
 box.append(h,about,row,status,list,pager);host.append(box);
 async function refreshCases(){if(pending)return;pending=true;status.textContent='Loading authorized case records…';
  refresh.disabled=true;selector.disabled=true;prev.disabled=next.disabled=true;
  try{const result=await query('GET');list.replaceChildren();
   if(!result.cases.length)list.append(make('p','No reports for this status.'));
   result.cases.forEach(c=>{
    const card=make('article',undefined,'gu-mod-case');const title=make('h3',`Report #${c.id} — ${c.status}`);
    const description=make('p',`Target: ${c.contentId||'unknown'} · Reason: ${c.reason||'not specified'}`);
    const detail=make('p',c.details||'No additional report details.');detail.className='gu-mod-detail';
    const stamp=make('small',c.createdAt?`Received: ${new Date(c.createdAt).toLocaleString()}`:'');
    const noteLabel=make('label','Decision reason (10–500 characters): ');
    const note=make('textarea');note.rows=2;note.maxLength=500;
    note.setAttribute('aria-label',`Decision reason for report ${c.id}`);noteLabel.append(note);
    const controls=make('div',undefined,'gu-mod-actions');
    const transitions=c.status==='open'?[['start_review','Start review'],['resolve','Resolve'],['dismiss','Dismiss']]:
      c.status==='reviewing'?[['resolve','Resolve'],['dismiss','Dismiss']]:
      result.isOwner?[['reopen','Reopen — Owner']]:[];
    for(const [action,caption] of transitions){const b=make('button',caption,'btn secondary');b.type='button';
      b.addEventListener('click',async()=>{
       if(pending)return;const reason=note.value.trim();if(reason.length<10){status.textContent='Provide at least 10 characters explaining the decision.';note.focus();return}
       if(action==='reopen'&&!window.confirm('Reopen this previously closed case for review?'))return;
       pending=true;[...box.querySelectorAll('button,select,textarea')].forEach(el=>el.disabled=true);
       status.textContent='Saving audited decision…';
       try{const result=await query('POST',{reportId:Number(c.id),expectedStatus:c.status,action,note:reason});
        if(result.audited!==true)throw Error('Backend did not confirm an audit record.');
        status.textContent='Decision and audit record committed. Refreshing cases…';
       }catch(e){status.textContent=e.message||'Action not confirmed. Refresh before another attempt.';
        pending=false;[...box.querySelectorAll('button,select,textarea')].forEach(el=>el.disabled=false);return}
       pending=false;await refreshCases();
      });controls.append(b);
    }
    // v0.14.0.25: independently authorized, read-only audit-history display.
    // Do not identify the reporting member or display arbitrary audit metadata.
    const historyButton=make('button','View decision history','btn secondary');
    historyButton.type='button';
    const history=make('section',undefined,'gu-mod-history-v01425');
    history.hidden=true;history.setAttribute('aria-label',`Decision history for report ${c.id}`);
    historyButton.setAttribute('aria-expanded','false');
    historyButton.addEventListener('click',async()=>{
      if(!history.hidden){history.hidden=true;historyButton.setAttribute('aria-expanded','false');return}
      history.hidden=false;historyButton.setAttribute('aria-expanded','true');
      history.replaceChildren(make('p','Loading authorized audit history…'));
      historyButton.disabled=true;
      try{
        const sb=await window.getSupabaseClient(),ses=(await sb.auth.getSession()).data?.session;
        if(!ses?.access_token)throw Error('Sign in again to inspect the audit history.');
        const response=await fetch('/api/admin-report-case-history-v01425?reportId='+encodeURIComponent(c.id),{
          headers:{authorization:'Bearer '+ses.access_token,accept:'application/json'},cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||data.ok!==true||!Array.isArray(data.history))
          throw Error(data.error||'Decision history unavailable.');
        history.replaceChildren();
        if(!data.history.length){history.append(make('p','No v0.14.0.24+ audited case transitions recorded. Earlier decisions may use legacy audit paths.'));}
        else{
          const list=make('ol');
          for(const event of data.history){
            const line=make('li');
            const title=make('strong',`${event.from||'Unknown'} → ${event.to||'Unknown'}`);
            const time=make('small',event.loggedAt?` · ${new Date(event.loggedAt).toLocaleString()}`:'');
            const note=make('p',event.note||'No decision note recorded.');
            line.append(title,time,note);list.append(line);
          }
          history.append(list);
        }
      }catch(e){history.replaceChildren(make('p',e.message||'History temporarily unavailable.'))}
      finally{historyButton.disabled=false}
    });
    controls.append(historyButton);
    const m=/^(commons|legacy):(topic|post):([1-9][0-9]*)$/.exec(String(c.contentId||''));
    if(m){const inspect=make('button','Inspect content','btn secondary');inspect.type='button';inspect.addEventListener('click',()=>{
      const open=window.GroundUpAdminWorkflows?.openModeration;
      if(typeof open==='function')open({scope:m[1],type:m[2],id:m[3]});
      else status.textContent='Existing moderation editor is unavailable; refresh Admin.';
    });controls.append(inspect)}
    card.append(title,stamp,description,detail,noteLabel,controls,history);
    if(c.resolutionNote)card.append(make('p','Recorded decision: '+c.resolutionNote,'small'));
    list.append(card);
   });
   prev.disabled=page<=1;next.disabled=!result.hasMore;locationText.textContent=`Page ${page}`;
   status.textContent=`Loaded ${result.cases.length} authorized case records. Editing content requires the separate moderation editor.`;
  }catch(e){list.replaceChildren();status.textContent=e.message||'Report cases unavailable. Verify the reviewed database migration.';
   prev.disabled=next.disabled=true}
  finally{pending=false;refresh.disabled=selector.disabled=false}
 }
 selector.addEventListener('change',()=>{filter=selector.value;page=1;void refreshCases()});
 refresh.addEventListener('click',refreshCases);
 prev.addEventListener('click',()=>{if(page>1){page--;void refreshCases()}});
 next.addEventListener('click',()=>{if(!next.disabled&&page<100){page++;void refreshCases()}});
 // Only request sensitive queue data after the operator navigates to the Community panel.
 const observer=new MutationObserver(()=>{if(host.classList.contains('active')&&!loaded){loaded=true;void refreshCases()}});
 observer.observe(host,{attributes:true,attributeFilter:['class']});
 if(host.classList.contains('active')){loaded=true;void refreshCases()}
 return true;
}
let attempt=0;const timer=setInterval(()=>{if(build()||++attempt>100)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
