/* Local source test: never submits a password, verifies a CAPTCHA or changes
 * provider secrets. Canonical host movement occurs BEFORE loading a widget.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const whole=readFileSync(new URL('../assets/js/site.js',import.meta.url),'utf8');
const split=whole.indexOf('/* v0.14.0.32 — preserve established routes');
assert(split>0,'Source bootstrap marker missing');
const authBootstrap=whole.slice(0,split);
function load(host,pathname){
 let redirected='',widgets=0;
 const location={hostname:host,pathname,search:'?next=%2Fdashboard.html',hash:'#review',
  replace:url=>{redirected=url}};
 const document={querySelector:()=>null,createElement:tag=>({tagName:tag,dataset:{}}),
  head:{append:el=>{if(el?.src?.includes('turnstile-auth.js'))widgets++}},addEventListener:()=>{}};
 runInNewContext(authBootstrap,{location,document,window:{}});
 return {redirected,widgets};
}
const yahoo='stock-market-from-the-ground-up-d1r.pages.dev';
const legacy='stock-market-from-the-ground-up.pages.dev';
const preview='7fd1283a.'+yahoo;
for(const page of ['/signin','/signin.html','/create-account','/create-account.html']){
 for(const host of [legacy,preview]){
  const result=load(host,page);
  assert.equal(result.redirected,'https://'+yahoo+page+'?next=%2Fdashboard.html#review');
  assert.equal(result.widgets,0,'Never issue a CAPTCHA from an unapproved host');
 }
 const live=load(yahoo,page);
 assert.equal(live.redirected,'');
 assert.equal(live.widgets,1,'Yahoo canonical page loads the existing managed widget normally');
}
assert.equal(load(legacy,'/labs.html').redirected,'','Only authentication pages redirect');
assert.equal(load('localhost','/signin').redirected,'','Never redirect local test host to production');
console.log('PASS Yahoo auth hostname: legacy/preview signin and signup migrate before Turnstile; canonical and other routes preserved');
