(async function(){
 const host=document.getElementById('spark-shop-packages'),status=document.getElementById('spark-shop-status');
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 try{
  const r=await fetch('data/crownlight-sparks-store-v014167.json',{cache:'no-store'});
  if(!r.ok)throw Error('Unavailable');const data=await r.json();
  if(!Array.isArray(data.packages))throw Error('Invalid catalog');
  const active=!!data.checkoutEnabled;
  // Current package file explicitly has checkout disabled. A real server-side
  // checkout must be verified before any purchase control becomes available.
  for(const p of data.packages){
   if(!/^[A-Z0-9_]{3,60}$/.test(p.code)||!Number.isInteger(p.quantity)||!Number.isInteger(p.priceCents))continue;
   const card=el('article',null,'spark-card');card.append(el('span',active&&p.checkoutEnabled?'Beta OPEN':'Coming Soon','spark-tag'),
    el('h2',p.name),el('p',p.quantity+' Crownlight Lumens'),el('div',(p.priceCents/100).toLocaleString('en-US',{style:'currency',currency:'USD'}),'spark-cost'));
   const note=el('p',active&&p.checkoutEnabled?'Package availability requires authenticated payment verification.':'Pricing shown for planning; purchases are not yet enabled.','small');card.append(note);
   // Deliberately avoid inventing a payment URL, checkout capability or price authorization.
   host.append(card);
  }
  status.textContent=host.children.length?(active?'Current package catalog — payment status must be confirmed before checkout.':'Lumen bundles are displayed for planning only; prices must be reconciled and checkout remains disabled.'):'No Lumen packages are currently published.';
 }catch{status.textContent='Spark package catalog is unavailable. No purchase was started.';}
})();
