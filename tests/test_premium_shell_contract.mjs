/* Premium design integration source-contract regression. Run: node tests/test_premium_shell_contract.mjs */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const theme=read('assets/js/premium-design-v014168.js');
const css=read('assets/css/premium-design-v014168.css');
const dashboard=read('dashboard.html');
const academy=read('bootcamp-academy.html');
const site=read('assets/js/site.js');
const home=read('index.html'),stats=read('assets/js/home-community.js');
assert(!home.includes('assets/js/home-community.js'),'Owner-removed example membership statistics must not be injected into the public homepage');
assert(!read('functions/_middleware.js').includes('home-community.js'),'Edge middleware must not re-inject the owner-removed example statistics');
assert(stats.includes('Example online members')&&stats.includes('Example registered members'),'Example statistics must never appear as real counts');
assert(stats.includes('if(d.show===false)'),'Owner must retain authority to hide statistics');

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
const legacyRenderer=read('assets/js/production-completion.js');
const legacySource=read('src/ts/production-completion.ts');
assert(legacyRenderer.includes("main.classList.contains('gu-premium-home')"),'The deployed legacy renderer must preserve the premium homepage');
assert(legacySource.includes("main.classList.contains('gu-premium-home')"),'TypeScript source must preserve the premium homepage');
assert(home.includes('gu-home-stage-grid')&&home.includes('gu-home-terminal'),'Production homepage must contain actual educational workstation and layout');
assert(home.includes('DEMONSTRATION · NOT LIVE DATA'),'Illustrative charts must be labeled explicitly');
assert(!home.includes('Example online members'),'Do not display invented member activity on authored homepage');
assert(css.includes('gu-home-message h1{font-size:clamp('),'Hero typography must have audited responsive limits');
assert(css.includes('max-width:520px'),'Small phones must have dedicated responsive layout');
assert(dashboard.includes('dashboard.html?tab=billing')&&dashboard.includes('dashboard.html?tab=support'),'Sidebar must retain operational member destinations');
for(const selector of ['.gu-redesign-academy #academy-lab-slot','.gu-redesign-labs #gu-lab-registry-view','.gu-redesign-store .store-category-tabs','.gu-member-dashboard-shell .v1322-member-tabs','.gu-member-dashboard-shell>.gu-member-side-menu'])assert(css.includes(selector),'Missing integrated platform treatment '+selector);
assert(css.includes('prefers-contrast:more'),'High contrast safety must exist');
assert(css.includes('premium-light'),'Light theme override must exist');
const memberController=read('assets/js/dashboard-ui-legacy.js');
assert(memberController.includes("nav.hidden=false;hub.classList.remove('gu-single-member-nav')"),'Dashboard must retain the owner-approved member tab strip alongside the permanent sidebar');
assert(memberController.includes("defs.every(([code])=>sidebarCodes.has(code))"),'Sidebar integration must verify every required member tab');
assert(css.includes('.gu-single-member-nav .v1322-member-tabs[hidden]'),'Legacy suppressed navigation styles must remain scoped to the removed legacy state');
for(const tab of ['access','skills','books','settings','help','support','billing','activity'])assert(dashboard.includes('dashboard.html?tab='+tab),'Sidebar missing authoritative section '+tab);
const metricSource=read('assets/js/member-dashboard.js');
assert(memberController.includes('gu-member-start'),'Dashboard must offer immediate learning actions');
assert(memberController.includes('v1324-summary-grid" hidden'),'Old duplicate entitlement strip must remain hidden');
assert(metricSource.includes("const hero=document.querySelector('.v1321-overview .v132-dashboard-hero')"),'Verified learner metrics must mount beneath welcome header');
assert(metricSource.includes("['Guided Labs'")&&metricSource.includes("['Skills Assessed'"),'Overview metrics must describe verified Guided Labs and assessed skills');
assert(css.includes('.gu-member-dashboard-shell .gu-member-start'),'Learning actions must have responsive layout styling');
console.log('PASS premium shell source contracts');
