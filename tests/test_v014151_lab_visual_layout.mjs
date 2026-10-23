/* D11 source contract for approved chart visibility across guided and reviewed exercises. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/lab-player.js','utf8');
const html=readFileSync('lab-player.html','utf8');
const css=readFileSync('assets/css/lab-learning-layout-v014151.css','utf8');
assert(js.includes('lab-learning-split'), 'Lab player must establish two-column lesson/visual layout');
assert(js.includes('lab-learning-visual'), 'Visual column must remain present during assessment');
assert(js.includes('lab-learning-content'), 'Exercise and graded-question column must be paired to visual');
assert(js.indexOf('lab-learning-visual')<js.indexOf('id="v014-training-slot"'), 'Visual must appear before training slot');
assert(js.includes('portableVisual(lab)'), 'Use only existing approved source visual');
assert(js.includes('No verified chart attached'), 'Never claim a fabricated historical candle chart');
assert(js.includes('visual acceptance'), 'Missing chart must remain an acceptance gap');
assert(html.includes('lab-learning-layout-v014151.css'),'Source lab route must include isolated layout');
assert(css.includes('position:sticky'),'Approved visual remains visible while scrolling desktop questions');
assert(css.includes('max-width:980px'),'Mobile must stack visual and lesson naturally');
assert(css.includes('prefers-reduced-motion'),'Reduced motion policy must be retained');
assert(!js.includes('canvas.fillRect('),'No fabricated historical candles in Lab player');
console.log('PASS D11 lab player preserves licensed/attributed teaching visual beside guided and graded instruction; no chart fabricated');
