/* Focused formative-coaching safety regression: no private scoring, no
 * keyword-count mastery, no invisible data or external model required. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const js=readFileSync('assets/js/lab-v33-instructor.js','utf8');
const scope={};
runInNewContext(js,scope,{filename:'lab-v33-instructor.js'});
const inspect=scope.GroundUpLabV33Instructor?.inspectFormativeReasoning;
assert.equal(typeof inspect,'function');
const cases=[
 ['watchlist',"No: a scanner rank is not a buy instruction. Verify the original dated issuer source first.",'supported'],
 ['watchlist',"The scanner is up 30%, so buy it now.",'revise'],
 ['watchlist',"A watchlist is a list.",'revise'],
 ['candle',"Real body is the distance between the open and close.",'supported'],
 ['candle',"The high and low determine the real body.",'revise'],
 ['vwap',"A trade of 300 shares has more weight in VWAP than 100 shares when averaging prices.",'supported'],
 ['vwap',"VWAP will guarantee future price gains.",'revise'],
 ['ema',"The shorter EMA9 reacts more to the most recent completed closing price.",'supported'],
 ['volume',"Volume measures executed shares during the five minute period.",'supported'],
 ['depth',"The quoted spread equals the ask minus the bid: 10.10 - 9.90 = 0.20.",'supported'],
 ['tape',"The completed time and sales print contains execution time, traded price and share quantity.",'supported'],
 ['routing',"An accepted limit order may remain unfilled or fill partially; inspect actual order status.",'supported'],
 ['structure',"A higher swing low is above the previous comparable low.",'supported'],
 ['unknown_new_topic',"It looks interesting because I think I have an answer.",'unverified']
];
for(const [category,response,wanted] of cases){
 const result=inspect({category},response);
 assert.equal(result.status,wanted,category+' '+response+' '+result.message);
 assert(result.message.length>35);
 assert(!/mastered|you passed the assessment|graded.*correct/i.test(result.message),
  'Formative feedback may not claim independent assessment');
}
const negative=inspect({category:'watchlist'},"I don't need to check any company source; automatically buy when a scanner jumps.");
assert.equal(negative.status,'revise','Contradictory behavior must not pass on isolated terms');
assert(!js.includes('expected.split(/[^a-z0-9]+/).filter(w=>w.length>=5)'),
 'Never return to a brittle keyword-matching pass rule');
assert(js.includes('onUnderstandingPassed?.()'),
 'Ungraded progress must not be trapped by the unknown-category abstention');
console.log('PASS 15 focused formative coaching cases, misconception and unverified-answer safety.');
