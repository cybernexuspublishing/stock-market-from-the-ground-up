/* v0.14.0.76 — repeatable same-account $0 QA; explicit reset, verified grants, no new paid products. */
(()=>{'use strict';
 const section=document.getElementById('store-zero-monthly-qa');if(!section)return;
 const begin=document.getElementById('store-zero-monthly-begin'),
   reset=document.getElementById('store-zero-monthly-reset'),
   refresh=document.getElementById('store-zero-monthly-refresh'),
   status=document.getElementById('store-zero-monthly-status'),
   route='/api/store-zero-monthly-qa';
 const q=new URLSearchParams(location.search);
 const sid=q.get('gu72')==='complete'?q.get('session_id'):null;
 const setupView=q.get('gu72')==='setup';
 const set=msg=>{status.textContent=msg};
 function explain(code){
  const labels={
   QA_CONFIGURATION_MISSING:'The separate $0 LIVE QA product, allowlisted test member, or production credentials are not configured yet. Checkout remains locked.',
   NOT_AUTHORIZED:'This is not the designated FREE test account. The account ID below must match the Cloudflare QA allowlist before this checkout can be used.',
   NOT_ELIGIBLE:'This account does not meet the verified adult FREE member requirements for this controlled test.',
   QA_PRICE_NOT_ZERO:'The Stripe LIVE test product and exactly $0.00 one-time price could not be verified. Checkout remains locked.',
   QA_UNAVAILABLE:'The controlled $0 LIVE test is unavailable. Confirm the one-time SQL grant function and production configuration before enabling it.',
   VERIFICATION_UNAVAILABLE:'The member access or eligibility service is unavailable. Checkout remains locked.',
   SIGN_IN_REQUIRED:'Sign in as the designated FREE test member before using this checkout.'
  };
  return labels[code]||'The controlled $0 LIVE test is not available for this account. Checkout remains locked until setup and eligibility checks pass.';
 }
 async function showSetupIdentity(){
  section.hidden=false;begin.disabled=true;
  set('Checking controlled $0 LIVE Store checkout readiness…');
  try{
   const sb=await window.getSupabaseClient?.();
   const sess=(await sb?.auth?.getSession?.())?.data?.session;
   const uid=sess?.user?.id;
   if(!uid){set('Sign in as the designated FREE test member and reopen this Store verification link. Checkout is locked.');return}
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(uid)){set('Account identification is unavailable. Checkout remains locked.');return}
   if(section.querySelector('#gu73-member-test-id'))return;
   const box=document.createElement('div');box.id='gu73-member-test-id';box.className='small';
   const label=document.createElement('p');
   label.textContent='Signed-in test account ID (use this exact UUID for GU72_QA_ALLOWED_USER_ID):';
   const value=document.createElement('code');value.textContent=uid;
   const copy=document.createElement('button');copy.type='button';copy.className='btn secondary';
   copy.textContent='Copy account ID';
   copy.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(uid);copy.textContent='Copied account ID'}
    catch{copy.textContent='Select the displayed account ID to copy it'}
   });
   box.append(label,value,document.createTextNode(' '),copy);
   status.after(box);
  }catch{set('Unable to identify the signed-in account. Checkout remains locked.')}
 }
 async function api(method='GET',sessionId,action,checkoutAttemptId){
  const sb=await window.getSupabaseClient?.();
  const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Sign in to the designated free test account first.');
  const r=await fetch(route+(action==='reset'?'?action=reset':sessionId?'?session_id='+encodeURIComponent(sessionId):''),{
    method,headers:{authorization:'Bearer '+session.access_token,
      ...(method==='POST'?{'content-type':'application/json'}:{})},
    ...(method==='POST'?{body:JSON.stringify(action==='reset'?
      {confirm:'RESET_MY_ZERO_MONTHLY_QA_ACCESS'}:
      {confirm:'ONE_TIME_ZERO_MONTHLY_QA',checkoutAttemptId})}:{cache:'no-store'})});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true)throw Error(d?.error||'This LIVE verification offer is currently unavailable.');
  return d;
 }
 async function check(){
  try{
   const d=await api();
   reset.hidden=!d.canReset;
   if(!d.available){
    section.hidden=false;begin.disabled=true;
    begin.textContent=d.canReset?'Full Monthly test already active':'Test checkout locked — setup required';
    if(d.canReset){
      set('Monthly test access is active. Verify the membership and tools, then select Reset this test membership to FREE to repeat the $0.00 checkout using this same account. Prior completed sessions cannot grant access again.');
    }else{
      set(d.planCode&&d.planCode!=='FREE'?'This account is not FREE. Only the existing QA membership can be reset here; paid subscriptions and independent grants are never changed.':
        'The $0.00 test is visible but checkout is locked. A confirmed FREE test member, approved $0 LIVE Price and the two GU72 QA switches are required.');
    }
    return;
   }
   section.hidden=false;begin.disabled=false;
   begin.textContent='Verify $0.00 LIVE Checkout and One-Month Access';
   set('Eligible FREE test account. No charge or recurring subscription will be created.');
  }catch(e){
   reset.hidden=true;
   section.hidden=false;begin.disabled=true;
   begin.textContent='Test checkout locked';
   set(explain(e.message));
  }
 }
 async function statusCheck(){
  if(!sid)return;
  section.hidden=false;refresh.hidden=false;begin.disabled=true;
  set('Checking the signed LIVE Stripe Checkout and your membership status…');
  try{
   const d=await api('GET',sid);
   if(d.activated){
    reset.hidden=!d.canReset;
    set('Confirmed: your account now has Full Platform Monthly access. It expires on '+
      (d.expiresAt?new Date(d.expiresAt).toLocaleString():'the recorded expiration date')+
      '. It will not renew automatically.');
    refresh.hidden=true;
    const go=document.createElement('a');go.href='access.html';
    go.className='btn secondary';go.textContent='View Membership & Access';section.append(go);
   }else if(d.awaitingSignedWebhook){
    reset.hidden=true;
    set('Stripe checkout completed at $0.00. Waiting for the signed webhook to update your membership. Do not reset or repeat checkout until it has been verified.');
   }else{
    reset.hidden=true;
    set('Stripe checkout has not completed or this earlier session was reset. No membership was granted by this session.');
   }
  }catch(e){set(e.message)}
 }
 begin.addEventListener('click',async()=>{
  if(!window.confirm('Open a real Stripe LIVE $0.00 one-time Checkout for the authorized FREE test account? It grants one month only after signed confirmation, never renews, and must not ask for a card.'))return;
  begin.disabled=true;set('Checking $0 LIVE price and creating a one-time Stripe Checkout…');
  try{
   // Unique for each deliberate checkout; prevents recycling yesterday's
   // completed Stripe Session via the old user+calendar-day idempotency key.
   const attemptId=window.crypto?.randomUUID?.();
   if(!attemptId)throw Error('Unable to create a safe unique checkout attempt. Please use a current browser.');
   const d=await api('POST',null,'checkout',attemptId);
   if(d.amountCents!==0||!d.checkoutUrl)throw Error('Unsafe nonzero checkout response blocked.');
   const u=new URL(d.checkoutUrl);
   if(u.hostname!=='checkout.stripe.com'||u.protocol!=='https:')throw Error('Unexpected payment destination.');
   location.assign(u.toString());
  }catch(e){set(e.message);begin.disabled=false}
 });
 reset.addEventListener('click',async()=>{
  if(reset.hidden||reset.disabled)return;
  if(!window.confirm('Reset ONLY this account\'s active $0 LIVE QA Monthly grant to FREE? Your previous test entitlement ends immediately. Paid plans, books, Stripe history and prior session records are not changed. You can then run another NEW $0 checkout.'))return;
  reset.disabled=true;begin.disabled=true;
  set('Resetting only the previously verified $0 QA membership…');
  try{
   const d=await api('POST',null,'reset');
   if(!d.reset||d.resetCount<1)throw Error('Membership reset not confirmed. Do not checkout yet.');
   reset.hidden=true;
   set('Test membership reset confirmed. Rechecking that this account is FREE…');
   await check();
  }catch(e){set(e.message||'Reset could not be verified.');reset.disabled=false}
  finally{reset.disabled=false}
 });
 refresh.addEventListener('click',statusCheck);
 if(sid){statusCheck();return}
 if(q.get('gu72')==='cancelled'){section.hidden=false;set('Free LIVE Checkout cancelled. No membership changed.');}
 const start=async()=>{await new Promise(resolve=>setTimeout(resolve,150));await showSetupIdentity();await check()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
