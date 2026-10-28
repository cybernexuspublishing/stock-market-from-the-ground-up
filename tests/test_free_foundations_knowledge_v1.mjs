/* Foundational completeness gate: twelve independent free reference topics.
 * No payment, authenticated provider session, private market data or assessment.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/js/free-foundations-knowledge-v1.js');
const page=read('bootcamp-academy.html');
const css=read('assets/css/free-foundations-knowledge-v1.css');
const callbacks=[];
const context=vm.createContext({document:{readyState:'loading',addEventListener:(evt,cb)=>callbacks.push([evt,cb])},Object,Number,Error});
vm.runInContext(source,context,{filename:'free-foundations-knowledge-v1.js'});
const library=context.GroundUpFreeKnowledgeV1?.topics;
assert.equal(library?.length,12,'Free library must cover all twelve beginner essentials');
const ids=Array.from(library,x=>x.id);
assert.equal(new Set(ids).size,12,'No repeated core topic may displace a missing one');
for(const topic of library){
 assert(topic.title.length>14,'Need meaningful lesson title: '+topic.id);
 assert(topic.teach.length>=180,'Teach-first explanation missing: '+topic.id);
 assert(topic.why.length>=75,'Reason for learning missing: '+topic.id);
 assert(topic.method.length>=4&&Array.from(topic.method).every(x=>x.length>30),'Guided method missing: '+topic.id);
 assert(topic.example.length>=95&&/FICTIONAL/.test(topic.example),'Worked fictional case missing: '+topic.id);
 assert(topic.question.length>=55&&topic.review.length>=105,'Independent check and review missing: '+topic.id);
 assert(topic.mistake.length>=55,'Common misconception/remediation missing: '+topic.id);
 assert([1,2,3,4,5].includes(topic.day),'Missing Free lesson pathway');
 assert(/^https:\/\/(?:www\.)?(?:investor\.gov|syndication\.finra\.org)\//.test(topic.url),'Only authoritative source links allowed');
}
for(const id of ['goals','instruments','venues','orders','accounts','hours','charts','fundamentals','diversify','costs','protection','process'])
 assert(ids.includes(id),'Missing beginner knowledge category: '+id);
assert(source.includes('reviewBtn.disabled=true'),'Review must not be immediately available');
assert(source.includes('answer.value.trim().length<25'),'Independent response must come first');
assert(source.includes('Nothing was scored or saved.'));
assert(!/\bfetch\s*\(|\.rpc\s*\(|\/api\/|stripe|checkout/.test(source),'No private APIs or payment operations');
assert(page.includes('id="academy-free-knowledge"'));
assert(page.includes('assets/js/free-foundations-knowledge-v1.js'));
assert(page.includes('assets/css/free-foundations-knowledge-v1.css'));
assert(css.includes('max-width:760px'));
assert(callbacks.some(x=>x[0]==='DOMContentLoaded'));
console.log('PASS 12 free beginner knowledge topics: source links, teach/example/practice/review, no gated actions, no grades.');
