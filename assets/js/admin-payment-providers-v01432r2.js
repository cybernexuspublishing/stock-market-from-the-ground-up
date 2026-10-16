/* v0.14.0.32-R2: OWNER-visible provider routing and onboarding verification.
 * Never displays/accepts payment API secrets. Distinguishes config from approval.
 */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=label;if(cls)e.className=cls;return e};
let attempts=0;
function mount(){const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 if(panel.querySelector('[data-gu-managed-r2]'))return true;
 const box=el('section',undefined,'admin-card');box.dataset.guManagedR2='1';
 box.append(el('h2','Digital Payment Settings'),
 el('p','Choose how customers pay for memberships, learning tools and eBooks. Stripe is our preferred option; Lemon Squeezy is optional. Printed books use separate settings.'));
 const status=el('p','Customer payments are not ready. Check the payment account first.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const config=el('div'),field=el('label','Use this payment service for digital products');const select=el('select');
 for(const [value,title] of [['STRIPE_MANAGED','Stripe (digital books and memberships)'],['LEMON_SQUEEZY','Lemon Squeezy (optional backup)']]){
  const op=el('option',title);op.value=value;select.append(op)}field.append(select);
 const onLabel=el('label',' Allow this payment service for new digital checkouts');const enabled=document.createElement('input');enabled.type='checkbox';onLabel.prepend(enabled);
 const refresh=el('button','Check Payment Setup','btn secondary'),save=el('button','Save Payment Service','btn');
 refresh.type=save.type='button';save.disabled=true;
 const explain=el('p','This saves your preferred service. Customers still cannot pay until the provider and checkout have been fully tested and approved.','small');
 const debug=el('div');
 const sandboxBox=el('div');sandboxBox.append(el('h3','Try a Stripe Test Payment'));
 const typeLabel=el('label','What are you testing?'),typeSelect=el('select');
 for(const name of ['plan','tool','book']){const o=el('option',name);o.value=name;typeSelect.append(o)}typeLabel.append(typeSelect);
 const codeLabel=el('label','Website item code'),codeInput=el('input');codeInput.type='text';codeInput.placeholder='FULL_MONTHLY';codeInput.maxLength=90;codeInput.value='FULL_MONTHLY';codeInput.autocomplete='off';codeLabel.append(codeInput);
 const sandboxButton=el('button','Start Stripe Test Payment','btn secondary');sandboxButton.type='button';sandboxButton.disabled=true;
 const sandboxStatus=el('p','For testing only: no real payment is collected and membership access is not granted.');sandboxStatus.setAttribute('role','status');
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
   for(const [name,value] of [['Stripe test account connection',stripe.secretConfigured],['Stripe payment updates',stripe.webhookSecretConfigured],
    ['Stripe product prices',stripe.priceCatalogConfigured],['Stripe test payments allowed',stripe.sandboxEnabled],
    ['Stripe customer access after payment',stripe.productionEnabled],['Lemon Squeezy account connection',lemon.apiConfigured],
    ['Lemon Squeezy store selected',lemon.storeConfigured],['Lemon Squeezy payment updates',lemon.webhookSecretConfigured]]){
     debug.append(el('p',name+': '+(value?'Ready / on':'Needs setup / off')));}
   sandboxReady=role==='OWNER'&&data.provider==='STRIPE_MANAGED'&&data.enabled===true&&stripe.sandboxEnabled===true&&stripe.priceCatalogConfigured===true;
   sandboxButton.disabled=!sandboxReady;
   status.textContent='Digital payment service: '+data.provider+'; selected service allowed: '+(data.enabled?'YES':'NO')+'; customer payments remain OFF until payment handling and access are tested.';
   save.disabled=role!=='OWNER';
  }catch(e){status.textContent=e.message||'Provider configuration unavailable.';previous=null;sandboxReady=false;sandboxButton.disabled=true}
  finally{busy=false;refresh.disabled=false}
 }
 refresh.onclick=reload;
 sandboxButton.onclick=async()=>{
  if(!sandboxReady||busy)return;
  const code=codeInput.value.trim();if(!/^[A-Z0-9_]{3,90}$/.test(code)){sandboxStatus.textContent='Enter the item code shown in your website product list.';return}
  sandboxButton.disabled=true;sandboxStatus.textContent='Checking your account and Stripe test price…';
  try{const {session}=await client();const r=await fetch('/api/stripe-managed-sandbox-v01432r2',{
   method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({type:typeSelect.value,code})});
   const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok||j.sandboxOnly!==true)throw Error(j.error||'Test checkout unavailable.');
   const u=new URL(j.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com')throw Error('Unexpected provider checkout location.');
   sandboxStatus.textContent='Opening Stripe SANDBOX; no real entitlements are granted.';location.assign(u.href);
  }catch(e){sandboxStatus.textContent=e.message||'Stripe test checkout is unavailable.'}
  finally{sandboxButton.disabled=!sandboxReady}
 };
 save.onclick=async()=>{if(busy||!previous||role!=='OWNER')return;busy=true;save.disabled=true;
  try{const {sb}=await client();const {data,error}=await sb.rpc('gu_owner_digital_payment_route_save_v01432r2',{
   p_provider:select.value,p_enabled:enabled.checked,p_expected_updated_at:previous});
   if(error||!data?.ok){const e=error?.message||'Unable to save payment settings.';if(/PASSWORD_RECONFIRM_REQUIRED/.test(e))throw Error('Confirm your password using the existing Admin password verification control, then retry.');throw Error(e)}
   status.textContent='Owner preference saved and audited. Reloading…';busy=false;await reload();
  }catch(e){status.textContent=e.message||'Could not save payment settings.'}finally{busy=false;save.disabled=role!=='OWNER'}
 };
 return true;
}
const timer=setInterval(()=>{if(mount()||++attempts>100)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
