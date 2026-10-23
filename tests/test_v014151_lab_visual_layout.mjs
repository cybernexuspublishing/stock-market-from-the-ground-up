/* D11/D18 source contract: approved visual remains reachable without crowding
 * the single v3.2/v3.3 workstation. Absence never becomes fabricated history. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/lab-player.js','utf8');
const html=readFileSync('lab-player.html','utf8');
const oldCss=readFileSync('assets/css/lab-learning-layout-v014151.css','utf8');
const css=readFileSync('assets/css/lab-engine-v33-workstation.css','utf8');
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
assert(html.includes('lab-learning-layout-v014151.css'),'Legacy approved visual rules must remain loaded');
assert(html.includes('lab-engine-v33-workstation.css'),'The integrated workstation styling must be loaded after existing rules');
assert(css.includes('.gu-v33-journey'),'Learning stages must use compact dark styles');
assert(css.includes('@media(max-width:740px)'),'Small screens must stack without oversized split panels');
assert(css.includes('prefers-reduced-motion'),'Respect reduced motion');
assert(oldCss.includes('prefers-reduced-motion'),'Retain existing accessible visual behavior');
assert(!js.includes('canvas.fillRect('),'Never fabricate a historical market chart');
console.log('PASS D11/D18 shared Lab workstation, source/chart integrity and responsive layout');
