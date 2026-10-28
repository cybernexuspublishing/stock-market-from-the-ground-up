/* Accessible first-party search and exclusive Sparks/Profile popovers.
 * No paid dependencies, browser storage, or external search providers.
 */
(()=>{'use strict';
const pages=[
 ['Home','/index.html','Start learning the stock market'],
 ['Books','/books.html','Foundations books and reading resources'],
 ['Founding Memberships','/store.html#founders','Starter Standard Extended founding offers'],
 ['All Products & Upcoming Releases','/store-all-products.html','Catalog of books tools and Boot Camps'],
 ['Learning System','/learn.html','Foundational lessons and guided learning'],
 ['Interactive Labs','/labs.html','Historical lessons practice and quizzes'],
 ['Sample Labs','/lab-samples.html','Try free sample lessons'],
 ['Boot Camp Academy','/bootcamp-academy.html','Multi-day structured education'],
 ['Market Tutor','/market-tutor.html','Guided educational examples'],
 ['Market Commons','/market-commons.html','Forum and discussion'],
 ['Founders Commons','/founders-commons.html','Founding member community'],
 ['Trading Journal','/journal.html','Document and review trades'],
 ['Market Simulator','/simulator.html','Fictional market practice'],
 ['Tools','/tools.html','Market research and education tools'],
 ['Crownlight Sparks','/store-sparks.html','Sparks balance bundles and wallet'],
 ['Help and Support','/dashboard.html?tab=support','Member support and receipts'],
 ['Account Settings','/dashboard.html?tab=settings','Preferences and settings'],
 ['Advertise','/advertise.html','Sponsorships and advertising information']
];
let founderOffersVisible=false;
let productList=null;
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
let dialog=null,dialogInput=null,results=null,activeInput=null;
function ensureDialog(){
 if(dialog?.isConnected)return;
 dialog=el('dialog','gu-global-search-dialog');dialog.id='gu-global-search-dialog';
 const panel=el('div','gu-global-search-panel');
 const heading=el('h2','', 'Search the website');
 const close=el('button','gu-global-search-close','Close');close.type='button';
 close.addEventListener('click',()=>dialog.close());
 const head=el('div','gu-global-search-head');head.append(heading,close);
 dialogInput=el('input','gu-global-search-query');
 dialogInput.type='search';dialogInput.placeholder='Search pages and products';
 dialogInput.setAttribute('aria-label','Search pages and products');
 results=el('div','gu-global-search-results');results.setAttribute('aria-live','polite');
 panel.append(head,dialogInput,results);dialog.append(panel);document.body.append(dialog);
 dialogInput.addEventListener('input',render);
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
}
function render(){
 if(!results)return;
 results.replaceChildren();
 const q=String(dialogInput.value||'').trim().toLowerCase();
 const locations=pages.filter(([name,url,desc])=>(founderOffersVisible||!url.includes('#founders'))&&
  (name+' '+desc).toLowerCase().includes(q))
  .map(([name,url,desc])=>({name,url,desc}));
 const catalog=(productList||[]).filter(x=>(String(x.name||'')+' '+String(x.sku||'')+' '+String(x.category||'')).toLowerCase().includes(q))
  .slice(0,44).map(x=>({
    name:String(x.name||'Product'),desc:String(x.category||'')+' · '+String(x.price||''),
    url:typeof x.page==='string'&&/^[a-z0-9-]+\.html$/.test(x.page)?'/'+x.page:'/store-all-products.html'
  }));
 for(const item of [...locations,...catalog].slice(0,62)){
  const a=el('a','gu-global-search-result');a.href=item.url;
  a.append(el('strong','',item.name),el('span','',item.desc));results.append(a);
 }
 if(!results.childElementCount)results.append(el('p','gu-global-search-empty','No matching pages or products. Try a shorter term.'));
}
async function checkFoundingVisibility(){
 try{const r=await fetch('/api/founding-offer-status',{cache:'no-store'});
  if(r.ok){const j=await r.json();founderOffersVisible=j.ok===true&&j.offersVisible===true}
 }catch{founderOffersVisible=false}
 render();
}
void checkFoundingVisibility();
async function loadCatalog(){
 if(productList!==null)return;
 productList=[];
 try{
  const r=await fetch('/api/storefront-public-catalog',{cache:'no-store'});
  if(!r.ok)return;
  const data=await r.json();
  if(data?.ok===true&&Array.isArray(data.items)){productList=data.items;render()}
 }catch{/* Public navigation works without the catalog feed. */}
}
function show(value=''){
 ensureDialog();dialogInput.value=value;render();
 if(!dialog.open)dialog.showModal();
 dialogInput.focus();dialogInput.select();void loadCatalog();
}
function installSearch(nav){
 if(nav.querySelector('.gu-nav-search'))return;
 // Replace the old decorative "Search site" nav link with a real input.
 nav.querySelectorAll('a,button').forEach(node=>{
  if(node.textContent?.trim().toLowerCase()==='search site')node.remove();
 });
 const wrapper=el('div','gu-nav-search');
 const input=el('input','gu-nav-search-input');
 input.type='search';input.autocomplete='off';input.placeholder='Search site';
 input.setAttribute('aria-label','Search site and products');
 input.setAttribute('aria-keyshortcuts','Control+K Meta+K');
 input.setAttribute('aria-haspopup','dialog');
 const hint=el('kbd','gu-nav-search-hint','Ctrl + K');
 wrapper.append(input,hint);nav.append(wrapper);
 input.addEventListener('input',()=>{hint.hidden=!!input.value});
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();show(input.value)}});
 input.addEventListener('dblclick',()=>show(input.value));
 activeInput=input;
}
function installExclusiveMenus(nav){
 const wallet=nav.querySelector('.gu-nav-sparks'),profile=nav.querySelector('.v11-profile-group');
 if(!wallet||wallet.dataset.guExclusive==='1')return;
 wallet.dataset.guExclusive='1';
 const summary=wallet.querySelector('summary');
 summary?.setAttribute('aria-expanded','false');
 let opening=null,closing=null;
 const clear=()=>{if(opening!==null){clearTimeout(opening);opening=null}
   if(closing!==null){clearTimeout(closing);closing=null}};
 const close=()=>{clear();wallet.open=false;summary?.setAttribute('aria-expanded','false')};
 const open=()=>{clear();
  profile?.classList.remove('open');
  profile?.querySelector('.v12-profile-button')?.setAttribute('aria-expanded','false');
  wallet.open=true;summary?.setAttribute('aria-expanded','true');
 };
 const delayOpen=()=>{clear();opening=setTimeout(open,350)};
 const delayClose=()=>{if(closing!==null)clearTimeout(closing);
  closing=setTimeout(()=>{if(!wallet.matches(':hover')&&!wallet.contains(document.activeElement))close()},480)};
 summary?.addEventListener('click',e=>{e.preventDefault();wallet.open?close():delayOpen()});
 wallet.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')delayOpen()});
 wallet.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')delayClose()});
 wallet.addEventListener('focusin',()=>delayOpen());
 wallet.addEventListener('focusout',e=>{if(!wallet.contains(e.relatedTarget))delayClose()});
 document.addEventListener('click',e=>{if(!wallet.contains(e.target))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&wallet.open){close();summary?.focus()}});
 if(profile){
  const observer=new MutationObserver(()=>{
   if(profile.classList.contains('open'))close();
  });
  observer.observe(profile,{attributes:true,attributeFilter:['class']});
  const btn=profile.querySelector('.v12-profile-button');
  btn?.addEventListener('pointerenter',close);
  btn?.addEventListener('click',close);
 }
}
function mount(){
 const nav=document.querySelector('.site-header .navlinks');
 if(!nav||nav.dataset.v11Owned!=='1')return;
 installSearch(nav);installExclusiveMenus(nav);
}
let scheduled=false;
const schedule=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;mount()})};
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();show(activeInput?.value||'');
 }
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
 mount();new MutationObserver(schedule).observe(document.querySelector('.site-header')||document.body,{childList:true,subtree:true});
},{once:true});
else{mount();new MutationObserver(schedule).observe(document.querySelector('.site-header')||document.body,{childList:true,subtree:true})}
})();