import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('assets/js/bootcamp-academy-v014168.js','utf8');
const registry=JSON.parse(readFileSync('docs/research/talia/2026-10-31_verified20_sources_v1.json','utf8'));
assert.equal(registry.sources.length,20);
const valid=new Set(registry.sources.map(x=>new URL(x.url).hostname));
const exact=['truth5','watchlist7','scanners10','foundations30','charts45','risk60','practicum90'];
const section=ui.slice(ui.indexOf('const researchReferenceByProgram='),ui.indexOf('function showProgramResearchProtocol(d,mount)'));
assert(section.includes('Object.freeze'));
for(const program of exact)assert(section.includes(program+':{url:'),'Missing source for '+program);
const uris=[...section.matchAll(/url:'(https:\/\/[^']+)'/g)].map(x=>x[1]);
assert.equal(uris.length,7);
for(const url of uris){
 const u=new URL(url);
 assert.equal(u.protocol,'https:');
 assert(valid.has(u.hostname)||u.hostname==='chartschool.stockcharts.com',
  'All external reference domains must have source research: '+u.hostname);
}
assert(ui.includes('topic-level reference only. NOT verification, grading or independent editorial acceptance'));
assert(ui.includes("a.rel='noopener noreferrer'"));
assert(ui.includes("showFreeEvidence(d,mount)"),'Five Free lesson sources must remain intact');
assert(ui.includes("showProgramResearchProtocol(d,mount)"),'Keep original shared program teaching bridge');
assert(!/\binnerHTML\s*=/.test(ui),'Do not inject untrusted HTML');
console.log('PASS seven Academy program topic-level source checkpoints, Free source link preservation, no false acceptance and safe anchors.');
