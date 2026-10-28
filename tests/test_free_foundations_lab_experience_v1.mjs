/* Free Foundations Lab-method sampler contract: 5 original, fictional topics. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const src=read('assets/js/free-foundations-lab-experience-v1.js');
const app=read('assets/js/bootcamp-academy-v014168.js');
const html=read('bootcamp-academy.html');
const css=read('assets/css/free-foundations-lab-experience-v1.css');
const context=vm.createContext({Object,Number,Error});
vm.runInContext(src,context,{filename:'free-foundations-lab-experience-v1.js'});
const bridge=context.GroundUpFreeLabExperienceV1;
assert.equal(typeof bridge?.mount,'function');
assert.deepEqual(Object.keys(bridge.lessons).map(Number),[1,2,3,4,5]);
for(const [day,row] of Object.entries(bridge.lessons)){
 for(const key of ['title','focus','observe','decision','review','extended'])
  assert(row[key].length>=40,`Day ${day} missing substantive ${key}`);
 assert(!/guaranteed (profit|fill|return)/i.test(row.review));
}
assert(html.includes('free-foundations-lab-experience-v1.js'));
assert(html.includes('free-foundations-lab-experience-v1.css'));
assert(app.includes('GroundUpFreeLabExperienceV1?.mount?.(d.day,panels[3],panels[8])'));
assert(src.includes('Basic Historical Replay Setup'));
assert(src.includes('Original fictional educational example'));
assert(src.includes('FICTIONAL'));
assert(src.includes('No such dataset is represented by this fictional sample'));
assert(src.includes('No grade or server record was created'));
assert(!/\bfetch\s*\(|\.rpc\s*\(|\/api\/|checkout\.html/.test(src),
 'Free-only preview must not access privileged APIs or payments');
assert(css.includes('max-width:680px'));
const watchlist=read('free-watchlist.html');
const simulator=read('simulator.html');
assert(watchlist.includes('Learn it first. Practice your own research decision.'));
assert(watchlist.includes('bootcamp-academy.html?program=free5&amp;day=4'));
assert(simulator.includes('Talia’s Lab method: learn, set up, pause, decide, review'));
assert(simulator.includes('bootcamp-academy.html?program=free5&amp;day=3'));
assert(simulator.includes('paying does not create unavailable market history'));

console.log('PASS five Free Foundations Lab-method samples and accurate Free-to-Full-Lab entitlement boundaries');
