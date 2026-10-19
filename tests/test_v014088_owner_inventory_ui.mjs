/* v88 isolated DOM: authenticated inventory response -> rendered Owner product tabs.
 * No browser login and no payment or database interaction. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/owner-roadmap-product-inventory-v01488.js',import.meta.url),'utf8');
const node=id=>({id,innerHTML:'',textContent:'',value:'',hidden:false,dataset:{},handlers:{},
 classList:{toggle(){}},
 addEventListener(t,fn){this.handlers[t]=fn},
 querySelector(s){return this.children?.[s]||null},
 scrollIntoView(){this.scrolled=true},focus(){this.focused=true},click(){this.clicked=true}});
const ids=['or-app','or-tool-catalog','or-catalog-tools','or-membership-details','or-catalog-memberships',
'or-membership-matrix','or-catalog-tool-search','or-catalog-tool-summary','or-catalog-membership-summary',
'or-new-task','or-tab-core','or-evidence'];
const els=Object.fromEntries(ids.map(id=>[id,node(id)]));
const title=node('taskTitle'),area=node('taskArea'),detail=node('taskDetail');
els['or-new-task'].children={'[name=title]':title,'[name=area]':area,'[name=detail]':detail};
const document={getElementById(id){return els[id]||null},addEventListener(name,fn){if(name==='DOMContentLoaded')fn()}};
const window={};
vm.runInNewContext(source,{window,document,console}, {filename:'owner-roadmap-product-inventory-v01488.js',timeout:2500});
const w=window.OwnerRoadmapProductsV88;
assert.ok(w&&typeof w.render==='function');
assert.ok(w.isCatalog('tool-inventory')&&w.isCatalog('membership-coverage'));
const data={productInventory:{
 available:true,
 plans:[{plan_code:'FULL_MONTHLY',name:'Full Monthly',description:'Public learning',active:true,public_visible:true,
 price_cents:6999,billing_interval:'month',checkout_enabled:true,includes_all_tools:true,includes_all_books:true,ad_free:false}],
 tools:[{tool_code:'MARKET_TUTOR',name:'Market Tutor',description:'Teach market concepts <private>',
 category:'Education',status:'live',active:true,public_visible:true,individual_price_cents:2999,free_preview:false,href:'market-tutor.html'}],
 explicitAccess:[{plan_code:'FULL_MONTHLY',tool_code:'MARKET_TUTOR'}],
 guides:{plans:{FULL_MONTHLY:{included:['All released tools'],excluded:['Book files and external feed'],learn:['Understand risk and market terms'],terms:'Monthly, cancel under Terms'}},
 tools:{MARKET_TUTOR:{included:['Curriculum grounded guidance'],excluded:['Financial advice'],outcomes:['Explain market structure'],requirements:'First party knowledge context'}}},
 capabilities:[{code:'HISTORICAL_LABS',name:'Historical Labs',category:'Historical practice',description:'Recorded decisions',route:'/labs.html',buildFocus:['Check no-lookahead data rights']}]
}};
w.render(data);
assert.ok(w.isAvailable());
const rendered=els['or-tool-catalog'].innerHTML;
assert.ok(rendered.includes('MARKET_TUTOR'));
assert.ok(rendered.includes('HISTORICAL_LABS'));
assert.ok(rendered.includes('Market Tutor'));
assert.ok(rendered.includes('/market-tutor.html'));
assert.ok(rendered.includes('&lt;private&gt;'),'Untrusted catalog descriptions must be escaped');
assert.ok(rendered.includes('Plan improvement'));
const member=els['or-membership-details'].innerHTML;
assert.ok(member.includes('Full Monthly')&&member.includes('All released tools')&&member.includes('Book files and external feed'));
assert.ok(member.includes('$69.99')&&member.includes('Monthly, cancel under Terms'));
assert.ok(els['or-membership-matrix'].innerHTML.includes('Included — configured'));
assert.ok(els['or-membership-matrix'].innerHTML.includes('Market Tutor'));
assert.ok(els['or-app'].handlers.click,'Task action must be registered once');
els['or-app'].handlers.click({target:{closest(s){return s==='button[data-or-product-task]'?{dataset:{name:'Improve Market Tutor',category:'Premium tool',detail:'Verify no-look-ahead \\nTest access boundaries'}}:null}}});
assert.equal(title.value,'Improve Market Tutor');
assert.equal(area.value,'Premium tool');
assert.ok(detail.value.includes('Test access boundaries'));
assert.ok(els['or-tab-core'].clicked,'Improvement action must return to existing roadmap');
assert.ok(title.focused);
assert.ok(!els['or-new-task'].submitted,'Action cannot silently save a task');
w.render({productInventory:{available:false,error:'Private catalog unavailable.',capabilities:[]}});
assert.ok(!w.isAvailable());
assert.ok(els['or-membership-details'].innerHTML.includes('Private catalog unavailable.'));
assert.ok(!els['or-membership-details'].innerHTML.includes('$69.99'),'Never display stale price after read error');
console.log('PASS v88 rendered tools and supporting routes, full plan terms, mapped matrix, safe escaping, editable unsaved roadmap task, fail-closed catalog.');
