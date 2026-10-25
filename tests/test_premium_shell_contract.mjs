/* Premium design integration source-contract regression. Run: node tests/test_premium_shell_contract.mjs */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const theme=read('assets/js/premium-design-v014168.js');
const css=read('assets/css/premium-design-v014168.css');
const dashboard=read('dashboard.html');
const academy=read('bootcamp-academy.html');
const site=read('assets/js/site.js');
assert(theme.includes("if(isAdmin){try{const saved=sessionStorage.getItem(KEY)"),'Private Owner theme previews must not leak into public browsing');
assert(theme.includes("app.querySelector('.gu-design-picker')"),'Owner theme picker must not mount twice');
assert(theme.includes('new MutationObserver('),'Async Admin rendering must mount the existing design controls');
assert(theme.includes("method:'POST'")&&theme.includes("expectedRevision:"),'Theme activation must preserve authenticated revision-checked backend');
assert(dashboard.includes('href="bootcamp-academy.html"'),'Dashboard must link to canonical Boot Camp Academy');
assert(dashboard.includes('href="dashboard.html?tab=books"'),'Member books sidebar must use the existing account tab');
assert(academy.includes('assets/js/lab-engine-v32-universal.js'),'Academy must retain the shared Lab engine');
assert(site.includes('premium-design-v014168.css')&&site.includes('premium-design-v014168.js'),'Sitewide premium enhancement must load centrally');
assert(css.includes('html[data-gu-design="premium-light"]')&&css.includes('html[data-gu-design="premium-dark"]'),'Both Owner-approved modes must exist');
assert(css.includes('#academy-lab-slot')&&css.includes('#gu-v32-teaching-slot'),'Shared visual styling must cover Academy and Labs');
assert(css.includes('@media(forced-colors:active)'),'Selected navigation must remain visible with forced colors');
for(const [name,file,marker] of [
 ['Learning System','learn.html','gu-redesign-learn'],
 ['Lab Registry','labs.html','gu-redesign-labs'],
 ['Store','store.html','gu-redesign-store'],
 ['Academy','bootcamp-academy.html','gu-redesign-academy'],
 ['Dashboard','dashboard.html','gu-dashboard-quick'],
 ['Homepage','index.html','gu-home-terminal']
])assert(read(file).includes(marker),name+' must use the integrated premium page composition');
assert(css.includes('.gu-redesign-store .store-category-tabs'),'Marketplace tabs must retain an accessible category layout');
assert(css.includes('.gu-redesign-academy .academy-program'),'Academy cards must use shared premium styling');
assert(css.includes('.gu-release-actions'),'New page entry actions must be responsive');
console.log('PASS premium shell source contracts');
