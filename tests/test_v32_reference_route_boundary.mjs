/* Guard exact owner v3.2 standalone reference rendering and safe Pages routing. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const middleware=read('functions/_middleware.js');
const route=read('functions/lab-player.js');
const player=read('lab-player.html');
const prototype=read('lab-v32-member.html');
for(const name of ['lab-v32-member','lab-v32-reference']){
 assert(middleware.includes("'/"+name+"'"),'Non-production reference must bypass injected legacy HTMLRewriter: '+name);
 assert(middleware.includes("'/"+name+".html'"),'Explicit HTML endpoint must be protected from legacy injection: '+name);
}
assert(middleware.includes('return response;'),'Middleware must return original unmodified standalone HTML');
assert(route.includes("new Set(['F2-C07-L01','F3-C06-L01'])"),'Server routing scope must remain two reviewed reference IDs');
assert(route.includes("url.searchParams.get('demo')==='1'"),'Official protected v3.3 Lab must be default, requiring explicit demo=1 to preview v3.2');
assert(route.includes('return context.next();'),'All other canonical Labs must keep existing runtime');
assert(route.includes("status:302"),'Two reference routes need deterministic edge redirects');
assert(player.includes("if(args.get('demo')!=='1')return;"),'Client must never substitute demonstration for production unless requested');
assert(prototype.includes('NON-PRODUCTION')&&prototype.includes('Demonstration only'),'Reference may not claim real grading or credit fulfillment');
console.log('PASS v3.2 exact reference Pages routing and legacy middleware isolation');
