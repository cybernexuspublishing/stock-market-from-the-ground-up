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
 const list=by('qa-history');list.replaceChildren();
 for(const i of state.intents||[]){
  const item=document.createElement('li'),btn=document.createElement('button');
  btn.type='button';btn.textContent='Select '+i.id.slice(0,8);
  btn.addEventListener('click',()=>{by('qa-intent').value=i.id;say('Selected TEST intent '+i.id)});
  item.textContent=i.status+' — '+i.lumens_reserved+' shadow Lumens, '+money(i.cash_due_cents)+' TEST cash — ';
  item.append(btn);list.append(item);
 }
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
refresh().then(()=>{if(!q)say('QA checkout ready for Owner tests.')}).catch(e=>say(e.message));
})();