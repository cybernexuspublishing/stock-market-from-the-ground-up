/* Original, ungraded teaching for six canonical Lab examples.
 * Research basis: owner-reviewed STT-S-0114, -0022, -0240, -0243 and -0087.
 * Public references are educational definitions, not verified Lab data,
 * licensed charts, actual fills, or editorial acceptance of the 419 Labs.
 */
const lessons=Object.freeze({
 'F2-C07-L01':{
  guideCode:'CANDLE_READING',
  meaning:'A standard candle summarizes open, high, low, and close for one stated interval. Its body joins open and close; its wicks reach the high and low.',
  why:'The four prices let you describe what happened during that interval before discussing any pattern.',
  method:'Read the interval and chart type first. If close exceeds open, calculate body size as close minus open; calculate full range as high minus low.',
  example:'Fictional standard candle: open $10, high $12, low $9, close $11. Body = $1 and range = $3. These are supplied numbers, not the displayed Lab candle.',
  limit:'A bullish body does not predict the next candle. Synthetic chart types such as Heikin Ashi may display calculated prices rather than observed standard OHLC.',
  practice:'On the displayed standard candle, label O, H, L, and C, then state its interval and one thing it cannot tell you.',
  reference:'StockCharts ChartSchool — Introduction to Candlesticks',
  url:'https://chartschool.stockcharts.com/table-of-contents/chart-analysis/candlestick-charts/introduction-to-candlesticks'
 },
 'DT-C11-L01':{
  guideCode:'VWAP_CONTEXT',
  meaning:'VWAP is an average price weighted by traded volume over a declared accumulation window.',
  why:'It provides a session reference for comparing an observed price with a volume-weighted history, not a forecast.',
  method:'For a simplified trade ledger, add price times shares for each trade, then divide by total shares. Check the platform’s bar price convention and session reset before comparing displayed lines.',
  example:'Fictional ledger: 100 shares at $10 and 300 at $11 give ($1,000 + $3,300) / 400 shares = $10.75 per share. A bar-based platform may use a different input price.',
  limit:'Price above VWAP does not prove a breakout or favorable future return. An unfinished session VWAP can keep changing.',
  practice:'Point to the displayed VWAP and price at the same timestamp, then name the chart interval, session, and any unknown input convention.',
  reference:'StockCharts ChartSchool — Volume-Weighted Average Price',
  url:'https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/volume-weighted-average-price-vwap'
 },
 'DT-C19-L02':{
  guideCode:'VOLUME_ANALYSIS',
  meaning:'Share volume counts shares traded in a stated interval and reporting population.',
  why:'A count only becomes comparable when the time window and feed scope match.',
  method:'Read the volume bar’s interval and units. Compare it with a declared same-scope baseline; do not substitute short interest or a partial-venue short-sale file for whole-market volume.',
  example:'Fictional comparison: 12,000 shares in one five-minute bar versus 6,000 in a matched five-minute baseline is twice that baseline. It does not identify the traders or their motives.',
  limit:'Share volume is not a count of unique owners and does not by itself establish liquidity, direction, or an executable fill.',
  practice:'Name the displayed bar’s interval and feed scope, then identify one conclusion the count cannot support.',
  reference:'Nasdaq — Volume definition',
  url:'https://www.nasdaq.com/glossary/v/volume'
 },
 'DT-C34-L01':{
  guideCode:'CHART_STRUCTURE',
  meaning:'A trading range is a region where observed price repeatedly approaches an upper and lower boundary.',
  why:'Marking the boundaries before later candles appear makes a breakout criterion testable without hindsight.',
  method:'Use only visible bars to mark upper and lower zones, record the session and price field, and predeclare whether a wick or close beyond the zone counts as a break.',
  example:'Fictional zone: upper edge $10.20. A later high of $10.25 with a $10.05 close is a probe, not a confirmed close above $10.20 under a predeclared close rule.',
  limit:'Boundaries are often zones, and a range does not determine breakout direction. Moving a boundary after seeing the outcome changes the rule.',
  practice:'Mark both visible edges and write a confirmation rule before revealing the next observation.',
  reference:'StockCharts ChartSchool — Support and Resistance',
  url:'https://chartschool.stockcharts.com/table-of-contents/chart-analysis/support-and-resistance'
 },
 'DT-C45-L01':{
  guideCode:'FAILED_BREAKOUT',
  meaning:'A failed breakout is a move beyond a predeclared boundary that does not satisfy or sustain the chosen confirmation rule.',
  why:'It helps separate an observed probe from a later interpretation without treating the outcome as knowable in advance.',
  method:'Record the original boundary and confirmation rule, identify the first visible crossing, then compare only subsequent candles available at the review stage.',
  example:'Fictional close rule: a candle trades above $10.20 but closes $10.05. The high crossed the level; that candle did not close beyond it. This is not a real trade or a forecast.',
  limit:'A failed move cannot prove which orders were placed or guarantee a reversal. Do not use future candles to score the original decision.',
  practice:'Write what was known at the observation point and what later evidence changed the classification.',
  reference:'StockCharts ChartSchool — Rectangle',
  url:'https://chartschool.stockcharts.com/table-of-contents/chart-analysis/chart-patterns/rectangle'
 },
 'DT-C05-L01':{
  guideCode:'RISK_PER_SHARE',
  meaning:'Risk per share is the modeled price distance between a proposed entry and an invalidation price, stated in dollars per share.',
  why:'It separates a planned loss model from the number of shares and from an actual exit fill.',
  method:'For a hypothetical long position with entry E above invalidation S, distance d = E − S dollars per share. For budget B dollars, whole-share quantity is floor(B / d) only when d is positive and other constraints are ignored.',
  example:'Fictional inputs: B = $100, E = $10.00, S = $9.80. Then d = $0.20 per share and floor($100 / $0.20) = 500 shares before costs, slippage, liquidity, or account limits.',
  limit:'A stop trigger is not a guaranteed execution price. A gap, spread, or partial fill can make realized loss exceed the model.',
  practice:'Name each variable and unit, calculate the distance, and explain which missing execution information prevents a guaranteed loss claim.',
  reference:'SEC Investor.gov — Stop, Stop-Limit, and Trailing Stop Orders',
  url:'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15'
 }
});
export function teachingForLab(id){return lessons[id]||null}
export function formatLabTeaching(lesson,{question='',stage=null}={}){
 if(!lesson)return '';
 const q=String(question).toLowerCase().slice(0,450).replace(/learning journey stage:\s*(start|learn|experiment|predict|practice|assess|review|transfer|results)\b/g,'');
 const assess=stage==='Assess';
 const intent=/\b(why|matter|important|purpose)\b/.test(q)?'why':
  /\b(how|calculate|formula|compute|work|example|steps?)\b/.test(q)?'method':
  /\b(limit|risk|mistake|error|wrong|fail|cannot|can't)\b/.test(q)?'limit':
  /\b(practice|recognize|identify|spot)\b/.test(q)?'practice':'overview';
 const parts=['What it means: '+lesson.meaning];
 if(intent==='why'||intent==='overview')parts.push('Why it matters: '+lesson.why);
 if(intent==='method'||intent==='overview'){
  parts.push('How to work with it: '+lesson.method);
  if(!assess)parts.push('Worked example (fictional): '+lesson.example);
 }
 if(intent==='limit'||intent==='overview')parts.push('Limitation: '+lesson.limit);
 if(intent==='practice')parts.push('How to work with it: '+lesson.method);
 if(intent!=='limit'&&!assess)parts.push('Practice independently: '+lesson.practice);
 if(assess)parts.push('During Assess, use the displayed exercise instructions and your own reasoning. I cannot reveal a worked answer or answer key.');
 parts.push('Public reference for further study: '+lesson.reference+' — '+lesson.url);
 return parts.join('\n\n');
}
