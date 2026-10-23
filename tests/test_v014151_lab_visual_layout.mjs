/* D11/D18 source contract: approved visual remains reachable without crowding
 * the single v3.2/v3.3 workstation. Absence never becomes fabricated history. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/lab-player.js','utf8');
const html=readFileSync('lab-player.html','utf8');
const oldCss=readFileSync('assets/css/lab-learning-layout-v014151.css','utf8');
const css=readFileSync('assets/css/lab-v32-prototype-exact.css','utf8');
const bridge=readFileSync('assets/css/lab-engine-v32-member-bridge.css','utf8');
assert(js.includes('class="gu-ws"'),'Lab player must use the shared, compact workstation');
assert(js.includes('gu-ws-disclosures'),'Chart status and references should be grouped into expandable panels');
assert(js.includes('gu-ws-source'),'The historical visual/source panel must remain accessible');
assert(js.includes('lab-learning-visual'),'Existing approved visual must remain available');
assert(js.includes('gu-v32-teaching-slot'),'Shared teaching must be the primary member journey');
assert(js.includes('gu-ws-member-workbench'),'Existing protected decision and assessment controls must remain available');
assert(js.indexOf('lab-learning-visual')<js.indexOf('id="v014-training-slot"'),'Visual source panel must precede assessment');
assert(js.includes('portableVisual(lab)'),'Use only authorized source visuals');
assert(js.includes('No verified chart attached'),'Never portray hypothetical charts as historical proof');
assert(js.includes('visual acceptance'),'Unverified charts remain an editorial acceptance gap');
assert(html.includes('lab-v32-prototype-exact.css'),'Original approved visual layout must come from owner-supplied prototype');
assert(html.includes('lab-engine-v32-member-bridge.css'),'Protected member controls must use isolated bridge styles');
assert(css.includes('.stage-grid'),'Learning stages must use owner-original dark grid');
assert(css.includes('@media(max-width:730px)'),'Small screens must stack without oversized split panels');
assert(css.includes('prefers-reduced-motion'),'Respect reduced motion');
assert(bridge.includes('focus-visible'),'Authenticated member controls must retain keyboard focus');
assert(oldCss.includes('prefers-reduced-motion'),'Retain existing accessible visual behavior');
assert(!js.includes('canvas.fillRect('),'Never fabricate a historical market chart');
console.log('PASS D11/D18 shared Lab workstation, source/chart integrity and responsive layout');
