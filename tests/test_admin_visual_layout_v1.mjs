/* Visual regression for Admin density and Founders Commons form fields.
 * Synthetic-only: no account session, network, production browser or payments. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [1600,1024,480]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.setContent(`<!doctype html><html><body>
  <main class="admin-shell"><aside class="admin-sidebar"><nav id="admin-tabs"></nav></aside>
  <section class="admin-main"><div id="admin-app">
    <section class="admin-panel active" data-admin-panel="sparks">
     <div class="admin-heading"><div><h1>Sparks Packages</h1></div></div>
     <div id="admin-sparks-pricing-root" class="admin-grid">
      <div class="sp-price-toolbar"><label class="sp-price-field">Search<input></label><label class="sp-price-field">Category<select><option>All</option></select></label><button>Refresh</button></div>
      <p class="sp-price-note">Sparks information and pricing safeguards</p>
      <p class="sp-price-summary">12 catalog items</p>
      <div class="sp-price-grid"><article class="admin-card sp-price-card"><h3>Ad-free 24 hours</h3><div class="sp-price-fields"><label class="sp-price-field">Spark cost<input></label><label class="sp-price-field">Name<input></label></div></article><article class="admin-card sp-price-card">Ad-free 30 days</article></div>
      <article class="admin-card sp-price-card"><h2>Add a Spark-priced item</h2></article>
     </div>
    </section>
    <section class="admin-panel active" id="admin-products-panel"><section id="admin-products-prelaunch"><div id="admin-prelaunch-list"><article class="admin-card product-admin-card">1</article><article class="admin-card product-admin-card">2</article><article class="admin-card product-admin-card">3</article><article class="admin-card product-admin-card">4</article></div></section></section>
  </div></section></main></body></html>`);
  for(const css of ['assets/css/styles.css','assets/css/admin-platform.css','assets/css/admin-navigation.css','assets/css/admin-products-v01489.css','assets/css/admin-sparks-pricing-v1.css','assets/css/admin-interface-polish-v1.css'])await page.addStyleTag({content:read(css)});
  const metrics=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
   return {root:getComputedStyle(document.querySelector('#admin-sparks-pricing-root')).display,toolbar:rect('.sp-price-toolbar'),notice:rect('.sp-price-note'),summary:rect('.sp-price-summary'),list:rect('.sp-price-grid'),draft:rect('#admin-sparks-pricing-root>.sp-price-card'),products:[...document.querySelectorAll('#admin-prelaunch-list>.product-admin-card')].map(e=>e.getBoundingClientRect().left)};
  });
  assert.equal(metrics.root,'block','Sparks root must not be a column of unrelated widgets');
  assert.ok(metrics.notice.top>=metrics.toolbar.bottom-1,'Sparks description follows toolbar');
  assert.ok(metrics.list.top>=metrics.summary.bottom-1,'Sparks cards follow summary');
  assert.ok(metrics.draft.top>=metrics.list.bottom-1,'New item form follows pricing cards');
  assert.ok(metrics.toolbar.width<=width,'Sparks toolbar must fit viewport');
  const columns=new Set(metrics.products.map(x=>Math.round(x/5)*5)).size;
  assert.equal(columns,width>=1261?3:width>=761?2:1,'Prelaunch cards must form compact readable columns at '+width);
  await page.close();
 }
 for(const width of [1440,980,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.setContent(`<!doctype html><html><body class="gu-founders-page">
   <main class="wrap gu-f600-main"><section class="gu-f600-hero"><div><h1>Founders Commons</h1></div></section>
   <section class="gu-f600-layout"><div class="gu-f600-panel"><h2>Open an official ballot</h2>
    <form><label>Ballot title<input type="text"></label><label>Voting opens<input type="datetime-local"></label><label>Description<textarea rows="3"></textarea></label><button type="submit">Open ballot</button></form>
    </div><div class="gu-f600-panel"><h2>Results</h2></div></section></main></body></html>`);
  for(const css of ['assets/css/styles.css','assets/css/founders-commons-v014178.css','assets/css/admin-founders-layout-v1.css'])await page.addStyleTag({content:read(css)});
  const boxes=await page.evaluate(()=>{
   const form=document.querySelector('.gu-f600-panel form'),label=form.querySelector('label'),input=form.querySelector('input'),panel=document.querySelector('.gu-f600-panel'),r=el=>el.getBoundingClientRect();
   return {direction:getComputedStyle(label).flexDirection,label:r(label).toJSON(),input:r(input).toJSON(),panel:r(panel).toJSON(),form:r(form).toJSON(),scrollWidth:document.documentElement.scrollWidth};
  });
  assert.equal(boxes.direction,'column','Founder label text must be stacked above inputs');
  assert.ok(boxes.input.y>boxes.label.y+5,'Founder input must not overlap its own label');
  assert.ok(boxes.input.right<=boxes.panel.right,'Founder input must stay inside card');
  assert.ok(boxes.scrollWidth<=width+2,'Founders page must not overflow at '+width);
  await page.close();
 }
}finally{await browser.close();}
console.log('PASS: Sparks layout, 3/2/1 product density, Founders form stacking and responsive containment');
