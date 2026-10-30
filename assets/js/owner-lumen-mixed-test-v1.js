/* Owner-only, noncommercial QA interface. Never write Stripe or wallets from browser. */
(()=>{'use strict';
const by=id=>document.getElementById(id),money=x=>'$'+(x/100).toFixed(2);
let state=null,lock=false;
function say(s){by('qa-status').textContent=String(s)}
async function api(payload){
 const supabase=await window.getSupabaseClient();
 const session=(await supabase.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Owner sign-in required. Sign in, then return to this QA page.');
 const r=await fetch('/api/lumen-mixed-test-checkout',{
  method:payload?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{authorization:'Bearer '+session.access_token,...(payload?{'content-type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined});
 const data=await r.json().catch(()=>null);
 if(!r.ok||data?.ok!==true)throw Error(data?.error||'Owner QA service unavailable');
 return data;
}
function draw(){
 if(!state)return;
 renderHistory();
 by('qa-wallet').textContent='Available shadow Lumens: '+state.availableLumens;
 by('qa-mode').textContent=state.enabled?'Owner TEST payment mode: Enabled. No LIVE payments are used.':'Owner TEST payment mode: Disabled. Use the Admin Payment Center Owner TEST switch before making Stripe TEST purchases.';
 const used=Number(by('qa-lumens').value);
 if(!Number.isSafeInteger(used)||used<0||used>286||used>state.availableLumens){
  by('qa-preview').textContent='Choose 0–286 whole TEST Lumens, not exceeding your shadow balance.';
  by('qa-pay').disabled=true;return;
 }
 const discount=Math.min(1999,used*7),due=1999-discount,ok=due===0||due>=50;
 by('qa-preview').textContent='TEST item: $19.99 | Shadow Lumens: '+used+
  ' | Discount: '+money(discount)+' | Stripe TEST due: '+money(due)+
  ' | Remaining TEST Lumens: '+(state.availableLumens-used)+
  (ok?'':' | Invalid Stripe remainder (minimum $0.50)');
 by('qa-pay').disabled=lock||!state.enabled||!ok;
}
function renderHistory(){
 const orders=Array.isArray(state?.intents)?state.intents:[];
 const picker=by('qa-intent'),list=by('qa-history');
 const previous=picker.value;picker.replaceChildren();list.replaceChildren();
 const emptyOption=document.createElement('option');
 emptyOption.value='';emptyOption.textContent=orders.length?'Choose a TEST order':'No TEST orders yet';
 picker.append(emptyOption);
 for(const order of orders){
  const option=document.createElement('option');option.value=order.id;
  option.textContent=order.status.toUpperCase()+' · '+money(order.cash_due_cents)+' cash · '+order.lumens_reserved+' Lumens · '+order.id.slice(0,8);
  picker.append(option);
 }
 const preferred=orders.find(x=>x.id===previous)||
  orders.find(x=>x.status==='bound'||x.status==='reserved')||orders[0];
 if(preferred)picker.value=preferred.id;
 const selected=orders.find(x=>x.id===picker.value);
 by('qa-expire').disabled=lock||!state.enabled||selected?.status!=='bound';
 by('qa-refund').disabled=lock||!state.enabled||selected?.status!=='fulfilled';
 const hint=by('qa-history-empty');
 hint.hidden=orders.length>0;
 if(orders.length===0)hint.textContent='No TEST orders have been created. Start with Step 1 (set a shadow balance), then Step 2 (create a TEST checkout).';
 for(const order of orders){
  const item=document.createElement('li');
  const title=document.createElement('strong');
  title.textContent='TEST order '+order.id.slice(0,8)+' · '+order.status.toUpperCase();
  item.append(title);
  const detail=document.createElement('span');
  detail.textContent=' · '+order.lumens_reserved+' Lumens · '+money(order.cash_due_cents)+' TEST cash.';
  item.append(detail);
  const actionBtn=document.createElement('button');actionBtn.type='button';
  if(order.status==='reserved'||order.status==='bound'){
   actionBtn.textContent=order.status==='reserved'?'Resume TEST checkout':'Open existing TEST checkout';
   actionBtn.disabled=lock||!state.enabled;
   actionBtn.addEventListener('click',()=>action(()=>continueOrder(order)));
   item.append(actionBtn);
   if(order.status==='reserved'){
    const note=document.createElement('small');
    note.textContent=' This order is reserved but not linked to Stripe yet. Resuming uses the same order number and will not reserve Lumens twice.';
    item.append(note);
   }
  }else if(order.status==='fulfilled'){
   actionBtn.textContent='Select for TEST refund';
   actionBtn.addEventListener('click',()=>{picker.value=order.id;syncSelection();});
   item.append(actionBtn);
  }else{
   const note=document.createElement('small');
   note.textContent=order.status==='released'?' Reservation released.':' No new action is available for this status.';
   item.append(note);
  }
  list.append(item);
 }
}
function syncSelection(){
 const item=(state?.intents||[]).find(x=>x.id===by('qa-intent').value);
 by('qa-expire').disabled=lock||!state?.enabled||item?.status!=='bound';
 by('qa-refund').disabled=lock||!state?.enabled||item?.status!=='fulfilled';
}
async function continueOrder(item){
 const r=await api({action:'checkout',lumens:item.lumens_reserved,requestId:item.request_id});
 if(r.checkoutUrl){
  const url=new URL(r.checkoutUrl);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')
    throw Error('Unexpected TEST provider redirect.');
  location.assign(url.href);return;
 }
 await refresh();
 if(r.fullyCovered){say('Full-Lumen TEST order settled without a Stripe payment.');return;}
 say('TEST checkout requires review: '+String(r.error||r.notice||'Unknown status'));
}
async function refresh(){
 state=await api();draw();return state;
}
async function action(fn){
 if(lock)return;lock=true;by('qa-pay').disabled=true;
 try{await fn()}catch(e){say(e.message||String(e))}
 finally{lock=false;draw()}
}
by('qa-lumens').addEventListener('input',draw);
by('qa-intent').addEventListener('change',syncSelection);
by('qa-refresh').addEventListener('click',()=>action(async()=>{await refresh();say('QA ledger refreshed. Real wallet unchanged.')}));
by('qa-set').addEventListener('click',()=>action(async()=>{
 const balance=Number(by('qa-seed').value);
 if(!Number.isSafeInteger(balance)||balance<0||balance>1000)throw Error('Choose 0–1000 whole TEST Lumens.');
 await api({action:'seed',balance});await refresh();say('TEST-only wallet set to '+balance+'. No real Lumens affected.');
}));
by('qa-pay').addEventListener('click',()=>action(async()=>{
 const lumens=Number(by('qa-lumens').value);
 const requestId=crypto.randomUUID();
 const d=await api({action:'checkout',lumens,requestId});
 if(d.checkoutUrl){
  const url=new URL(d.checkoutUrl);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Unexpected provider domain');
  location.assign(url.href);return;
 }
 await refresh();say('100%-Lumen QA fulfillment succeeded. No Stripe payment and no real entitlement.');
}));
for(const [name,el] of [['expire','qa-expire'],['refund','qa-refund']]){
 by(el).addEventListener('click',()=>action(async()=>{
  const intentId=by('qa-intent').value.trim();
  if(!/^[a-f0-9-]{36}$/i.test(intentId))throw Error('Select a valid TEST intent from the ledger.');
  const d=await api({action:name,intentId});await refresh();
  say(d.notice||'Stripe TEST '+name+' requested; verify signed webhook result on next refresh.');
 }));
}
const q=new URL(location.href).searchParams.get('result');
if(q==='success')say('Returned from Stripe TEST. Refresh the ledger to verify signed-webhook fulfillment.');
if(q==='cancelled')say('TEST checkout canceled in browser. Expire the unpaid session to trigger signed credit restoration.');
refresh().then(()=>{
 if(q)return;
 const unfinished=(state?.intents||[]).filter(x=>x.status==='reserved');
 say(unfinished.length?
  'A TEST order is reserved but has no completed provider checkout. Use Resume TEST checkout in Recent shadow orders.':
  'QA checkout ready. Select an existing order below or create a new one.');
}).catch(e=>say(e.message));
})();