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
// Verify Founder Lab handoff and sign-in return-to-Lab contract against actual registry source.
const registry=readFileSync('assets/js/lab-registry.js','utf8');
assert(registry.includes("params.get('q')||params.get('lab')||params.get('open')||''"),
 'Founder deep-link alias must open the requested Lab');
const preservedRedirect="location.replace('signin.html?next='+encodeURIComponent('/labs.html'+location.search+location.hash))";
assert.equal(registry.split(preservedRedirect).length-1,2,
 'Both signed-out registry redirects must preserve Lab selection in same-origin next URL');
assert(registry.includes("const record=await client.from('platform_labs')"),
 'The selected Lab must still resolve through the authenticated canonical registry');
assert(registry.includes(".eq('active',true).eq('registry_visible',true)"),
 'Direct-link lookup must reject archived or nonvisible Lab metadata');
const inline=readFileSync('assets/js/labs-inline.js','utf8');
assert(inline.includes("new URLSearchParams(location.search).get('open')"),
 'The original v3.2/v3.3 inline host must recognize Founder links');
assert(inline.includes("document.body.classList.add('gu-inline-lab-active')"),
 'The inline host must announce when it owns the workstation');
assert(registry.includes("if(document.body.classList.contains('gu-inline-lab-active'))"),
 'The secondary collection renderer must not remove an already-open inline Lab');
assert(registry.includes("document.getElementById('v011-lab-registry-gate')?.remove();"),
 'The authenticated inline Lab must not be left behind the temporary registry visibility gate');
for(const term of ['sign out','unsaved','book not owned','Teach, then assess','keyboard','Support','never counted as a pass'])
 assert(html.toLowerCase().includes(term.toLowerCase()),'Missing pre-beta instruction '+term);
assert.doesNotMatch(html,/beta participation (automatically|guarantees) (?:passes|certifies|unlocks)/i);
console.log('PASS Gate 1 Founder private beta handoff: truth5 five-day and cross-book B01 steps, access and safe reporting.');
