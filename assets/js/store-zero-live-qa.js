/* v0.14.0.72 — store customer QA (allowlisted FREE member only). */
(()=>{'use strict';
 const section=document.getElementById('store-zero-monthly-qa');if(!section)return;
 const begin=document.getElementById('store-zero-monthly-begin'),
   refresh=document.getElementById('store-zero-monthly-refresh'),
   status=document.getElementById('store-zero-monthly-status'),
   route='/api/store-zero-monthly-qa';
 const q=new URLSearchParams(location.search);
 const sid=q.get('gu72')==='complete'?q.get('session_id'):null;
 const set=msg=>{status.textContent=msg};
 async function api(method='GET',sessionId){
  const sb=await window.getSupabaseClient?.();
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Sign in to the designated free test account first.');
  const r=await fetch(route+(sessionId?'?session_id='+encodeURIComponent(sessionId):''),{
    method,headers:{authorization:'Bearer '+session.access_token,
      ...(method==='POST'?{'content-type':'application/json'}:{})},
    ...(method==='POST'?{body:JSON.stringify({confirm:'ONE_TIME_ZERO_MONTHLY_QA'})}:{cache:'no-store'})});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true)throw Error(d?.error||'This LIVE verification offer is currently unavailable.');
  return d;
 }
 async function check(){
  try{
   const d=await api();
   if(!d.available){section.hidden=true;return}
   section.hidden=false;begin.disabled=false;
   begin.textContent='Verify $0.00 LIVE Checkout and One-Month Access';
   set('Eligible FREE test account. No charge or recurring subscription will be created.');
  }catch{section.hidden=true}
 }
 async function statusCheck(){
  if(!sid)return;
  section.hidden=false;refresh.hidden=false;begin.disabled=true;
  set('Checking the signed LIVE Stripe Checkout and your membership status…');
  try{
   const d=await api('GET',sid);
   if(d.activated){
    set('Confirmed: your account now has Full Platform Monthly access. It expires on '+
      (d.expiresAt?new Date(d.expiresAt).toLocaleString():'the recorded expiration date')+
      '. It will not renew automatically.');
    refresh.hidden=true;
    const go=document.createElement('a');go.href='access.html';
    go.className='btn secondary';go.textContent='View Membership & Access';section.append(go);
   }else if(d.awaitingSignedWebhook){
    set('Stripe checkout completed at $0.00. Waiting for the signed webhook to update your membership. Select Check membership update.');
   }else set('Stripe checkout has not completed. No membership was granted.');
  }catch(e){set(e.message)}
 }
 begin.addEventListener('click',async()=>{
  if(!window.confirm('Open a real Stripe LIVE $0.00 one-time Checkout for the authorized FREE test account? It grants one month only after signed confirmation, never renews, and must not ask for a card.'))return;
  begin.disabled=true;set('Checking $0 LIVE price and creating a one-time Stripe Checkout…');
  try{
   const d=await api('POST');
   if(d.amountCents!==0||!d.checkoutUrl)throw Error('Unsafe nonzero checkout response blocked.');
   const u=new URL(d.checkoutUrl);
   if(u.hostname!=='checkout.stripe.com'||u.protocol!=='https:')throw Error('Unexpected payment destination.');
   location.assign(u.toString());
  }catch(e){set(e.message);begin.disabled=false}
 });
 refresh.addEventListener('click',statusCheck);
 if(sid){statusCheck();return}
 if(q.get('gu72')==='cancelled'){section.hidden=false;set('Free LIVE Checkout cancelled. No membership changed.');}
 const start=async()=>{await new Promise(resolve=>setTimeout(resolve,150));check()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
