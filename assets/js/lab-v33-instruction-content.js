/* LAB-UX-STD-001 — grounded, curriculum-linked instructional content.
 * No assessed answer keys, future replay bars, trade advice or grade data.
 * Concrete demonstration values are explicitly illustrative. Source guide fields
 * are passed only after server-authorized Lab access in the shared engine.
 */
(function(root){
'use strict';
const clean=(value,max=900)=>String(value||'').trim().slice(0,max);
const sentence=(s)=>/[.!?]$/.test(s)?s:s+'.';
const currency=n=>'$'+Number(n).toFixed(2);
const domains={
 watchlist:{
  name:'Creating a stock watchlist',
  explanation:[
   'A stock watchlist is a dated list of securities to observe or research. It is NOT a buy list, a brokerage order, or a forecast. A scanner searches for securities matching filters; a watchlist holds chosen candidates with their evidence and conditions for further review.',
   'For each candidate record the issuer, observation time and time zone, verified catalyst/source, price and liquidity context, why you are watching, next review time, and what would remove it from the list.',
   'Use WATCH, VERIFY or NO TRADE as educational decisions. A large percentage gain does not establish source reliability, sufficient liquidity, a low spread or an entry signal.'
  ],
  example:[
   'FICTIONAL Example A: a dated issuer announcement is verified at 08:35 ET and the quoted spread is $0.04. Mark WATCH only while research and risk conditions are satisfied—not as an order.',
   'Example B has only an unverified social repost. Mark VERIFY and specify which original company document and publication time must be checked.',
   'Example C has a fictional $2.00 midpoint and a $0.20 quoted spread: $0.20 ÷ $2.00 = 10%. Under an illustrative 3% maximum-spread classroom rule, mark NO TRADE even if the scanner ranks the stock highly.',
   'Independent practice: record a new candidate and document its source, dated observation, reason for watching, invalidation condition and review time.'
  ],
  misconception:'A scanner result is not automatically a watchlist decision. A watchlist item is not a trading recommendation, entry signal or completed order.',
  limitation:'Quotes change, screenshots may be stale, and no watchlist ranking guarantees an execution or return.',
  check:{question:'A scanner flags a high percentage gainer with an unverified news repost. Does adding it to a watchlist make it a buy? What must be verified first?',
   choices:['No: verify the original dated issuer source and the observation conditions','Yes: scanner rank proves it is a buy'],correct:0,
   feedback:'A watchlist organizes research. Confirm primary source, timestamp and market conditions; no list membership authorizes a trade.'},
  experiment:'Change one watchlist input—source verification, spread or review time. Explain whether WATCH, VERIFY or NO TRADE changes, without looking ahead.',
  transfer:'On a new fictional candidate, state why it deserves research, what data is still missing and the rule that would remove it from the watchlist.'
 },
 candle:{
  name:'Candlestick anatomy',
  explanation:[
   'A candle represents one specified time interval, not an entire day unless the chart uses daily candles. Open (O) is its first recorded price, High (H) the highest, Low (L) the lowest, and Close (C) the last recorded price of that interval.',
   'The rectangular body spans Open to Close. The thin upper and lower lines, called wicks or shadows, extend toward High and Low. Close above Open makes an up candle; Close below Open makes a down candle. Candle color is a chart convention, not a guarantee of the next move.',
   'The body measures |Close − Open|. The full range measures High − Low. Body-to-range percentage equals body ÷ range × 100, provided range is greater than zero. Both calculations use prices from the SAME completed candle.'
  ],
  example:[
   'For a DIFFERENT illustrative 5-minute candle, let Open = $20.00, High = $22.00, Low = $19.00, and Close = $21.20.',
   'Body = |$21.20 − $20.00| = $1.20. Full range = $22.00 − $19.00 = $3.00.',
   'Body share of range = $1.20 ÷ $3.00 × 100 = 40%. It is a bullish candle because Close > Open, but this does not establish that the next candle will rise.'
  ],
  misconception:'The high-to-low difference is the FULL RANGE, not the real body. A bullish close also does not tell you whether the high occurred before or after the low.',
  limitation:'OHLC does not reveal the intrabar order of prices, who bought or sold, or the next interval’s direction.',
  check:{question:'Which prices determine a single candle’s real body?',choices:['High and Low','Open and Close','Close and volume'],correct:1,feedback:'The real body connects Open and Close. High minus Low instead produces the full range.'},
  experiment:'When Close moves while Open, High and Low stay fixed, body length and direction can change. Compare the new Close to Open; then recalculate |Close − Open| and divide by the unchanged range.',
  transfer:'A new candle may close below its open. The body remains an ABSOLUTE price distance; direction is a separate observation.'
 },
 vwap:{
  name:'Volume-Weighted Average Price',
  explanation:[
   'VWAP means Volume-Weighted Average Price. It estimates the average execution price over a defined set of trades, giving more influence to prices where more shares traded. It is not simply the midpoint between the highest and lowest prices.',
   'For each trade or group of trades, multiply execution price (dollars per share) by shares. This gives traded dollars. Add those traded dollars, add those shares, and divide cumulative dollars by cumulative shares.',
   'The symbol Σ means SUM across observations: VWAP = Σ(price × shares) ÷ Σ(shares). A chart based only on bar closing price times bar volume is an APPROXIMATION of trade-level VWAP. Always establish the session and available data.'
  ],
  example:[
   'Illustrative trades: 100 shares at $10.00 and 300 shares at $12.00.',
   'Traded dollars = (100 × $10.00) + (300 × $12.00) = $1,000 + $3,600 = $4,600.',
   'Total shares = 100 + 300 = 400; VWAP = $4,600 ÷ 400 = $11.50 per share. The heavier $12 trading pulls VWAP toward $12.'
  ],
  misconception:'A simple average ($10 + $12) ÷ 2 = $11 ignores that three times as many shares traded at $12.',
  limitation:'Price crossing VWAP does not prove a breakout, supply/demand motive, or an entry signal. Session boundaries and underlying trade data matter.',
  check:{question:'Why does a 300-share execution influence VWAP more than a 100-share execution?',choices:['Its price is always newer','VWAP weights each execution by shares','The high price automatically wins'],correct:1,feedback:'VWAP uses the traded share count as the weight. Multiply prices by shares, then divide summed dollars by summed shares.'},
  experiment:'Hold two illustrative prices constant and increase shares at the higher price. The weighted average moves toward that price. Only the weights changed; no future price was predicted.',
  transfer:'In a new case, recalculate from the beginning of the selected session. Do not copy a VWAP number between different session definitions.'
 },
 ema:{
  name:'Exponential moving averages',
  explanation:[
   'An exponential moving average (EMA) is a moving reference computed from past prices. Compared with a simple moving average of the same length, it gives greater relative weight to recent observations.',
   'For a length N EMA, the smoothing factor is α = 2 ÷ (N + 1). Each new EMA equals the previous EMA plus α times (the new completed close minus the previous EMA). For EMA9, α = 0.2. For EMA20, α is about 0.0952.',
   'A close above an EMA describes price LOCATION relative to a lagging calculation. It does not prove why people traded or guarantee follow-through. Never read a future candle into an EMA computed at an earlier observation boundary.'
  ],
  example:[
   'Illustrative EMA9: previous EMA = $10.00; current completed close = $10.50.',
   'EMA9 = $10.00 + 0.2 × ($10.50 − $10.00) = $10.10.',
   'The EMA rises by $0.10, not by the full $0.50 price change. Its actual historical starting value depends on the selected price history.'
  ],
  misconception:'EMA9 and EMA20 are references, not exact support prices or predictions; a faster EMA crossing a slower one can fail.',
  limitation:'EMA values depend on historical initialization, chosen interval, price input, and any extended-hours settings.',
  check:{question:'Why does EMA9 generally react faster than EMA20?',choices:['EMA9 weights recent prices more strongly','EMA9 uses future candles','EMA20 ignores every new close'],correct:0,feedback:'EMA9 has a larger smoothing factor, so a newly completed close has a greater effect.'},
  experiment:'Hold the previous EMA steady, then move the newly completed price in the hypothetical example. Watch the calculated EMA change only by its smoothing factor.',
  transfer:'An EMA relationship observed on a one-minute chart does not automatically describe the five-minute or daily chart.'
 },
 volume:{
  name:'Trading volume and participation',
  explanation:[
   'Volume is the number of shares traded during a stated interval. A five-minute volume bar belongs to the same time period as the five-minute price candle directly above it.',
   'Relative volume compares that share count with an appropriate baseline. Before saying volume is unusually high, define which periods are being compared; premarket and regular-session averages may not be comparable.',
   'Volume measures participation, not the identity or motives of buyers and sellers. More traded shares alongside an upward candle does not establish that all participants expect further gains.'
  ],
  example:[
   'Illustrative example: one five-minute candle trades 60,000 shares; a comparable baseline is 20,000 shares per five-minute interval.',
   'Relative interval volume = 60,000 ÷ 20,000 = 3.0 times the chosen baseline.',
   'That establishes a higher share count for this interval. It does not by itself verify a successful breakout.'
  ],
  misconception:'Confusing high volume with guaranteed liquidity or guaranteed continuation.',
  limitation:'Time-of-day, session type, data quality and float can change the meaning of a raw volume figure.',
  check:{question:'What does a five-minute volume bar directly measure?',choices:['Shares traded in that five-minute period','Number of investors who were profitable','Guaranteed available shares at the ask'],correct:0,feedback:'Volume counts executed shares in the interval. It is not an order-book depth or investor-profit measure.'},
  experiment:'Compare two completed candles with the same price movement but different executed-share counts. Decide what changed and what remains unknown.',
  transfer:'When comparing a new interval, use an appropriate volume baseline for its time of day and session.'
 },
 structure:{
  name:'Sequential price structure',
  explanation:[
   'Price structure emerges from a SEQUENCE of completed candles and meaningful reference levels. A higher high occurs when a defined swing high exceeds a prior comparable swing high; a higher low occurs when a defined swing low exceeds an earlier comparable swing low.',
   'A breakout describes a move across a previously identified level. You must specify whether your method requires a wick through the level, a candle close above it, or additional confirmation. Those rules are not interchangeable.',
   'A failed breakout becomes identifiable only as additional permitted evidence appears. At a historical pause, hide later candles and separate what is already observed from possible future outcomes.'
  ],
  example:[
   'Illustrative swing highs: $10.20 then $10.65; swing lows: $9.70 then $10.05, using the same swing definition.',
   'The second high is higher by $0.45 and the second low by $0.35. That is evidence of a higher-high/higher-low sequence in this simplified example.',
   'One later decline or an unconfirmed wick could challenge the interpretation; the two observations do not guarantee continuation.'
  ],
  misconception:'Labeling every green candle a higher high, or treating a momentary probe above resistance as a confirmed close-based breakout.',
  limitation:'Swing definitions, timeframe, liquidity, and confirmation criteria can change the interpretation.',
  check:{question:'Which is evidence of a higher low?',choices:['A later swing low above a comparable prior swing low','Any candle that closes green','A future low that has not occurred'],correct:0,feedback:'A higher low compares two already observed, comparable swing lows under the same method.'},
  experiment:'Change the marked resistance level or the definition of confirmation, and see whether the previously observed sequence still qualifies.',
  transfer:'Apply the same swing criteria to a different visible series. Do not use an unrevealed bar to determine the earlier classification.'
 },
 depth:{
  name:'Bid, ask and displayed market depth',
  explanation:[
   'The bid is the highest currently displayed buying price; the ask is the lowest currently displayed selling price. The spread is Ask − Bid, measured in dollars per share.',
   'Level II displays quotes and sizes at several price levels. Displayed depth describes resting interest at an instant, not guaranteed executable liquidity. Orders can be canceled or updated before they fill.',
   'A limit order controls the worst allowed execution price, subject to availability, but does not guarantee that the order executes. The best quote and trade prints should be interpreted together.'
  ],
  example:[
   'Illustrative best bid = $9.90 and best ask = $10.10.',
   'Quoted spread = $10.10 − $9.90 = $0.20 per share; at 100 shares that is a $20 quote-to-quote difference, before fees or market movement.',
   'If this exercise’s written maximum spread is $0.05, the quote does NOT meet that rule. A later favorable outcome does not change the original eligibility decision.'
  ],
  misconception:'Treating every displayed share as an assured fill or using the last traded price as though it were the current ask.',
  limitation:'Quotes can change faster than the display, and hidden liquidity, venue selection and order priority affect executions.',
  check:{question:'What is the quoted spread if bid is $9.90 and ask is $10.10?',choices:['$0.10','$0.20','$20.00 per share'],correct:1,feedback:'Subtract bid from ask: $10.10 − $9.90 = $0.20 per share.'},
  experiment:'Change only the displayed ask price. The spread changes immediately, but an execution is not guaranteed.',
  transfer:'Check both price and share size at the new best quote; a narrow spread alone does not establish sufficient depth.'
 },
 tape:{
  name:'Time & Sales',
  explanation:[
   'Time & Sales, also called the tape, lists completed transactions. Each print ordinarily includes execution time, traded price, and share size. A print reports a trade that occurred; it is not a standing bid or ask.',
   'A platform may color-code prints relative to its quote-classification method. Green or red does not conclusively identify who initiated the trade, let alone a participant’s intention or profitability.',
   'Read print frequency and sizes alongside contemporaneous quotes and the completed price chart. Changes across these views are observations, not proof that a particular investor is accumulating or distributing.'
  ],
  example:[
   'Illustrative prints: 09:30:01 — $10.01 — 150 shares; 09:30:02 — $10.00 — 90 shares; 09:30:04 — $10.02 — 250 shares.',
   'Total printed shares = 150 + 90 + 250 = 490 shares across these three transactions.',
   'The sequence describes execution prices and sizes. Without matching quotes and additional data, it cannot prove the identity or motivation of traders.'
  ],
  misconception:'Equating green prints with “only buyers” or red prints with “only sellers.” Every completed trade has both a buyer and a seller.',
  limitation:'Report delays, aggregation, off-exchange reporting, and quote classification rules can affect interpretation.',
  check:{question:'What is directly observed in a Time & Sales print?',choices:['A trader’s motive','Trade time, execution price and size','The next market price'],correct:1,feedback:'A trade print reports a completed execution and its associated time, price and share quantity.'},
  experiment:'Inspect prints of different sizes and compare their execution prices. Do not infer unseen trader identities.',
  transfer:'In another sequence, distinguish changes in trade size from changes in quote depth.'
 },
 routing:{
  name:'Order handling and settlement',
  explanation:[
   'Placing an order requests action from a broker or trading venue. Submitting the request, receiving an acknowledgment, obtaining an execution, and final settlement are different events.',
   'An order may be filled, partially filled, canceled, rejected, or remain open. Order type, routing, price availability, queue position and applicable rules affect the path.',
   'After execution, clearing and settlement transfer the contractual cash and securities obligations. A conceptual diagram can show the participants without claiming every order follows the same route.'
  ],
  example:[
   'Illustrative order: buy 100 shares with a $10.00 limit. Only 40 shares are offered at or below $10.00 while the order is eligible.',
   'A partial execution of 40 shares is possible, leaving up to 60 unfilled; a full 100-share fill is not automatically guaranteed.',
   'Execution status must come from the broker’s confirmed records, not from a candle crossing the limit price.'
  ],
  misconception:'Confusing a submitted order with a completed trade or treating a simulation price touch as proof of a fill.',
  limitation:'Venue rules, routing arrangements, available depth, and time in force affect actual order outcomes.',
  check:{question:'Does an accepted 100-share limit order prove all 100 shares traded?',choices:['Yes, once the chart touches the limit','No; it may remain open or fill partially','Yes, for every listed stock'],correct:1,feedback:'Submission and execution differ. Review actual order status and filled quantity.'},
  experiment:'Vary available shares at the stated limit in a illustrative order and classify the potential execution as full, partial, or not guaranteed.',
  transfer:'Explain how an order acknowledgment differs from an execution confirmation and a settlement record.'
 }
};
function inferDomain({visualType='',concept='',subject={}}={}){
 if(/\bwatchlist\b/i.test(concept))return 'watchlist';
 if(domains[visualType]&&visualType!=='candle')return visualType;
 if(visualType==='candle'||/\bcandlestick\b|\bcandle\b|\bwick\b|\bohlc\b/i.test(concept))return 'candle';
 if(/\bvwap\b/i.test(concept))return 'vwap';
 if(/moving average|\bema\b|\bsma\b/i.test(concept))return 'ema';
 if(/level ii|order book|bid.{0,16}ask|spread/i.test(concept))return 'depth';
 if(/time and sales|reading the tape|trade print/i.test(concept))return 'tape';
 if(/routing|settlement|partial fill/i.test(concept))return 'routing';
 if(/volume|participation/i.test(concept))return 'volume';
 if(/trend|breakout|support|resistance|higher high|higher low/i.test(concept))return 'structure';
 return 'general';
}
function fromGuide(input){
 const g=input.guide||{},t=input.teaching||{},subject=input.subject||{},concept=clean(input.concept||'this skill',160);
 const definition=clean(t.what||subject.definition||g.concept,800);
 const reason=clean(t.why||subject.why||g.procedure,800);
 const method=(Array.isArray(t.how)?t.how:subject.steps||[]).map(x=>clean(x,250)).filter(Boolean);
 const procedure=clean(g.procedure,650);
 const mistake=clean(subject.error||g.commonError,650);
 const limit=clean(subject.limit||g.limit,650);
 const invalidation=clean(g.invalidation,650);
 const reviewedCase=root.GroundUpLabV34CompetencyExamples?.get?.(g.code);
 const paragraphs=[
  sentence('Today we are learning about '+concept),
  definition?sentence(definition):'Begin with the defined observation and its timeframe.',
  reason?sentence(reason):'Before interpreting a result, identify which facts are actually observable.',
  method.length?sentence('Apply the method in order: '+method.map((v,i)=>(i+1)+'. '+v).join(' ')):procedure?sentence('Apply the procedure: '+procedure):'Record the observation and state what could disprove your conclusion.'
 ];
 return {
  name:concept,
  explanation:paragraphs,
  example:reviewedCase?.steps?.length?reviewedCase.steps:[
   'Worked reasoning for '+concept+': identify the observable evidence and its timeframe first.',
   procedure?sentence(procedure):'Record the input, unit, and observation boundary.',
   invalidation?sentence('Now test the alternative: '+invalidation):'State which additional evidence would change the result.'
  ],
  misconception:mistake||'Do not mistake a possible interpretation for an observed fact.',
  limitation:limit||'A completed observation cannot prove an unseen future result.',
  experiment:procedure||'Change one permitted variable and describe precisely what changed in the observation.',
  transfer:invalidation||'Apply the same rule to a different observation boundary without using future data.',
  check:null
 };
}
/* Learning objectives describe an observable learner skill, not a task
 * instruction that simply repeats the original book's "Explain X" verb.
 * These are instructional objectives, not assessed competency credits. */
const learningOutcomes={
 watchlist:[
  'Distinguish a scanner from a watchlist and explain why neither is an order.',
  'Document the evidence source, time, observation rule and disqualifying condition for a candidate.',
  'Classify fictional candidates as WATCH, VERIFY or NO TRADE using stated information.'
 ],
 candle:[
  'Point to the Open, High, Low and Close on a completed candle and identify its real body and wicks.',
  'Calculate the body, full range and body-to-range percentage using the correct prices and units.',
  'Explain what an upward or downward body shows—and why it cannot predict the next candle.'
 ],
 vwap:[
  'Explain how share volume changes the influence of each traded price on VWAP.',
  'Calculate a volume-weighted price from illustrative trades and identify what the line represents.',
  'Interpret price relative to VWAP without treating a crossing as a guaranteed entry signal.'
 ],
 ema:[
  'Distinguish EMA9 from EMA20 and explain why both react after prices change.',
  'Follow an EMA calculation using its previous value, a new completed close and smoothing factor.',
  'Recognize an EMA/price relationship and identify when it provides insufficient evidence.'
 ],
 volume:[
  'Read a volume bar in the same interval as its corresponding price candle.',
  'Compare share volume with a clearly defined baseline and calculate relative volume.',
  'Explain why unusually high volume does not prove a breakout or identify traders.'
 ],
 structure:[
  'Identify comparable swing highs and lows within the completed price sequence.',
  'Distinguish a breakout attempt from confirmation under a stated rule.',
  'Recognize contradictory evidence without using candles that were hidden at the decision point.'
 ],
 tape:[
  'Read a completed Time & Sales print: time, execution price and share quantity.',
  'Compare prints while distinguishing executions from current bid and ask quotes.',
  'Explain why print colors cannot prove who traded or what they intended.'
 ],
 depth:[
  'Find the best bid, best ask and displayed share sizes.',
  'Calculate a quoted spread and compare it with the conditions of a hypothetical plan.',
  'Explain why displayed liquidity or a submitted order does not guarantee an execution.'
 ],
 routing:[
  'Describe the distinction between submitting, accepting and executing an order.',
  'Identify full, partial, canceled and open order outcomes in a illustrative example.',
  'Explain why a chart touch does not prove that an order was filled.'
 ]
};
function objectives(input,category){
 if(learningOutcomes[category])return learningOutcomes[category];
 const g=input.guide||{},t=input.teaching||{};
 const concept=clean(input.concept||g.title||'this lesson',130).replace(/^(?:explain|identify|describe|recognize|define)\s+/i,'');
 const facts=clean(t.what||g.concept||concept,180).replace(/^(?:explain|identify|describe|recognize|define)\s+/i,'');
 const method=clean((Array.isArray(t.how)&&t.how.length?t.how.join(' '):g.procedure)||'apply the lesson’s stated method',220);
 const limits=clean(g.commonError||g.invalidation||'mistaking a hypothesis for a completed observation',180);
 return [
  'Explain '+concept+' in your own words'+(facts.toLowerCase()===concept.toLowerCase()?' and identify the observable facts.':'. Use these specific facts: '+facts+'.'),
  'Work through the method with evidence from the specified interval: '+method+'.',
  'Recognize and correct this common mistake or limitation: '+limits+'.'
 ];
}
function lesson(input={}){
 // Defensive topic resolution: a registry key can never become the
 // instructional subject, including when the teaching module is used alone.
 const given=clean(input.concept,170);
 const isLocator=/^(?:F[1-3]|DT|TAPE|SITE)-C\d+-L\d+$/i.test(given)||
  /^(?:concept title pending|untitled|unknown)/i.test(given);
 const fallback=clean(input.guide?.title||input.guide?.concept||
  input.teaching?.what||'Market evidence and decision-making',170);
 const material=isLocator||!given?{...input,concept:fallback}:input;
 const category=inferDomain(material);
 const base=category==='general'?fromGuide(material):domains[category];
 const named=clean(material.concept,170);
 const custom=material.teaching||{};
 // Keep subject-specific authorized content prominent even when an illustration
 // category covers a broader family of lessons.
 const focus=category==='general'?'':named?'Current concept: '+named+'.':'';
 const customHow=Array.isArray(custom.how)?custom.how
  .filter(x=>typeof x==='string'&&x.trim()).slice(0,4).map(x=>clean(x,500)):[];
 // The thirty approved Boot Camp days carry distinct objectives, observation
 // rules, procedures and limitations. Present those as actual teaching rather
 // than a generic sentence about "evidence-led, repeatable decisions".
 const extra=[
  ...(custom.what?['Our goal for this lesson is to '+clean(custom.what,440).replace(/[.]+$/,'')+'.']:[]),
  ...(custom.why?['Why this matters: '+clean(custom.why,440)]:[]),
  ...(custom.when?['What to look for: '+clean(custom.when,500)]:[]),
  ...customHow.map((step,index)=>'Practice method, step '+(index+1)+': '+step),
  ...(custom.commonError?['A mistake to watch for: '+clean(custom.commonError,480)]:[]),
  ...(custom.limitation?['A boundary of this exercise: '+clean(custom.limitation,480)]:[])
 ];
 const stage=Number(input.stage||0);
 const caseStudy=root.GroundUpLabV34CompetencyExamples?.get?.(material.guide?.code,material.concept);
 const outcomes=objectives(material,category);
 let blocks=[];
 if(stage===0){
  // Start previews the journey. It does not test, demonstrate calculations or
  // demand knowledge the member has not yet learned.
  if(category==='candle')blocks=[
   'First, I’ll show you the four prices that make one candlestick, and how to find its body and wicks.',
   'Next, we’ll learn to measure the body, full range and wicks using the chart itself.',
   'Finally, we’ll learn what a completed candle can tell us, and why one candle cannot promise the next move.',
   'I’ll teach each step on the Learn screen, and then you can practice with me. Nothing to calculate or answer just yet.'
  ];
  else if(category==='vwap')blocks=[
   'We’ll start by discovering what a volume-weighted average is and why the number of traded shares matters.',
   'Then I’ll show you the prices, share counts and reference line on a chart before we calculate them.',
   'Finally, we’ll practice describing what a price-to-VWAP comparison shows—and what it does not prove.',
   'We’ll explore the visual together on the next screen. No questions or calculations yet.'
  ];
  else blocks=[
   'We’ll begin with what '+named+' means. I’ll introduce the words you need before asking you to use them.',
   'Next, I’ll show you how to recognize the important details in an example and work through the method.',
   'Finally, you’ll try the skill, spot a common mistake and learn what the available evidence cannot prove.',
   'You can start without prior knowledge. I’ll teach before asking you to practice.'
  ];
 }
 else if(stage===1)blocks=[...(focus?[focus]:[]),...base.explanation,...extra,
  ...(caseStudy?.steps?.length?['We will apply this method to a separate illustrative worked case.']:[])];
 else if(stage===2)blocks=[base.explanation[0],base.experiment,'Describe what the manipulated input changes and what it does not establish.'];
 else if(stage===4)blocks=[base.explanation[0],base.example[0],base.example[1],'Apply the same METHOD to your own practice question; do not simply copy the numbers from this separate example.'];
 else if(stage===6)blocks=[clean(custom.commonError||base.misconception,480),
  clean(custom.limitation||base.limitation,480),
  'Revisit your original decision and explain which observations were available before the result.'];
 else if(stage===7)blocks=[base.transfer,base.limitation,'Lock your analysis before revealing any later replay observation.'];
 else if(stage===8)blocks=[base.explanation[0],base.misconception,'Transfer the method to a fresh case. Completion of guided teaching is not independent competency mastery.'];
 return {
  category,heading:base.name,objectives:outcomes,blocks:blocks.filter(Boolean),
  worked:stage===1?(caseStudy?.steps?.length&&category!=='general'&&category!=='watchlist'
   ?[...base.example,...caseStudy.steps]:base.example):[],
  misconception:custom.commonError?clean(custom.commonError,480):base.misconception,
  limitation:custom.limitation?clean(custom.limitation,480):base.limitation,
  check:stage===1?base.check:null,
  sourceNote:category==='general'?'Based on the available Lab topic and original competency guide; individual lesson review may still be required.'
    :'Worked prices, quantities and scenario details in this instructor demonstration are illustrative, not verified history.'
 };
}
root.GroundUpLabV33InstructionContent=Object.freeze({lesson,inferDomain,version:'1.0'});
})(globalThis);
