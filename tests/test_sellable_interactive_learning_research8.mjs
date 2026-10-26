/* Product 02 regression: truthful beta Lab coverage + source-grounded
 * educational example. No account credentials, checkout or private keys.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';

const html=readFileSync('store-tool-interactive-learning.html','utf8');
const css=readFileSync('assets/css/store-interactive-learning-v1.css','utf8');
const js=readFileSync('assets/js/store-interactive-learning-v1.js','utf8');
const market=readFileSync('assets/js/store-product-detail-v01484.js','utf8');
const server=readFileSync('functions/api/lab-player-context.js','utf8');

for(const term of ['data-product-code="INTERACTIVE_LEARNING"','store-product-detail-v01484.js',
 'store-interactive-learning-v1.js','store-interactive-learning-v1.css',
 'Fictional','fictional','data-il-coverage','data-il-answer','data-il-check',
 'data-il-feedback','data-il-explain','data-il-practice','data-il-reset',
 'name="order-choice"','type="radio"','role="status"','aria-live="polite"',
 'STT-C-0013','STT-C-0014','STT-C-0016','STT-C-0017',
 'https://www.investor.gov/']){
 assert(html.includes(term),'Missing buyer education or evidence cue: '+term);
}
assert(html.includes('Try again')&&html.includes('Show why this matters'));
assert(css.includes('max-width:390px')&&css.includes('max-width:900px'));
assert(css.includes('prefers-reduced-motion'));
assert(css.includes(':focus-visible'));
assert(!/we guarantee profits?|guaranteed trading profits?|guaranteed execution at a fixed price|certified trading mastery/i.test(html), 'No affirmative investment guarantees or certifications');
assert(html.includes('no guaranteed profits'), 'The educational product must include an explicit non-guarantee disclosure');
assert(!html.includes('checkout.html?type=tool'));
assert(market.includes('INTERACTIVE_LEARNING'));
assert(server.includes("['ONDEMAND_TRAINING','INTERACTIVE_LEARNING']"));
assert(js.includes("request('/api/lab-beta-scope')"));
assert(js.includes("request('/api/lab-release-availability')"));
assert(js.includes('selected.length!==336')&&js.includes('upcoming.length!==83'));
assert(js.includes("betaReady")===false);
assert(!js.includes('localStorage')&&!js.includes('innerHTML')&&!js.includes('/api/checkout'));
assert(js.includes('No score or membership record is created.'));

function makeNode(){
 return {textContent:'',hidden:false,dataset:{},handlers:{},addEventListener(k,cb){this.handlers[k]=cb},
   querySelector(){return null},reset(){},focus(){}};
}
const nodes=Object.fromEntries(['status','coverage','answer','check','explain','practice',
 'reset','attempt','feedback'].map(id=>[id,makeNode()]));
let choice=null,mode='good',hits=[];
nodes.answer.querySelector=()=>choice?{value:choice}:null;
nodes.answer.reset=()=>{choice=null};
const root={querySelector(sel){return nodes[sel.slice(9,-1)]||null}};
const doc={getElementById(id){return id==='interactive-learning-preview'?root:null}};
const response=data=>new Response(JSON.stringify(data),{status:200,
 headers:{'content-type':'application/json'}});
const context={document:doc,console,Set,Object,Response,AbortController,setTimeout,clearTimeout,
 fetch:async url=>{
  hits.push(url);
  if(mode==='outage')throw Error('Service unavailable');
  if(url==='/api/lab-beta-scope')return response({ok:true,selectedForPrebeta:BETA_CANDIDATE_IDS,
    upcoming:BETA_UPCOMING_IDS,targetSelected:336,targetUpcoming:83});
  if(url==='/api/lab-release-availability')return response({ok:true,publishedIds:[],
    guidedBetaIds:[BETA_CANDIDATE_IDS[0],BETA_CANDIDATE_IDS[1],BETA_UPCOMING_IDS[0]]});
  throw Error('Unexpected outbound request '+url);
 }};
runInNewContext(js,context,{filename:'assets/js/store-interactive-learning-v1.js'});
// Public preview does not display assessment questions before the worked explanation.
assert(html.includes('data-il-practice hidden'),'The question must be hidden until Learn is revealed');
nodes.explain.handlers.click();
assert.equal(nodes.explain.hidden,false);
assert.equal(nodes.practice.hidden,false);
choice='market';nodes.check.handlers.click();
assert.match(nodes.feedback.textContent,/not a maximum price/);
assert.equal(nodes.feedback.dataset.state,'remediation');
choice='limit';nodes.check.handlers.click();
assert.match(nodes.feedback.textContent,/may remain completely or partially unfilled/);
assert.equal(nodes.feedback.dataset.state,'correct');
assert.match(nodes.attempt.textContent,/No score or membership record/);
nodes.reset.handlers.click();
assert.match(nodes.attempt.textContent,/ungraded illustrative practice/);
await new Promise(r=>setTimeout(r,5));
assert.match(nodes.coverage.textContent,/selected 336/);
assert.match(nodes.coverage.textContent,/Other site-exclusive teaching is separate/);
assert(hits.includes('/api/lab-beta-scope')&&hits.includes('/api/lab-release-availability'));
console.log('PASS: Interactive Learning beta product taught before answer, ungraded corrected feedback, truthful 336/83 release visibility, source transparency and no checkout bypass.');
