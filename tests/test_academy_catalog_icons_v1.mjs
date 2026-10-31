/* Visual changes cannot modify course entitlement or checkout. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/js/bootcamp-academy-v014168.js');
const html=read('bootcamp-academy.html'),css=read('assets/css/bootcamp-academy-icons-v1.css');
const imgs={"truth5":"catalyst-analysis.svg","watchlist7":"candidate-quality.svg","scanners10":"volume-analysis.svg","foundations30":"candle-reading.svg","charts45":"chart-structure.svg","risk60":"position-sizing.svg","practicum90":"mfe-mae-review.svg"};
for(const [code,file] of Object.entries(imgs)){
 assert(js.includes(code+":'"+file+"'"));
 assert(existsSync(new URL('../assets/images/skill-illustrations/'+file,import.meta.url)));
}
assert.equal(Object.keys(imgs).length,7);
assert(js.includes("icon.alt=''"));
assert(js.includes("icon.setAttribute('aria-hidden','true')"));
assert(js.includes("const name=node('span',p.title)"));
assert(js.includes("const id=node('span',p.code)"));
assert(js.includes("academy-program--locked"));
assert(js.includes("'store-membership-ondemand-monthly.html'"));
assert(html.includes('assets/css/bootcamp-academy-icons-v1.css'));
assert(html.includes('Boot Camps are not sold individually.'));
assert(css.includes('font-size:clamp(1.4rem,1.65vw,1.75rem)!important'));
assert(css.includes('@media(max-width:570px)'));
assert.doesNotThrow(()=>new Script(js));
console.log('PASS: seven subject icons, compact title, access control and sales disclosure');
