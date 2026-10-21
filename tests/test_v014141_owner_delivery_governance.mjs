// Deployment 01 of 08: status vocabulary, plan provenance and Owner-only private surface.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerReleasePlanV014141} from '../functions/_lib/owner-release-plan-v014141.js';
const server=readFileSync('functions/api/owner-roadmap.js','utf8');
const client=readFileSync('assets/js/owner-roadmap.js','utf8');
const html=readFileSync('owner-roadmap.html','utf8');
const admin=readFileSync('admin.html','utf8');
const delivery=readFileSync('assets/js/admin-delivery-brief.js','utf8');
const statuses=["not_started","research_required","research_complete","planned","in_progress","partially_complete","implemented","testing_required","blocked","owner_review_required","deferred","owner_complete","verified"];
assert.equal(ownerReleasePlanV014141.packages.length,8);
assert.deepEqual(ownerReleasePlanV014141.packages.map(p=>p.number),['01','02','03','04','05','06','07','08']);
assert(ownerReleasePlanV014141.packages.every(p=>/^CORE-\d{4}$/.test(p.roadmapId)));
assert(ownerReleasePlanV014141.packages.every(p=>p.title&&p.scope));
for(const stage of statuses){
 assert(server.includes("'"+stage+"'")||server.includes('"'+stage+'"'),stage+' missing from protected API');
 assert(client.includes("'"+stage+"'")||client.includes('"'+stage+'"'),stage+' missing from browser labels');
 assert(html.includes('value="'+stage+'"'),stage+' missing from filter');
}
assert(server.includes("['verified','research_complete'].includes(status)"));
assert(server.includes('releasePlan:ownerReleasePlanV014141'));
assert(admin.includes('admin-delivery-brief.js'));
assert(admin.includes('admin-delivery-brief.css'));
assert(delivery.includes("fetch('/api/owner-roadmap'"));
assert(delivery.includes("response.status===401||response.status===403"));
assert(delivery.includes("token"));
assert(delivery.includes("cache:'no-store'"));
assert(!delivery.includes('localStorage'));
assert(!delivery.includes('innerHTML'));
assert(!delivery.includes('site_settings'));
assert(html.includes('id="or-release-packages"'));
assert.equal((html.match(/id="or-release-packages"/g)||[]).length,1);
console.log('PASS v0.14.0.141: Owner-only delivery UI, eight source release packages, expanded status contract');
