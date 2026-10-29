/* Source-only educational reconciliation regression. No accounts, payments,
 * historical feed, proprietary strategy or official grades are touched. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const syntax=[
 'assets/js/lab-v33-instruction-content.js',
 'assets/js/bootcamp-academy-v014168.js',
 'assets/js/free-watchlist-v1.js',
 'assets/js/advanced-tools.js',
 'assets/js/journal-guided-v2.js',
 'functions/_lib/bootcamp-academy-v014168.js'
];
for(const file of syntax){
 execFileSync(process.execPath,['--check',new URL('../'+file,import.meta.url).pathname],{stdio:'pipe'});
}
const tutor={};
vm.runInNewContext(read('assets/js/lab-v33-instruction-content.js'),{globalThis:tutor},{timeout:3000});
const teach=tutor.GroundUpLabV33InstructionContent;
assert.equal(typeof teach?.lesson,'function','Shared Lab must still teach');
const subjects=new Map([
 ['Trade plan and stop-loss','tradeplan'],
 ['Earnings catalyst and issuer source','catalyst'],
 ['Dip and rip high-of-day breakout','momentum'],
 ['Market liquidity and slippage','liquidity'],
 ['Journal review of an unfilled order','journal'],
 ['Candlestick anatomy','candle'],
 ['VWAP reclaim','vwap'],
 ['Advanced watchlist construction','watchlist']
]);
for(const [concept,domain] of subjects){
 const r=teach.lesson({concept,stage:1});
 assert.equal(r.category,domain,concept);
 assert.ok(r.blocks.length>=3,concept+' must teach before asking');
 assert.ok(r.worked.length>=2,concept+' must include an original worked example');
 assert.ok(r.limitation,concept+' needs limitation');
 assert.ok(r.check?.question,concept+' needs an ungraded self-check');
 assert.equal(r.check.choices.length,2,concept+' needs answer alternatives');
}
const academy=read('functions/_lib/bootcamp-academy-v014168.js');
const academyUI=read('assets/js/bootcamp-academy-v014168.js');
assert.match(academy,/researchExtensions/);
assert.match(academy,/researchEnrichment:researchFor\(topic,objective\)/);
assert.match(academy,/researchEnrichment:researchFor\(entry\.title,entry\.objective/);
assert.match(academyUI,/if\(d\.researchEnrichment\)/);
assert.match(academyUI,/node\('h4',x\.theme\)/);
assert.match(academyUI,/not an official assessment or a verified historical example/);
const free=read('free-watchlist.html'),freeUI=read('assets/js/free-watchlist-v1.js');
assert.match(free,/id="free-research-prepare"/);
assert.match(freeUI,/const parts=fields\.map/);
assert.match(freeUI,/combined\.length>600/);
assert.match(freeUI,/request\(\{action,symbol,researchNote,sourceNote/);
const advanced=read('assets/js/advanced-tools.js');
for(const gate of ['source','structure','liquidity','invalidation'])assert.ok(advanced.includes("w-gate-"+gate));
assert.match(advanced,/researchGates/);
assert.match(advanced,/READY.*Object\.values\(researchGates\)/);
const journal=read('assets/js/journal-guided-v2.js');
assert.match(journal,/Relied on unverified catalyst/);
assert.match(journal,/original trade thesis/);
const cards=JSON.parse(read('data/tutor-video-transcript-research-v1.json'));
assert.equal(cards.guides?.length,14,'Existing research Tutor must remain intact');
assert.equal(new Set(cards.guides.map(x=>x.code)).size,14);
assert.equal(cards.guides.filter(x=>x.supplemental===true).length,14);
console.log('Sitewide STT instructional reconciliation passed: Lab teaching, Academy, watchlists, Journal and 14 Tutor guides.');
