/* Crownlight V3: first-party, ungraded Talia research guidance.
 * Provides evidence prompts and Lab study topics. No hidden assessment keys,
 * no graded mastery, no financial recommendation and no outside API calls.
 */
(function(root){
 'use strict';
 const packs=Object.freeze({
  DISCOVER:{topic:'Watchlist foundations',objective:'Identify the company and separate a ticker idea from a trading decision.',
   exercise:'Find the issuer, security type, catalyst date, and your source. What would make you reject the ticker immediately?',
   mistake:'Confusing a trending symbol with an authorized and reliable research source.'},
  RESEARCH:{topic:'Catalysts, provenance and research chronology',objective:'Distinguish publication time from observation time and verify the original claim.',
   exercise:'Record the earliest public source and what is still unverified. Could this information have been known at your observation time?',
   mistake:'Using an article posted later to justify an earlier decision.'},
  ANALYZE:{topic:'Market structure and risk',objective:'Name two evidence-backed levels and a clear invalidation condition.',
   exercise:'Document support, resistance, liquidity constraints, and how a conflicting higher timeframe would affect the setup.',
   mistake:'Treating a static price level as a guarantee or an instruction to trade.'},
  MONITOR:{topic:'Manual pattern recognition',objective:'Set testable conditions without mistaking a research alert for a trade signal.',
   exercise:'Which documented observation would require you to review, and what price or volume data is not yet independently verified?',
   mistake:'Reading a stale, member-entered price as a real-time alert.'},
  PLAN:{topic:'Pre-trade decision planning',objective:'Write a conditional entry, invalidation, reward/risk, and NO TRADE alternative.',
   exercise:'Would your position-size model still be acceptable with slippage and spread? What cancels the plan?',
   mistake:'Calling a proposed setup a filled brokerage trade.'},
  PRACTICE:{topic:'Fictional replay and no-trade decisions',objective:'Use an authorized rehearsal while keeping hidden future observations out of the decision.',
   exercise:'Record the decision boundary and an explanation before revealing any new simulated bar.',
   mistake:'Claiming practice reveals an achievable live execution price.'},
  REVIEW:{topic:'Research-process review',objective:'Compare the original plan, source quality and recorded process without inventing P&L.',
   exercise:'Which risk was identified early? Which review conditions were documented versus reconstructed afterward?',
   mistake:'Marking an unexecuted idea as a profitable trade.'},
  LEARN:{topic:'Transfer and spaced learning',objective:'State one reusable decision rule and a counterexample that would invalidate it.',
   exercise:'Explain the idea to a new learner, then identify the lab or guided exercise that could test it independently.',
   mistake:'Equating the presence of a note or a completed click with demonstrated mastery.'}
 });
 function forStage(stage){return packs[stage]||packs.DISCOVER}
 const API=Object.freeze({packs,forStage});
 root.GroundUpWatchlistLearningV3=API;
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
