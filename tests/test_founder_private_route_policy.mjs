/* Founder routes are private across middleware, shared route policy and Service Worker.
 * Local source-only regression; real authorized member sessions remain a separate gate.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const scope={};
runInNewContext(read('assets/js/route-policy.js'),{globalThis:scope});
const routes=['founders-commons','founder-benefits','founder-extended-path',
 'founder-learning-studio','founder-legacy'];
for(const name of routes){
 for(const path of ['/'+name,'/'+name+'.html','/'+name+'.html?topic=safe']){
  assert.equal(scope.GroundUpRoutePolicy.classify(path),'member',path);
  assert.equal(scope.GroundUpRoutePolicy.isProtected(path),true,path);
 }
}
for(const path of ['/index.html','/store.html','/membership.html']){
 assert.equal(scope.GroundUpRoutePolicy.isProtected(path),false,path+' stays public');
}
const sw=read('sw.js'),middleware=read('functions/_middleware.js');
assert(sw.includes('if(POLICY.isProtected(p))'));
assert(sw.includes("fetch(req,{cache:'no-store'})"));
assert(middleware.includes("result.headers.set('cache-control','private, no-store, max-age=0')"));
assert(middleware.includes('data-auth-required'));
console.log('PASS Founder routes: private middleware classification and network-only cache path');
