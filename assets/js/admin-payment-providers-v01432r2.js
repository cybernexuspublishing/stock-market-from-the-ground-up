/* v0.14.0.32-R2: OWNER-visible provider routing and onboarding verification.
 * Never displays/accepts payment API secrets. Distinguishes config from approval.
 */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=label;if(cls)e.className=cls;return e};
let attempts=0;
function mount(){const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 if(panel.querySelector('[data-gu-managed-r2]'))return true;
 const box=el('section',undefined,'admin-card');box.dataset.guManagedR2='1';
 box.append(el('h2','Digital Payments — Stripe Managed Payments & Lemon Squeezy'),
 el('p','Stripe Managed Payments is the preferred digital provider, subject to account approval. Lemon Squeezy stays available as an alternative. Signed physical books use separate Standard Stripe; Lulu Direct is separate.'));
 const status=el('p','Provider integration is not active. Verify account configuration before changing routing.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const config=el('div'),field=el('label','Preferred digital payment provider');const select=el('select');
 for(const [value,title] of [['STRIPE_MANAGED','Stripe Managed Payments (digital)'],['LEMON_SQUEEZY','Lemon Squeezy (alternative)']]){
  const op=el('option',title);op.value=value;select.append(op)}field.append(select);
 const onLabel=el('label',' Enable selected digital provider route');const enabled=document.createElement('input');enabled.type='checkbox';onLabel.prepend(enabled);
 const refresh=el('button','Check Configuration','btn secondary'),save=el('button','Save Digital Provider Preference','btn');
 refresh.type=save.type='button';save.disabled=true;
 const explain=el('p','This controls the routing preference; it does not approve Stripe onboarding or enable live Stripe Managed Payments.','small');
 const debug=el('div');
 const sandboxBox=el('div');sandboxBox.append(el('h3','Managed Payments — Owner Sandbox Checkout'));
 const typeLabel=el('label','Test product type'),typeSelect=el('select');
 for(const name of ['plan','tool','book']){const o=el('option',name);o.value=name;typeSelect.append(o)}typeLabel.append(typeSelect);
 const codeLabel=el('label','Test product code'),codeInput=el('input');codeInput.type='text';codeInput.placeholder='FULL_MONTHLY';codeInput.maxLength=90;codeInput.value='FULL_MONTHLY';codeInput.autocomplete='off';codeLabel.append(codeInput);
 const sandboxButton=el('button','Open Stripe Test Checkout','btn secondary');sandboxButton.type='button';sandboxButton.disabled=true;
 const sandboxStatus=el('p','This creates sandbox transactions only. Paid entitlements are never issued by R2.');sandboxStatus.setAttribute('role','status');
 sandboxBox.append(typeLabel,codeLabel,sandboxButton,sandboxStatus);
 box.append(status,refresh,config,field,onLabel,save,explain,debug,sandboxBox);panel.append(box);
 let previous=null,busy=false,role='',sandboxReady=false;
 async function client(){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in as authorized staff.');return{sb,session}}
 async function reload(){if(busy)return;busy=true;refresh.disabled=save.disabled=true;debug.replaceChildren();status.textContent='Checking Owner account and provider configuration…';
  try{const {sb,session}=await client();const {data,error}=await sb.rpc('gu_owner_digital_payment_route_read_v01432r2');if(error||!data?.ok)throw Error(error?.message||'R2 database migration has not been installed.');
   previous=data.updatedAt;role=data.role;select.value=data.provider;enabled.checked=!!data.enabled;
   const r=await fetch('/api/payment-provider-status-v01432r2',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}),readiness=await r.json();
   if(!r.ok||!readiness.ok)throw Error(readiness.error||'Readiness check failed.');
   const stripe=readiness.managed||{},lemon=readiness.lemon||{};
   for(const [name,value] of [['Managed Payments sandbox key',stripe.secretConfigured],['Managed webhook signing secret',stripe.webhookSecretConfigured],
    ['Managed price catalog mapping',stripe.priceCatalogConfigured],['Managed test checkout permission',stripe.sandboxEnabled],
    ['Managed Payments live fulfillment',stripe.productionEnabled],['Lemon API configured',lemon.apiConfigured],
    ['Lemon Store ID configured',lemon.storeConfigured],['Lemon webhook configured',lemon.webhookSecretConfigured]]){
     debug.append(el('p',name+': '+(value?'Configured / enabled':'Not configured / disabled')));}
   sandboxReady=role==='OWNER'&&data.provider==='STRIPE_MANAGED'&&data.enabled===true&&stripe.sandboxEnabled===true&&stripe.priceCatalogConfigured===true;
   sandboxButton.disabled=!sandboxReady;
   status.textContent='Current route: '+data.provider+'; route enabled: '+(data.enabled?'YES':'NO')+'; all live Stripe Managed Payments remain BLOCKED until verified webhook fulfillment.';
   save.disabled=role!=='OWNER';
  }catch(e){status.textContent=e.message||'Provider configuration unavailable.';previous=null;sandboxReady=false;sandboxButton.disabled=true}
  finally{busy=false;refresh.disabled=false}
 }
 refresh.onclick=reload;
 sandboxButton.onclick=async()=>{
  if(!sandboxReady||busy)return;
  const code=codeInput.value.trim();if(!/^[A-Z0-9_]{3,90}$/.test(code)){sandboxStatus.textContent='Enter an existing uppercase product code.';return}
  sandboxButton.disabled=true;sandboxStatus.textContent='Confirming Owner password authorization and checking Stripe sandbox price…';
  try{const {session}=await client();const r=await fetch('/api/stripe-managed-sandbox-v01432r2',{
   method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({type:typeSelect.value,code})});
   const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok||j.sandboxOnly!==true)throw Error(j.error||'Test checkout unavailable.');
   const u=new URL(j.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('Unexpected provider checkout location.');
   sandboxStatus.textContent='Opening Stripe SANDBOX; no real entitlements are granted.';location.assign(u.href);
  }catch(e){sandboxStatus.textContent=e.message||'Stripe sandbox could not open.'}
  finally{sandboxButton.disabled=!sandboxReady}
 };
 save.onclick=async()=>{if(busy||!previous||role!=='OWNER')return;busy=true;save.disabled=true;
  try{const {sb}=await client();const {data,error}=await sb.rpc('gu_owner_digital_payment_route_save_v01432r2',{
   p_provider:select.value,p_enabled:enabled.checked,p_expected_updated_at:previous});
   if(error||!data?.ok){const e=error?.message||'Unable to save';if(/PASSWORD_RECONFIRM_REQUIRED/.test(e))throw Error('Confirm your password using the existing Admin password verification control, then retry.');throw Error(e)}
   status.textContent='Owner preference saved and audited. Reloading…';busy=false;await reload();
  }catch(e){status.textContent=e.message||'Save failed.'}finally{busy=false;save.disabled=role!=='OWNER'}
 };
 return true;
}
const timer=setInterval(()=>{if(mount()||++attempts>100)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
