/* Visual changes cannot modify course entitlement or checkout. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/js/bootcamp-academy-v014168.js');
const html=read('bootcamp-academy.html'),css=read('assets/css/bootcamp-academy-gallery-v2.css');
const nav=read('assets/js/navigation.js');
const imgs={"truth5":"truth-and-sources.svg","watchlist7":"research-watchlist.svg","scanners10":"market-scanners.svg","foundations30":"trading-foundations.svg","charts45":"chart-reading-setups.svg","risk60":"risk-execution.svg","practicum90":"simulated-practicum.svg"};
for(const [code,file] of Object.entries(imgs)){
 assert(js.includes(code+":'"+file+"'"));
 assert(existsSync(new URL('../assets/images/bootcamp-covers/'+file,import.meta.url)));
}
assert.equal(Object.keys(imgs).length,7);
assert(js.includes("icon.alt=''"));
assert(js.includes("icon.setAttribute('aria-hidden','true')"));
assert(js.includes("const name=node('span',p.title)"));
assert(js.includes("const id=node('span',p.code)"));
assert(js.includes("academy-program--locked"));
assert(js.includes("'store-membership-ondemand-monthly.html'"));
assert(html.includes('assets/css/bootcamp-academy-gallery-v2.css'));
assert(html.includes('class="academy-free-entry academy-free-feature"'));
assert(nav.includes('href="/bootcamp-academy.html">Boot Camps</a>'));
assert(css.includes('repeat(3,minmax(0,1fr))!important'));
assert(css.includes('background:transparent!important'));
assert(css.includes('academy-program-cover'));
assert(css.includes('max-width:100%!important'));
assert(html.includes('Choose a Boot Camp'));
assert(!html.includes('class="academy-free-entry card"'));
assert(html.includes('Boot Camps are not sold individually.'));
assert(css.includes('font-size:clamp(1.4rem,1.65vw,1.75rem)!important'));
assert(css.includes('@media(max-width:600px)'));
assert.doesNotThrow(()=>new Script(js));
console.log('PASS: seven subject icons, compact title, access control and sales disclosure');
