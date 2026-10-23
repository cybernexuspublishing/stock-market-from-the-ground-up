/* Deployment 15 onward — release identity parity with forward-compatible
 * validation. A newer coordinated D16–D18 release must not fail because the
 * original D15 test pinned v0.14.0.155 exactly.
 * Source only; never creates payment, deployment or entitlement.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const manifest=JSON.parse(read('release-manifest.json'));
const commerce=JSON.parse(read('data/commerce-config.json'));
const current=String(manifest.version||'');
const parse=v=>{
 assert.match(v,/^\d+\.\d+\.\d+\.\d+$/,'Four-part version required');
 return v.split('.').map(Number);
};
const compare=(a,b)=>{
 const x=parse(a),y=parse(b);
 for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];
 return 0;
};
assert(compare(current,'0.14.0.155')>=0,'Cannot regress below Deployment 15');
assert.equal(commerce.version,current,'Commerce and public manifest must match');
const config=read('config.js'),route=read('assets/js/route-policy.js'),sw=read('sw.js');
assert(config.includes("VERSION: '"+current+"'"),'Browser configuration version mismatch');
assert(route.includes("version:'"+current+"'"),'Shared route policy version mismatch');
assert(sw.includes('groundup-v'+current.replaceAll('.','')+'-public'),'Service Worker cache must rotate with release');
for(const page of ['admin.html','owner-roadmap.html'])
 assert(read(page).includes('name="application-version" content="v'+current+'"'),
  'Application meta version mismatch: '+page);
assert.equal(manifest.customerCheckoutApproved,false,
 'Customer billing remains locked until separately accepted; update release gate test only with signed production acceptance');
assert.equal(manifest.liveStripeFulfillmentEnabled,false,
 'Source version changes cannot activate paid fulfillment without separate evidence');
assert.equal(manifest.deployment10?.sourceVersion,'v0.14.0.150',
 'Historical Deployment 10 source provenance is immutable');
const shadow=read('assets/js/admin-stripe-shadow-v01439.js');
const query='014'+current.split('.').at(-1).padStart(3,'0');
assert(read('admin.html').includes('admin-stripe-shadow-v01439.js?v='+query),
 'Stripe Admin bundle cache key must track release version');
assert(shadow.includes("window.SITE_CONFIG?.VERSION||'unverified'"),
 'Stripe Admin script cannot silently claim a stale deployment version');
console.log('PASS D15+: version '+current+' consistent across public metadata; paid launch locked');
