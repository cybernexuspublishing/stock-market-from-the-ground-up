/* Owner-frozen 2026-10-23 v3.2 visual baseline.
 * Exact 8003-byte CSS is required; no heuristic restyling.
 * This is source contract QA, not live screenshot parity or 419-Lab acceptance.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const css=read('assets/css/lab-v32-prototype-exact.css');
const prototype=read('assets/js/lab-v32-prototype-exact.mjs');
const standalone=read('lab-v32-reference.html');
assert.equal(standalone.match(/<style>([\s\S]*?)<\/style>/)?.[1],css,'Reference must embed the complete untouched prototype CSS');
assert.equal(standalone.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1],prototype,'Reference must embed the complete untouched prototype JavaScript');
assert.equal(createHash('sha256').update(standalone).digest('hex'),'1249fe6f2407e6237792ae3ae6817c6e3fe2e0c11ac50418186c8b877d5954aa','Reference must match uploaded full standalone HTML byte-for-byte');
assert(!standalone.includes('src="assets/js/'),'Reference must not depend on externally deployed JavaScript');
assert(!standalone.includes('href="assets/css/'),'Reference must not depend on externally deployed styles');
const member=read('lab-player.html');
const js=read('assets/js/lab-player.js');
const engine=read('assets/js/lab-engine-v32-universal.js');
const visual=read('assets/js/lab-engine-v33-visual.js');
const replay=read('assets/js/lab-v32-synthetic-replay.js');
const hash=createHash('sha256').update(css).digest('hex');
assert.equal(hash,'950c1338e81dbba2917dd6e5a05342374973bfe08031ffe1b32e6d241a0620fd','Owner prototype CSS must be byte-for-byte unchanged');
assert.equal(createHash('sha256').update(prototype).digest('hex'),'b457eaf597d7a7c2dd90d72d2218214c3cab1ae9609f4081a523e9e3a1b367cf','Owner reference JavaScript must be byte-for-byte unchanged');
assert.match(prototype,/function candleChart\(b\)/);
assert.match(prototype,/function replayChart\(\)/);
assert.match(prototype,/function wallet\(\)/);
assert.match(prototype,/function start\(\)/);
assert.match(prototype,/function results\(\)/);
for(const name of ['banner','prototype-bar','toolbar','journey','stage-grid','content','shell']){
 assert(member.includes('class="'+name+'"')||member.includes('class="'+name+' '),'Missing exact prototype shell element: '+name);
}
for(const id of ['player-stage-grid','player-stage-progress','player-mode-trigger','player-mode-menu','player-mode-help','player-progress-value','player-mode-confirm','player-workspace'])
 assert(member.includes('id="'+id+'"'),'Missing required prototype UX control: '+id);
assert(member.indexOf('lab-v32-prototype-exact.css')<member.indexOf('lab-engine-v32-member-bridge.css'),'Owner CSS must load before member adapter');
assert(!member.includes('src="assets/js/lab-v32-prototype-exact.mjs"'),'Never run insecure standalone answer keys as official member grader');
assert(member.includes('lab-v32-synthetic-replay.js'),'Owner reference replay chart must be available as explicit Study Only illustration');
assert(js.includes('serverGuidedAllowed===true')&&js.includes('serverAdvancedAllowed===true'),'Member entitlements must be server-authorized');
assert(js.includes('GroundUpInteractiveTraining'),'Private grading connection must remain');
assert(engine.includes('paintPrototypeProgress'),'Real stage progress must update the original toolbar');
assert(engine.includes('Question Pass Wallet'),'Wallet presentation must remain while server ledger is unavailable');
assert(engine.includes('Live credit balances are withheld'),'No fictional credits must appear as live entitlements');
assert(visual.includes('function candleChart(b,showTable=true)'),'Member candle chart must use original reference visualization');
assert(replay.includes('function replayChart()'),'Reference synthetic replay must retain owner chart');
assert(replay.includes('Study Only')&&replay.includes('fictional'),'Synthetic reference is never graded market history');
for(const [p,s] of [['lab-player.js',js],['lab-engine-v32-universal.js',engine],['lab-engine-v33-visual.js',visual],['lab-v32-synthetic-replay.js',replay]])assert.doesNotThrow(()=>new vm.Script(s),p+' JavaScript syntax');
console.log('PASS owner-exact v3.2 CSS, shell, chart lineage, mode controls and protected member boundaries');
