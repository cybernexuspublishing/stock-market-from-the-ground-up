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
const passApi=read('functions/api/lab-question-pass.js');
const passSql=read('supabase/migrations/v0.14.0.163_QUESTION_PASS_LEDGER_OWNER_REVIEW_REQUIRED.sql');
const css=read('assets/css/lab-v33-experience.css')+read('assets/css/lab-v33-instructor.css');
for(const [path,source] of [
 ['assets/js/lab-engine-v32-universal.js',engine],
 ['assets/js/lab-player.js',player],
 ['assets/js/lab-v33-instructor.js',instructor],
 ['assets/js/lab-v33-workspace-flow.js',flow]
])assert.doesNotThrow(()=>new Script(source,{filename:path}),path+' must parse');
assert(markup.indexOf('lab-v33-workspace-flow.js')<markup.indexOf('lab-player.js'));
assert(!css.includes('max-width:1100px;'),
 'The earlier 1100px centered chart/Talia limitation must never return');
assert(css.includes('max-width:none;\n  min-width:0;\n  margin-inline:0;'),
 'The unified lesson must stretch to the available member workspace');
assert(css.includes('@container (min-width:940px)'),
 'Desktop teaching columns must respond to the available container width');
assert(css.includes('@container (max-width:939px)'),
 'Narrow embedded lessons must stack instead of creating clipped columns');
assert(css.includes('grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)'),
 'Chart and Talia must share the usable horizontal area');

assert(markup.includes('class="journey-progress-track-inner"'),'Nine stage labels must appear inside the progress bar');
assert(engine.includes('heading.hidden=stage===0'),'No separate Start title above instructor');
assert(passApi.includes('memberIdentity(env,request)')&&passApi.includes('getBookCodeAccess(env,request,spec.book)'),
 'Credit spending must verify a signed-in member and an eligible book');
assert(passApi.includes('groundup_question_pass_spend')&&passApi.includes('groundup_question_pass_summary'),
 'Wallet and spends must be server-authoritative');
assert(passSql.includes('pg_advisory_xact_lock')&&passSql.includes('groundup_qp_once_per_question'),
 'Concurrent requests must not deduct multiple credits for one question');
assert(passSql.includes("interval '60 days'")&&passSql.includes("source='purchased' and billing_period_ends_at is null and expires_at is null"),
 'Preserve included expiration and purchased non-expiration rules');
assert(passSql.includes('revoke all on function')&&passSql.includes('grant execute on function'),
 'Ledger functions must not be available to the anonymous/authenticated browser roles');
assert(!passApi.includes('purchasedCreditAllocation(')&&!passApi.includes('includedCreditAllocation('),
 'Production must not fabricate or automatically grant Question Pass balances');
assert(flow.includes('What did price do before your decision?'),'Decisions must use a brief chart-specific question');
assert(!flow.includes('Use only completed candles actually displayed.'),'Learner-facing questions must sound like natural instruction');
assert(flow.includes('work.hidden=!state.workbenchVisible;')&&
 flow.includes('workbenchVisible:independent||position>=3'),
 'Start, Learn and Experiment must conceal the independent decision form');
assert(flow.includes('reflection.hidden=!state.reflectionVisible;')&&
 flow.includes('reflectionVisible:independent?decisionIsLocked:position>=6'),
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
assert(engine.includes("shell.querySelectorAll?.(':scope > .gu-v33-support-tabs').forEach(node=>node.remove())"),
 'Start-only Wallet/support tabs must not remain duplicated on Learn and later stages');
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
assert(instructor.includes("el('h3','Talia')"),"Instructor display title must use Owner-approved Talia-only name");
assert(!instructor.includes("el('h3','Talia Mercer')"),"Do not expose instructor last name in the member header");
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
  this.className='';this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ')},contains:name=>this.className.split(/\s+/).includes(name)};this.textContent='';this.hidden=false;this.value='';this.checked=false;this.style={};}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
 insertBefore(item,before){const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,item)}
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
assert.equal(tabs[2].textContent,'Crownlight Sparks Wallet');
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
const fakeWallet=new Element('section');fakeWallet.textContent='Your available Crownlight Sparks balance';
lesson.setWalletContent(fakeWallet);
tabs[2].handlers.click();assert.equal(tabs[2].attrs['aria-selected'],'true');
assert(nodes(lesson.element).some(n=>n===fakeWallet),'Wallet content must appear in the third panel');
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
// Original v3.2 credits may be used only after explicit member confirmation.
let spent=0,credits=8,completed=false;
const passed=ctx.GroundUpLabV33Instructor.create({
 stage:4,concept:'Candlestick construction',lessonContext:{visualType:'candle'},
 questions:['Enter the numerical result for body.','Enter the numerical result for range.','Enter the numerical result for percent.'],
 onCreditAction:async({action,index})=>{
  if(action==='balance')return{ok:true,balance:{included:credits,purchased:0,available:credits}};
  assert.equal(action,'reveal');assert.equal(index,0);
  spent++;credits-=4;
  return{ok:true,balance:{included:credits,purchased:0,available:credits},
   answerText:'Body = |Close − Open| = $1.00',studyOnly:true};
 },
 onComplete:()=>{completed=true}
});
const passNodes=nodes(passed.element);
const passButton=(value)=>passNodes.find(n=>n.tagName==='button'&&n.textContent===value);
const confirm=passNodes.find(n=>n.className==='gu-v33-pass-confirm');
assert(confirm?.hidden,'Credit confirmation must begin concealed');
await Promise.resolve();await Promise.resolve();
assert.equal(passButton('Reveal answer · 4 Sparks').disabled,false,'Verified positive balance unlocks optional Reveal');
passButton('Reveal answer · 4 Sparks').handlers.click();
assert.equal(confirm.hidden,false,'Reveal must open a confirmation directly above controls');
assert.equal(spent,0,'Selecting a credit action must not spend it');
passButton('Cancel').handlers.click();
assert.equal(confirm.hidden,true);assert.equal(spent,0,'Cancel cannot spend a credit');
passButton('Reveal answer · 4 Sparks').handlers.click();
await passButton('Confirm 4-Spark use').handlers.click();
assert.equal(spent,1,'Confirmation must spend exactly once');
assert(passNodes.some(n=>n.className==='gu-v33-pass-feedback'&&n.textContent.includes('Four Sparks were used')),
 'Confirmed paid reveal must display the study answer and credit result');
