/* SMFGU-LEARNING-LAYOUT-001 v1.0: source acceptance for full-width instruction. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const cssPath='assets/css/teaching-full-width-v1.css';
assert(existsSync(cssPath),'Shared teaching width stylesheet must exist');
const css=read(cssPath);
const pages=[
 'candle-practice.html','lab-player.html','lab-v32-member.html',
 'labs.html','bootcamp.html','bootcamp-academy.html',
 'free-watchlist.html','advanced-tool.html'
];
for(const p of pages){
 const html=read(p);
 assert(html.includes('teaching-full-width-v1.css?v=20261031-1'),'Shared stylesheet missing: '+p);
 assert(html.includes('gu-teaching-wide'),'Teaching-wide scope missing: '+p);
}
assert(css.includes('.gu-learning-journey-v3 .gu-public-classroom'),'Public ECharts and Talia workspace layout is shared');
assert(css.includes('grid-template-columns:minmax(0,1.28fr) minmax(0,.9fr)'),'Chart left and tutor right on desktop');
assert(css.includes('#gu-v32-teaching-slot .gu-v33-stage-hero'),'All member Labs share chart + tutor layout');
assert(css.includes('#academy-lab-slot) .gu-v33-stage-hero'),'Boot Camp Labs share chart + tutor layout');
assert(css.includes('.academy-study-grid>.gu-bc-index'),'Academy lesson navigator must be moved above teaching surface');
assert(css.includes('#academy-days>*'),'Academy lesson selection must remain available');
assert(css.includes('.gu-bc-shell:not(.academy-study-grid)'),'Classic Boot Camps included');
assert(css.includes('.academy-studio-layout'),'Free Foundations teaching studio included');
assert(css.includes('#gu-inline-lab-frame'),'Inline Labs must remain full width');
assert(css.includes('.wrap.free-watchlist'),'Free Watchlist teaching must use page width');
assert(css.includes('.cl-talia-v4 .cl-talia-workspace'),'Shared Watchlist / Advanced Talia teaching must remain chart and tutor side-by-side');
assert(css.includes('@media(max-width:1050px)'),'Tutor and chart must stack responsively');
assert(css.includes('grid-template-columns:minmax(0,1fr)!important'),'Single column mobile learning layout');
assert(css.includes('[hidden]{display:none!important}'),'Hidden stages must remain concealed');
assert(!css.includes('body.gu-teaching-wide main .wrap'),'Never widen arbitrary pages globally');
assert(!/\b(?:assessmentKey|correctAnswer|answerKey)\s*=/.test(css),'No assessment logic in layout CSS');
console.log('PASS full-width teaching layout contract: public Candlestick, Labs, embedded Labs, Boot Camps, Free Foundations, Watchlist Talia, advanced tool, responsive chart + tutor');
