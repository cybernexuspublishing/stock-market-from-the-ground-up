/* v0.14.0.40 — OWNER testing console in Payments & Billing. SHADOW ONLY. */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpStripeShadowV01439)return;
 const $=(s,r=document)=>r.querySelector(s),element=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
 const SKUS={
  'plan:FULL_MONTHLY':'Full Monthly — $69.99', 'plan:FULL_ANNUAL':'Full Annual — $699.00',
  'plan:LIFETIME':'Lifetime — $2,499.00','plan:ONDEMAND_MONTHLY':'Historical Replay — $19.99/month',
  'tool:INTERACTIVE_LEARNING':'Learning & Labs — $29.99/month',
  'tool:JOURNAL_ANALYTICS':'Trading Journal — $29.99/month',
  'tool:MARKET_SIMULATOR':'Market Simulator — $29.99/month','tool:MARKET_TUTOR':'Market Tutor — $29.99/month'
 };
 let state=null,loaded=false;
 function permitted(){const tab=$('#admin-tabs button[data-panel="commerce"]'),gate=$('#admin-gate'),app=$('#admin-app');return gate?.hidden===true&&app&&!app.hidden&&tab&&!tab.disabled&&!tab.hidden&&!tab.closest('[hidden]')&&!tab.classList.contains('cc-owner-hidden')&&tab.getAttribute('aria-disabled')!=='true'}
 const root=element('section',undefined,'gu39-shadow-card');root.id='gu39-shadow';root.setAttribute('aria-label','Stripe sandbox payment testing');
 const title=element('h2','Stripe Payment Testing');
 const lead=element('p','Safely check Stripe test payments without changing real customer memberships, orders, or eBook rights.');
 const banner=element('p','TEST MODE ONLY · Real customer checkout remains OFF','gu39-danger');
 const message=element('p','Select Refresh to check the system.','gu39-message');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const summary=element('dl',undefined,'gu39-summary');
 const controls=element('div',undefined,'gu39-actions');
 const refresh=element('button','Refresh Testing Status');refresh.type='button';
 const verify=element('button','Verify All 8 Sandbox Products');verify.type='button';
 const catalog=element('div',undefined,'gu39-catalog-report');catalog.setAttribute('role','status');catalog.setAttribute('aria-live','polite');
 const toggle=element('button','Enable Testing');toggle.type='button';toggle.disabled=true;
 const label=element('label','Choose a test product');label.htmlFor='gu39-sku';
 const sel=element('select');sel.id='gu39-sku';for(const [value,name] of Object.entries(SKUS)){const opt=element('option',name);opt.value=value;sel.append(opt)}
 const begin=element('button','Open Stripe Test Checkout');begin.type='button';begin.disabled=true;
 const explain=element('p','Only the Owner can change testing settings. A recent password confirmation is required. Test data is stored separately from real entitlements. No refunds or recurring memberships are modified outside this test area.','gu39-small');
 controls.append(refresh,verify,toggle,label,sel,begin);root.append(title,lead,banner,summary,controls,catalog,message,explain);
 async function auth(){const sb=await window.getSupabaseClient?.();const session=(await sb?.auth?.getSession?.())?.data?.session;if(!session?.access_token)throw Error('Sign in to Admin first.');return session.access_token}
 function show(data){state=data;summary.replaceChildren();const rows=[['Owner Test Mode',data.enabled?'Enabled':'Disabled'],['Cloudflare Sandbox Gate',data.cloudflareGate?'Configured':'Not configured'],['Stripe Test Price IDs',String(data.priceIdsConfigured??0)+' / 8'],['Test Checkout Records',String(data.intentCount??0)],['Processed Sandbox Events',String(data.processedEventCount??0)],['Shadow Access Records',String(data.shadowAccessCount??0)],['Real Customer Payments','DISABLED']];
  for(const [k,v] of rows){summary.append(element('dt',k),element('dd',v))}
  toggle.textContent=data.enabled?'Disable Testing':'Enable Testing';toggle.disabled=data.role!=='OWNER'||(!data.enabled&&!data.cloudflareGate);
  begin.disabled=data.role!=='OWNER'||!data.enabled||!data.cloudflareGate||!data.priceIdsConfigured;
  message.textContent='All displayed purchases remain sandbox-only; actual Stripe processing and entitlement safety require acceptance testing.';
 }
 async function getState(){refresh.disabled=true;message.textContent='Checking authorized sandbox status…';try{const token=await auth();const r=await fetch('/api/gu39-sandbox',{headers:{authorization:'Bearer '+token},cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Sandbox unavailable.');show(data)}catch(e){toggle.disabled=begin.disabled=true;message.textContent=e.message||'Unable to access payment testing controls.'}finally{refresh.disabled=false}}
 async function verifyCatalog(){verify.disabled=true;catalog.replaceChildren();catalog.append(element('p','Checking the eight products directly against the Stripe Sandbox API…'));
  try{const jwt=await auth(),r=await fetch('/api/gu39-sandbox?view=catalog',{headers:{authorization:'Bearer '+jwt},cache:'no-store'}),data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'Catalog verification unavailable.');
   catalog.replaceChildren();catalog.append(element('h3','Sandbox catalog: '+data.productsVerified+' / '+data.productsExpected+' verified'));
   if(!data.allVerified)catalog.append(element('p','No products were added or modified. Review discrepancies before importing anything.'));
   const table=element('table'),caption=element('caption','Read-only Stripe verification results'),head=element('thead'),htr=element('tr');
   for(const c of ['Product','Expected Price','Result'])htr.append(element('th',c));head.append(htr);table.append(head);
   const body=element('tbody');for(const x of data.rows){const tr=element('tr');tr.append(element('td',x.productName||x.sku),element('td','$'+(x.amountCents/100).toFixed(2)+' / '+x.interval),element('td',x.status));body.append(tr)}
   table.append(body);catalog.append(table);
  }catch(e){catalog.replaceChildren();catalog.append(element('p','Catalog verification could not complete: '+(e.message||'Unknown error.')))}finally{verify.disabled=false}
 }
 verify.addEventListener('click',verifyCatalog);
 async function perform(payload){toggle.disabled=begin.disabled=true;try{const token=await auth();const r=await fetch('/api/gu39-sandbox',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Action was not authorized.');return data}catch(e){message.textContent='Payment testing action not completed: '+(e.message||'Unknown error.');return null}finally{if(state){toggle.disabled=state.role!=='OWNER';begin.disabled=state.role!=='OWNER'||!state.enabled||!state.cloudflareGate}}}
 refresh.addEventListener('click',getState);
 toggle.addEventListener('click',async()=>{if(!state)return;const next=!state.enabled;if(next&&!confirm('Enable SHADOW sandbox tests? No real member access will change.'))return;
  const result=await perform({action:'toggle',enabled:next,updatedAt:state.updatedAt});if(result)await getState()});
 begin.addEventListener('click',async()=>{const sku=sel.value;if(!Object.hasOwn(SKUS,sku))return;if(!confirm('Start a STRIPE TEST purchase? Use Stripe test card details only. No real billing.'))return;
  const result=await perform({action:'checkout',sku});if(!result)return;
  let destination;try{destination=new URL(result.url);if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Unsafe destination.')}catch{message.textContent='Stripe checkout URL verification failed.';return}
  location.assign(destination.href)});
 function mount(){if(loaded||!permitted())return;const host=$('.gu33-payment-hub')||$('.admin-panel[data-panel="commerce"]')||$('[data-admin-panel="commerce"]');if(!host)return;
  if($('#gu39-shadow')){loaded=true;return}loaded=true;host.prepend(root);window.GroundUpStripeShadowV01439=Object.freeze({version:'0.14.0.40',refresh:getState,verifyCatalog});getState()}
 let counter=0;const check=setInterval(()=>{if(loaded||++counter>180){clearInterval(check);return}mount()},250);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
