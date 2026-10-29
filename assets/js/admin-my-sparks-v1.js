/* My Sparks Wallet — auditable Owner self-credit in the existing Sparks panel.
 * Does not touch payments, purchased credits, memberships or other user accounts.
 * Server + DB both independently enforce active OWNER and self-only.
 */
(()=>{
 'use strict';
 const root=document.getElementById('admin-my-sparks-wallet');
 if(!root)return;
 const $=selector=>root.querySelector(selector);
 const form=$('[data-owner-sparks-form]');
 const status=$('[data-owner-sparks-status]');
 const balance=$('[data-owner-sparks-balance]');
 const history=$('[data-owner-sparks-history]');
 const refreshButton=$('[data-owner-sparks-refresh]');
 const submit=form.querySelector('button[type="submit"]');
 let busy=false,pending=null,loaded=false;
 const guard=async()=>{
  const client=await window.getSupabaseClient();
  const token=(await client.auth.getSession()).data?.session?.access_token;
  if(!token)throw Error('Sign in with your Owner account.');
  return token;
 };
 async function api(method='GET',body){
  const token=await guard();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch('/api/admin-lantern-sparks'+(method==='GET'?'?self=1':''),{
    method,cache:'no-store',signal:controller.signal,
    headers:{authorization:'Bearer '+token,...(method==='POST'?{'content-type':'application/json'}:{})},
    body:method==='POST'?JSON.stringify(body):undefined
   });
   const data=await r.json().catch(()=>({}));
   if(!r.ok||data.ok!==true)throw Error(String(data.error||'Balance could not be verified.'));
   return data;
  }finally{clearTimeout(timeout)}
 }
 function showHistory(records){
  history.replaceChildren();
  const heading=document.createElement('strong');heading.textContent='Recent audited adjustments';
  history.append(heading);
  if(!records?.length){
   const item=document.createElement('p');item.textContent='No previous manual adjustments.';history.append(item);return;
  }
  const list=document.createElement('ul');
  for(const entry of records.slice(0,10)){
   const item=document.createElement('li');
   const created=entry.created_at?new Date(entry.created_at).toLocaleString():'Date unavailable';
   item.textContent=created+' · '+(entry.delta>=0?'+':'')+entry.delta+
    ' Sparks · '+entry.previous_available+' → '+entry.resulting_available+
    ' · '+String(entry.reason||'').slice(0,180);
   list.append(item);
  }
  history.append(list);
 }
 async function load(){
  if(busy)return;
  busy=true;refreshButton.disabled=true;
  status.textContent='Verifying Owner wallet…';
  try{
   const data=await api();
   root.hidden=false;loaded=true;submit.disabled=false;
   const b=data.balance;
   if(!b||!Number.isInteger(b.available)||!Number.isInteger(b.manual))
    throw Error('Sparks ledger is unavailable.');
   balance.textContent=b.available.toLocaleString()+' available · '+
    b.manual.toLocaleString()+' manual · '+(b.included||0).toLocaleString()+
    ' included · '+(b.purchased||0).toLocaleString()+' purchased';
   showHistory(data.activity);
   status.textContent='Verified. Manual Owner-issued Sparks never expire. No credits have been issued by loading this panel.';
  }catch(err){
   if(!loaded){
    // Don't display a privileged wallet editor before Owner authorization.
    root.hidden=true;
   }else status.textContent='Wallet unavailable: '+String(err.message||'Please retry');
  }finally{busy=false;refreshButton.disabled=false}
 }
 refreshButton.addEventListener('click',()=>void load());
 form.addEventListener('input',()=>{
  // A materially different request receives a different idempotency UUID.
  if(pending&&pending.fingerprint!==JSON.stringify({
   value:Number(form.elements.amount.value),reason:form.elements.reason.value.trim()
  }))pending=null;
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!loaded)return;
  const value=Number(form.elements.amount.value);
  const reason=String(form.elements.reason.value||'').trim();
  if(!Number.isSafeInteger(value)||value<1||value>10000||reason.length<10||reason.length>500){
   status.textContent='Choose 1–10,000 whole Sparks and provide a reason of 10–500 characters.';
   return;
  }
  if(!window.confirm('Add '+value.toLocaleString()+
   ' nonexpiring manual Sparks to your signed-in Owner wallet? This is an audited credit and is not a Stripe purchase.'))return;
  const fingerprint=JSON.stringify({value,reason});
  if(!pending||pending.fingerprint!==fingerprint){
   if(!globalThis.crypto?.randomUUID){status.textContent='Secure request ID unavailable. Reload your browser.';return}
   pending={fingerprint,requestId:crypto.randomUUID()};
  }
  busy=true;submit.disabled=true;refreshButton.disabled=true;
  status.textContent='Submitting one audited Owner credit…';
  try{
   const result=await api('POST',{self:true,operation:'add',value,reason,requestId:pending.requestId});
   if(!Number.isInteger(result.balance?.available))throw Error('Server did not verify the new balance.');
   balance.textContent=result.balance.available.toLocaleString()+' available · '+
    (result.balance.manual||0).toLocaleString()+' manual · '+
    (result.balance.included||0).toLocaleString()+' included · '+
    (result.balance.purchased||0).toLocaleString()+' purchased';
   status.textContent=result.alreadyApplied?'This transaction was already applied; no duplicate credit was issued.':
    value.toLocaleString()+' Sparks added to your Owner wallet. The database ledger and Admin audit were updated.';
   form.reset();pending=null;
   // Update the history after the write; use the API-reconciled balance above.
   void (async()=>{try{const x=await api();showHistory(x.activity)}catch{}})();
  }catch(err){
   status.textContent='Credit NOT confirmed: '+String(err.message||'Service unavailable')+
    '. Review the balance and recent adjustments before retrying. The same request ID will be reused.';
  }finally{busy=false;submit.disabled=false;refreshButton.disabled=false}
 });
 const panel=root.closest('[data-admin-panel]');
 const observer=new MutationObserver(()=>{
  if(panel?.classList.contains('active')&&!loaded&&!busy)void load();
 });
 if(panel)observer.observe(panel,{attributes:true,attributeFilter:['class']});
 if(panel?.classList.contains('active'))void load();
})();
