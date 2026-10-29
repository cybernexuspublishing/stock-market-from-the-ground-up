/* Purchase eligible existing Chart Studio time passes with Lumens using the
 * EXISTING confirmed-price, idempotent server-authoritative Sparks API.
 * Never bypasses member/owner/paid-tier entitlement checks.
 */
(async function(){
 'use strict';
 const host=document.getElementById('lumen-chart-offers');
 const status=document.getElementById('lumen-chart-status');
 if(!host||!status)return;
 const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x};
 try{
  const sb=await window.getSupabaseClient?.(),session=(await sb?.auth.getSession())?.data?.session;
  if(!session?.access_token){
    status.textContent='Sign in to view Chart Studio Lumen passes and your wallet balance.';
    const link=el('a','Sign in','btn secondary');
    link.href='signin.html?next='+encodeURIComponent('/store-sparks.html#lumen-chart-passes');
    host.append(link);return;
  }
  const headers={authorization:'Bearer '+session.access_token},options={headers,cache:'no-store',credentials:'same-origin'};
  const [offersR,walletR]=await Promise.all([
    fetch('/api/member-sparks-chart',options),
    fetch('/api/member-sparks-wallet',options)
  ]);
  if(!offersR.ok||!walletR.ok)throw Error('Unverified offers or wallet');
  const data=await offersR.json(),wallet=await walletR.json();
  if(data.ok!==true||!Array.isArray(data.offers)||wallet.ok!==true||
    !Number.isSafeInteger(wallet.wallet?.available))throw Error('Unverified offers or wallet');
  const balance=wallet.wallet.available;
  status.textContent='Available Lumens: '+balance+'. Costs and eligibility are server verified. Existing included Chart Studio tiers must not be purchased again.';
  for(const offer of data.offers){
    if(!offer||!/^CHART_(ADVANCED|PROFESSIONAL)_(DAY|WEEK|MONTH)$/.test(offer.sku)||
      !Number.isSafeInteger(offer.costSparks)||offer.costSparks<1||
      !Number.isSafeInteger(offer.durationHours)||offer.durationHours<1)continue;
    const card=el('article',null,'spark-card');
    const days=offer.durationHours/24,period=days===1?'24 hours':days+' days';
    card.append(el('h3',offer.tier==='ADVANCED'?'Advanced Chart Studio':'Professional Chart Studio'),
      el('p',period+' of temporary access'),
      el('div',offer.costSparks+' Lumens','spark-cost'));
    const button=el('button','Redeem '+offer.costSparks+' Lumens','btn');button.type='button';
    button.disabled=balance<offer.costSparks;
    const note=el('p',button.disabled?'Insufficient Lumens.':'Eligible member access only. No automatic renewal.','small');
    button.addEventListener('click',async()=>{
      const cost=offer.costSparks;
      if(!window.confirm('Redeem '+cost+' Lumens for '+period+' of '+offer.tier+
        ' Chart Studio? Current balance: '+balance+'; cost: '+cost+
        '; estimated remaining: '+(balance-cost)+'. The server will recheck all balances and entitlements before spending.'))return;
      button.disabled=true;status.textContent='Confirming your selected Chart Studio pass…';
      try{
        const r=await fetch('/api/member-sparks-chart',{method:'POST',cache:'no-store',credentials:'same-origin',
          headers:{...headers,'content-type':'application/json'},
          body:JSON.stringify({sku:offer.sku,requestId:crypto.randomUUID(),expectedCost:cost})});
        const result=await r.json();
        if(!r.ok||result.ok!==true)throw Error(result.error||'Redemption not confirmed');
        status.textContent='Confirmed. '+cost+' Lumens redeemed; pass expires '+
          new Date(result.expiresAt).toLocaleString()+'. Refresh to check your updated wallet.';
        window.location.reload();
      }catch(error){
        status.textContent='No new redemption confirmed: '+String(error.message||'Service unavailable')+
          '. Check your wallet before retrying.';
        button.disabled=false;
      }
    });
    card.append(note,button);host.append(card);
  }
  if(host.childElementCount===0)status.textContent='No currently authorized Chart Studio Lumen passes are available.';
 }catch{status.textContent='Could not verify Chart Studio offers or wallet. No Lumens were spent.'}
})();
