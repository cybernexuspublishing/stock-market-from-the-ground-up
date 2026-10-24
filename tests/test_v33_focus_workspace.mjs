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
assert(markup.includes('class="journey-progress-track-inner"'),'Nine stage labels must appear inside the progress bar');
assert(engine.includes('heading.hidden=stage===0'),'No separate Start title above instructor');
assert(flow.includes('What did price do before your decision?'),'Decisions must use a brief chart-specific question');
assert(!flow.includes('Use only completed candles actually displayed.'),'Learner-facing questions must sound like natural instruction');
assert(flow.includes('work.hidden=!allowed;')&&flow.includes('activeStage>=3'),
 'Start, Learn and Experiment must conceal the independent decision form');
assert(flow.includes('reflection.hidden=!ready')&&flow.includes('activeStage>=6'),
 'Post-lab reflection must remain unavailable until Review');
assert(player.includes('id="gu-ws-reflection"'),'Reflection must be a separate, stage-gated section');
assert(player.includes("new CustomEvent('gu-v33-decision-locked')"),
 'A saved hypothetical decision must enable the appropriate reflection boundary');
assert(player.includes('GroundUpLabV33WorkspaceFlow?.mount?.({mode})'),'Production Lab must activate shared reference tabs and wizard');
assert(engine.includes('instructorInstance.setStartSetup(setup)'),
 'Historical Lab Setup must appear within the instructor header on Start');
assert(engine.includes('gu-v35-chart-worked'),'Worked examples must be integrated into the illustrated candle or chart, one step at a time');
assert(engine.includes('Start Guided Learning →'),'Main action must use the owner-approved professional label');
assert(engine.includes("button('Ask Market Tutor',()=>instructorInstance?.openTutor?.())"),'Market Tutor must be alongside primary Start action');
assert(engine.includes('gu-v33-start-primary'),'Main CTA must use visible highlighted treatment');
assert(css.includes('background:#f3be43!important'),'Start CTA must be noticeably gold');
assert(css.includes('.gu-v33-support-tablist')&&css.includes('grid-template-columns:repeat(3'),'Instructional support needs three side-by-side tabs');
assert(engine.includes('instructorInstance.setWalletContent(wallet)'),'Question Pass Wallet must occupy third support tab');
assert(engine.includes('shell.insertBefore(support,nav.nextSibling)'),'Primary actions must appear above the support tabs');
assert(css.includes('.gu-v33-instructor-narration')&&css.includes('overflow:visible!important'),'Narration must reserve text height without a scrollbar');
assert(instructor.includes('gu-v33-instructor-dialogue'),'Talia must provide an inline answer form');
assert(engine.includes('gu-v35-teaching-actions'),'All four help controls must ask Talia to teach, not expand disconnected panels');
assert(engine.includes("highlights.insertAdjacentElement('afterend',tabs)"),
 'All four teaching controls must be nested inside the visual after its focus controls');
assert(instructor.includes('function teachDirect('),
 'Supplementary teaching must narrate immediately without a reflection gate');
assert(!instructor.includes('What is the most important lesson from this explanation'),
 'Do not ask generic reflection questions after explanations');
assert(instructor.includes('Real body = |Close − Open|. Full range = High − Low.'),
 'Talia must narrate the real-body and full-range formulas');
assert(instructor.includes('gu-v33-pass-controls')&&instructor.includes('gu-v33-pass-confirm'),
 'Question Pass reveal/skip and explicit confirmation must appear inside Practice');
assert(engine.includes('onCreditAction:stage===4')&&engine.includes('practiceAssisted=true'),
 'Spending a pass must mark the practice as assisted rather than independently correct');
assert(player.includes('requestLabQuestionPass')&&player.includes('/api/lab-question-pass'),
 'Credit service must be authenticated, not simulated in the browser');
assert(instructor.includes('gu-v33-instructor-suggestions'),
 'The instructor must expose contextual clickable chat suggestions');
assert(engine.includes('if(current===0||current===1)return []'),
 'Neither Start nor untaught Learn may ask general lesson questions');
assert(instructor.includes('interaction.hidden=stage===0||stage===1'),
 'The answer dialogue must remain hidden until explicitly checking understanding');
assert(instructor.includes('interaction.hidden=false;'),
 'Check My Understanding must reveal the in-window question');
assert(engine.includes("chart.querySelector('.gu-l33-interactive-tools [data-view=\"both\"]')"),
 'VWAP must be visible at the beginning of the Learn demonstration');
assert(!engine.includes('body.insertBefore(actions,hero.nextSibling)'),
 'The four instructional buttons must never be moved below the instructor');
assert(css.includes('gu-v33-instructor-dialogue[hidden]'),
 'Visually hidden Start and pre-check prompts must not occupy space');
