import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ownerAudit20261028} from '../functions/_lib/owner-roadmap-audit-20261028.js';
const audit=ownerAudit20261028;
assert.equal(audit.documentId,'SMFGU-WEB-ROADMAP-AUDIT-20261028-01');
assert.equal(audit.items.length,10);
assert.equal(new Set(audit.items.map(x=>x.id)).size,10);
for(const item of audit.items){
 assert(item.title&&item.evidence&&item.nextCheck&&item.status);
 assert(!/production.accepted|fully certified/i.test(item.status));
}
const html=readFileSync('owner-roadmap.html','utf8');
const api=readFileSync('functions/api/owner-roadmap.js','utf8');
const ui=readFileSync('assets/js/owner-roadmap.js','utf8');
assert.match(html,/id="or-current-audit"/);
assert.match(api,/currentAudit:ownerAudit20261028/);
assert.match(ui,/renderCurrentAudit\(data.currentAudit\)/);
const css=readFileSync('assets/css/member-profile-v1.css','utf8');
assert.match(css,/grid-template-columns:220px minmax\(0,1fr\)/);
assert.match(css,/>\.gu-member-side-menu\{display:block!important/);
assert.doesNotMatch(css,/>\.gu-member-side-menu\{display:none!important/);
const dash=readFileSync('assets/js/member-dashboard.js','utf8');
for(const token of ['lab-release-availability','trainingOnlyIds','INTERACTIVE_LEARNING','ONDEMAND_TRAINING','Guided Labs'])
 assert(dash.includes(token));
assert(!dash.includes("'Available with your current access'"));
const avatar=readFileSync('assets/js/dashboard-profile-avatar-v4.js','utf8');
assert(avatar.includes('/api/member-profile'));
assert(existsSync('assets/avatars/av-n6.webp'));
const about=readFileSync('about.html','utf8');
assert.match(about,/Tiingo market-data account/);
assert.match(about,/Alpaca market-data account \(IEX coverage\)/);
assert.match(about,/not the full consolidated U.S. market/);
console.log('PASS Oct 28 roadmap audit, accurate dashboard release counts, saved avatar layout, scoped provider copy and preserved Owner status boundaries');
