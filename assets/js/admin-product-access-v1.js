/* Shared product access editor: one definition per product, no duplicated tools. */
(()=>{'use strict';
const root=document.getElementById('admin-product-access-root');
if(!root)return;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let policies=[],selected=null;
const heading=el('h3','Shared Product Access · Free, Trials & Paid');
const description=el('p','Configure one product across Free, trials, paid access, membership inclusions, purchase durations and expiry. Legacy mode keeps existing access behavior. No payment or credit is charged by this editor.');
const state=el('p','Checking Owner authorization…');state.setAttribute('role','status');state.setAttribute('aria-live','polite');
const chooseLabel=el('label','Choose a product '),choose=el('select');choose.setAttribute('aria-label','Product access configuration');
chooseLabel.append(choose);
const form=el('form');form.className='admin-grid';
const flags={};
for(const [key,name] of [['free_access','Free access'],['trial_access','Paid or credit-funded trials may be offered'],['paid_access','Eligible for standalone paid offers']]){
 const label=el('label'),c=el('input');c.type='checkbox';c.name=key;flags[key]=c;
 label.append(c,document.createTextNode(' '+name));form.append(label);
}
const membershipLabel=el('label','Included memberships (comma-separated codes) ');
const membership=el('input');membership.type='text';membership.maxLength=750;membership.placeholder='FULL_MONTHLY, FULL_ANNUAL, LIFETIME';
membership.setAttribute('aria-label','Included membership codes');membershipLabel.append(membership);form.append(membershipLabel);
const daysLabel=el('fieldset'),legend=el('legend','Purchase durations');daysLabel.append(legend);
const days={};
for(const [num,label] of [[1,'1 day'],[7,'1 week'],[14,'2 weeks'],[30,'1 month (30 days)'],[180,'6 months (180 days)']]){
 const field=el('label'),c=el('input');c.type='checkbox';c.value=String(num);days[num]=c;
 field.append(c,document.createTextNode(' '+label+' '));daysLabel.append(field);
}
form.append(daysLabel);
const expiryLabel=el('label','Access expiration policy '),expiry=el('select');
for(const [value,text] of [['fixed_term','Fixed term — ends after issued duration'],['membership_bound','Membership-bound — ends with qualifying membership'],['non_expiring','Non-expiring entitlement (only when separately granted)'],['session_only','Session only']]){
 const o=el('option',text);o.value=value;expiry.append(o);
}expiryLabel.append(expiry);form.append(expiryLabel);
const modeLabel=el('label','Policy enforcement mode '),mode=el('select');
for(const [value,text] of [['legacy','Legacy — preserve current behavior'],['configured','Configured — govern Free preview; paid access still requires an existing verified entitlement']]){
 const o=el('option',text);o.value=value;mode.append(o);
}modeLabel.append(mode);form.append(modeLabel);
const warning=el('p','Changing trial or paid eligibility does not activate checkout, issue passes, change Stripe products, or bypass the existing entitlement checks. Membership codes and expiry are configuration for the shared issuance layer, not an immediate grant.');
warning.className='small';
const save=el('button','Save product access configuration');save.type='submit';save.className='btn';
const refresh=el('button','Refresh configurations');refresh.type='button';refresh.className='btn secondary';
refresh.addEventListener('click',()=>void load());
const actions=el('div');actions.className='admin-actions';actions.append(save,refresh);
form.append(warning,actions);
root.append(heading,description,state,chooseLabel,form);
async function api(body){
 const client=await window.getSupabaseClient();
 const token=(await client.auth.getSession()).data?.session?.access_token;
 if(!token)throw Error('Owner sign-in required.');
 const r=await fetch('/api/product-access-config',{method:body?'POST':'GET',
  headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
  credentials:'same-origin',cache:'no-store',body:body?JSON.stringify(body):undefined});
 const result=await r.json().catch(()=>({}));
 if(!r.ok||result.ok!==true)throw Error(result.error||'Product access service unavailable.');
 return result;
}
function show(){
 selected=policies.find(x=>x.product_code===choose.value)||null;
 form.hidden=!selected;if(!selected)return;
 for(const key of Object.keys(flags))flags[key].checked=selected[key]===true;
 membership.value=(selected.included_memberships||[]).join(', ');
 for(const [day,input] of Object.entries(days))input.checked=(selected.purchase_durations||[]).includes(Number(day));
 expiry.value=selected.access_expiration_policy;
 mode.value=selected.policy_mode;
 state.textContent=selected.label+' · '+selected.product_code+' · version '+selected.version+
  (selected.policy_mode==='legacy'?' · legacy rules currently control access':' · configured Free-preview rule active');
}
choose.addEventListener('change',show);
async function load(retain){
 try{
  save.disabled=true;const data=await api();
  policies=data.policies||[];
  const wanted=retain||choose.value;
  choose.replaceChildren();
  for(const p of policies){const option=el('option',p.label+' · '+p.product_code);option.value=p.product_code;choose.append(option)}
  if(wanted&&policies.some(x=>x.product_code===wanted))choose.value=wanted;
  form.hidden=!policies.length;chooseLabel.hidden=!policies.length;
  save.disabled=!policies.length;
  if(!policies.length)state.textContent='No product-access configurations found.';
  else show();
 }catch(e){form.hidden=true;chooseLabel.hidden=true;state.textContent=e.message;save.disabled=true;}
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!selected)return;
 const memberships=membership.value.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
 const payload={
  product_code:selected.product_code,version:selected.version,
  free_access:flags.free_access.checked,trial_access:flags.trial_access.checked,
  paid_access:flags.paid_access.checked,included_memberships:memberships,
  purchase_durations:Object.entries(days).filter(([,x])=>x.checked).map(([k])=>Number(k)),
  access_expiration_policy:expiry.value,policy_mode:mode.value
 };
 if(payload.policy_mode==='configured'&&!window.confirm('Activate configured Free-preview access for this product? Existing paid entitlement checks remain in force.'))return;
 try{
  save.disabled=true;state.textContent='Saving revision…';
  const result=await api(payload);state.textContent='Saved revision '+result.policy.version+'.';
  await load(payload.product_code);
 }catch(err){state.textContent=err.message;}
 finally{save.disabled=false;}
});
void load();
})();