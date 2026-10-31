/* A personal thank-you without speculative payment confirmation.
 * The authenticated server endpoint verifies the exact owned TEST order; the
 * URL, session-local labels, or older entitlements are never proof of payment.
 */
(async()=>{'use strict';
 const byId=id=>document.getElementById(id);
 const node={panel:byId('purchase-panel'),eyebrow:byId('purchase-eyebrow'),
  greeting:byId('purchase-greeting'),intro:byId('purchase-intro'),
  status:byId('purchase-status'),detail:byId('purchase-detail'),
  summary:byId('purchase-summary'),product:byId('purchase-product'),
  access:byId('purchase-access'),lumens:byId('purchase-lumens'),
  card:byId('purchase-card'),nextTitle:byId('purchase-next-title'),
  nextCopy:byId('purchase-next-copy'),primary:byId('purchase-primary'),
  testNote:byId('purchase-test-note')};
 const usd=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
 const nameOf=user=>{
  const meta=user?.user_metadata||{};
  const raw=[meta.first_name,meta.full_name,meta.display_name,meta.name].find(v=>
   typeof v==='string'&&v.trim()&&!v.includes('@'))||'';
  const first=raw.trim().split(/[\s_]+/)[0].replace(/[\r\n\t]/g,'').slice(0,32);
  return first&&/[\p{L}]/u.test(first)?first:'';
 };
 const withName=(plain,name)=>name?plain+', '+name:plain;
 const put=(id,value)=>{node[id].textContent=value};
 const change=(state,status,detail)=>{
  node.panel.dataset.state=state;put('status',status);put('detail',detail);
 };
 const preview=new URLSearchParams(location.search);
 const sessionId=preview.get('session_id'),orderId=preview.get('order_id');
 try{
  const client=await window.getSupabaseClient();
  if(!client)throw Error('CLIENT_UNAVAILABLE');
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token){
   change('pending','Sign in to view your order','Your order belongs to your member account. For privacy, we only show payment and access details after sign-in.');
   put('nextCopy','Sign in with the same account you used at checkout to review your access.');
   node.primary.href='/signin.html?next='+encodeURIComponent('/purchase-thank-you.html'+location.search);
   node.primary.textContent='Sign in to check my order';
   return;
  }
  let first='';
  try{const {data}=await client.auth.getUser();first=nameOf(data?.user)}catch{/* Greeting is optional. */}
  put('greeting',withName('Thank you for being here',first)+'.');
  put('intro','We appreciate the time you invest in learning. Every new concept you understand and every decision you practice is progress worth building on.');
  if(!sessionId&&!orderId){
   // Earlier Stripe TEST sessions returned only ?sku=. Confirm current access,
   // never claim that this legacy URL verifies a particular payment.
   const legacySku=preview.get('sku');
   const required={CHART_ADVANCED_30D:'ADVANCED',CHART_PROFESSIONAL_30D:'PROFESSIONAL'};
   if(Object.hasOwn(required,legacySku)){
    try{
     const check=await fetch('/api/chart-tier-access',{
      headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
     const access=await check.json();
     if(check.ok&&access?.eligible===true&&access.allowed?.includes(required[legacySku])){
      change('pending','Your Chart Studio access is available',
       'Your account currently has '+required[legacySku].toLowerCase()+
       ' Studio access. This earlier checkout link does not identify a specific order, so it cannot verify that particular payment.');
      put('nextTitle','Continue where you left off');
      put('nextCopy','Open your Chart Studio workspace or visit My Purchases to check the separate order record. Your learning progress remains yours.');
      node.primary.href='/simulator.html';node.primary.textContent='Open Chart Studio';
      return;
     }
    }catch{/* The generic verification message remains accurate. */}
   }
   change('pending','We are checking your purchase information',
    'This earlier checkout link does not identify a specific order. Please review My Purchases or your dashboard; this page alone does not confirm payment.');
   return;
  }
  const ref=sessionId?'session_id='+encodeURIComponent(sessionId):'order_id='+encodeURIComponent(orderId);
  const response=await fetch('/api/chart-purchase-confirmation?'+ref,{
   headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true){
   change('pending','Your order needs another check','We could not verify this exact checkout for your signed-in account. No new access is confirmed here. Visit your dashboard or contact support before attempting another payment.');
   return;
  }
  node.testNote.hidden=data.testOnly!==true;
  put('product',data.product||'Crownlight Chart Studio');
  put('lumens',(data.lumensApplied||0)===0?'None':
   String(data.lumensApplied)+' ('+usd(data.discountCents)+' applied)');
  put('card',(data.cardCents||0)===0?'No card charge':usd(data.cardCents));
  put('access',data.accessUntil?
   new Date(data.accessUntil).toLocaleString(undefined,{dateStyle:'long',timeStyle:'short'}):
   'No active access confirmed');
  node.summary.hidden=false;
  if(data.state==='confirmed'){
   put('eyebrow','Your next chapter starts here');
   put('greeting',withName('Thank you for choosing to learn with us',first)+'.');
   put('intro','Your trust matters to us. We built The Stock Market: From the Ground Up to make market education clearer, more practical and easier to put into practice.');
   change('confirmed','Your Chart Studio access is ready',
    data.product+' is now available on your account. This is a one-time 30-day access purchase, not an automatically renewing subscription.');
   put('nextTitle','Make the most of your new access');
   put('nextCopy','Open Chart Studio, revisit a saved workspace or try a new example. Your progress belongs to you, and the tools are here when you are ready to learn.');
   node.primary.href='/simulator.html';
   node.primary.textContent='Open Chart Studio';
  }else if(data.state==='refunded'){
   put('eyebrow','Your account has been updated');
   change('refunded','Your refund is recorded',
    'This order has been refunded and the related paid Studio access has ended. Any Lumens applied to this order are returned through the verified refund process.');
   put('access','Ended after refund');
   put('nextTitle','Your learning can continue');
   put('nextCopy','Your saved work remains in your account. Your dashboard shows the access available to you now.');
  }else if(data.state==='expired'){
   put('eyebrow','No purchase completed');
   change('expired','This checkout was not completed',
    'This TEST order has expired. No new paid Studio access was activated through this checkout. Reserved Lumens are released through the verified expiration process.');
   put('access','Not activated');
   put('nextTitle','Continue when you are ready');
   put('nextCopy','You can return to the Store or continue learning with the tools already included in your account.');
  }else if(data.state==='disputed'||data.state==='revoked'){
   put('eyebrow','Account and order update');
   change('revoked','This order no longer provides paid access',
    'The order is under review or has been reversed. Any available access is determined by your current membership and other valid entitlements.');
   put('access','Not active');
  }else{
   put('eyebrow','Your order is being checked');
   change('pending','Payment confirmation is still pending',
    'We have not yet received verified settlement for this exact order. Please do not pay again while it is being reconciled.');
   put('access','Awaiting verification');
   put('nextCopy','Please check your dashboard before attempting another checkout. Existing learning tools remain available according to your membership.');
  }
 }catch{
  change('pending','Purchase status temporarily unavailable',
   'We cannot verify a payment from this page right now. Please check My Purchases or your dashboard; do not repeat a payment while its status is uncertain.');
 }
})();
