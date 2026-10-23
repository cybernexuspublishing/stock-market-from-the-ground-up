/* Byte-controlled v3.2 member reference derived from owner-approved original.
 * Prevents silently replacing the working engine with superficial lookalikes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ref=readFileSync('lab-v32-reference.html','utf8');
const member=readFileSync('lab-v32-member.html','utf8');
const player=readFileSync('lab-player.html','utf8');
const source='let S=fresh();';
const replacement=`// The exact owner v3.2 engine remains intact; the entry Lab is chosen
// from two verified, public, fictional reference subjects only.
const referenceLabParam=new URLSearchParams(location.search).get('lab');
let S=fresh(referenceLabParam==='F3-C06-L01'||referenceLabParam==='vwap'?'vwap':'candlestick');`;
assert.equal(ref.split(source).length-1,1,'Reference must expose precisely one initialization entrypoint');
assert.equal(member,ref.replace(source,replacement),'Member demonstration must keep every original prototype line intact except entry Lab selection');
assert(member.includes('function replayChart()')&&member.includes('function creditControl()'),'Charts and wallet control must be the actual v3.2 implementation');
assert(member.includes('function assess()')&&member.includes('function review()')&&member.includes('function transfer()')&&member.includes('function results()'),'Full learning and feedback operations required');
assert(member.includes('NON-PRODUCTION')&&member.includes('Simulated'),'Cannot misrepresent imaginary credits, prices, chart evidence or grading');
assert(player.includes('lab-v32-member.html?lab='),'Known reference routes must load actual prototype');
assert(player.includes("if(args.get('demo')!=='1')return;"),'Latest v3.3 official Lab must be default; v3.2 demo only with explicit opt-in');
for(const id of ['F2-C07-L01','F3-C06-L01'])assert(player.includes(id),'Missing reference mapping '+id);
console.log('PASS original v3.2 HTML is exact except tested Lab selector; production member grading route remains separate');
