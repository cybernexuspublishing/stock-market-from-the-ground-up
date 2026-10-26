/* Guard the owner's layout freeze: this overlay must remain visual-only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const css=readFileSync('assets/css/labs-graphite-skin.css','utf8');
const allowed=new Set(['background','color','border-color','box-shadow','outline-color','caret-color','accent-color','border-radius']);
const properties=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(?:\{|;)\s*([\w-]+)\s*:/g)].map(x=>x[1]);
assert(properties.length>30);
for(const name of properties)assert(allowed.has(name)||name.startsWith('--gu-lab-'),'Layout/typography property forbidden: '+name);
assert(!/animation|transition|transform|font-size|padding|margin|display|position|grid-template/.test(css.replace(/\/\*[\s\S]*?\*\//g,'')));
for(const name of ['labs.html','lab-player.html','site-lab.html']){
 const current=readFileSync(name,'utf8');const base=execFileSync('git',['show','HEAD:'+name],{encoding:'utf8'});
 const normalize=text=>text.replace('<link rel="stylesheet" href="assets/css/labs-graphite-skin.css">','').replace(' data-gu-lab-skin="graphite"','');
 assert.equal(normalize(current),normalize(base),'Teaching markup must be byte-identical after removing opt-in skin link/marker');
}
assert(!/\bsvg\b|\bcanvas\b|\.fill\b|\.feedback\b|\.warn\b/.test(css),'Do not recolor chart data, progress or feedback semantics');
console.log('PASS Lab skin: visual-only declaration allowlist, no geometry/typography/motion rules, teaching markup unchanged, chart and feedback semantics untouched.');

for(const selector of ['.prototype-bar','#player-stage-grid .stage-item.current','.gu-v33-instructor-head .gu-v33-setup','.gu-v40-start-preview','.gu-v40-preview-outcomes>h3'])assert(css.includes(selector),'Missing current player surface: '+selector);

assert(css.includes('center 30% / 100% 1px no-repeat'),'Connected stages use background lines, not layout changes');
