// Existing Founder-only Beta Test Center: Gate 1 should be an extension,
// never a second public tester app or a bypass of entitlement/assessment gating.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('founders-commons.html','utf8');
assert.match(html,/<body[^>]*data-auth-required="true"/);
assert.match(html,/id="gu-f600-gate1"/);
assert.match(html,/id="gu-f600-content" hidden/);
assert.match(html,/bootcamp-academy\.html\?program=truth5/);
for(const id of ['F1-C02-L01','F2-C01-L01'])assert(html.includes('labs.html?open='+id));
for(const term of ['sign out','unsaved','book not owned','Teach, then assess','keyboard','Support','not counted as a pass'])
 assert(html.toLowerCase().includes(term.toLowerCase()),'Missing pre-beta instruction '+term);
assert.doesNotMatch(html,/beta participation (automatically|guarantees) (?:passes|certifies|unlocks)/i);
console.log('PASS Gate 1 Founder private beta handoff: truth5 five-day and cross-book B01 steps, access and safe reporting.');
