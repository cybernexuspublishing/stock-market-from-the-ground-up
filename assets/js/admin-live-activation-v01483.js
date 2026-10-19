/* v0.14.0.83 | OWNER-ONLY eight positive-price LIVE activation.
 * The SQL Editor runs the INSTALL migration; only authenticated Owner +
 * independently verified recent password may activate protected site settings.
 * Never handles Stripe secrets, book/KDP data, subscription mutations, or
 * historical $0 QA.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 const h=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e};
 let tries=0;
 function mount(){
  const host=document.querySelector('.admin-panel[data-admin-panel="commerce"]');
  if(!host)return false;
  if(host.querySelector('[data-gu83-live-activation]'))return true;
  const section=h('section',undefined,'admin-card');
  section.dataset.gu83LiveActivation='true';
  section.hidden=true;
  section.append(
   h('h2','Activate Paid LIVE Checkout — Eight Existing Products'),
   h('p','OWNER ONLY. Enables the four paid memberships and four individual tool subscriptions in the existing production database. This can allow real customer charges immediately once the verified Cloudflare/Stripe settings also pass. It never sells books or reactivates the $0 test.')
  );
  const status=h('p','Checking Owner access…','small');status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const start=h('button','Authorize LIVE Payments for Eight Products','btn');start.type='button';start.disabled=true;
  section.append(start,status);host.prepend(section);
  async function owner(){
   if(typeof window.getSupabaseClient!=='function')throw Error('Website authentication is not available.');
   const sb=await window.getSupabaseClient();
   const {data:{session}}=await sb.auth.getSession();
   if(!session)throw Error('Sign in with the authorized Owner account.');
   const {data,error}=await sb.rpc('gu_owner_digital_payment_route_read_v01432r2');
   if(error||data?.role!=='OWNER')throw Error('Only the signed-in Owner may activate LIVE payments.');
   return sb;
  }
  let sb;
  const load=async()=>{
   try{sb=await owner();section.hidden=false;start.disabled=false;
    status.textContent='Owner access verified. Press the activation button once after installing the v0.14.0.83 Supabase SQL. The existing password confirmation is required.';
   }catch(e){start.disabled=true;status.textContent=e.message||'Owner authorization unavailable.'}
  };void load();
  start.onclick=async()=>{
   if(start.disabled)return;
   if(!window.confirm('Activate all EIGHT existing paid LIVE memberships/tools now? Once external Stripe verification succeeds, real customers can be charged. Book/KDP data and the retired $0 test will remain unchanged.'))return;
   start.disabled=true;status.textContent='Verifying Owner authorization and protected payment settings…';
   try{
    sb=await owner();
    const call=()=>sb.rpc('gu83_owner_activate_eight_live_checkout',{
     p_confirmation:'ENABLE_EIGHT_PAID_LIVE_CHECKOUT'
    });
    let result=await call();
    // The shared Supabase client intercepts PASSWORD_RECONFIRM_REQUIRED and
    // displays the site's existing password + Turnstile dialog. This fallback
    // covers a late-loaded password-confirm enhancement only.
    if(result.error&&/PASSWORD_RECONFIRM_REQUIRED/i.test(result.error.message||'')&&
       typeof window.GroundUpAdminPasswordConfirm?.ensure==='function'){
      await window.GroundUpAdminPasswordConfirm.ensure();
      result=await call();
    }
    if(result.error||result.data?.ok!==true)throw Error(result.error?.message||'No verified activation result. Nothing has been approved.');
    const d=result.data;
    if(d.plansEnabled!==4||d.toolsEligible!==4||!d.testingDisabled||
       !d.stripeRouteEnabled||!d.masterCheckoutEnabled)throw Error('Database activation response did not verify all eight products and launch switches.');
    status.textContent='Database LIVE activation confirmed: 4 plans, 4 tools, Stripe route ON, TESTING OFF, master checkout ON. Checking public production checkout…';
    const url='/api/stripe-live-checkout-v01458?type=plan&code=FULL_MONTHLY&gu83='+Date.now();
    const r=await fetch(url,{cache:'no-store'});const check=await r.json().catch(()=>null);
    if(check?.liveCheckoutAvailable===true){
      status.textContent='Database ACTIVATED and Full Monthly LIVE Stripe checkout is AVAILABLE. Other seven products retain independent server-side SKU verification.';
    }else{
      status.textContent='Database ACTIVATED, but the public Stripe readiness check remains CLOSED. Check Cloudflare Production redeployment, Managed Payments merchant eligibility, the eight LIVE price mappings and webhook account/secret. Do not submit a payment to diagnose.';
    }
   }catch(e){status.textContent='LIVE activation NOT verified: '+(e.message||String(e));start.disabled=false}
  };
  return true;
 }
 const clock=setInterval(()=>{if(mount()||++tries>120)clearInterval(clock)},250);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
