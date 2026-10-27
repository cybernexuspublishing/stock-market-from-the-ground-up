(function(){
 const C=()=>window.CommerceTools,e=s=>C().esc(s);
 const when=v=>v?new Date(v).toLocaleString():'—';
 // Tool links are editable catalog data. Escape markup AND allowlist only
 // same-site HTML routes; HTML escaping alone does not block javascript: URLs.
 const safeToolHref=value=>{
  const path=String(value||'').trim();
  return /^[a-z0-9][a-z0-9/_-]*\.html(?:[?#][A-Za-z0-9%=&_+.,/#-]*)?$/i.test(path)
   &&!path.includes('..')&&!path.includes('//')?path:null;
 };
 const toolPeriod=x=>{
  const end=x.current_period_end||x.ends_at;
  if(!end)return 'No verified paid-through date';
  const st=String(x.status||'').toLowerCase();
  const label=x.cancel_at_period_end===true?'Scheduled cancellation / recorded paid-through date':
   ['paused','past_due','failed','unpaid'].includes(st)?'Unconfirmed billing period end':
   ['canceled','expired'].includes(st)?'Recorded ended billing period':
   'Current paid-through / billing period end';
  return label+': '+when(end);
 };
 const billingNotice=x=>{
  const st=String(x.status||'').toLowerCase();
  if(['past_due','paused','unpaid','failed'].includes(st))
   return '<p role="alert" class="notice">A subscription payment may not have been confirmed. Paid access can be restricted immediately; no grace period is promised. Use Manage Billing / Cancel where available, or <a href="dashboard.html?tab=support">contact private Support</a> for billing help.</p>';
  if(['canceled','expired'].includes(st))
   return '<p class="small">This subscription has ended. Check Current Platform Access for remaining tools.</p>';
  if(x.cancel_at_period_end===true)
   return '<p class="small">Cancellation is scheduled at the current billing period end. Stripe determines the effective date.</p>';
  return '';
 };
 const portalButton=(kind,row)=>row.provider==='STRIPE_MANAGED'&&row.metadata?.source==='gu58_live_signed_stripe'&&
  /^sub_[A-Za-z0-9_]{6,150}$/.test(String(row.provider_subscription_id||''))?
  `<button type="button" class="btn secondary" data-billing-kind="${kind}" data-billing-record="${Number(row.id)}">Manage Billing / Cancel</button>`:
  '<span class="small">For payment changes or cancellation, <a href="dashboard.html?tab=support">open private Support</a>.</span>';
 async function portal(sb,member,kind,recordId,button){
  const status=document.getElementById('billing-status');
  button.disabled=true;status.textContent='Verifying your billing subscription…';
  try{
   const {data:{session}}=await sb.auth.getSession();
   if(session?.user?.id!==member.id||!session.access_token)throw Error('Current account session required. Sign in again.');
   const res=await fetch('/api/stripe-billing-portal',{method:'POST',
    headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},
    cache:'no-store',body:JSON.stringify({kind,recordId})});
   const body=await res.json().catch(()=>({}));
   if(!res.ok||body.ok!==true)throw Error(body.error||'Billing management is temporarily unavailable.');
   const url=new URL(body.url);
   if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw Error('Unexpected payment-provider destination.');
   const {data:{session:current}}=await sb.auth.getSession();
   if(current?.user?.id!==member.id)throw Error('Account changed; billing portal not opened.');
   // Click-triggered top-level navigation avoids popup blockers.
   window.location.assign(url.href);
  }catch(err){status.textContent=String(err.message||err);button.disabled=false;}
 }

 async function init(){const {cfg}=await C().load(),sb=await window.getSupabaseClient(),gate=document.getElementById('purchase-gate');const {data:{user}}=await sb.auth.getUser();if(!user){gate.innerHTML='<div class="notice">Sign in to view purchases.</div>';return}
 sb.auth.onAuthStateChange((_event,next)=>{
  if(next?.user?.id===user.id)return;
  for(const id of ['current-access','subscription-list','tool-pass-list','order-list']){
   document.getElementById(id)?.replaceChildren();
  }
  document.getElementById('billing-status').textContent='Account changed. Reload under your own identity to manage purchases.';
  gate.textContent='Account changed. Reload to display only your own purchases.';
 });
 const [orders,subs,passes,access]=await Promise.all([sb.from('site_orders').select('*,site_order_items(*)').eq('user_id',user.id).order('created_at',{ascending:false}),sb.from('site_subscriptions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),sb.from('user_tool_passes').select('*,platform_tools(name,href)').eq('user_id',user.id).order('created_at',{ascending:false}),sb.rpc('my_platform_access')]);
 const {data:{user:verified}}=await sb.auth.getUser();
 if(verified?.id!==user.id){gate.textContent='Account changed. Reload to display only your own purchases.';return;}
 const failedSources=[['orders',orders],['subscriptions',subs],['tool passes',passes],['access',access]]
  .filter(([,value])=>value?.error).map(([name])=>name);
 if(failedSources.length){
  gate.textContent='Purchase records could not be verified ('+failedSources.join(', ')+'). Please reload or contact support. Unavailable records are not the same as zero purchases.';
  for(const id of ['current-access','subscription-list','tool-pass-list','order-list']){
   const el=document.getElementById(id);if(el)el.textContent='Data unavailable. No access or purchase conclusion can be made.';
  }
  return;
 }
 gate.innerHTML='';const a=access.data||{};document.getElementById('current-access').innerHTML=`<article class="purchase-card"><div class="eyebrow">Current access</div><h3>${e(a.planName||'Free')}</h3>${(a.staffRoles||[]).length?`<div class="v11-chip-row">${a.staffRoles.map(r=>`<span class="v11-badge staff">${e(r)}</span>`).join('')}</div>`:''}<p class="small">${a.renewsAt?`Renews: ${e(when(a.renewsAt))}`:a.expiresAt?`Expires: ${e(when(a.expiresAt))}`:a.planCode==='LIFETIME'?'Never expires':'No paid renewal scheduled'}</p><a class="btn secondary" href="access.html">View Access Matrix</a></article>`;const s=subs.data||[];document.getElementById('subscription-list').innerHTML=s.length?s.map(x=>`<article class="purchase-card"><div class="eyebrow">${e(x.plan_code)}</div><h3>${e(x.status||'Unknown status')}</h3><p class="small">Provider: ${e(x.provider||'—')} · Current period ends: ${e(when(x.current_period_end))}</p>${billingNotice(x)}<div class="purchase-actions">${portalButton('plan',x)}</div></article>`).join(''):'<div class="empty-state">No website subscription transactions yet.</div>';const ps=passes.data||[];document.getElementById('tool-pass-list').innerHTML=ps.length?ps.map(x=>`<article class="purchase-card"><div class="eyebrow">À-la-Carte Tool Pass</div><h3>${e(x.platform_tools?.name||x.tool_code)}</h3><p class="small">Status: ${e(x.status)} · ${e(toolPeriod(x))}</p>${billingNotice(x)}${safeToolHref(x.platform_tools?.href)?`<a class="btn secondary" href="${e(safeToolHref(x.platform_tools.href))}">Open Tool</a>`:''}${portalButton('tool',x)}</article>`).join(''):'<div class="empty-state">No À-la-Carte tool passes yet.</div>';const o=orders.data||[];document.getElementById('order-list').innerHTML=o.length?`<div class="purchase-table-wrap"><table class="purchase-table"><thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>${o.map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${e(x.provider_order_id||String(x.id).slice(0,8))}<details class="order-record-details"><summary>View order details</summary><p>Website order ID: ${e(x.id)} · Provider: ${e(x.provider||"—")}</p><p>Payment confirmed: ${e(when(x.paid_at))} · Refunded: ${e(when(x.refunded_at))}</p><p>Subtotal: ${C().money((Number(x.subtotal_cents)||0)/100)} · Tax: ${C().money((Number(x.tax_cents)||0)/100)} · Total: ${C().money((Number(x.total_cents)||0)/100)} ${e(x.currency||"USD")}</p><ul>${(x.site_order_items||[]).map(i=>`<li>${e(i.description||i.product_code)} · Qty ${Number(i.quantity)||0} · ${C().money((Number(i.total_cents)||0)/100)}</li>`).join("")}</ul><p class="small">This is the recorded website order history, not a provider-issued tax invoice or payment receipt. For Stripe invoices and subscription management, use the authorized billing portal where available.</p></details></td><td>${(x.site_order_items||[]).map(i=>e(i.description||i.product_code)).join('<br>')}</td><td>${e(x.status)}</td><td>${C().money((Number(x.total_cents)||0)/100)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">No direct website purchases yet. Amazon orders are intentionally not listed here.</div>'}
 document.addEventListener('click',evt=>{
  const button=evt.target.closest?.('button[data-billing-kind][data-billing-record]');
  if(!button)return;
  const kind=button.dataset.billingKind,id=Number(button.dataset.billingRecord);
  if((kind!=='plan'&&kind!=='tool')||!Number.isSafeInteger(id)||id<1)return;
  // Auth binding and actual ownership are independently rechecked server-side.
  const session=window.getSupabaseClient().then(async sb=>{
   const {data:{user}}=await sb.auth.getUser();
   if(!user)throw Error('Sign in before managing billing.');
   await portal(sb,user,kind,id,button);
  });
  session.catch(err=>{document.getElementById('billing-status').textContent=String(err.message||err);button.disabled=false;});
 });
 document.addEventListener('DOMContentLoaded',init);
})();
