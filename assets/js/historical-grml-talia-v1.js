/* GRML September 21, 2026 — authored Talia instruction.
 * No stock prices, future outcomes, answer keys for graded Labs or customer data
 * are embedded. Every numeric observation uses only server-revealed candles.
 * Ungraded educational checks; never award mastery or trade fills.
 */
(()=>{
'use strict';
const stages=[
 {at:1,id:'first-candle',title:'1 · Observe before predicting',
  teach:'You are seeing one completed candle from IEX, one trading venue. A candle reports prices and volume during that minute; it does not prove what will happen next.',
  question:'What can you conclude from the one completed IEX candle?',
  options:['It guarantees the next candle direction.','It represents every U.S. exchange.','It shows only that minute’s recorded IEX price range and volume.'],
  correct:2,why:'Exactly. Describe the known candle, then keep the future unknown.',
  retry:'That claim would require evidence not yet visible. Compare the candle’s actual scope to the choices.',
  transfer:'Before you lock ENTER, WATCH or NO TRADE, name one missing piece of evidence and your invalidation rule.'},
 {at:3,id:'structure',title:'2 · Recognize candle sequences',
  teach:'Now compare completed candles instead of treating a single green or red body as a reliable signal. Focus on the observed sequence, wick locations and whether activity is expanding or contracting.',
  question:'How should you investigate an apparent upward movement?',
  options:['Assume the next three minutes will rise.','Compare the completed highs, lows, closes and volume; do not infer an outcome.','Buy immediately because one close was higher.'],
  correct:1,why:'Yes. A sequence is evidence to evaluate, not a prediction that must come true.',
  retry:'A single movement is not confirmation. Which option requires comparing already-completed observations?',
  transfer:'Point to two visible observations and explain what would contradict your interpretation.'},
 {at:5,id:'volume',title:'3 · Read venue volume carefully',
  teach:'Volume is the number of shares reported for these IEX candles. It does not equal national consolidated volume, and a busy minute alone does not tell you whether buyers or sellers will control the next minute.',
  question:'What does a larger IEX minute-volume bar establish?',
  options:['More shares traded on IEX during that minute, not certainty about the next move.','It proves that all U.S. exchanges had the same volume.','It guarantees a breakout.'],
  correct:0,why:'Correct. Report venue volume accurately without turning it into a directional guarantee.',
  retry:'Volume measures completed activity; it does not reveal future prices or the entire national tape.',
  transfer:'Compare the volume on two completed candles. Describe activity without claiming a guaranteed trade.'},
 {at:10,id:'levels',title:'4 · Mark observed levels without hindsight',
  teach:'A prior completed high or low can be a possible reference level. Only use levels that were already visible at your current replay boundary. Do not label a later breakout before it happens.',
  question:'What makes a level valid for a no-lookahead trade plan?',
  options:['It will be touched by an unrevealed future candle.','A hindsight chart shows it worked.','It is derived from already completed candles and has a written invalidation condition.'],
  correct:2,why:'Right. A level is a decision-time reference, not proof that an entry should happen.',
  retry:'Levels chosen using later outcomes create lookahead bias. Use only what the member could have seen then.',
  transfer:'Mark one observed high or low and state the precise evidence that would invalidate your setup.'},
 {at:15,id:'timeframes',title:'5 · Check completed higher timeframes',
  teach:'A 3-, 5- or 15-minute candle is usable only after every constituent one-minute candle has completed. A partial candle is not a finished signal.',
  question:'At the 15-minute replay boundary, what may you compare?',
  options:['A 15-minute candle that includes minutes 9:45–9:59 before those minutes occur.','The completed 9:30–9:44 candle and only the one-minute observations already revealed.','All prices from the full trading session.'],
  correct:1,why:'Correct. You may use the first completed 15-minute group but not the later 15-minute group.',
  retry:'Count the completed source minutes first. A higher-timeframe candle cannot reveal unobserved minutes.',
  transfer:'Switch between 1-, 3-, 5- and 15-minute views and identify which candles are fully completed.'},
 {at:20,id:'risk',title:'6 · Define the trade and the risk',
  teach:'Before entering, specify an observable trigger, a price-based invalidation, possible slippage and a reason to stay out. These historical OHLCV candles cannot prove your brokerage order would have filled.',
  question:'Which plan is decision-ready?',
  options:['Enter because a historical chart later went higher.','Assume every displayed price was an executable fill.','Describe an observable entry trigger, invalidation and risk limit, or explicitly choose NO TRADE.'],
  correct:2,why:'Yes. The plan must still make sense without seeing the next candle.',
  retry:'A plan based on future outcomes or guaranteed fills cannot be evaluated fairly.',
  transfer:'Write a WATCH or NO TRADE plan and identify what evidence would change it.'},
 {at:25,id:'no-trade',title:'7 · Reassess rather than force a setup',
  teach:'You have more historical evidence, but more candles do not require more trades. Compare the current observation with the earlier hypothesis and revise only from what is visible.',
  question:'If the evidence conflicts with your original setup, what is the disciplined response?',
  options:['Update the hypothesis, respect invalidation and consider NO TRADE.','Move the invalidation farther away without recording it.','Assume the next hidden candle will repair the idea.'],
  correct:0,why:'Exactly. A well-reasoned decision not to trade is a valid learning outcome.',
  retry:'Do not use hope or unseen prices to keep a weak plan alive.',
  transfer:'Explain what changed since the first decision, using only completed observations.'},
 {at:30,id:'review',title:'8 · Separate decision quality from hindsight',
  teach:'The 30-minute opening window has been revealed. Compare your locked first decision with what actually happened, but do not rewrite the original reasoning using the outcome.',
  question:'How should you review a correct process followed by an unfavorable outcome?',
  options:['Declare the plan wrong solely because price moved against it.','Evaluate the evidence, decision timing, invalidation and risk separately from the result.','Claim a hypothetical fill was confirmed by IEX.'],
  correct:1,why:'Correct. Process evaluation and realized market outcome are different questions.',
  retry:'Judge the plan on what was known at decision time, not the benefit of hindsight.',
  transfer:'Record one process strength, one weakness and one next-session improvement in your Journal.'}
];
function stageAt(revealed){
 if(!Number.isInteger(revealed)||revealed<1)return null;
 for(let i=stages.length-1;i>=0;i--)if(revealed>=stages[i].at)return stages[i];
 return null;
}
function describe({revealed,completed=[],frame=1}={}){
 const s=stageAt(revealed);
 if(!s)return null;
 const tail=Array.isArray(completed)?completed.at(-1):null;
 const before=Array.isArray(completed)?completed.at(-2):null;
 const fmt=x=>Number(x).toFixed(4);
 const evidence=tail?
  'Latest completed '+frame+'-minute IEX candle: O $'+fmt(tail.o)+', H $'+fmt(tail.h)+
  ', L $'+fmt(tail.l)+', C $'+fmt(tail.c)+', venue volume '+Number(tail.v).toLocaleString('en-US')+
  ' shares.'+(before?' Its close is '+(tail.c>=before.c?'at or above':'below')+' the preceding completed close.':' This is the first completed candle at this interval.'):
  'No completed '+frame+'-minute candle is available yet. Return to 1-minute observations or wait for the entire interval; do not infer partial prices.';
 return {...s,evidence,sourceCount:revealed,frame};
}
function isCheckpoint(revealed){return stages.some(s=>s.at===revealed&&revealed>1)}
window.CrownlightGrmlTalia=Object.freeze({stageAt,describe,isCheckpoint,stageCount:stages.length});
})();
