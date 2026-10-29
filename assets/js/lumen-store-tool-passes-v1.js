/* Full-Lumen tool access, using released and server-priced offers only.
 * Draft offers never reach a purchase button. All discounts and membership
 * eligibility are independently verified by server on redemption.
 */
(()=>{'use strict';
const host=document.getElementById('lumen-tool-offers'),status=document.getElementById('lumen-tool-status');
if(!host||!status)return;
let activeAccount=null;
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
async function load(){
 host.replaceChildren();status.textContent='Checking available Lumen tool offers…';
 try{
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token||!session?.user?.id){
   const link=el('a','Sign in to see eligible tools');link.href='signin.html?next='+encodeURIComponent('/lumen-store.html');
   host.append(link);status.textContent='Sign-in required for personal Lumen purchases.';return;
  }
  activeAccount=session.user.id;
  const headers={authorization:'Bearer '+session.access_token};
  const [offers,wallet]=await Promise.all([
   fetch('/api/member-lumen-tool-passes',{headers,cache:'no-store'}),
   fetch('/api/member-sparks-wallet',{headers,cache:'no-store'})
  ]);
  const [offersData,walletData]=await Promise.all([offers.json(),wallet.json()]);
  if(!offers.ok||offersData.ok!==true||!wallet.ok||walletData.ok!==true)
   throw Error('The current member balance and offers could not be verified.');
  const balance=walletData.wallet.available;
  if(offersData.ownerIncluded){status.textContent='Owner access includes all registered tools; do not spend Lumens on tools already included.';return}
  const products=offersData.offers||[];
  if(!products.length){status.textContent='No additional research-tool trials are currently for sale. Existing Chart Studio and ad-free pass options appear above.';return}
  status.textContent='Available Lumens: '+balance+'. Fixed-term passes do not auto-renew. One Lumen is nominally $0.07.';
  for(const offer of products){
   if(!offer||!Number.isSafeInteger(offer.costLumens)||offer.costLumens<=0||!Number.isSafeInteger(offer.durationDays))continue;
   const card=el('article');card.className='spark-card';
   card.append(el('h3',offer.tool==='WATCHLIST_WORKBENCH'?'Advanced Watchlist & Trade-Plan Builder':offer.tool==='JOURNAL_ANALYTICS'?'Paid Trading Journal Analytics':offer.tool),
    el('p',offer.durationDays+'-day tool pass · '+offer.costLumens+' Lumens'),
    el('p','No automatic renewal. Existing included membership benefits will not be charged again.'));
   const buy=el('button','Redeem '+offer.costLumens+' Lumens');buy.className='btn';buy.type='button';buy.disabled=balance<offer.costLumens;
   const note=el('p',buy.disabled?'Insufficient available Lumens.':'Covers the complete fixed-term digital tool price, with no cash payment.');
   card.append(note,buy);host.append(card);
   buy.addEventListener('click',async()=>{
    const latest=(await client.auth.getSession()).data?.session;
    if(!latest||latest.user.id!==activeAccount){status.textContent='Account changed. Reload before purchasing.';return}
    if(!confirm('Redeem '+offer.costLumens+' Lumens for '+offer.durationDays+
       ' days of '+offer.tool+'? Available: '+balance+'; expected remaining: '+(balance-offer.costLumens)+
       '. Full price paid in Lumens; no automatic renewal. The server will verify availability and all existing benefits.'))return;
    buy.disabled=true;status.textContent='Confirming your redemption…';
    try{
     const r=await fetch('/api/member-lumen-tool-passes',{method:'POST',credentials:'same-origin',
      headers:{authorization:'Bearer '+latest.access_token,'content-type':'application/json'},cache:'no-store',
      body:JSON.stringify({offerCode:offer.code,expectedCostLumens:offer.costLumens,requestId:crypto.randomUUID()})});
     const data=await r.json().catch(()=>null);
     if(!r.ok||data?.ok!==true)throw Error(data?.error||'Redemption was not completed.');
     status.textContent='Confirmed. '+data.spent+' Lumens redeemed; access through '+new Date(data.expiresAt).toLocaleString()+'. Refresh for the updated wallet.';
     await load(); // Re-read the actual wallet from server.
    }catch(error){status.textContent='Not confirmed: '+String(error.message||error)+'. Check the wallet before trying again.';buy.disabled=false}
   });
  }
 }catch(e){status.textContent=e.message||'Lumen Store temporarily unavailable.'}
}
void load();
})();
