/* D09 secure follow-up contract; Node 22, no live Supabase/AI traffic. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isContextualTutorFollowup,getVerifiedPriorTutorQuestion} from '../functions/_lib/tutor-conversation-context-v014159.js';
import {rankApprovedTutorTopics} from '../functions/_lib/tutor-retrieval-v014149.js';
const user='123e4567-e89b-12d3-a456-426614174000';
const other='223e4567-e89b-12d3-a456-426614174000';
const conv='323e4567-e89b-12d3-a456-426614174000';
const row={question:'Explain volume weighted average price VWAP',generation:'verified:original-competency-guide'};
const calls=[];
const rest=async(_env,path)=>{calls.push(path);return {ok:true,data:[row]};};
assert(isContextualTutorFollowup('What about its limitations?'));
assert(isContextualTutorFollowup('Tell me more'));
assert(!isContextualTutorFollowup('What is support and resistance?'));
assert(!isContextualTutorFollowup(''));
// No member ID or conversation ID means no database call or context.
assert.equal(await getVerifiedPriorTutorQuestion({},'not-an-id',conv,{rest}),null);
assert.equal(await getVerifiedPriorTutorQuestion({},user,'not-an-id',{rest}),null);
assert.equal(calls.length,0);
const prior=await getVerifiedPriorTutorQuestion({},user,conv,{rest});
assert.equal(prior,row.question);
const search=new URL('https://database.example/rest/v1/'+calls[0]).searchParams;
assert.equal(search.get('user_id'),'eq.'+user);
assert.equal(search.get('conversation_id'),'eq.'+conv);
assert.equal(search.get('limit'),'1');
assert.equal(search.get('select'),'question,generation');
assert(!calls[0].includes('learner_answer')&&!calls[0].includes('answer,'));
assert(!calls[0].includes(other));
const topics=[{id:'vwap',title:'VWAP',aliases:['volume weighted average price'],summary:'Volume weighted price',related:[]}];
assert.equal(rankApprovedTutorTopics(prior+' What about its limitations?',topics)[0].id,'vwap');
const bad=[null,'client-copy','verified:public-companion-glossary'];
for(const generation of bad){
 const res=await getVerifiedPriorTutorQuestion({},user,conv,{rest:async()=>({ok:true,data:[{question:'Untrusted last turn',generation}]})});
 assert.equal(res,null,'Reject unverified assistant/client-copied history');
}
assert.equal(await getVerifiedPriorTutorQuestion({},user,conv,{rest:async()=>({ok:true,data:[{question:'Old one',generation:row.generation},{question:'New one',generation:row.generation}]})}),null,'Backend must obey bound');
assert.equal(await getVerifiedPriorTutorQuestion({},user,conv,{rest:async()=>({ok:false,status:503})}),null);
assert.equal(await getVerifiedPriorTutorQuestion({},user,conv,{rest:async()=>{throw Error('network')}}),null);
const api=readFileSync('functions/api/market-tutor-v01492.js','utf8');
assert(api.includes('getVerifiedPriorTutorQuestion(env,auth.userId,body.conversationId)'),
 'Never accept browser-supplied user ID for context');
assert(api.includes('isContextualTutorFollowup(q)'),'Only contextual follow-ups use previous question');
assert(api.includes('if(body.priorTurnsSupplied)'),'Untrusted client history remains ignored');
assert(api.includes('verifiedFollowupContext'),'Member response identifies when verified context was used');
assert(!api.includes('JSON.stringify(body.priorTurns)'),'No forged browser history forwarded');
console.log('PASS D09 verified same-member follow-up grounding, one-row cap, untrusted-history rejection and zero-provider fallback');
