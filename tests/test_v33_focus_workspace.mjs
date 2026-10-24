/* Shared Lab v3.3 focused UX contract; no real accounts or API calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const engine=read('assets/js/lab-engine-v32-universal.js');
const player=read('assets/js/lab-player.js');
const instructor=read('assets/js/lab-v33-instructor.js');
const teaching=read('assets/js/lab-v33-instruction-content.js');
const flow=read('assets/js/lab-v33-workspace-flow.js');
const markup=read('lab-player.html');
const css=read('assets/css/lab-v33-experience.css')+read('assets/css/lab-v33-instructor.css');
for(const [path,source] of [
 ['assets/js/lab-engine-v32-universal.js',engine],
 ['assets/js/lab-player.js',player],
 ['assets/js/lab-v33-instructor.js',instructor],
 ['assets/js/lab-v33-workspace-flow.js',flow]
])assert.doesNotThrow(()=>new Script(source,{filename:path}),path+' must parse');
assert(markup.indexOf('lab-v33-workspace-flow.js')<markup.indexOf('lab-player.js'));
assert(player.includes('GroundUpLabV33WorkspaceFlow?.mount?.({mode})'),'Production Lab must activate shared reference tabs and wizard');
assert(engine.includes('shell.insertBefore(setup,heading)'),'Historical Lab Setup must precede the Start heading');
assert(engine.includes('gu-v33-teaching-followup'),'Worked example and comprehension check must be below the instructor');
assert(engine.includes('Start Guided Learning →'),'Main action must use the owner-approved professional label');
assert(engine.includes("button('Ask Market Tutor',()=>instructorInstance?.openTutor?.())"),'Market Tutor must be alongside primary Start action');
assert(engine.includes('gu-v33-start-primary'),'Main CTA must use visible highlighted treatment');
assert(css.includes('background:#f3be43!important'),'Start CTA must be noticeably gold');
assert(css.includes('.gu-v33-support-tablist')&&css.includes('grid-template-columns:repeat(3'),'Instructional support needs three side-by-side tabs');
assert(engine.includes('instructorInstance.setWalletContent(wallet)'),'Question Pass Wallet must occupy third support tab');
assert(engine.includes('shell.insertBefore(support,nav.nextSibling)'),'Primary actions must appear above the support tabs');
assert(css.includes('scrollbar-gutter:stable'),'Typed lesson display should not expand the page');
assert(css.includes('.gu-v33-reference-tablist')&&css.includes('[aria-selected="true"]'),'Historical references need selected state');
assert(css.includes('.gu-v33-evidence-step[hidden]'),'Inactive evidence questions should remain concealed');
for(const id of ['ev-structure','ev-location','ev-volume','ev-invalidation','ev-decision','ev-notes','lock-decision'])
 assert(player.includes(id)&&flow.includes(id),'Preserve field '+id+' and member save schema');
assert(flow.includes("if(work&&['guided','practice'].includes(mode))work.open=false"),
 'Guided flow should keep end-of-lesson protected workbench collapsed until requested');
assert(!flow.includes('fetch('),'Client presentation must not create another data or entitlement API');
assert(instructor.includes('Talia Mercer — Your Learning Instructor'));
assert(!instructor.includes('Elara Voss'));
assert(instructor.includes("memberFirstName=''" ),'Retain existing first-name personalization');
assert(instructor.includes("item.button.setAttribute('role','tab')"));
assert(instructor.includes("item.pane.setAttribute('role','tabpanel')"));
assert(instructor.includes("aria-selected"),'Tabs must be accessible');
assert(instructor.includes("if(current!=='tutor')activate('tutor')"),'Start Tutor shortcut must activate the same Tutor pane');
assert(engine.includes("if(![3,5].includes(stage)"),'No instructor may enter protected Predict/Assess');
assert(flow.includes("if(mode!=='blind'&&mode!=='assessment')step.append"),
 'Independent decision modes must not get teaching hints from the evidence wizard');
assert(player.includes('PLAYER.mode'), 'Existing protected decision/assessment remains owned by the player');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.attrs={};
  this.className='';this.textContent='';this.hidden=false;this.value='';this.checked=false;this.style={};}
 append(...items){this.children.push(...items)}
 setAttribute(key,val){this.attrs[key]=String(val)}
 addEventListener(key,fn){this.handlers[key]=fn}
 focus(){this.focused=true}
}
const doc={createElement:t=>new Element(t),createTextNode:text=>{
 const n=new Element('text');n.textContent=String(text);return n;
}};
const ctx=createContext({document:doc,AbortController,console});
new Script(teaching).runInContext(ctx);
new Script(instructor).runInContext(ctx);
const lesson=ctx.GroundUpLabV33Instructor.create({stage:0,concept:'Construct an Up / Bullish Candle',memberFirstName:'Maya',lessonContext:{visualType:'candle'}});
const nodes=(n)=>[n,...(n.children||[]).flatMap(nodes)];
const all=nodes(lesson.element),tabs=all.filter(n=>n.attrs.role==='tab');
assert.equal(tabs.length,2);
assert.equal(tabs[0].textContent,'Review your learning objectives');
assert.equal(tabs[1].textContent,'Ask Market Tutor about this concept');
tabs[0].handlers.click();
assert.equal(tabs[0].attrs['aria-selected'],'true');
assert.equal(tabs[1].attrs['aria-selected'],'false');
tabs[1].handlers.click();
assert.equal(tabs[0].attrs['aria-selected'],'false');
assert.equal(tabs[1].attrs['aria-selected'],'true');
assert.equal(all.filter(n=>n.attrs.role==='tabpanel'&&!n.hidden).length,1);
lesson.openTutor();
assert.equal(tabs[1].attrs['aria-selected'],'true');
assert(all.some(n=>n.className==='gu-v33-instructor-typing'&&n.textContent.includes('Hello, Maya. I’m Talia Mercer')),
 'Typed first-name personal greeting must survive layout changes');
lesson.dispose();
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:3}),null);
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:5}),null);
console.log('PASS focused Lab UX: setup-first, named instructor, accessible content tabs, professional CTA, protected evidence wizard');
