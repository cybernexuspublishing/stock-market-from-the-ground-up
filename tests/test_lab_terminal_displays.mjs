import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.attrs={};this.innerHTML='';}
 append(...nodes){this.children.push(...nodes)}
 setAttribute(k,v){this.attrs[k]=v}
}
function load(source){const c={document:{createElement:n=>new Element(n),createTextNode:t=>({textContent:t})}};vm.runInNewContext(source,c);return c.GroundUpLabV33Contextual;}
const file='assets/js/lab-v33-contextual-visuals.js';
const before=load(execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'}));
const after=load(readFileSync(file,'utf8'));
const flatten=n=>[n,...(n.children||[]).flatMap(flatten)];
let checked=0;
for(const type of ['structure','ema','vwap','volume'])for(const stage of [1,3,7]){
 const old=flatten(before.create({type,stage})).find(n=>n.className==='gu-l33-chart').innerHTML;
 const svg=flatten(after.create({type,stage})).find(n=>n.className==='gu-l33-chart').innerHTML;
 // Exact same visible candles, OHLC geometry and inspection identifiers.
 const candles=s=>[...s.matchAll(/<g data-candle-index[\s\S]*?<\/g>/g)].map(x=>x[0].replace(/#[\da-f]{6}/gi,'COLOR'));
 assert.deepEqual(candles(svg),candles(old),type+' must preserve candle geometry and visible observations');
 assert(svg.includes('LAST $')&&svg.includes('>VOLUME</text>'));
 assert.equal((svg.match(/data-candle-index=/g)||[]).length,stage===3?5:stage===7?7:8);
 execFileSync('python',['-c','import sys,xml.etree.ElementTree as E; E.fromstring(sys.stdin.read())'],{input:svg});checked++;
}
const css=readFileSync('assets/css/lab-terminal-displays.css','utf8');
assert(!/(?:^|[;{])\s*(?:width|height|padding|margin|display|position|font-size|grid-template-columns)\s*:/m.test(css),'Terminal finish must preserve workstation layout');
for(const page of ['labs.html','lab-player.html','site-lab.html','lab-v32-member.html']){
 const html=readFileSync(page,'utf8');assert(html.includes('data-gu-lab-skin="graphite"'));assert(html.includes('lab-terminal-displays.css?v=20261026'));assert(html.includes('labs-graphite-skin.css?v=terminal-20261026'));
}
console.log('PASS '+checked+' SVG plots parse; visible candle geometry/counts preserved; all four Lab entrypoints covered; no workstation geometry changes.');
