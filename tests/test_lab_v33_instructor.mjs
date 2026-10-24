/* LAB-UX-STD-001: typewriter narration + optional in-page Market Tutor.
 * Offline source and behavior regression. No live account/model calls.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const js=read('assets/js/lab-v33-instructor.js');
const instruction=read('assets/js/lab-v33-instruction-content.js');
const player=read('assets/js/lab-player.js');
const engine=read('assets/js/lab-engine-v32-universal.js');
const html=read('lab-player.html');
const css=read('assets/css/lab-v33-instructor.css');
assert(html.includes('assets/css/lab-v33-instructor.css'));
assert(html.indexOf('lab-v33-instruction-content.js')<html.indexOf('lab-v33-instructor.js'));
assert(html.indexOf('lab-v33-instructor.js')<html.indexOf('lab-engine-v32-universal.js'));
assert(engine.includes('lessonContext:{visualType,guide,subject,teaching:authorizedTeaching}'),'Instructor must use genuine Lab and competency content');
for(const generic of ['We will examine','Read the explanation alongside','Try changing one permitted input'])assert(!js.includes(generic),'Generic non-teaching narration must not return');
assert(engine.includes('instructorInstance?.dispose?.()'),'Stage rerender must cancel outstanding Tutor/typing work');
assert(engine.includes('if(![3,5].includes(stage)'),'Predict and Assess must not have embedded instructional Tutor');
assert(engine.includes('tutorTopic:tutorSafeSubject(lab)')===false,'Topic guard must be passed only from Player, not user-answer state');
assert(player.includes("tutorTopic:tutorSafeSubject(lab),tutorRequest:requestLabTutor"));
assert(player.includes("['guided','practice'].includes(PLAYER.mode)"),'Tutor access must be restricted to instructional modes');
assert(player.includes("sb?.auth?.getSession?.()"),'Market Tutor requests require current signed-in token');
assert(player.includes("'/api/market-tutor'"),'Use existing authenticated Tutor service');
assert(player.includes("saveHistory:false"),'New in-Lab Tutor use does not silently save questions');
assert(!player.includes("allowModel:true,saveHistory:false"),'AI generation must remain member opt-in');
assert(js.includes("consent.checked=false"),'AI generation must be off by default');
assert(js.includes("FICTIONAL")===false,'Narration should not fabricate charts');
assert(js.includes("Lab answers")===false,'Never transmit local answer fields');
assert(js.includes("document.createTextNode"),'Use safe text insertion rather than HTML response rendering');
assert(css.includes('prefers-reduced-motion:reduce'));
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.attrs={};this.style={};this.className='';this._text='';this.value='';this.type='';this.hidden=false;this.checked=false;}
 get textContent(){return this._text}
 set textContent(t){this._text=String(t??'')}
 append(...x){this.children.push(...x)}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.handlers[k]=fn}
}
const document={createElement:n=>new Element(n),createTextNode:t=>{const n=new Element('text');n.textContent=t;return n}};
const context=createContext({document,AbortController,console});
new Script(instruction,{filename:'lab-v33-instruction-content.js'}).runInContext(context);
new Script(js,{filename:'lab-v33-instructor.js'}).runInContext(context);
const api=context.GroundUpLabV33Instructor;
const author=context.GroundUpLabV33InstructionContent;
const candle=author.lesson({stage:1,visualType:'candle',concept:'Construct an Up / Bullish Candle'});
assert.match(candle.blocks.join(' '),/Open \(O\).*High \(H\).*Low \(L\).*Close \(C\)/);
assert(candle.blocks.some(x=>x.includes('High − Low')),'Explain full range using correct formula');
assert(candle.worked.some(x=>x.includes('40%')),'Teach with worked fictional candle example');
assert(candle.check?.question.includes('real body'));
const introduction=author.lesson({stage:0,visualType:'candle',concept:'Construct an Up / Bullish Candle'});
assert.equal(introduction.objectives.length,3);
assert(introduction.objectives.some(line=>line.includes('Open, High, Low and Close')));
assert(introduction.blocks[0].includes('what you will learn'));
assert(introduction.blocks.some(line=>line.includes('40%'))===false,'The Start stage must not reveal the worked calculation');

const vwap=author.lesson({stage:1,visualType:'vwap',concept:'VWAP Reclaim'});
assert(vwap.blocks.some(x=>x.includes('Σ means SUM')),'Define Greek symbols rather than presume prior knowledge');
assert(vwap.worked.some(x=>x.includes('$11.50')),'Work VWAP from dollars and share counts');
const practice=author.lesson({stage:4,visualType:'candle',concept:'Construct an Up / Bullish Candle'});
assert(!practice.blocks.join(' ').includes('Open $31.00'),'Do not reveal the current Lab practice numbers');
for(const type of ['candle','vwap','ema','structure','volume','tape','depth','routing']){
 const lesson=author.lesson({stage:1,visualType:type,concept:'Example'});
 assert(lesson.blocks.length>=3&&lesson.worked.length>=3&&lesson.check,'Every specialized instructor needs definitions, example and concept check: '+type);
}
const calls=[];
function walk(n){return [n,...n.children.flatMap(walk)]}
const ui=api.create({stage:1,subject:'VWAP context and its limitations',concept:'VWAP Reclaim',
 requestTutor:async x=>{
  calls.push({question:x.question,allowModel:x.allowModel});
  return {answer:'VWAP uses observed price and volume information; it does not guarantee a breakout.',generation:'reviewed-glossary-logic'};
 }});
assert(ui?.element);
const nodes=walk(ui.element);
const ask=nodes.find(n=>n.tagName==='button'&&n.textContent==='Ask Market Tutor');
const choice=nodes.find(n=>n.tagName==='input'&&n.type==='checkbox');
const question=nodes.find(n=>n.tagName==='textarea');
const status=nodes.find(n=>n.className==='gu-v33-tutor-status');
assert(ask&&choice&&question&&status);
const lessonView=api.create({stage:1,subject:'Candlestick anatomy',concept:'Construct an Up / Bullish Candle',lessonContext:{visualType:'candle'}});
const lessonNodes=walk(lessonView.element);
assert(lessonNodes.some(n=>n.className==='gu-v33-instructor-worked'),'Actual worked example must be visible');
const initial=api.create({stage:0,subject:'Candlestick anatomy',concept:'Construct an Up / Bullish Candle',lessonContext:{visualType:'candle'}});
const initialNodes=walk(initial.element);
assert(initialNodes.some(n=>n.tagName==='h3'&&n.textContent==='Avery — Your Learning Instructor'),'The named virtual instructor must be visible');
assert(initialNodes.some(n=>n.className==='gu-v33-instructor-typing'&&n.textContent.includes('Here is what you will learn')),'The teaching objectives must be delivered in the instructor typing panel');
assert(initialNodes.some(n=>n.className==='gu-v33-instructor-typing'&&n.textContent.includes('I’m Avery')),'Start stage must have an approachable first-person instructor');
assert(initialNodes.some(n=>n.className==='gu-v33-instructor-objectives'),'Allow members to revisit the spoken objectives');
initial.dispose();
assert(lessonNodes.some(n=>n.className==='gu-v33-instructor-check'),'Concept comprehension check must be visible');
assert(lessonNodes.some(n=>n.className==='gu-v33-instructor-typing'&&n.textContent.includes('Open (O)')),'Instructor must teach definitions, not tell learner to read');
lessonView.dispose();
assert.equal(calls.length,0,'Never automatically call server when Lab opens');
question.value='What does VWAP measure?';
await ask.handlers.click();
assert.equal(calls.length,1);
assert.equal(calls[0].allowModel,false,'Source-grounded is the default');
assert(!calls[0].question.includes('replay answer'),'Never attach hidden answer');
assert.match(status.textContent,/Source-grounded Market Tutor response/);
choice.checked=true;
await ask.handlers.click();
assert.equal(calls[1].allowModel,true,'Paid AI must be explicitly selected');
assert.equal(api.create({stage:3,subject:'VWAP'}),null,'Predict is a decision boundary');
assert.equal(api.create({stage:5,subject:'VWAP'}),null,'Assessment is a protected boundary');
ui.dispose();
console.log('PASS typed accessible instructor, explicit AI consent, existing authenticated Tutor boundary, restricted independent stages');
