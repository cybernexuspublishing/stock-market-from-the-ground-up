/* v0.14.0.89 — one Admin Products workspace for all three Store categories.
 * Reuses existing authenticated /api/admin, audited Owner plan availability,
 * and existing book/tool editors. Never creates checkout or grants rights.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;',"'":'&#39;'}[c]));
const money=c=>(Number(c||0)/100).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const cycle=x=>({month:'/month',year:'/year',lifetime:' one-time',none:''})[x]||'';
const planPages={FREE:'store-membership-free.html',FULL_MONTHLY:'store-membership-full-monthly.html',FULL_ANNUAL:'store-membership-full-annual.html',LIFETIME:'store-membership-lifetime.html',ONDEMAND_MONTHLY:'store-membership-ondemand-monthly.html'};
const toolPages={INTERACTIVE_LEARNING:'store-tool-interactive-learning.html',JOURNAL_ANALYTICS:'store-tool-journal-analytics.html',MARKET_SIMULATOR:'store-tool-market-simulator.html',MARKET_TUTOR:'store-tool-market-tutor.html'};
const urlFor=(kind,code)=>({plan:planPages,tool:toolPages}[kind]?.[code]||'store-product.html?type='+encodeURIComponent(kind)+'&code='+encodeURIComponent(code);
let context=null,live=null,current='memberships',pending=false;
const msg=(s,error=false)=>{const x=$('admin-products-message');if(x){x.textContent=s;x.classList.toggle('admin-products-error',error)}};
async function token(){
 const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();
 if(!session?.access_token)throw Error('Administrator sign-in is required.');
 return session.access_token;
}
async function request(url,body){
 const r=await fetch(url,{method:body?'POST':'GET',headers:{authorization:'Bearer '+await token(),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await r.json().catch(()=>null);
 if(!r.ok||!data?.ok)throw Error(data?.error||'Products service is unavailable ('+r.status+').');
 return data;
}
const admin=(name,body)=>request('/api/admin?action='+encodeURIComponent(name),body);
const plan=(body)=>request('/api/plan-controls',body);
const can=p=>context?.permissions?.includes(p)||false;
const owner=()=>context?.roles?.includes('OWNER')||false;
function show(tab){
 current=tab;
 for(const name of ['memberships','books','tools']){
  const x=$('admin-products-'+name),button=$('admin-products-tab-'+name),selected=tab===name;
  if(x)x.hidden=!selected;
  if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1}
 }
 history.replaceState(null,'','#products'+(tab==='memberships'?'':'-'+tab));
}
function membershipCard(p){
 const enabled=p.active&&p.public_visible;
 const price=money(p.price_cents)+cycle(p.billing_interval);
 const buttons=owner()&&can('commerce.view')?
  '<div class="product-admin-fields"><label><input type="checkbox" data-flag="active" '+(p.active?'checked':'')+
  (p.plan_code==='FREE'?' disabled':'')+'> Available for new enrollment</label><label><input type="checkbox" data-flag="public" '+(p.public_visible?'checked':'')+'> Listed in Store</label><label><input type="checkbox" data-flag="pause"> Pause NEW checkout (cannot enable from here)</label>'+
  '<button class="btn secondary" type="button" data-plan-save="'+e(p.plan_code)+'">Save Visibility</button></div>':
 '<p class="small">Owner authorization is required to change membership availability.</p>';
 const status=enabled?p.checkout_enabled?'Listed · Database checkout ON':'Listed · Checkout not enabled':'Hidden / disabled';
 return '<article class="admin-card product-admin-card" data-plan="'+e(p.plan_code)+'">'+
 '<div class="eyebrow">Membership</div><h3>'+e(p.name)+'</h3>'+
 '<p class="product-admin-price">'+e(price)+'</p><p>'+e(p.description||'Membership product description not yet provided.')+'</p>'+
 '<p class="product-admin-status">'+e(status)+'</p>'+
 '<div class="product-admin-actions"><a class="btn secondary" target="_blank" rel="noopener" href="'+e(urlFor('plan',p.plan_code))+'">View Customer Page</a></div>'+buttons+
 '<p class="small">Changing a Stripe-linked membership price, billing interval or included entitlements requires synchronized provider mapping, customer disclosure, and a separate audited rollout. This editor never changes those terms silently.</p></article>';
}
function toolCard(t){
 const published=t.active&&t.public_visible;
 const price=t.status==='live'&&Number(t.individual_price_cents)>0?money(t.individual_price_cents)+'/month':'Pricing not announced';
 const state=t.status==='live'?(t.checkout_enabled?'Listed · Checkout ON':'Released · Checkout not enabled'):
 'Coming Soon · '+String(t.status||'planned').replaceAll('_',' ');
 return '<article class="admin-card product-admin-card"><div class="eyebrow">À-la-Carte</div><h3>'+e(t.name)+'</h3>'+
 '<p class="product-admin-price">'+e(price)+'</p><p>'+e(t.description||'Further product details are being prepared.')+'</p>'+
 '<p class="product-admin-status">'+e(state)+(published?'':' · Not publicly displayed')+'</p>'+
 '<p class="small">SKU: <code>'+e(t.tool_code)+'</code> · Preview: '+(t.free_preview?'Configured':'Not configured')+'</p>'+
 '<div class="product-admin-actions"><a class="btn secondary" href="'+e(urlFor('tool',t.tool_code))+'" target="_blank" rel="noopener">View Customer Page</a>'+
 (can('tools.manage')?'<button type="button" class="btn" data-tool-edit="'+e(t.tool_code)+'">Edit Tool</button>':'')+'</div></article>';
}
function wire(){
 const root=$('admin-products-panel');if(!root||root.dataset.wired)return;root.dataset.wired='true';
 root.querySelectorAll('[data-product-tab]').forEach(button=>{
  button.addEventListener('click',()=>show(button.dataset.productTab));
  button.addEventListener('keydown',ev=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
   ev.preventDefault();const names=['memberships','books','tools'],n=names.indexOf(button.dataset.productTab);
   const i=ev.key==='Home'?0:ev.key==='End'?2:ev.key==='ArrowRight'?(n+1)%3:(n+2)%3;
   show(names[i]);$('admin-products-tab-'+names[i]).focus();
  });
 });
 $('admin-products-new-tool')?.addEventListener('click',()=>{try{window.GroundUpAdminToolEditor?.add()}catch(ex){msg(ex.message,true)}});
 root.addEventListener('click',async ev=>{
  const tool=ev.target.closest('[data-tool-edit]');
  if(tool){
   const item=live?.tools?.find(x=>x.tool_code===tool.dataset.toolEdit);
   if(!item)return;
   try{window.GroundUpAdminToolEditor?.edit(item)}catch(ex){msg(ex.message,true)}
   return;
  }
  const btn=ev.target.closest('[data-plan-save]');if(!btn)return;
  const p=live?.plans?.find(x=>x.plan_code===btn.dataset.planSave);
  if(!p||!owner()){msg('Owner authorization is required.',true);return}
  const card=btn.closest('[data-plan]');
  const active=card.querySelector('[data-flag="active"]').checked;
  const publicVisible=card.querySelector('[data-flag="public"]').checked;
  const pauseCheckout=card.querySelector('[data-flag="pause"]').checked;
  if(!confirm('Update visibility for '+p.name+'? Existing paid accounts are not cancelled. Pausing paid checkout requires a separate activation process to undo.'))return;
  btn.disabled=true;
  try{await plan({planCode:p.plan_code,active,publicVisible,pauseCheckout});
   msg('Saved membership visibility through the existing audited Owner authorization.');await load();
  }catch(ex){msg('Membership not changed: '+ex.message,true)}
  finally{btn.disabled=false}
 });
 window.addEventListener('groundup-product-updated',()=>load());
}
async function load(){
 if(pending)return;pending=true;
 try{
  wire();
  context=await admin('context');
  const requests=[can('commerce.view')?admin('platform'):Promise.resolve({plans:[],tools:[]}),
   can('catalog.view')?window.GroundUpAdminBookEditor?.load():Promise.resolve()];
  const result=await Promise.allSettled(requests);
  if(result[0].status!=='fulfilled')throw result[0].reason;
  live=result[0].value;
  $('admin-products-membership-list').innerHTML=live.plans.length?live.plans.map(membershipCard).join(''):'<p>Membership catalog is restricted or unavailable.</p>';
  $('admin-products-tool-list').innerHTML=live.tools.length?live.tools.map(toolCard).join(''):'<p>Tool catalog is restricted or unavailable.</p>';
  $('admin-products-new-tool').hidden=!can('tools.manage');
  if(result[1].status!=='fulfilled')msg('Books could not be loaded: '+result[1].reason?.message,true);
  else msg((live.plans?.length||0)+' membership configurations · '+(live.tools?.length||0)+' tool records. Book listings are managed in the Books tab.');
  const hash=location.hash.slice(1);show(hash==='#'?current:hash.endsWith('-tools')?'tools':hash.endsWith('-books')?'books':current);
 }catch(ex){msg('Products catalog unavailable: '+ex.message,true)}
 finally{pending=false}
}
window.GroundUpAdminProducts={load,show};
})();