assert(css.includes('.gu-v33-reference-tablist')&&css.includes('[aria-selected="true"]'),'Historical references need selected state');
assert(css.includes('.gu-v33-evidence-step[hidden]'),'Inactive evidence questions should remain concealed');
for(const id of ['ev-structure','ev-location','ev-volume','ev-invalidation','ev-decision','ev-notes','lock-decision'])
 assert(player.includes(id)&&flow.includes(id),'Preserve field '+id+' and member save schema');
assert(flow.includes("if(work&&['guided','practice'].includes(mode))work.open=false"),
 'Guided flow should keep end-of-lesson protected workbench collapsed until requested');
assert(!flow.includes('fetch('),'Client presentation must not create another data or entitlement API');
assert(instructor.includes("el('h3','Talia')"));
assert(!instructor.includes('Elara Voss'));
assert(instructor.includes("memberFirstName=''" ),'Retain existing first-name personalization');
assert(instructor.includes("item.button.setAttribute('role','tab')"));
assert(instructor.includes("item.pane.setAttribute('role','tabpanel')"));
assert(instructor.includes("aria-selected"),'Tabs must be accessible');
assert(instructor.includes("if(current!=='tutor')activate('tutor')"),'Start Tutor shortcut must activate the same Tutor pane');
assert(engine.includes("if(![3,5].includes(stage)"),'No instructor may enter protected Predict/Assess');
assert(flow.includes("if(mode!=='blind'&&mode!=='assessment'){"),
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
assert.equal(tabs.length,3,'Start stage must show Learning Objectives, Market Tutor and Question Pass Wallet tabs');
assert.equal(tabs[2].textContent,'Question Pass Wallet');
assert.equal(typeof lesson.setWalletContent,'function');
assert.equal(tabs[0].textContent,'Review your learning objectives');
assert.equal(tabs[1].textContent,'Ask Market Tutor about this concept');
tabs[0].handlers.click();
assert.equal(tabs[0].attrs['aria-selected'],'true');
assert.equal(tabs[1].attrs['aria-selected'],'false');
tabs[1].handlers.click();
assert.equal(tabs[0].attrs['aria-selected'],'false');
assert.equal(tabs[1].attrs['aria-selected'],'true');
assert.equal(all.filter(n=>n.attrs.role==='tabpanel'&&!n.hidden).length,1);
const startDialogue=all.find(n=>n.className==='gu-v33-instructor-dialogue');
assert(startDialogue?.hidden===true,'Start must introduce objectives without a question');
const fakeWallet=new Element('section');fakeWallet.textContent='Your available Question Pass balance';
lesson.setWalletContent(fakeWallet);
tabs[2].handlers.click();assert.equal(tabs[2].attrs['aria-selected'],'true');
assert(all.some(n=>n===fakeWallet),'Wallet content must appear in the third panel');
lesson.openTutor();
assert.equal(tabs[1].attrs['aria-selected'],'true');
assert(all.some(n=>n.className==='gu-v33-instructor-typing'&&n.textContent.includes('Hello, Maya. I’m Talia')),
 'Typed first-name personal greeting must survive layout changes');
lesson.dispose();
const learn=ctx.GroundUpLabV33Instructor.create({
 stage:1,concept:'Candlestick Construction',lessonContext:{visualType:'candle'}
});
const learnNodes=nodes(learn.element);
const learnDialogue=learnNodes.find(n=>n.className==='gu-v33-instructor-dialogue');
assert(learnDialogue?.hidden===true,'Learn must teach before requiring a response');
const openCheck=learnNodes.find(n=>n.tagName==='button'&&n.textContent==='Check my understanding');
assert(openCheck,'The member must have a deliberate knowledge-check control');
openCheck.handlers.click();
assert(learnDialogue.hidden===false,'The explicit knowledge check must reveal the response area');
const suggestion=learnNodes.find(n=>n.tagName==='button'&&
 n.textContent==='Talia, explain the common mistake');
assert(suggestion&&typeof suggestion.handlers.click==='function',
 'A common mistake must be a clickable chat suggestion');
suggestion.handlers.click();
assert(learnNodes.some(n=>n.className==='gu-v33-instructor-member-question'&&
 n.textContent==='You asked: Talia, explain the common mistake'),
 'Clicking suggestion must post the member question in the instructor dialogue');
assert(learnNodes.some(n=>n.className==='gu-v33-instructor-typing'&&
 n.textContent.includes('The common mistake:')),
 'Talia must respond with subject-specific misconception teaching');
learn.teachSupplement('Explain This Concept',['Read the displayed completed candle.']);
assert(learnNodes.some(n=>n.className==='gu-v33-instructor-typing'&&
 n.textContent.includes('Body percentage = (real body ÷ full range) × 100')),
 'The supplementary explanation must speak the complete candlestick formula');
assert(!learnNodes.some(n=>n.className==='gu-v33-instructor-prompt'&&
 n.textContent.includes('most important lesson')),
 'Supplemental help must not generate a generic reflective question');
learn.dispose();
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:3}),null);
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:5}),null);
console.log('PASS focused Lab UX: setup-first, named instructor, accessible content tabs, professional CTA, protected evidence wizard');
