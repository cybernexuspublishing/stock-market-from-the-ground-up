/* Lumen Store: future catalog is discovery only, not an invented checkout. */
(async function(){
 'use strict';
 const host=document.getElementById('lumen-future-products');
 const status=document.getElementById('lumen-future-status');
 const policy=document.getElementById('lumen-discount-policy');
 if(policy){
   try{
    const response=await fetch('/api/lumen-discount-policy',{cache:'no-store'});
    if(!response.ok)throw Error('policy unavailable');
    const data=await response.json(),p=data.policy;
    if(data.ok!==true||!p||p.enabled!==false)throw Error('policy unavailable');
    policy.textContent='Planned cash checkout discount: 1 Lumen = $'+(p.denominationCents/100).toFixed(2)+
     ', eligible for up to 100% of the qualifying product subtotal without a dollar cap. Whole Lumens required; the final Lumen may cover a remainder smaller than $0.07. No cash change. Taxes, shipping and excluded products are not covered; eligible subscription discounts, if introduced, apply only to the expressly authorized invoice, not automatic future renewals. Lumens cannot be exchanged for cash or withdrawn, and the displayed redemption value is not a cash exchange rate. NOT ACTIVE until server-authorized checkout redemption is released.';
   }catch{policy.textContent='Cash checkout discounts are not active. No Lumens will be deducted for a purchase discount.'}
 }
 if(!host||!status)return;
 try{
  const response=await fetch('/data/crownlight-lumen-marketplace-v1.json',{cache:'no-store'});
  if(!response.ok)throw Error('catalog unavailable');
  const data=await response.json();
  if(!Array.isArray(data.proposed))throw Error('catalog unavailable');
  const fragment=document.createDocumentFragment();
  for(const p of data.proposed){
   if(!p||typeof p.name!=='string'||typeof p.notes!=='string'||p.priceLumens!==null)continue;
   const card=document.createElement('article');card.className='spark-card';
   const tag=document.createElement('span');tag.className='spark-tag';
   tag.textContent=p.status==='future'?'Future category':'Planned · Not for sale';
   const title=document.createElement('h3');title.textContent=p.name;
   const description=document.createElement('p');description.textContent=p.notes;
   const category=document.createElement('p');category.className='small';
   category.textContent=p.category;
   card.append(tag,title,category,description);
   if(p.durationsDays){
    const options=document.createElement('p');options.className='small';
    options.textContent='Possible access windows: 1 day, 7 days, 14 days, 30 days or 180 days. Prices and access rights not released.';
    card.append(options);
   }
   fragment.append(card);
  }
  host.append(fragment);
  status.textContent='Planned rewards only. These entries cannot spend Lumens or generate a paid order.';
 }catch{status.textContent='Future rewards catalog is unavailable. No credits have been spent.'}
})();
