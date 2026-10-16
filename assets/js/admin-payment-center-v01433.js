/* Cyber Nexus / The Stock Market: From the Ground Up | v0.14.0.33
 * Navigation and payment-readiness presentation only. No grant, key storage, checkout
 * activation, privilege escalation, SQL migration or rewriting existing editors.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname)||window.GroundUpAdminPaymentCenterV01433)return;
const qs=(s,root=document)=>root.querySelector(s),all=(s,root=document)=>Array.from(root.querySelectorAll(s));
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const gate=()=>{const g=qs('#admin-gate'),a=qs('#admin-app');return !!(g&&g.hidden&&a&&!a.hidden)};
function allowed(button){return !!(button&&!button.hidden&&!button.disabled&&!button.closest('[hidden]')&&!button.classList.contains('cc-owner-hidden')&&button.getAttribute('aria-disabled')!=='true')}
const commerceNav=()=>qs('#admin-tabs button[data-panel="commerce"]');
let mounted=false,loaded=false,started=false,searchStatus=null;
const targets=[
 {id:'managed',name:'Stripe Managed Payments',description:'Digital provider, sandbox checkout, price mapping readiness and webhook status',keywords:'stripe digital managed account secret configuration price subscription', selector:'[data-gu-managed-r2]'},
 {id:'lemon',name:'Lemon Squeezy',description:'Alternative digital provider configuration and webhook readiness',keywords:'lemon squeezy api key variant subscription',selector:'[data-gu-lemon-readiness]'},
 {id:'signed',name:'Signed Book Payments & Fulfillment',description:'Standard Stripe physical payments, author-copy pricing, paid orders, signing, and tracking',keywords:'stripe physical kdp signed paperback hardcover orders shipping',selector:'[data-gu-signed-admin-v01431]'},
 {id:'lulu',name:'Lulu Direct & Print Sales',description:'Optional print provider, checkout links and title-level fulfillment settings',keywords:'lulu paperback hardcover print links',selector:'[data-gu-print-owner-v01428]'},
 {id:'printModes',name:'Print Fulfillment Preferences',description:'OWNER preferences for signed copies and Lulu enable/disable',keywords:'manual fulfillment signed enable disable',selector:'[data-gu-signed-print-v01429]'},
 {id:'digital',name:'eBook Sales & Downloads',description:'Private EPUB/PDF, KDP Select restrictions and title-level digital controls',keywords:'ebook epub pdf download rights kindle',selector:'[data-gu-digital-v01430]'},
 {id:'orders',name:'Orders & Subscriptions',description:'Existing site order and subscription records; provider remains payment authority',keywords:'customers payments renewal orders membership billing ledger',selector:'#admin-orders'},
 {id:'reconcile',name:'Reconciliation & Webhooks',description:'Recorded checkout intents, webhooks and entitlement status',keywords:'refund disputes chargeback reconciliation ledger webhook',nav:'[data-oc-tab="commerce"]'},
 {id:'memberships',name:'Membership Pricing & Visibility',description:'Manage membership visibility and available enrollment options',keywords:'free monthly annual lifetime founding plan membership',url:'/plan-controls.html'},
 {id:'catalog',name:'Products & Book Catalog',description:'Catalog records, print and digital editions',keywords:'book products title catalog',nav:'[data-panel="catalog"]'},
 {id:'settings',name:'Site Checkout Settings',description:'Existing site settings and global feature flags',keywords:'toggle public checkout payment mode',nav:'[data-panel="settings"]'}
];
function openTarget(item){
 if(item.url){location.assign(item.url);return true}
 const nav=item.nav?qs('#admin-tabs button'+item.nav):commerceNav();
 if(!allowed(nav))return false;
 nav.click();
 if(!item.selector)return true;
 // Existing modules mount asynchronously; preserve their original DOM & event handlers.
 let cycles=0;
 const timer=setInterval(()=>{const target=qs(item.selector);if(target&&target.isConnected&&target.getClientRects().length){clearInterval(timer);target.scrollIntoView({block:'start',behavior:'smooth'});if(target.matches('section,article')){target.setAttribute('tabindex','-1');target.focus({preventScroll:true})}}
 else if(++cycles>=24){clearInterval(timer);searchStatus&&(searchStatus.textContent='The section is not currently available. Check the account permission or configuration.')}
 },110);
 return true;
}
function paymentPanel(){const panel=qs('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;
 if(qs('[data-gu33-payment-hub]',panel))return true;
 const heading=qs('.admin-heading h1',panel);if(heading)heading.textContent='Payments & Billing Center';
 const sub=qs('.admin-heading p',panel);if(sub)sub.textContent='All payment providers, products, subscriptions, orders and fulfillment controls in one place. Provider operations remain independently authorized.';
 const hub=make('section',undefined,'gu33-payment-hub');hub.dataset.gu33PaymentHub='1';
 const intro=make('div',undefined,'gu33-hub-top');intro.append(make('h2','Payment Operations'),make('p','Stripe Managed Payments is the preferred DIGITAL sandbox integration. Lemon Squeezy is an optional digital alternative. Author-signed print uses Standard Stripe; Lulu Direct is separate. These channels are not interchangeable.'));
 const status=make('p','Reviewing provider readiness…','gu33-hub-notice');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const refresh=make('button','Refresh Payment Readiness','btn secondary');refresh.type='button';
 const summary=make('div',undefined,'gu33-summary');summary.append(status,refresh);
 const board=make('div',undefined,'gu33-provider-cards');
 const cards=[['stripe','Stripe Managed Payments','Digital · subscriptions, tools, eligible eBooks','managed'],['lemon','Lemon Squeezy','Alternative digital provider','lemon'],['physical','Standard Stripe','Author-signed paperback & hardcover','signed'],['print','Lulu Direct','Optional externally fulfilled print','lulu']];
 for(const [key,name,desc,target] of cards){const card=make('article',undefined,'gu33-provider-card');card.dataset.gu33Provider=key;
  card.append(make('h3',name),make('p',desc));const badge=make('strong','Checking configuration…','gu33-status-badge');badge.dataset.gu33Badge=key;card.append(badge);
  const button=make('button',`Open ${name} Settings`,'btn secondary');button.type='button';button.dataset.gu33Go=target;card.append(button);board.append(card)}
 const finder=make('div',undefined,'gu33-feature-index');finder.append(make('h3','Payment Tasks & Shortcuts'),make('p','Choose a task to jump to the existing authorized editor. This dashboard does not replace any current controls.'));
 const fLabel=make('label','Find a payment task');const input=make('input');input.type='search';input.placeholder='Search payments, Stripe, refunds, digital books, shipping…';input.setAttribute('aria-label','Search payment tasks');fLabel.append(input);finder.append(fLabel);
 const links=make('div',undefined,'gu33-task-grid');for(const item of targets){const b=make('button',undefined,'gu33-task');b.type='button';b.dataset.gu33Go=item.id;
  b.append(make('strong',item.name),make('span',item.description));links.append(b)}finder.append(links);
 const mapping=make('section',undefined,'gu33-catalog');mapping.append(make('h3','Stripe Digital Products & Price Mapping'),make('p','See current database products and prices alongside whether each SKU has a Stripe sandbox Price ID in Cloudflare. Existing “Variant ID” entries belong to Lemon Squeezy, not Stripe.'));
 const mappingButton=make('button','Check Stripe Product Mapping','btn secondary');mappingButton.type='button';
 const mappingStatus=make('p','No configuration imported into this page; select Check to inspect current non-secret settings.');mappingStatus.setAttribute('role','status');mappingStatus.setAttribute('aria-live','polite');
 const mappingTable=make('div',undefined,'gu33-table-wrap');mapping.append(mappingButton,mappingStatus,mappingTable);
 mappingButton.onclick=async()=>{mappingButton.disabled=true;mappingStatus.textContent='Reading authorized catalog and mapped/unmapped status…';mappingTable.replaceChildren();
  try{const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Authorized sign-in required.');
   const response=await fetch('/api/payment-catalog-v01433',{method:'GET',headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
   const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw Error(data?.error||'Unable to read product mapping.');
   const table=make('table');const header=make('thead'),tr=make('tr');for(const col of ['Website SKU','Product','Price','Billing','Stripe Price ID','Availability'])tr.append(make('th',col));header.append(tr);table.append(header);
   const body=make('tbody');for(const p of data.products||[]){const row=make('tr');const price=Number.isInteger(p.amountCents)?(p.amountCents/100).toLocaleString(undefined,{style:'currency',currency:'USD'}):'Not priced';
    for(const value of [p.key,p.name,price,p.billing,p.mapped?'Mapped in Cloudflare':'Unmapped',p.eligible?'Eligible candidate':p.reason||'Disabled'])row.append(make('td',value));body.append(row)}table.append(body);mappingTable.append(table);
   mappingStatus.textContent=`${data.mappedCount} of ${data.catalogCount} website SKUs have mapped Stripe Price IDs. These mappings are not verified checkouts. Selected route: ${data.route} (${data.routeEnabled?'enabled':'disabled'}).`;
  }catch(e){mappingStatus.textContent='Stripe catalog status unavailable: '+(e.message||'Request failed.')}
  finally{mappingButton.disabled=false}
 };
 const legacy=make('div',undefined,'gu33-legacy-warning');legacy.append(make('strong','Important: existing “Membership Variant Mapping” is Lemon Squeezy-specific.'),make('p','The Variant ID entries in older checkout screens are NOT Stripe Price IDs. For Managed Payments, use the Stripe sandbox price map configured privately in Cloudflare. No checkout goes live merely because a setting is saved.'));
 hub.append(intro,summary,board,finder,mapping,legacy);
 const first=qs('.admin-grid.two',panel);if(first)panel.insertBefore(hub,first);else panel.append(hub);
 hub.addEventListener('click',e=>{const b=e.target.closest('[data-gu33-go]');if(!b)return;const item=targets.find(x=>x.id===b.dataset.gu33Go);if(!item)return;if(!openTarget(item))status.textContent='This account cannot access that control. Check OWNER/ADMIN role permissions.'});
 input.addEventListener('input',()=>{const query=norm(input.value);all('.gu33-task',links).forEach(b=>{const t=targets.find(x=>x.id===b.dataset.gu33Go);b.hidden=!!query&&!norm([t.name,t.description,t.keywords].join(' ')).includes(query)})});
 async function check(){if(!gate()||!allowed(commerceNav()))return;refresh.disabled=true;status.textContent='Checking server-side configuration; no payment credentials are displayed.';
  try{const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in as authorized staff.');
   const res=await fetch('/api/payment-provider-status-v01432r2',{method:'GET',cache:'no-store',headers:{authorization:'Bearer '+session.access_token}});
   const json=await res.json().catch(()=>null);if(!res.ok||!json?.ok)throw Error(json?.error||'Payment status is unavailable.');
   const m=json.managed||{},l=json.lemon||{},physical=json.physical||{},route=json.configuredRoute||{};
   const data={stripe:{configured:!!(m.secretConfigured&&m.webhookSecretConfigured&&m.priceCatalogConfigured),label:m.sandboxEnabled?'Sandbox configured; live NOT ready':m.secretConfigured?'Partial sandbox configuration':'Not configured'},
    lemon:{configured:!!(l.apiConfigured&&l.storeConfigured&&l.webhookSecretConfigured),label:l.apiConfigured?'Check all provider secrets':'Not configured'},
    physical:{configured:!!physical.signedBookCheckoutEnabled,label:physical.signedBookCheckoutEnabled?'Worker switch ON — verify tests':'Checkout disabled'},
    print:{configured:false,label:'Verify per-book Lulu settings'}};
   for(const [key,value] of Object.entries(data)){const e=qs(`[data-gu33-badge="${key}"]`,hub);if(!e)continue;e.textContent=value.label;e.classList.toggle('gu33-configured',value.configured)}
   const routeName=route.provider==='STRIPE_MANAGED'?'Stripe Managed Payments':route.provider==='LEMON_SQUEEZY'?'Lemon Squeezy':'Unknown';
   status.textContent=`Digital route: ${routeName} (${route.enabled?'enabled':'disabled'}). Stripe Managed live customer payments: NOT IMPLEMENTED. Provider key presence does not verify merchant approval, product mapping, webhook delivery or entitlements.`;
  }catch(e){status.textContent='Unable to verify provider readiness: '+(e.message||'Unknown error')+'; no checkout enabled by this page.'}
  finally{refresh.disabled=false}
 }
 refresh.addEventListener('click',check);
 if(gate())check();else{const timer=setInterval(()=>{if(gate()){clearInterval(timer);check()}},450);setTimeout(()=>clearInterval(timer),30000)}
 return true;
}
function search(){if(qs('[data-gu33-global-search]'))return true;
 const main=qs('.admin-main'),app=qs('#admin-app');if(!main||!app)return false;
 const container=make('section',undefined,'gu33-global-search');container.dataset.gu33GlobalSearch='1';container.hidden=!gate();
 const label=make('label','Find a control, setting or section (Ctrl+K)');label.setAttribute('for','gu33-global-input');
 const input=make('input');input.id='gu33-global-input';input.type='search';input.autocomplete='off';input.setAttribute('aria-controls','gu33-global-results');input.setAttribute('aria-expanded','false');input.placeholder='Search Admin: Stripe, members, reports, messaging, settings…';
 const output=make('div',undefined,'gu33-search-results');output.id='gu33-global-results';output.hidden=true;
 const hint=make('p','Search administrative navigation and functionality — not private member records.','gu33-search-hint');
 container.append(label,input,output,hint);main.insertBefore(container,app);
 searchStatus=make('p','','gu33-search-live');searchStatus.setAttribute('role','status');searchStatus.setAttribute('aria-live','polite');container.append(searchStatus);
 const paymentExtras=targets.map(item=>({text:item.name,detail:item.description,keywords:item.keywords,click:()=>openTarget(item),permission:()=>allowed(commerceNav())}));
 let current=[],selected=0;
 function buildIndex(){const records=[],seen=new Set();
  for(const nav of all('#admin-tabs button,#admin-tabs a')){
   if(!allowed(nav)||nav.closest('#cc-preserved-module-roots,.cc-owner-hidden'))continue;
   const label=nav.textContent.trim();if(!label||/^(cards|dense)$/i.test(label))continue;
   const key='nav:'+label+':'+(nav.dataset.panel||nav.dataset.ocTab||nav.id||nav.getAttribute('href')||'');if(seen.has(key))continue;seen.add(key);
   records.push({text:label,detail:'Admin section',keywords:'navigation '+label,click:()=>{if(!allowed(nav))return false;nav.click();return true}})
  }
  for(const item of paymentExtras)if(item.permission())records.push(item);
  // Never index member names, email addresses, reports, private tokens or form values.
  return records;
 }
 function render(){const q=norm(input.value);output.replaceChildren();current=[];selected=0;
  if(!q){output.hidden=true;input.setAttribute('aria-expanded','false');searchStatus.textContent='';return}
  current=buildIndex().filter(x=>norm([x.text,x.detail,x.keywords].join(' ')).includes(q)).slice(0,14);
  if(!current.length){output.append(make('p','No matching authorized control found. Try another term.','gu33-search-empty'))}
  else current.forEach((item,i)=>{const b=make('button',undefined,'gu33-result');b.type='button';b.dataset.index=String(i);b.append(make('strong',item.text),make('small',item.detail));b.addEventListener('click',()=>activate(i));output.append(b)});
  output.hidden=false;input.setAttribute('aria-expanded','true');highlight();searchStatus.textContent=current.length+' matching administrative controls';
 }
 function highlight(){all('.gu33-result',output).forEach((b,i)=>b.setAttribute('aria-selected',String(i===selected)))}
 function activate(index){const item=current[index];if(!item)return;const ok=item.click();if(ok===false){searchStatus.textContent='That control is not currently authorized.';return}input.value='';render();input.blur()}
 input.addEventListener('input',render);
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';render();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!current.length)return;e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+current.length)%current.length;highlight()}if(e.key==='Enter'&&current.length){e.preventDefault();activate(selected)}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){if(!gate())return;e.preventDefault();input.focus();input.select()} });
 const t=setInterval(()=>{container.hidden=!gate();if(container.hidden)output.hidden=true},600);window.addEventListener('pagehide',()=>clearInterval(t),{once:true});
 return true;
}
function install(){if(mounted||!gate())return;
 mounted=true;search();if(allowed(commerceNav()))paymentPanel();
 window.GroundUpAdminPaymentCenterV01433={version:'v0.14.0.33',search:()=>qs('#gu33-global-input')?.focus(),open:openTarget};
}
let attempts=0;const timer=setInterval(()=>{if(gate()){install();if(mounted)clearInterval(timer)}else if(++attempts>180)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
