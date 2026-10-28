/* Crownlight Sparks V2 ad-free marketplace: server-authorized, no fake purchases. */
(async function(){
 'use strict';
 const host=document.getElementById('spark-adfree-options');
 const status=document.getElementById('spark-adfree-status');
 if(!host||!status)return;
 const element=(tag,value,cls)=>{
  const e=document.createElement(tag);
  if(value!=null)e.textContent=String(value);
  if(cls)e.className=cls;
  return e;
 };
 const labels={ADFREE_DAY:'24 hours',ADFREE_WEEK:'7 days',ADFREE_MONTH:'30 days'};
 const money=n=>Number(n||0).toLocaleString();
 try{
  const catResp=await fetch('data/crownlight-sparks-store-v014167.json',{cache:'no-store'});
  if(!catResp.ok)throw Error('Catalog unavailable');
  const catalog=await catResp.json(),passes=Array.isArray(catalog.adFreePasses)?catalog.adFreePasses:[];
  if(passes.length!==3)throw Error('Pass catalog unavailable');
  const client=await window.getSupabaseClient?.();
  const session=(await client?.auth.getSession())?.data?.session;
  if(!session?.access_token){
   status.textContent='Sign in to check whether your account is eligible for an Ad-Free Pass.';
   const link=element('a','Sign in','btn secondary');
   link.href='signin.html?next='+encodeURIComponent('/store-sparks.html#spark-adfree-section');
   host.append(link);return;
  }
  const token=session.access_token,headers={authorization:'Bearer '+token};
  const [eligibleResponse,walletResponse]=await Promise.all([
   fetch('/api/member-sparks-adfree',{headers,cache:'no-store',credentials:'same-origin'}),
   fetch('/api/member-sparks-wallet',{headers,cache:'no-store',credentials:'same-origin'})
  ]);
  if(!eligibleResponse.ok||!walletResponse.ok)throw Error('Account permissions could not be verified');
  const current=await eligibleResponse.json(),ledger=await walletResponse.json();
  if(current.ok!==true||ledger.ok!==true||!Number.isSafeInteger(ledger.wallet?.available))
   throw Error('Wallet could not be verified');
  if(current.eligible!==true){
   status.textContent=current.planCode==='OWNER'||current.planCode==='LIFETIME'
    ?'Your membership already includes ad-free access. No Sparks are required.'
    :'There are no paid sponsor placements available for your current plan.';
   return;
  }
  const active=current.active===true&&current.expiresAt&&Date.parse(current.expiresAt)>Date.now();
  status.textContent=(active?'Ad-free active until '+new Date(current.expiresAt).toLocaleString()+'. ':'')+
   'Verified wallet balance: '+money(ledger.wallet.available)+' Sparks.';
  for(const pass of passes){
   if(!Object.hasOwn(labels,pass.code)||!Number.isSafeInteger(pass.costSparks)||pass.costSparks<1)continue;
   const card=element('article',null,'spark-card');
   card.append(element('h3',labels[pass.code]+' Ad-Free Pass'),
    element('p',pass.costSparks+' Sparks','spark-cost'));
   const action=element('button','Redeem '+pass.costSparks+' Sparks','btn');
   action.type='button';action.disabled=pass.redeemEnabled!==true||ledger.wallet.available<pass.costSparks;
   if(pass.redeemEnabled!==true)card.append(element('p','This pass is not available for redemption yet.','small'));
   else if(action.disabled)card.append(element('p','Insufficient Sparks','small'));
   else card.append(element('p','This pass extends any active ad-free time.','small'));
   action.addEventListener('click',async()=>{
    const approval=window.confirm('Spend '+pass.costSparks+' Crownlight Sparks for '+labels[pass.code]+
     ' without sponsor ads? Your purchase will extend an existing pass.');
    if(!approval)return;
    action.disabled=true;
    status.textContent='Confirming your Sparks redemption…';
    try{
     const requestId=crypto.randomUUID();
     const response=await fetch('/api/member-sparks-adfree',{
      method:'POST',headers:{...headers,'content-type':'application/json'},
      credentials:'same-origin',cache:'no-store',
      body:JSON.stringify({sku:pass.code,requestId})
     });
     const result=await response.json();
     if(!response.ok||result.ok!==true)throw Error(result.error||'Redemption was not confirmed');
     status.textContent='Ad-free pass active until '+new Date(result.expiresAt).toLocaleString()+
      '. Your page will refresh to apply the ad-free status.';
     window.location.reload();
    }catch(error){
     status.textContent='Redemption not confirmed: '+String(error.message||'Service unavailable')+
      '. Check your wallet before trying again.';
     action.disabled=false;
    }
   });
   card.append(action);host.append(card);
  }
 }catch{
  status.textContent='Ad-Free Passes are temporarily unavailable. No Sparks were deducted.';
 }
})();
