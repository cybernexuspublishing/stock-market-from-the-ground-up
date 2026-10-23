/* The Stock Market: From the Ground Up — supplementary original practice.
 * Adapted from owner-provided STT_ORIGINAL_PRACTICE_BANK_2026-10-21_H.md.
 * Source status: ORIGINAL DRAFT / EDITORIAL REVIEW PENDING.
 * NOT official, graded, historical, live-market or financial advice.
 */
(function(root){
'use strict';
const CASES=Object.freeze([
 {id:'H-01',match:/\bvwap\b|\bplan\b|reclaim|session/i,title:'Different plans need their own evidence',
  setup:'Plan A requires a regular-session break above $20 after 9:45 a.m. ET. An 8:50 a.m. move crosses $20. Plan B, written at noon, requires a VWAP reclaim and a separate confirmation; the reclaim appears at 12:20 p.m. but confirmation remains unknown.',
  question:'Which conditions are actually met? Can one plan retrospectively validate another?',
  feedback:'The 8:50 a.m. crossing fails Plan A’s session and time conditions. Plan B has a potential reclaim but not its required confirmation. A later plan cannot be used to repair the earlier decision.',
  limit:'These are fictional plan definitions, not universal trading entry rules.'},
 {id:'H-02',match:/\bjournal\b|trading thesis|trade plan|holding period/i,title:'Keep the original trade thesis intact',
  setup:'A hypothetical short-term plan enters at $10 with a $9.50 invalidation reference. After the original thesis fails, the learner changes the journal label to “long term” without new research.',
  question:'What new evidence would be required before a truly separate long-term plan could be evaluated?',
  feedback:'A label change does not alter the failed short-term thesis. Preserve the original trade record and distinguish any new investment horizon, evidence, position sizing, risks and exit logic.',
  limit:'An invalidation reference does not guarantee the available execution price.'},
 {id:'H-03',match:/reward.?risk|risk.?reward|\btarget\b|\bstop\b|expectancy/i,title:'A larger target changes arithmetic, not probability',
  setup:'Hypothetical entry: $11. Invalidation reference: $10. Compare upside objectives of $15 and $16. No fill likelihood or win probability has been supplied.',
  question:'Calculate the two modeled reward/risk price-distance ratios. Does either ratio establish a profitable strategy?',
  feedback:'The modeled ratios are ($15−$11)/($11−$10)=4R and ($16−$11)/($11−$10)=5R. A more distant target increases the arithmetic reward but provides no information about its probability or execution.',
  limit:'Does not incorporate commissions, liquidity, slippage or probabilities.'},
 {id:'H-04',match:/\bspread\b|bid.*ask|level\s*(ii|2)|liquidity|order book/i,title:'An attractive move can still fail your plan',
  setup:'A fictional candidate quotes bid $9.90 and ask $10.10. This exercise’s maximum acceptable spread is $0.05. Halt information is unresolved. You have not observed any future price movement.',
  question:'Calculate the quoted spread, identify failed or unknown conditions and decide whether the candidate qualifies under this particular plan.',
  feedback:'Spread = $10.10−$9.90 = $0.20, above this scenario’s $0.05 threshold. The unresolved halt state is another blocker. No-trade is consistent with the declared exercise conditions, even if price later rises.',
  limit:'The threshold is specific to this fictional exercise, not a universal rule.'},
 {id:'H-05',match:/\bfees\b|\bcosts\b|\bnet\b|position sizing|reward.*risk/i,title:'Targets, gross returns and net returns differ',
  setup:'A fictional long has entry $14.50, invalidation reference $13.75, 100 shares and assumed round-trip costs of $5. Compare objectives at $16.75 and $17.00.',
  question:'Calculate gross risk, gross profits, net modeled winning results and how a higher target changes the ratio.',
  feedback:'Gross modeled risk: 100×($14.50−$13.75)=$75. Gross gains: $225 and $250. After $5 costs: $220 and $245. Modeled losing outcome after costs is −$80. Ratios of net-win magnitude to net-loss magnitude are 2.75 and 3.0625 under the stated assumptions.',
  limit:'These are exact-fill arithmetic assumptions. Actual prices, liquidity and costs may differ.'},
 {id:'H-06',match:/\bearnings\b|catalyst|event timing|news release|filing/i,title:'Event timing and confirmation are separate conditions',
  setup:'A fictional plan allows evaluation only after an earnings release and a defined post-event observation. A breakout occurs before release. A second breakout occurs afterward, but confirmation evidence is unavailable.',
  question:'Does either observation meet every condition of the stated plan? What additional evidence is needed?',
  feedback:'The first breakout fails the timing condition. The second satisfies post-event timing but lacks the separate required confirmation. Neither is fully qualified based on the supplied information.',
  limit:'The scenario is not a universal instruction to avoid every earnings event.'},
 {id:'H-07',match:/\btape\b|market structure|price action|breakout|volume analysis|pattern/i,title:'Observed prices do not prove participant motives',
  setup:'A fictional completed chart crosses a previously observed high. Commentary claims that all shorts were forced out and all earlier holders sold. No positions, orders or ownership data accompanies the claim.',
  question:'Which statements are observations, which are interpretations, and what additional evidence would be needed?',
  feedback:'A price crossing may be observed from an appropriately scoped chart. The reasons particular investors traded, or whether they closed positions, cannot be established from that chart alone. Mark commentary as an unverified interpretation.',
  limit:'Even dated position reports have their own reporting delays and evidentiary limits.'},
 {id:'H-08',match:/\bscanner\b|\bscan\b|\bwatchlist\b|candidate selection|eligibility/i,title:'An empty qualified shortlist is a valid result',
  setup:'None of the hypothetical stocks meets every required filter in a predefined scanner. One popular candidate fails two core conditions, and there was no separate speculative plan before the scan.',
  question:'Should the failed candidate be added to the core watchlist just to avoid an empty result?',
  feedback:'No. Under this fictional plan, the core shortlist is empty. Another strategy would need its own predeclared criteria and risk framework. An empty result is not a failed research session.',
  limit:'This does not prohibit evaluating a distinct plan; it prohibits silently rewriting the first one.'}
]);
const text=(tag,s)=>{const e=document.createElement(tag);e.textContent=s;return e};
function choose(topic){
 const value=String(topic||'');
 return CASES.find(c=>c.match.test(value))||null;
}
function create({topic='',labId=''}={}){
 const c=choose(topic);
 if(!c)return null;
 const outer=document.createElement('details');outer.className='gu-v33-workshop';
 const heading=text('summary','Applied Decision Workshop · '+c.title);
 outer.append(heading);
 outer.append(text('p','Fictional original practice ('+c.id+'). Supplemental instruction awaiting editorial review; not a scored assessment.'));
 const scenario=text('p',c.setup);scenario.className='gu-v33-workshop-scenario';outer.append(scenario);
 outer.append(text('p',c.question));
 const label=text('label','Explain your interpretation using only the facts stated');
 const field=document.createElement('textarea');field.rows=4;field.maxLength=1800;
 field.placeholder='Identify the observed facts, failed/missing conditions, and what would invalidate your interpretation.';
 label.append(field);outer.append(label);
 const result=text('p','');result.setAttribute('role','status');result.className='gu-v33-workshop-status';
 const button=text('button','Lock and review this example');button.type='button';
 button.addEventListener('click',()=>{
  if(field.value.trim().length<25){result.textContent='Record at least 25 characters of your own analysis before viewing the explanation.';return;}
  field.disabled=true;button.disabled=true;
  result.textContent='Your interpretation has been locked for this local, ungraded exercise.';
  const review=document.createElement('section');review.className='gu-v33-workshop-feedback';
  review.append(text('strong','Guided interpretation'));
  review.append(text('p',c.feedback),text('p','Limitations: '+c.limit));
  outer.append(review);
 });
 outer.append(button,result);
 return outer;
}
root.GroundUpLabV33DecisionWorkshop=Object.freeze({create,choose,caseIds:CASES.map(x=>x.id),version:'original-research-v1'});
})(globalThis);