assert(passNodes.some(n=>n.className.includes('gu-v33-instructor-submit')&&n.disabled),
 'Revealed answer must not also be submitted as independent practice');
passNodes.find(n=>n.tagName==='button'&&n.textContent==='Continue to next practice question').handlers.click();
assert(passNodes.some(n=>n.className==='gu-v33-instructor-question-counter'&&n.textContent==='Question 2 of 3'),
 'Paid Study Only reveal must permit the next independent question');
assert.equal(spent,1,'Advancing must not spend another credit');
assert.equal(completed,false,'Revealing one question does not complete the whole practice');
passed.dispose();
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:3}),null);
assert.equal(ctx.GroundUpLabV33Instructor.create({stage:5}),null);
// Stage boundaries must hide the entire legacy decision panel until Predict
// and hide the separate reflection until Review, not merely collapse details.
const parts={
 'gu-ws-member-workbench':{hidden:false,open:true,dataset:{}},
 'gu-ws-reflection':{hidden:false,open:true,dataset:{}}
};
const workspaceEnv=createContext({
 document:{getElementById:id=>parts[id]||null},
 console
});
new Script(flow).runInContext(workspaceEnv);
const flowApi=workspaceEnv.GroundUpLabV33WorkspaceFlow;
const v4=flowApi.presentationState;
assert.equal(typeof v4,'function','Shared v4 controller must expose a pure mode/stage state policy');
for(const mode of ['guided','practice']){
 for(let stage=0;stage<3;stage++){
  const state=v4(mode,stage);
  assert.equal(state.workbenchVisible,false,mode+' must conceal decisions during orientation');
  assert.equal(state.reflectionVisible,false,mode+' must conceal reflection before Review');
 }
 assert.equal(v4(mode,3).workbenchVisible,true,mode+' decision begins at Predict');
 assert.equal(v4(mode,5).reflectionVisible,false,mode+' review stays gated');
 assert.equal(v4(mode,6).reflectionVisible,true,mode+' reflection begins at Review');
}
for(const mode of ['blind','assessment']){
 assert.equal(v4(mode,0).workbenchVisible,true,mode+' must permit independent decision');
 assert.equal(v4(mode,0).reflectionVisible,false,mode+' must conceal reflection before locking');
 assert.equal(v4(mode,0,true).reflectionVisible,true,mode+' must unlock reflection after decision');
}
assert.equal(v4('guided',999).stage,8,'Stage bounds must be clamped');
assert.equal(v4('guided',-15).stage,0,'Negative stages must not bypass gating');
assert(player.includes('currentPlayerPolicy().stage'),'Mode switching must consume the shared stage policy');
assert(player.includes('PLAYER.locked||policy.stage>=3'),'Mode locking must use the same stage boundary as the workbench');
assert(!player.includes('fraction>=1/3'),'Mode locking must not infer progress from a separate fractional metric');
flowApi.stageVisibility(0);
assert.equal(parts['gu-ws-member-workbench'].hidden,true);
assert.equal(parts['gu-ws-reflection'].hidden,true);
assert.equal(parts['gu-ws-member-workbench'].open,false);
flowApi.stageVisibility(1);
assert.equal(parts['gu-ws-member-workbench'].hidden,true);
flowApi.stageVisibility(3);
assert.equal(parts['gu-ws-member-workbench'].hidden,false);
assert.equal(parts['gu-ws-reflection'].hidden,true);
flowApi.stageVisibility(6);
assert.equal(parts['gu-ws-reflection'].hidden,false);
flowApi.stageVisibility(0);
assert.equal(parts['gu-ws-reflection'].hidden,true,'Returning to Start conceals reflection');
console.log('PASS focused Lab UX: setup-first, named instructor, accessible content tabs, professional CTA, protected evidence wizard');
