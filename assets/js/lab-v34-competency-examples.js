/* 30 competency-linked ORIGINAL illustrative worked-case scaffolds.
 * A single bridge covers all canonical Lab mappings and thirty Bootcamp days.
 * Examples teach the method, not proprietary historical candles, private
 * grading rubrics, legal compliance or promised trade outcomes.
 */
(function(root){'use strict';
const examples={
CHART_STRUCTURE:[
 'Illustrative pivots: first swing high $10.20, later high $10.50; first low $9.70, later low $9.90.',
 'Compare like-defined pivots: $10.50 is a higher high; $9.90 is a higher low.',
 'This sequence supports an advancing structure under that pivot rule; it does not prove the next swing rises.',
 'New-case practice: compare highs $8.70 and $8.55 and lows $8.10 and $7.95. Identify the structure and any ambiguity.'
],
CANDLE_READING:[
 'Illustrative five-minute candle: O $31.00, H $32.50, L $30.50, C $32.00.',
 'Body=|$32−$31|=$1; range=$32.50−$30.50=$2; body percentage=1÷2×100=50%.',
 'The high and low are wick extremes. OHLC cannot show whether the high preceded the low.',
 'New case: O $12.40, H $12.70, L $11.90, C $12.10. Calculate body, range and direction.'
],
VWAP_CONTEXT:[
 'Illustrative trades: 200 shares at $8 and 100 at $10; the shares count as weights.',
 'Dollar value=$1,600+$1,000=$2,600; shares=300; VWAP=$2,600÷300≈$8.67/share.',
 'A simple $9 average misrepresents unequal volumes. Bar-close VWAP, where used, is an approximation.',
 'New case: 150 shares at $12 and 50 at $16. Calculate the weighted average and identify the session boundary.'
],
EMA_CONTEXT:[
 'An EMA updates from a completed close and its previous value; α=2÷(N+1) for period N.',
 'For EMA9, α=0.20; for EMA20, α≈0.0952. EMA9 reacts more quickly to the same closing-price change.',
 'Without enough prior completed closes, a precise historical EMA reading cannot be reconstructed.',
 'New case: prior EMA9=$10.00 and current close=$10.50. Compute the new EMA9.'
],
VOLUME_ANALYSIS:[
 'Illustrative five-minute volumes: prior comparable-bar average 100 shares; current bar 300 shares.',
 'Relative volume=300÷100=3.0×, provided the durations and baseline definition match.',
 'Volume counts shares, not distinct people or the net number of buyers. It does not guarantee direction.',
 'New case: 225 current shares versus a 150-share same-duration average; calculate relative volume.'
],
MULTI_TIMEFRAME:[
 'Illustrative daily chart makes a higher low while a one-minute chart briefly makes a lower low.',
 'Identify which observations belong to which timeframe before describing agreement or conflict.',
 'A one-minute move cannot establish that the daily structure has changed without observing the daily reference.',
 'New case: compare a five-minute resistance level with a one-minute attempted breakout; state what confirms either one.'
],
BREAKOUT_RECOGNITION:[
 'Illustrative resistance is $10.00 and a completed five-minute candle wicks to $10.12 but closes at $9.96.',
 'A close-based breakout rule has NOT been confirmed merely because the wick exceeded $10.00.',
 'State the rule and candle completion boundary before checking price. Future candles may not rewrite the earlier decision.',
 'New case: resistance $7.50, close $7.58, but low liquidity; identify what is observed and what remains unverified.'
],
FAILED_BREAKOUT:[
 'Illustrative close-based resistance $10.00: one candle closes $10.08, the following candle closes $9.89.',
 'The later close documents a move back below the level, under a clearly stated failure definition.',
 'The failure is observable only after that later bar completes; do not use it to grade the earlier prediction.',
 'New case: explain how a wick-only break differs from a confirmed-and-later-failed breakout.'
],
PULLBACK_RECOGNITION:[
 'Illustrative price makes higher highs and higher lows; one bar retreats within the existing swing range.',
 'A pullback is a counter-move inside a defined structure, not automatically a trend reversal.',
 'Confirm the pivot rule and invalidate the idea if the structural low is breached under the chosen rule.',
 'New case: a pullback breaks the most recent comparable low; explain the competing interpretations.'
],
HOD_PM_LEVELS:[
 'HOD means Highest price of the Day so far; PMH means Premarket High, subject to a specified session boundary.',
 'Illustrative premarket high=$9.85, regular-session high so far=$10.05. They are different reference windows.',
 'Mark the session and timestamp. An unfinished candle or future high cannot be borrowed into the earlier pause.',
 'New case: regular-session price reaches $9.90 after PMH=$9.95. State whether PMH has been exceeded.'
],
RCT_RECOGNITION:[
 'Use the specifically taught Red Candle Theory criteria to describe an observed completed red candle and the following price action.',
 'Mark where the red candle begins and ends and which later observation is actually visible.',
 'A red candle by itself neither guarantees a reversal nor proves later participation.',
 'New case: compare a red candle followed by a higher close with one followed by another lower close; state what differs.'
],
SQUEEZE_CONTEXT:[
 'Illustrative stock advances rapidly while spread widens from $0.02 to $0.12 and volume increases.',
 'The chart shows extension and liquidity change, not verified short-covering or any participant identity.',
 'Compare price, spread, volume and invalidation; avoid claiming a squeeze without independent evidence.',
 'New case: observe a vertical price rise on declining volume. What alternative explanations should remain open?'
],
RISK_PER_SHARE:[
 'Illustrative proposed long entry $10.00 and defined invalidation/stop $9.60.',
 'Risk per share=$10.00−$9.60=$0.40 before slippage, fees, or gaps.',
 'The stop is an assumption about an exit condition, not a guarantee of execution at $9.60.',
 'New case: entry $6.25 and stop $6.05. Find planned risk per share.'
],
POSITION_SIZING:[
 'Illustrative permitted dollar risk=$20, proposed long entry=$10, invalidation=$9.60.',
 'Risk/share=$0.40. Max whole shares by risk= floor($20÷$0.40)=50 shares before other constraints.',
 'Check buying power, quote depth, fee/slippage and broker rules; theoretical size is not an order recommendation.',
 'New case: planned dollar risk $18, risk/share $0.30. What is the maximum whole-share calculation?'
],
RISK_REWARD:[
 'Illustrative long entry $10.00, stop $9.60 and hypothetical target $11.20.',
 'Risk=$0.40/share; potential reward=$1.20/share; reward/risk=$1.20÷$0.40=3:1 (3R).',
 'The target, stop and fill remain hypothetical; a 3R setup does not guarantee profitable expectancy.',
 'New case: entry $8, stop $7.75, target $8.50. Calculate reward/risk.'
],
ORDER_SELECTION:[
 'Illustrative buy limit is $10.00 for 100 shares, but only 40 shares are available at eligible prices.',
 'The order may remain open or fill only 40 shares. A limit restricts eligible execution price, not availability.',
 'Read broker-reported filled quantity; a chart trade at $10.00 cannot establish your order executed.',
 'New case: compare a market order during a wide spread with a limit order that may not fill.'
],
SLIPPAGE_SPREAD:[
 'Illustrative best bid=$9.90, best ask=$10.10, midpoint=$10.00.',
 'Quoted spread=$10.10−$9.90=$0.20/share, or 2% of this midpoint.',
 'Spread cost and actual slippage depend on order behavior, execution and price changes.',
 'New case: bid $4.98, ask $5.02. Find dollar spread and percent of midpoint.'
],
CATALYST_ANALYSIS:[
 'A illustrative company announces an offering at 8:35 a.m. ET; another unsourced social post claims an acquisition.',
 'Record which statement has a primary issuer or filing source, its timestamp and precise claim.',
 'Price reaction cannot prove the catalyst caused all trades; do not confuse rumor with confirmed disclosure.',
 'New case: two headlines conflict. Identify what filing or issuer release would resolve the discrepancy.'
],
FLOAT_SUPPLY:[
 'Illustrative reported public float=5 million shares on a specific filing date; daily volume=10 million shares.',
 'Volume÷dated float=2× reported turnover. It does not mean every share traded twice or that ten million unique holders bought.',
 'Corporate actions and offerings can alter share counts; use date-appropriate documentation.',
 'New case: 12 million volume versus 8 million dated float. Compute turnover and state the limitations.'
],
SEC_FILINGS:[
 'Locate an SEC filing by issuer name, filing type, filed date and accession number.',
 'Separate company statements in a dated filing from historical prices and interpretations of likely dilution.',
 'A filed document may describe plans or contingencies rather than a completed event.',
 'New case: compare an S-3 registration and a later 8-K reporting a completed transaction; do not conflate them.'
],
CANDIDATE_QUALITY:[
 'Illustrative scanner shows +30% price change but a $0.20 quoted spread on a $2 stock.',
 'Spread as percent of $2 midpoint is about 10%, before depth, halts or slippage.',
 'A ranking on percentage gain is not a complete trade-quality assessment.',
 'New case: compare a liquid +12% candidate and a very wide-spread +40% candidate without assuming either is profitable.'
],
MARKET_REGIME:[
 'Illustrative index trend is choppy while an individual stock briefly breaks above its morning high.',
 'Distinguish broad context from that stock’s independently observed prices and volume.',
 'A favorable broad regime cannot guarantee an individual continuation.',
 'New case: explain how your decision changes if index volatility increases while the stock level remains unchanged.'
],
TAPE_READING:[
 'Illustrative print: 09:30:04, execution price $10.02, 250 shares. These are completed trade facts.',
 'Compare with timestamp-aligned bid/ask quotes to characterize where execution occurred.',
 'Color coding alone does not prove buyer identity, intent or a guaranteed next print.',
 'New case: a 500-share print occurs between bid and ask. What can and cannot be concluded?'
],
LEVEL2_READING:[
 'Illustrative best bid $10.00 for 350 shares and ask $10.03 for 280 shares.',
 'The best quoted spread is $0.03; available displayed sizes can change or cancel.',
 'Displayed depth is not a guarantee that a 350-share order will execute at the quoted price.',
 'New case: ask size disappears while the best ask rises. Identify what the quote display actually establishes.'
],
HALTS_LULD:[
 'A stock becomes subject to a regulatory or volatility pause. Open orders may remain affected by venue/broker rules.',
 'Record an authoritative halt notice, the effective time and the reopening information, rather than inferring solely from flat prints.',
 'LULD bands and halt mechanisms vary by security, session and current exchange rules.',
 'New case: a chart appears frozen but no official halt is confirmed. List alternate causes and the verification source.'
],
ENTER_WATCH_NO_TRADE:[
 'Illustrative stock is near a breakout level but its current spread is too wide for the prewritten risk plan.',
 'Document ENTER, WATCH, or NO TRADE as conditional education decisions grounded in observable requirements.',
 'No-trade can be the correct process outcome; a later rally cannot retroactively invalidate the earlier evidence.',
 'New case: the price condition is met but liquidity is missing. Explain a defensible WAIT/NO TRADE response.'
],
INVALIDATION_DISCIPLINE:[
 'Illustrative long hypothesis requires a five-minute close above $10.00; invalidation is a completed close below $9.80.',
 'Write those criteria BEFORE observing subsequent candles or results.',
 'A predetermined rule documents a decision boundary, not a guaranteed exit fill.',
 'New case: the level changes after entry. Explain when changing an invalidation would be hindsight bias.'
],
CHASE_FOMO_DISCIPLINE:[
 'Illustrative momentum candle jumps from $5.00 to $5.70 while the spread widens and planned risk worsens.',
 'Check whether your original entry/risk conditions still hold rather than following price out of urgency.',
 'A subsequent further rise does not prove the earlier chase was process-correct.',
 'New case: plan required a pullback but price never pulls back. Document the no-entry decision.'
],
MFE_MAE_REVIEW:[
 'Illustrative long entry=$10.00. After entry, highest observed price=$10.50 and lowest=$9.80.',
 'MFE is maximum favorable excursion=$0.50/share. MAE is maximum adverse excursion=$0.20/share (magnitude).',
 'These extremes do not establish which occurred first; comparison needs matching holding-window observations.',
 'New case: entry $6.20, peak $6.40, trough $6.05. Calculate MFE and MAE and explain the boundaries.'
],
INDEPENDENT_PLAN:[
 'Illustrative planning worksheet specifies concept, market session, observation boundary, entry condition and invalidation.',
 'Record risk/share, expected reward, liquidity requirements, whether a catalyst is verified, and a no-trade rule.',
 'Do not evaluate a plan by cherry-picking its eventual outcome; review contemporaneous evidence and process.',
 'New case: remove the verified liquidity field. Explain why the plan is now incomplete.'
]
};
const watchlistSteps=Object.freeze([
 'A watchlist is a dated research list, NOT a scanner result, buy order or forecast. Name the company, the available source, its timestamp, the review rule and the reason for inclusion.',
 'FICTIONAL Example A: the dated issuer statement is independently verified at 08:35 ET, with a $0.04 spread. WATCH means research remains eligible under the defined conditions, not buy.',
 'FICTIONAL Example B: only a social repost is available. Mark VERIFY and identify the original issuer document and timestamp still missing.',
 'FICTIONAL Example C: $2 midpoint and $0.20 spread mean a 10% quoted spread. A hypothetical 3% classroom maximum rejects the candidate as NO TRADE, despite the scanner ranking.'
]);
const get=(code,title='')=>{
 const items=/\bwatchlist\b/i.test(String(title))?watchlistSteps:examples[String(code||'')];
 if(!items)return null;
 return Object.freeze({source:'original-illustrative-competency-scenario',steps:[...items],code});
};
function create({code,title='',stage=1}={}){
 const scenario=get(code,title);
 if(!scenario||!root.document?.createElement)return null;
 const node=(tag,value,cls)=>{
  const n=root.document.createElement(tag);
  if(value!==undefined)n.textContent=String(value);
  if(cls)n.className=cls;
  return n;
 };
 const surface=node('section',undefined,'gu-l33-graphic gu-v34-competency-visual');
 surface.setAttribute('aria-label','Interactive illustrative competency worked example');
 const head=node('div',undefined,'gu-l33-head');
 head.append(node('h3',title||String(code).replaceAll('_',' ')||'Worked study case'));
 head.append(node('span','SIMULATED · STUDY ONLY','gu-v34-evidence-label'));
 surface.append(head,node('p',/\bwatchlist\b/i.test(title)
  ?'FICTIONAL watchlist worksheet. Scanner results are discovery inputs only; rows are not orders or verified historical trades.'
  :'This is a separate, original educational example. It is not the book’s verified historical chart or a graded assessment.','gu-v34-evidence-note'));
 if(/\bwatchlist\b/i.test(title)){
  const table=node('table',undefined,'gu-v34-watchlist-table');
  table.append(node('caption','Fictional watchlist — observed 08:35 ET'));
  const header=node('thead'),headerRow=node('tr');
  for(const label of ['Candidate','Source at pause','Quoted spread','Research decision'])headerRow.append(node('th',label));
  header.append(headerRow);table.append(header);
  const rows=[
   ['Example A','Dated issuer statement verified','$0.04','WATCH · conditional'],
   ['Example B','Social repost only; source missing','Unverified','VERIFY primary source'],
   ['Example C','Illustrative scanner +30%','$0.20 on $2 (10%)','NO TRADE · 3% classroom rule']
  ];
  const body=node('tbody');
  for(const values of rows){const row=node('tr');for(const value of values)row.append(node('td',value));body.append(row)}
  table.append(body);surface.append(table);
 }
 const actions=node('div',undefined,'gu-l33-interactive-tools');
 actions.setAttribute('role','group');actions.setAttribute('aria-label','Choose an example step');
 const display=node('div',undefined,'gu-v34-example-step');
 display.setAttribute('role','status');
 const counter=node('p',undefined,'gu-v34-example-counter');
 const explanation=node('p',undefined,'gu-v34-example-explanation');
 const stepButtons=[];
 let current=0;
 const select=(index,announce=true)=>{
  if(!Number.isInteger(index)||index<0||index>=scenario.steps.length)return;
  current=index;
  counter.textContent='Worked case '+(index+1)+' of '+scenario.steps.length;
  explanation.textContent=scenario.steps[index];
  stepButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  if(announce&&typeof CustomEvent==='function')surface.dispatchEvent(new CustomEvent('gu-v34-visual-focus',{
   bubbles:true,detail:{type:'general',feature:'case-'+index}
  }));
 };
 scenario.steps.forEach((_,i)=>{
  const button=node('button','Step '+(i+1),'gu-l33-view-btn');
  button.type='button';button.setAttribute('data-teaching-feature','case-'+i);
  button.addEventListener('click',()=>select(i));actions.append(button);stepButtons.push(button);
 });
 const next=node('button','Next worked step →','gu-v34-next-step');
 next.type='button';next.addEventListener('click',()=>select((current+1)%scenario.steps.length));
 actions.append(next);
 display.append(counter,explanation);
 surface.append(actions,display);
 select(0,false);return surface;
}
root.GroundUpLabV34CompetencyExamples=Object.freeze({get,create,codes:Object.freeze(Object.keys(examples)),version:'3.4.0'});
})(globalThis);
