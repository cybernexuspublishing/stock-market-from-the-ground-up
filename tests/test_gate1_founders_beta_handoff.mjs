// Existing Founder-only Beta Test Center: Gate 1 should be an extension,
// never a second public tester app or a bypass of entitlement/assessment gating.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('founders-commons.html','utf8');
assert.match(html,/<body[^>]*data-auth-required="true"/);
assert.match(html,/id="gu-f600-gate1"/);
assert.match(html,/id="gu-f600-content" hidden/);
assert(html.includes('Founding membership or authorized beta access required'));
assert(html.includes('time-limited Owner-authorized educational beta pass'));
assert(html.includes('Get private beta-access help'));
const commonsClient=readFileSync('assets/js/founders-commons-v014178.js','utf8');
assert(commonsClient.includes("gu_founder_noncommercial_qa_v014289"),'The Owner QA pass must use the installed protected access RPC');
assert(commonsClient.includes('Temporary 30-day learning QA access'),'A QA account cannot be misrepresented as a paid Founder');
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
for(const term of ['sign out','unsaved','book not owned','Teach, then assess','keyboard','Support','unavailable activity is ever counted as a pass'])
 assert(html.toLowerCase().includes(term.toLowerCase()),'Missing pre-beta instruction '+term);
assert.doesNotMatch(html,/beta participation (automatically|guarantees) (?:passes|certifies|unlocks)/i);
assert(html.includes('Founding Member testing is open for accessible Guided Beta lessons'),
 'Founder guidance must no longer make reviewed assessment approval a prerequisite for beta practice');
assert(html.includes('other source-backed Labs in the selected 336'),
 'Founder guidance must cover the pre-beta target, not solely the original B01');
assert(html.includes('Guided Beta is ungraded'),
 'Beta learning must never claim official grade credit before rubric publication');
console.log('PASS Gate 1 Founder private beta handoff: truth5 five-day and cross-book B01 steps, access and safe reporting.');
