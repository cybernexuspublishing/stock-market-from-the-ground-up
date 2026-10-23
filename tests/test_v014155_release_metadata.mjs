/* D15 release ID parity; historical Deployment 10 record remains immutable.
 * Static source test: never creates payments, deployments or grants.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const version='0.14.0.155';
const manifest=JSON.parse(read('release-manifest.json'));
const commerce=JSON.parse(read('data/commerce-config.json'));
const config=read('config.js');
const sw=read('sw.js');
const route=read('assets/js/route-policy.js');
assert.equal(manifest.version,version);
assert.equal(commerce.version,version);
assert.match(config,/VERSION:\s*'0\.14\.0\.155'/);
assert.match(route,/version:'0\.14\.0\.155'/);
assert.match(sw,/groundup-v0140155-public/);
for(const page of ['admin.html','owner-roadmap.html'])
 assert.match(read(page),/name="application-version" content="v0\.14\.0\.155"/);
assert.equal(manifest.customerCheckoutApproved,false,'Version synchronization must not authorize charging');
assert.equal(manifest.liveStripeFulfillmentEnabled,false,'Version synchronization must not authorize billing fulfillment');
assert.equal(manifest.deployment10?.sourceVersion,'v0.14.0.150','Historical release provenance must not be falsified');
console.log('PASS D15: release identifiers synchronized; no paid-launch activation');
