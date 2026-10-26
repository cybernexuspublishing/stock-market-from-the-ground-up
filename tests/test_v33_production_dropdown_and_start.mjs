/* Guard owner-corrected Learning v3.3 production experience.
 * No real member account, grades, replay history, credit or payment writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const player=read('lab-player.html');
const source=read('assets/js/lab-player.js');
const engine=read('assets/js/lab-engine-v32-universal.js');
const css=read('assets/css/lab-v32-prototype-exact.css');
const route=read('functions/lab-player.js');
const middleware=read('functions/_middleware.js');
assert(player.includes('LEARNING ENGINE v3.3'),'Production must say Learning Engine v3.3, not reference 3.2');
assert(player.includes('id="player-mode-trigger"')&&player.includes('id="player-mode-menu"'),'Mode selector and dropdown must be present');
assert(player.includes('aria-haspopup="menu"'),'Learning selector must expose menu semantics');
assert(css.includes('.toolbar>.mode-menu{position:absolute'),'Popover must overlay, not push lesson below viewport');
assert(css.includes('max-height:min(65vh,420px)'),'Popover must have bounded scroll height');
assert(engine.includes("el('h3','Historical Lab Setup')"),'Original book/chart setup must be visible on first learning stage');
assert(engine.includes("lab?.ticker")&&engine.includes("lab?.date"),'Display only authorized source fields');
assert(engine.includes("el('summary','Where these chart examples come from')")&&
 engine.includes('A historical chart must match the named ticker, date, time, source and verified prices.')&&
 engine.includes('Practice examples are not live quotes or guaranteed trade outcomes.'),
 'Do not claim simulated candle values as authenticated ticker history; keep member-readable provenance visible');
assert(engine.includes('setupTimeframe'),'Historical source setup must display the authorized interval even when its separate timeframe field is blank');
assert(!source.includes('await window.SiteAccess?.get?.()'),'Do not wait on unrelated legacy entitlement RPC before first lesson');
assert(source.includes('serverGuidedAllowed===true')&&source.includes('serverAdvancedAllowed===true'),'Preserve server-issued access and mode rights');
assert(source.includes("event.key==='Escape'"),'Keyboard users must be able to close Learning Mode menu');
assert(source.includes('gu-v32-teaching-slot')&&source.includes('gu-ws-member-workbench'),'Both teaching and protected decision workbench must remain accessible');
assert(route.includes("url.searchParams.get('demo')==='1'"),'Fictional v3.2 must require deliberate preview, never auto-redirect production');
assert(!route.includes("url.searchParams.get('official')!=='1'"),'Default production route must not return to old reference');
assert(!middleware.includes("'/lab-player','/lab-player.html'].includes(path))return response"),'Production must receive the common site navigation and header enhancement pipeline');
assert(player.includes('class="site-header"')&&player.includes('class="navlinks"'),'Production Lab must retain the same website header and navigational chrome');
assert(player.includes('lab-v33-site-shell.css'),'Production Lab should isolate lesson styles from shared header');
assert(middleware.includes("lab-v33-site-shell.css"),'Shared site middleware must add Lab shell CSS after other sitewide sheets');
assert(middleware.includes('const mfaDenied=await staffMfaBoundary')&&middleware.includes('const paymentDenied=await paymentModeBoundary'),'Global security guards must remain');
assert.doesNotThrow(()=>new Script(source), 'Player JS must parse');
assert.doesNotThrow(()=>new Script(engine), 'Shared learning JS must parse');
// Assessment readiness must be verified on the protected API before any
// initial deep link, unlocked mode change or post-lock restart can proceed.
assert(player.includes('id="player-mode-availability"'));
assert(source.includes("await assessmentModeReady('assessment')"));
assert(source.includes('if(!(await assessmentModeReady(next))'));
assert(source.includes('const ready=await assessmentModeReady(destination)'));
let responseBody={ok:true,available:false,questionCount:0},httpOK=true;
const readinessPanel={hidden:true,textContent:''};
const sandbox=createContext({
 window:{addEventListener(){}},
 document:{getElementById:id=>id==='player-mode-availability'?readinessPanel:null,addEventListener(){}},
 fetch:async()=>({ok:httpOK,json:async()=>responseBody}),
 AbortController,setTimeout,clearTimeout,encodeURIComponent,console
});
new Script(source).runInContext(sandbox);
new Script("PLAYER.lab={id:'F2-C07-L01'};PLAYER.access={serverAdvancedAllowed:true,sb:{auth:{getSession:async()=>({data:{session:{access_token:'TEST_ONLY'}}})}}};").runInContext(sandbox);
const evaluate=expression=>new Script(expression).runInContext(sandbox);
assert.equal((await evaluate('verifiedAssessmentAvailability()')).ready,false,'Draft banks cannot release assessment');
assert.equal(await evaluate("assessmentModeReady('assessment')"),false);
assert.match(readinessPanel.textContent,/no Owner-reviewed question bank/);
assert.equal(readinessPanel.hidden,false);
responseBody={ok:true,available:true,questionCount:3};
assert.equal(await evaluate("assessmentModeReady('assessment')"),true);
assert.equal(readinessPanel.hidden,true);
httpOK=false;
assert.equal(await evaluate("assessmentModeReady('assessment')"),false,'API failures must not release assessment');
assert.match(readinessPanel.textContent,/could not verify/);
assert.equal(await evaluate("assessmentModeReady('guided')"),true,'Guided teaching cannot require reviewed assessment');
console.log('PASS Learning v3.3 is production default; compact dropdown, first-stage setup, no hanging optional entitlements, preserved protected boundaries');
