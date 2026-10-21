/* Owner Billing Reconciliation Evidence v0.14.0.134.
 * Read-only on demand; never prompts for provider credentials or runs Cron.
 * The server, not browser roles, authorizes this financial evidence.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?\/?$/i.test(location.pathname))return;
 const $=(s,r=document)=>r.querySelector(s);
 const el=(tag,text)=>{const x=document.createElement(tag);
  if(text!==undefined)x.textContent=String(text);return x};
 const box=el('section');box.id='owner-billing-evidence';
 box.className='admin-card owner-billing-evidence';
 box.setAttribute('aria-labelledby','owner-billing-evidence-title');
 const title=el('h2','LIVE Billing Reconciliation — Private Evidence');
 title.id='owner-billing-evidence-title';
 const summary=el('p','Read existing signed Stripe reconciliation database evidence. Does not run a scan, contact Stripe, change access, or authorize LIVE charges.');
 const btn=el('button','Review Billing Reconciliation — No Charge');
 btn.type='button';btn.className='btn secondary';
 const output=el('div');output.className='owner-billing-evidence-output';
 output.setAttribute('role','status');output.setAttribute('aria-live','polite');
 output.append(el('p','Not yet reviewed. Select the button to load current private database counters.'));
 box.append(title,summary,btn,output);
 const friendly=Object.freeze({
  SIGN_IN_REQUIRED:'Sign in to the Owner account.',
  OWNER_ONLY:'Only the Owner may view this report.',
  PASSWORD_RECONFIRM_REQUIRED:'Reconfirm the Owner password before accessing private billing evidence.',
  AUTH_CONFIGURATION_MISSING:'Supabase Owner authentication is not configured.',
  DATABASE_CONFIGURATION_MISSING:'The Cloudflare server-side database secret is missing or invalid.',
  BILLING_CURSOR_INCOMPLETE:'Reconciliation cursors are missing. Review the installed v124 SQL; do not rerun it without preflight.',
  BILLING_CURSOR_UNAVAILABLE:'The private reconciliation cursor could not be read.',
  BILLING_EVIDENCE_COUNT_UNKNOWN:'The database did not provide exact counts. No success can be inferred.',
  BILLING_EVIDENCE_UNAVAILABLE:'The private billing evidence could not be read. Check service permissions and schema.'
 });
 const statusText=Object.freeze({
  OPEN_DISCREPANCIES:'ACTION REQUIRED — unresolved reconciliation issues',
  SCAN_ACTIVITY_STALE:'ACTION REQUIRED — no recent cursor activity in one or both categories',
  NO_SIGNED_RECURRING_RECORDS:'NO PAID RECURRING RECORDS — no full paid checkout acceptance',
  NO_OPEN_DISCREPANCIES_OBSERVED:'NO OPEN DISCREPANCIES OBSERVED — paid lifecycle remains unverified',
  COUNTS_CHANGED_DURING_READ:'COUNTS CHANGED — rerun read-only review after concurrent processing ends'
 });
 function addTable(headers,rows,caption){
  const table=el('table');table.className='owner-billing-evidence-table';
  table.append(el('caption',caption));
  const thead=el('thead'),headRow=el('tr');
  for(const t of headers){const th=el('th',t);th.scope='col';headRow.append(th)}
  thead.append(headRow);table.append(thead);
  const tbody=el('tbody');
  for(const row of rows){const tr=el('tr');for(const col of row)tr.append(el('td',col));tbody.append(tr)}
  table.append(tbody);return table;
 }
 function render(data){
  output.replaceChildren();
  output.append(el('p','Database result: '+(statusText[data.status]||'REVIEW REQUIRED')));
  output.append(el('p','Recorded at: '+new Date(data.asOf).toLocaleString()+
   '. This is a read-only, non-atomic database snapshot.'));
  const categories=data.categories||{};
  const rows=['plan','tool'].map(k=>{
   const c=categories[k]||{};
   return [k==='plan'?'Membership subscriptions':'À-la-Carte subscriptions',
    c.eligibleRecurringRecords??'Unavailable',c.unresolvedIssues??'Unavailable',
    c.previouslyResolvedIssues??'Unavailable',
    c.lastActivityAt?new Date(c.lastActivityAt).toLocaleString():'Unavailable',
    c.activityWithin48h===true?'Within 48 hours':'Stale / unverified'];
  });
  output.append(addTable(
   ['Category','Signed-source records','Open issues','Resolved issues','Cursor last updated','Cursor activity'],
   rows,'Read-only reconciliation register by category'));
  const details=Object.entries(data.openIssuesByType||{}).filter(([_,n])=>n>0);
  if(details.length)output.append(addTable(['Issue classification','Unresolved count'],
   details.map(([k,n])=>[k,n]),'Unresolved Stripe reconciliation alerts by classification'));
  output.append(el('p','Total eligible recurring records: '+data.totals.eligibleRecurringRecords+
   '. Open issues: '+data.totals.openIssues+
   '. Previously resolved issues: '+data.totals.previouslyResolvedIssues+'.'));
  if(data.countsAgree===false)output.append(el('p',
   'Counts were changing during this review. The separate database queries are not one atomic snapshot.'));
  output.append(el('p','Acceptance remains NOT VERIFIED: full Stripe sweep, customer-paid checkout, signed LIVE webhook/member access, and launch approval. A recent successful Cloudflare execution must be verified separately.'));
 }
 async function load(){
  btn.disabled=true;output.replaceChildren(el('p','Reading private reconciliation evidence…'));
  try{
   const client=await window.getSupabaseClient?.();
   const session=(await client?.auth?.getSession?.())?.data?.session;
   if(!session?.access_token)throw new Error('SIGN_IN_REQUIRED');
   const res=await fetch('/api/billing-reconciliation-health',{
    method:'GET',headers:{authorization:'Bearer '+session.access_token,
     accept:'application/json'},cache:'no-store',redirect:'error'
   });
   const data=await res.json().catch(()=>null);
   if(!res.ok||data?.ok!==true)throw new Error(data?.error||'BILLING_EVIDENCE_UNAVAILABLE');
   render(data);
  }catch(e){
   output.replaceChildren(el('p',friendly[e?.message]||
    'Owner billing evidence is not available. No billing settings were changed.'));
  }finally{btn.disabled=false}
 }
 btn.addEventListener('click',load);
 function eligible(){
  const ctx=typeof ADMIN!=='undefined'?ADMIN.ctx:null;
  const app=$('#admin-app'),gate=$('#admin-gate');
  return app&&!app.hidden&&gate?.hidden===true&&
   Array.isArray(ctx?.roles)&&ctx.roles.some(r=>String(r).toUpperCase()==='OWNER')&&
   Array.isArray(ctx?.permissions)&&ctx.permissions.includes('commerce.view');
 }
 let attached=false;
 function mount(){
  if(attached||!eligible())return;
  const panel=$('#admin-app .admin-panel[data-admin-panel="commerce"]');
  if(!panel)return;
  const host=$('.gu33-payment-hub',panel)||panel;
  if($('#owner-billing-evidence',host)){attached=true;return}
  host.append(box);attached=true;
 }
 function initialize(){
  const obs=new MutationObserver(mount);
  const gate=$('#admin-gate'),app=$('#admin-app');
  if(gate)obs.observe(gate,{attributes:true,attributeFilter:['hidden']});
  if(app)obs.observe(app,{attributes:true,attributeFilter:['hidden']});
  mount();
  let tries=0;
  const timer=setInterval(()=>{
   mount();if(attached||++tries>=60){clearInterval(timer);obs.disconnect()}
  },1000);
  window.addEventListener('pagehide',()=>{clearInterval(timer);obs.disconnect()},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();
