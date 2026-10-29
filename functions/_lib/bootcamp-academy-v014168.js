/* Crown & Lantern Press / The Stock Market: From the Ground Up.
 * Seven separately versioned Academy study paths on ONE Lab Engine.
 * The original thirty-day course is imported, not overwritten or duplicated.
 * Official competencies/grades and future historical bars stay in their own
 * protected assessment/replay services.
 */
import {bootcampCurriculumV014144 as original} from './bootcamp-curriculum-v014144.js';
import {freeFoundationsV1} from './free-foundations-v1.js';
import {phaseAFreeFoundations} from './free-foundations-phase-a-v1.js';
export const ACADEMY_VERSION='0.14.0.168';
const current=new Map(original.days.map(day=>[day.day,day]));
if(current.size!==30)throw Error('Thirty-day original curriculum changed unexpectedly.');
const phases=Object.freeze({
 learn:{
  label:'Learn and recognize',
  lead:'I will first explain the term, show where the evidence comes from, and demonstrate the method.',
  method:'Describe the source and label each input before considering a decision.',
  boundary:'Learning the definition does not establish a trade result or independent mastery.'
 },
 practice:{
  label:'Guided rehearsal',
  lead:'I will demonstrate one attempt, then you will repeat the method without copying the outcome.',
  method:'Record the observable inputs, complete the calculation or comparison, then check a different case.',
  boundary:'A guided or revealed result is Study Only and cannot count as an independent assessment.'
 },
 transfer:{
  label:'Independent transfer',
  lead:'Now use what you learned on a new case. Decide from information actually available at the pause.',
  method:'State evidence, one alternative reading, uncertainty, invalidation and a justified no-trade choice where appropriate.',
  boundary:'Do not look ahead to the outcome, invent a broker execution or equate a journal entry with official mastery.'
 }
});

// STT archive and video research: first-party, ungraded enrichment of existing
// Academy days. This reuses the canonical 30-day source and existing member
// progress. A research supplement is not a verified historical bar or exam key.
const researchExtensions=Object.freeze([
 {match:/candl|wick|doji|ohlc|price bar/i,theme:'Candle structure versus hidden sequence',
  teach:'A finished candle gives open, high, low and close for its declared interval. It cannot establish whether the high occurred before the low, and a doji body may coexist with a wide full range.',
  example:'FICTIONAL: Open $8.00, high $9.25, low $7.90 and close $8.02. The real body is $0.02 but the full range is $1.35; neither number proves intrabar chronology.',
  steps:['Label the timeframe and session before measuring.','Compute body as absolute close minus open, and full range as high minus low.','Identify one conclusion that OHLC alone cannot support.'],
  checkpoint:'What is the difference between a small doji body and a small high-to-low range?'},
 {match:/vwap|moving average|ema|trend indicator/i,theme:'Indicator context and VWAP limitations',
  teach:'VWAP weights price by traded volume over a defined session. An EMA smooths completed closes. A reclaim, bounce or cross is an observation, not proof of continuation.',
  example:'FICTIONAL: A price crosses an approximated bar-based VWAP while the spread widens. The crossing is visible, but the proposed decision remains WAIT until the written liquidity and trigger conditions are satisfied.',
  steps:['Declare the timeframe, session and indicator formula.','Separate a completed cross from a provisional bar.','Compare the planned invalidation with the current liquidity gate.'],
  checkpoint:'Can a VWAP cross alone guarantee an entry or fill? Explain.'},
 {match:/catalyst|filing|earnings|source|research|sector|sympathy|news/i,theme:'Source chronology and catalyst research',
  teach:'Distinguish what a company announced from what the market actually did. Date the first original source and its terms, classify related sector activity as a hypothesis and record missing facts.',
  example:'FICTIONAL: A repost calls a proposed partnership a signed revenue contract. The primary filing confirms only negotiations. VERIFY the claim rather than treating a headline as an entry.',
  steps:['Locate the original issuer or regulatory record and date.','Extract the measured claim and any conditional language.','Record uncertainty, competing explanations and a no-trade boundary.'],
  checkpoint:'What is verifiable from a press release, and what market conclusion needs separate observations?'},
 {match:/watchlist|scan|universe|candidate|filter/i,theme:'Candidate selection and watchlist discipline',
  teach:'A scanner provides matches to declared filters; a watchlist records dated research questions. Preserve observation times, data source, reasons for inclusion, review dates and reasons for removal.',
  example:'FICTIONAL: A low-float gainer passes a volume screen but fails a 3% maximum quoted-spread rule. It can remain a research item, but the defined trade plan is NO TRADE.',
  steps:['Define the security universe, filter rule and date.','Record the catalyst, source and chart context separately.','Apply an explicit risk veto and next-review condition.'],
  checkpoint:'Which failing input should exclude a promising candidate from the proposed setup?'},
 {match:/risk|position|stop|trade plan|entry|exit|execution|order|slippage|fill/i,theme:'Precommitted trade plan and executable risk',
  teach:'Define the why, observable trigger, invalidation, stop mechanism, target and size before an outcome. A stop-market can slip; a stop-limit may not fill; large reported volume does not guarantee current depth.',
  example:'FICTIONAL: Entry $5.00, stop reference $4.80, target $5.60 and $25 risk budget imply $0.20 planned risk per share and at most 125 whole shares before affordability and liquidity constraints.',
  steps:['Calculate risk per share and a possible whole-share size.','Model one adverse fill, widening spread or halt scenario.','Record a condition requiring WAIT or NO TRADE.'],
  checkpoint:'Why can a real loss exceed the planned entry-to-stop difference?'},
 {match:/breakout|dip|rip|red.to.green|reclaim|high.of.day|pattern|momentum|squeeze|flag/i,theme:'Pattern definition, evidence and invalidation',
  teach:'Define each pattern from levels, times and completed observations. Red-to-green is relative to the previous closing price, not simply the candle color. A low float or round-number break is not a proven squeeze.',
  example:'FICTIONAL: Yesterday closes at $2.40. Today opens $2.20 and later crosses $2.40. The crossing is observed, but successful continuation remains unknown.',
  steps:['Identify the reference level and the market session.','Describe forming, observed, failed and unknown states.','State what future outcome is still hidden and the invalidation condition.'],
  checkpoint:'What distinguishes a developing setup from a confirmed observation, and from a guarantee?'},
 {match:/journal|review|performance|discipline|psycholog|reflect|mfe|mae/i,theme:'Evidence-first journal and process review',
  teach:'Record ticker, original thesis, candidate source, size, precommitted plan and actual decision separately. Review no-trades and losses without rewriting original decisions after the outcome.',
  example:'FICTIONAL: A learner passes on an attractive chart due to insufficient depth. A later rally does not retroactively remove the earlier liquidity concern.',
  steps:['Preserve the initial timestamp and evidence.','Compare actual action or no-trade with the prewritten plan.','Explain one improvement without implying that MFE/MAE are executable fills.'],
  checkpoint:'Why can a no-trade decision be sound even when price later rises?'}
]);
const researchFor=(...texts)=>{
 const text=texts.filter(Boolean).join(' ');
 const row=researchExtensions.find(x=>x.match.test(text));
 if(!row)return null;
 return Object.freeze({theme:row.theme,teach:row.teach,example:row.example,
  steps:[...row.steps],checkpoint:row.checkpoint,
  status:'source_informed_ungraded_original_instruction_not_accepted_market_replay'});
};

// Truth Behind the Ticker: original five-day course, one discrete instructional
// journey. All worked examples are fictional and cannot be called market history.
// Sample answers are ungraded coaching, not protected assessment keys.
const truth5Lessons=Object.freeze([
 Object.freeze({
  explanation:'Every market statement has a claimant, a source, a time and a testable meaning. An issuer release can establish what the company publicly said; it does not establish that the statement is complete, accurate, or a cause of subsequent trading. A repost is evidence of a repost, not independent corroboration.',
  workedExample:'FICTIONAL: Account A posts “North Harbor Robotics doubled revenue” without a source. Its own linked screenshot lacks a reporting period. A company PDF, if independently located on the issuer’s domain, would let you check whether the figure describes quarterly revenue, annual revenue, guidance, or a percentage comparison. Without the original dated document, classify the claim as unverified.',
  sourceProcedure:['Write the exact claim without adjectives such as “explosive.”','Identify the original issuer, regulator or exchange record and capture its URL and published date.','Quote or paraphrase only the relevant measured claim, including the period and denominator.','Record what the primary document cannot independently prove.','Choose VERIFY, HOLD FOR EVIDENCE or REJECT AS UNSUPPORTED; never infer an entry.'],
  selfCheck:'A widely shared screenshot says a stock is “guaranteed to squeeze.” What is actually verifiable from the screenshot alone?',
  reviewGuide:'Only that the screenshot contains the assertion. A genuine issuer filing, exchange notice and separately timestamped market observations would need their own verification; none can guarantee a squeeze.',
  error:'Treating repost volume, a professional-looking chart or a follower count as proof of the underlying market claim.',
  transfer:'Find one claim in a new article and trace it back to the original source. Record the unverified portions without trading.',
  investigation:'FICTIONAL INDEPENDENT CASE: At 09:04 ET, an anonymous account posts a screenshot that says a small company signed a guaranteed $40 million contract. At 09:10 ET, a second account links to a page resembling the company press room, but the address is a lookalike domain. Your job is not to choose a trade. Write an evidence ledger identifying the claimant, source URL ownership, original document, publication time, whether a contract value or only a proposed opportunity is stated, and the missing confirmation. Classify the post VERIFIED, PARTLY VERIFIED or UNVERIFIED. A screenshot and a persuasive domain name are insufficient to verify the contract.',
  sourceClaimCase:Object.freeze({
   title:'HIMS — source-reported rejection of a panic-dip trade',
   sourceLabel:'StocksToTrade, Panic Into Gains (June 23, 2025)',
   sourceUrl:'https://stockstotrade.com/panic-into-gains/',
   observation:'The author reports declining a HIMS panic-dip entry because adverse deal-related news changed his risk interpretation. This supports the article reporting a NO TRADE choice; it does not establish a filled transaction, forecast success or independently verified market path.',
   limits:'The visible prose lacks an exact decision timestamp, quote, fill record and evidence proving a specific result. Confirm the original issuer deal announcement, its first-public time and the contemporaneous quote before assessing the decision; the article may omit alternative causes.',
   question:'State precisely what this source supports: a reported decision not to trade. What contemporaneous news and market information must be checked before claiming that declining the opportunity was justified?',
   evidenceType:'SOURCE_REPORTED_NO_TRADE_NOT_BACKTEST'
  })
 }),
 Object.freeze({
  explanation:'SEC EDGAR filings identify a legal filer, accession number, form, filing date, accepted timestamp and reporting period. A Form 10-Q describes an interim reporting period; a Form 10-K covers a fiscal year; a Form 8-K reports specified events. The form label does not certify that a headline accurately interprets every item in the filing.',
  workedExample:'FICTIONAL: A blog claims “profits rose 80% today.” The linked document is a 10-Q filed today but covering an earlier three-month period. The filing date and the period being measured are different. Check whether the comparison uses revenue, net income, or earnings per share, and whether the comparator period is equivalent.',
  sourceProcedure:['Confirm the exact legal filer and trading symbol; tickers alone can be ambiguous after corporate actions.','Open the filing from SEC EDGAR rather than assuming a copied excerpt is complete.','Record form type, accession, acceptance time, fiscal period and relevant line or item.','Read the associated footnote or disclosure context; distinguish fact, estimate and forward-looking statement.','Write a one-sentence conclusion with its source and a separate one-sentence limitation.'],
  selfCheck:'A filing is accepted at 16:12 ET and reports last quarter’s revenue. Which timestamp and period belong in your evidence log?',
  reviewGuide:'Record the filing acceptance time, independently supported public-availability time and revenue reporting period separately. SEC EDGAR documents may appear after the recorded acceptance timestamp; that timestamp alone does not prove a learner could already retrieve the filing. The fiscal-period date is not the moment the quarter’s transactions occurred.',
  error:'Confusing filing acceptance time, fiscal-period end, issuer announcement time, and time of a market print.',
  transfer:'Repeat the filing identity/period check with a second filing type. If the filing is unavailable, record the gap rather than substituting an article.',
  investigation:'FICTIONAL INDEPENDENT CASE: A headline says a company “proved record annual profits” after publishing an 8-K that attaches an earnings release. The exhibit includes unaudited quarterly financial results and next-year revenue guidance. In your source ledger record the legal filer, form and item, accession, acceptance time, exhibit, period actually reported, and whether each figure is historical, unaudited, or forward-looking. Explain why the presence of an 8-K does not turn a projection into audited performance. If the exact document is missing, withhold the conclusion rather than substituting a social summary.'
 }),
 Object.freeze({
  explanation:'Market research requires chronology. Event time, publication time, retrieval time, data-feed timestamp and your decision-pause time are distinct. Normalize time zones explicitly, including daylight-saving transitions, before asserting what was publicly knowable.',
  workedExample:'FICTIONAL: An issuer posts a release at 08:03 ET; a newsletter republishes it at 08:17 ET; a quote screenshot is captured at 08:21 ET. At an 08:10 ET decision pause the 08:17 newsletter and 08:21 screenshot are FUTURE evidence and cannot support the earlier decision. A later price jump does not prove the release caused it.',
  sourceProcedure:['Set an explicit decision pause with date, time, time zone and market session.','For EDGAR, record the filing acceptance timestamp and independently observed public availability separately; an accepted filing may not be instantly retrievable.','List each source event and the timestamp actually supported by that source.','Remove anything that becomes visible after the pause.','State at least one alternative cause and one essential unknown.','Lock your provisional finding and only then inspect the later timeline for review.'],
  selfCheck:'May a 09:05 ET social repost justify a decision supposedly made at 08:50 ET? Which independently verifiable publication timestamp and decision-time evidence would you need before trusting the claimed analysis?',
  reviewGuide:'No. It occurred after the declared pause. A separately verified earlier issuer release might have been available, but that must be proved independently.',
  error:'Backdating information into an earlier decision because the later explanation makes the price move look obvious.',
  transfer:'Construct a new four-event timeline and mark exactly what could have been known at two different pauses.',
  investigation:'FICTIONAL INDEPENDENT CASE: A newswire displays an issuer statement at 08:31 ET, a verified issuer page shows an update at 08:46 ET, and a chart screenshot has no export timestamp. A researcher claims to have decided at 08:37 ET using the updated statement and chart. Build two evidence columns: publicly available by 08:37 and only potentially available afterward. You may use the 08:31 item if you verify its actual publication time; you cannot use the 08:46 update at 08:37. The undated chart needs an independently supported observation timestamp. Do not infer causation from the price after the pause.',
  sourceClaimCase:Object.freeze({
   title:'PLRX — source-reported trade chronology (not independently verified fills)',
   sourceLabel:'StocksToTrade, Two key lessons from my live PLRX trade (July 12, 2022)',
   sourceUrl:'https://stockstotrade.com/two-key-lessons-from-my-live-plrx-trade/',
   observation:'The author reports a $22.01 buy-stop trigger, a $20 planned risk reference, unexpected sluggish price action, an offering announcement after the close, and an eventual loss of approximately $0.22 per share. These are statements in the public article—not verified broker executions or a rights-cleared chart.',
   limits:'The exact fill time, quantities, source-time-stamped offering announcement, data-feed path, and independently reconciled profit/loss are not established. The reported planned $2.01 price gap and the later $0.22 per-share loss measure different things. The stop trigger is not a guaranteed transaction price.',
   question:'At a 3:50 p.m. ET decision pause, which evidence is contemporaneously available and which offering/outcome details are future information? Do not reconstruct the missing fills or claim the outcome was predictable.',
   evidenceType:'SOURCE_REPORTED_CASE_WITH_OPEN_VERIFICATION'
  })
 }),
 Object.freeze({
  explanation:'A percentage depends on its numerator, denominator and measurement window. Share price, market capitalization, float turnover and dollar volume answer different questions. Price change is (new price − reference price) ÷ reference price × 100. A split can change displayed per-share prices without changing a shareholder’s proportionate ownership.',
  workedExample:'FICTIONAL: A share rises from $2.50 to $3.00 during the specified window. Change = ($3.00 − $2.50)/$2.50 × 100 = 20%. If 200,000 shares trade at an illustrative average of $3.00, dollar volume is about $600,000; this approximation does NOT establish order-book depth, achievable fills or motive.',
  sourceProcedure:['Identify what the reported metric actually measures and the exact window.','Write numerator, denominator and units before computing.','Check split adjustments and whether quote timestamps share the same session.','Compute the result; separately label any estimate.','List at least two limitations that could make the quoted figure misleading for trade execution.'],
  selfCheck:'A post says “volume exceeded float twice.” Does that prove every freely tradable share changed hands twice?',
  reviewGuide:'No. Volume is aggregate executed shares. The same shares can trade repeatedly; float estimates can be stale; volume/float does not identify unique owners.',
  error:'Using a price percentage, volume-to-float ratio or bar volume as if it guaranteed liquidity or a profitable execution.',
  transfer:'Audit another promotional statistic and reproduce its arithmetic using original source dates and consistent units.',
  investigation:'FICTIONAL INDEPENDENT CASE: A stock closes at $0.80 before a one-for-ten reverse split and appears at $8.00 on a correctly split-adjusted comparison the next session. A promotional graphic claims a 900% gain. Calculate what happens to an illustrative holder of 1,000 old shares: the holder has 100 new shares, and the theoretical pre/post market value is $800 before any separate market move or transaction costs. Distinguish mechanical per-share repricing from a genuine price return; verify the corporate-action effective date and adjustment convention before trusting a gain scan.',
  sourceClaimCase:Object.freeze({
   title:'SSM — check the source-reported risk/reward arithmetic',
   sourceLabel:'StocksToTrade, Perfect Example of the VWAP Hold (Sep 2026; page dating requires reconciliation)',
   sourceUrl:'https://stockstotrade.com/perfect-example-of-the-vwap-hold/',
   observation:'The article labels a Sep. 1 SSM chart and presents an illustrative $4.23 entry, $4.10 risk reference and $4.84 target. Those price levels are a retrospective plan, not a documented fill, executed stop or realized trade. The research archive captured a Sep. 5 displayed date while a later public retrieval showed Sep. 4; check original publication metadata before asserting chronology.',
   limits:'Nominal price risk $0.13/share; target distance $0.61/share; potential price-distance reward/risk = 0.61 ÷ 0.13 ≈ 4.69:1, not a guaranteed 5:1 execution. At a $100 planned-risk cap, floor(100 ÷ 0.13) = 769 whole shares before slippage and fees; 770 shares implies $100.10 planned exposure. Actual stop execution can be worse.',
   question:'Before seeing any later bars, identify what is source-reported versus independently verified, then calculate the exact maximum whole-share size. Would a missing quote, incomplete volume scope or timing contradiction change your NO TRADE decision?',
   evidenceType:'SOURCE_REPORTED_RETROSPECTIVE_PLAN_NOT_EXECUTION'
  })
 }),
 Object.freeze({
  explanation:'Independent verification combines source reliability, chronology, calculation and a defensible decision. A capstone is complete only when the learner can document the reasoning without copying a worked answer. A missing document is a legitimate finding; “no trade” is a valid risk decision.',
  workedExample:'FICTIONAL: An 08:00 ET post says “Example Works will triple sales”; a 09:05 ET repost repeats it; a quote screenshot lacks a timestamp. For an 08:30 ET pause, a source ledger would reject the later repost and undated quote as evidence. The claim remains unverified until an original issuer or regulatory record supports a clearly defined statement.',
  sourceProcedure:['Choose one real, publicly accessible company claim but do not copy or upload proprietary content.','Create a source ledger: issuer, URL, document form/type, measured period, timezone-aware publication time and independent corroboration status.','Create a chronology that excludes evidence published after your stated decision pause.','Reproduce one relevant calculation with units; label synthetic or estimated inputs.','Write a conclusion under VERIFIED, PARTLY VERIFIED, UNVERIFIED or CONTRADICTED; include an alternative hypothesis and no-trade condition.','Independently repeat on a second claim; compare whether your classification criteria stayed consistent.'],
  selfCheck:'You cannot locate an original filing or reliably timestamp a quote. What conclusion and trading decision are defensible?',
  reviewGuide:'Mark the relevant market claims unverified, document the missing evidence and select NO TRADE rather than reverse-engineering a justification from later price movement.',
  error:'Choosing an outcome first and then selecting only corroborating screenshots, or reporting a self-reviewed capstone as certified mastery.',
  transfer:'Complete a fresh claim investigation without hints, retain your private reflection and explain which new evidence would change the classification.',
  investigation:'FICTIONAL INDEPENDENT CAPSTONE: At your 09:15 ET pause you have a screenshot claiming a 70% share-price move, an original company release describing a prospective agreement without an announced dollar value, and a delayed quote stamped 08:50 ET. The screenshot does not state its price baseline, the release cannot establish a completed contract, and the quote does not establish executable bid/ask liquidity at 09:15. Produce a two-column ledger of supported facts versus unresolved claims, identify the denominator needed to verify 70%, note a plausible alternative interpretation, and justify VERIFY MORE or NO TRADE. State the exact new records that would change your decision.',
  sourceClaimCase:Object.freeze({
   title:'MNDR and NCPL — compare scan claims without seeing future outcomes',
   sourceLabel:'StocksToTrade, Choose Between Solid Trades (October 15, 2026)',
   sourceUrl:'https://stockstotrade.com/choose-between-solid-trades/',
   observation:'The article labels October 12 five-minute charts and reports 9:38 a.m. ET scanner signals. It states that around five minutes before the open MNDR had approximately 57 million volume and 3.5 million float, versus NCPL around 9 million volume and 4.3 million float. Its later 89% and 77% signal-to-high claims are retrospective and unavailable at the pause.',
   limits:'The source figures imply about 16.29 MNDR rotations and 2.09 NCPL rotations, not 16 or 2 sets of unique owners. Exact signal availability, feed scope, float dates, bid/ask spreads, executions and a complete performance sample remain unverified. Later highs do not certify an entry or a stop fill.',
   question:'At 9:38 a.m. ET, first hide both later signal-to-high outcomes. Write what was actually knowable and what still needed verification. Compare reported turnover responsibly and state when a NO TRADE decision would be justified.',
   evidenceType:'SOURCE_REPORTED_RETROSPECTIVE_COMPARISON'
  })
 })
]);

const authored={
 truth5:{
  title:'The Truth Behind the Ticker',level:'Foundation',theme:'Source credibility and market claims',
  summary:'Learn to distinguish verifiable source records from promotional claims and unsupported price stories.',
  modules:[
   ['Who can support a market claim?',24,'Separate an original issuer or regulator document from an anonymous repost.','Locate the publisher, document date and original claim before treating it as fact.'],
   ['What does the SEC filing actually say?',24,'Read an SEC filing by form, company identity, period and acceptance time.','Find and record the original accession and the fact it supports.'],
   ['When did the market learn the news?',7,'Build a timestamped chronology of a public announcement and identify what was knowable.','Separate release time from later price movement, which needs its own historical source.'],
   ['When statistics mislead',2,'Check the interval, denominator, split adjustments, venue coverage and missing comparisons.','Explain why a percentage gainer ranking without units and timestamps can mislead.'],
   ['Independent source-verification challenge',29,'Investigate one public claim using a primary source and document its limits.','Classify each statement: verified, unverified, outdated, opinion, promotional or misleading.']
  ]
 },
 watchlist7:{
  title:'Build Your Own Stock Watchlist',level:'Foundation',theme:'Research and ranking',
  summary:'Identify, verify, compare, monitor and independently review candidates without entering trades.',
  modules:[
   ['What Is a Watchlist?',26,'Distinguish a research list from a promise to purchase a security.','Define the columns, update schedule and removal criteria.'],
   ['Finding Stocks Worth Researching',8,'Screen candidates using an explicit price, volume, float and liquidity universe.','Record a candidate and explain what the scan did not establish.'],
   ['Finding the Real Catalyst',7,'Locate the original disclosure or time-stamped company announcement.','Distinguish a verified event from market commentary and rumor.'],
   ['Reading the Chart',5,'Locate completed prices and compare candles and visible structure.','Record timeframe, open, high, low, close and observed volume without guessing.'],
   ['Eliminating Weak Candidates',10,'Evaluate spread, limited volume, halt status and a reason not to trade.','Remove or flag a candidate with documented evidence rather than a hunch.'],
   ['Building and Updating the Watchlist',26,'Rank candidates by explainable criteria and track what changed.','Recheck time, liquidity and announcements before revising priority.'],
   ['Independent Watchlist Challenge',30,'Produce and defend a current ranked list with a no-trade alternative.','State the evidence, sources, uncertainty and review date for each candidate.']
  ]
 },
 scanners10:{
  title:'Mastering Stock Scanners',level:'Foundation to intermediate',theme:'Scanner logic and false positives',
  summary:'Build reproducible screens, test the inputs and learn why a scanner hit is not a trade signal.',
  modules:[
   ['Define the scanner universe',8,'Separate exchange, session and data-feed coverage.','State which securities are excluded before testing filters.'],
   ['Choose price and dollar-change filters',2,'Distinguish percent change from absolute change.','Calculate both with labeled starting and ending prices.'],
   ['Volume and relative volume',4,'Compare shares across equivalent intervals.','Show the reference-period definition and report missing data.'],
   ['Float and share structure',4,'Check publicly reported shares, float definitions and split adjustments.','Record the as-of date and source rather than trusting a stale field.'],
   ['Premarket versus regular session',5,'Identify the current market session and exact time boundaries.','Exclude an after-hours print from a regular-session calculation.'],
   ['Read the spread and liquidity',6,'Calculate bid–ask spread and recognize thin displayed depth.','Separate visible quotes from actual executed liquidity.'],
   ['Validate catalyst claims',7,'Verify news time and issuer identity against an original record.','Reject headlines unsupported by an identifiable source.'],
   ['Spot false positives',8,'Explain stale quotes, mismatched timeframes and improper volume comparisons.','Revise a filter and document which false hit it would reject.'],
   ['Compare watchlist ranking',26,'Prioritize qualified candidates by evidence, not urgency.','Identify an acceptable candidate and at least one defensible no-trade choice.'],
   ['Build and audit a scanner',30,'Specify an independently repeatable scan and its evidence requirements.','Produce the filters, an example result, limitations and a revision plan.']
  ]
 }
};
const definitions=[
 {code:'truth5',days:5,metadata:authored.truth5},
 {code:'watchlist7',days:7,metadata:authored.watchlist7},
 {code:'scanners10',days:10,metadata:authored.scanners10},
 {code:'foundations30',days:30,metadata:{title:'The Complete Trading Foundations Boot Camp',
  level:'Beginner to intermediate',theme:'Market foundations and long-only simulation',
  summary:'The original approved 30-day curriculum, with its existing progress API and authored daily objectives.'}},
 {code:'charts45',days:45,metadata:{title:'Chart Reading and Trading Setups',
  level:'Intermediate',theme:'Candles, context, patterns and multi-timeframe setup evaluation',
  summary:'Fifteen chart-focused topics, each taught, rehearsed and transferred to another evidence set.'},
  source:[5,9,13,14,15,16,18,20,21,22,23,26,27,28,29]},
 {code:'risk60',days:60,metadata:{title:'Risk, Execution, and Trading Discipline',
  level:'Intermediate to advanced',theme:'Sizing, execution, journal accuracy and no-trade decisions',
  summary:'Twenty risk-oriented topics, each examined in explanation, guided rehearsal and independent review.'},
  source:[1,2,3,4,6,8,10,11,12,13,16,17,19,20,23,24,25,26,27,30]},
 {code:'practicum90',days:90,metadata:{title:'Advanced Simulated Trading Practicum',
  level:'Advanced',theme:'Research, planning, simulation, performance analysis and independent review',
  summary:'All thirty original market-skill themes revisited across three successive evidence-based practice cycles.'},
  source:Array.from({length:30},(_,i)=>i+1)}
];
function dayFor(d,i){
 const day=i+1;
 if(d.code==='foundations30'){
  const originalDay=current.get(day);
  return Object.freeze({...originalDay,programCode:d.code,programDay:day,sourceDay:day,
   phase:'learn',phaseLabel:'Original 30-day guided learning',mode:'guided',
   method:[originalDay.observe,originalDay.practice],limitation:originalDay.caution,
   officiallyGraded:false,masteryAwarded:false,
   assessmentSource:'protected_lab_assessment_only'});
 }
 let sourceDay,topic,objective,practice,observe;
 if(d.metadata.modules){
  const row=d.metadata.modules[i];[topic,sourceDay,objective,practice]=row;
  observe='Identify and record the dated source, interval, visible evidence and uncertainty for '+topic.toLowerCase()+'.';
 }else{
  const cycle=Math.floor(i/d.source.length);sourceDay=d.source[i%d.source.length];
  const source=current.get(sourceDay);const stage=['learn','practice','transfer'][cycle]||'transfer';
  const descriptor=cycle===0?'Understand':cycle===1?'Rehearse':'Independently transfer';
  topic=descriptor+': '+source.title;
  objective=(cycle===0?'Explain and recognize: ':cycle===1?'Demonstrate with a different example: ':
   'Apply without hindsight to an unfamiliar case: ')+source.objective;
  observe=source.observe;practice=source.practice;
 }
 const phase=d.metadata.modules?'learn':['learn','practice','transfer'][Math.floor(i/d.source.length)]||'transfer';
 const info=phases[phase],source=current.get(sourceDay);
 return Object.freeze({
  day,programDay:day,programCode:d.code,sourceDay,title:topic,
  objective,observe,practice,phase,phaseLabel:info.label,
  researchEnrichment:researchFor(topic,objective,observe,practice),
  method:[info.lead,info.method,practice],
  remediation:'If a necessary observation is unavailable, stop and return to the source before concluding.',
  limitation:source.caution+' '+info.boundary,
  competencies:[...source.competencies],
  relatedLabs:source.relatedLabs.map(row=>Object.freeze({...row,editorial:'PROVISIONAL_UNGRADED_REUSE'})),
  toolPath:source.toolPath,officiallyGraded:false,masteryAwarded:false,
  sourceStatus:d.code==='truth5'?'original_authored_truth5_editorial_review_pending':'approved_parent_30_day_topic_with_program_specific_original_exercise',
  ...(d.code==='truth5'?{
   lesson:truth5Lessons[i],
   method:[...truth5Lessons[i].sourceProcedure],
   limitation:source.caution+' '+truth5Lessons[i].error+' No independent graded mastery or verified historical feed is inferred.',
   remediation:truth5Lessons[i].reviewGuide
  }:{})
 });
}
export const academyPrograms=Object.freeze(definitions.map(d=>Object.freeze({
 code:d.code,title:d.metadata.title,days:d.days,level:d.metadata.level,theme:d.metadata.theme,
 summary:d.metadata.summary,
 version:ACADEMY_VERSION,status:d.code==='foundations30'?'original_30_day_controlling':'original_study_design_editorial_acceptance_pending',
 entitlement:'ONDEMAND_TRAINING',route:d.code==='foundations30'?'bootcamp.html':'bootcamp-academy.html?program='+d.code,
 priceStatus:'covered_by_existing_authorized_training_entitlement_no_new_purchase',
 creditPolicy:'No Crownlight Sparks needed for teaching; optional assisted Practice has separate authenticated service.',
 progression:'individual_program_progress_ungraded_no_automatic_mastery',
 curriculum:Object.freeze(Array.from({length:d.days},(_,i)=>dayFor(d,i)))
})));
// Free Foundations shares the same authenticated Academy revision/reflect/reload
// storage but is NOT an eighth Boot Camp or a protected assessed Lab.
export const freeFoundationsProgram=Object.freeze({
 code:'free5',days:5,version:ACADEMY_VERSION,
 title:'Free Foundations — Learn, Understand, Practice',
 level:'Absolute beginner',theme:'Ownership, candles, evidence, watchlists and disciplined risk',
 summary:'Five complete zero-knowledge lessons with Talia, fictional demonstrations, guided self-checks and private ungraded reflections.',
 status:'original_free_beginner_curriculum_editorial_review_pending',
 entitlement:'ELIGIBLE_FREE_MEMBER',
 route:'bootcamp-academy.html?program=free5',
 priceStatus:'included_free_no_payment_no_sparks',
 creditPolicy:'All teaching, examples and explanations are always available without Crownlight Sparks.',
 progression:'own_private_study_reflections_not_official_mastery',
 curriculum:Object.freeze(freeFoundationsV1.map((entry,i)=>Object.freeze({
  day:i+1,programDay:i+1,programCode:'free5',
  title:entry.title,objective:entry.objective,observe:entry.observe,
  practice:entry.practice,phase:'learn',phaseLabel:'Free guided fundamentals with Talia',
  researchEnrichment:researchFor(entry.title,entry.objective,entry.observe,entry.practice),
  method:entry.lesson.sourceProcedure,remediation:entry.lesson.reviewGuide,
  limitation:entry.lesson.error+' '+entry.lesson.whenNot,
  skillDomain:entry.skillDomain,relatedLabs:[],
  toolPath:entry.lesson.practiceLink||'simulator.html?practice=free',
  officiallyGraded:false,masteryAwarded:false,
  sourceStatus:'original_fictional_free_foundations_v1',
  lesson:Object.freeze({...entry.lesson,phaseA:phaseAFreeFoundations[i]})
 })))
});
export const academyByCode=Object.freeze({...Object.fromEntries(academyPrograms.map(program=>[program.code,program])),free5:freeFoundationsProgram});
export const academyCatalog=Object.freeze(academyPrograms.map(({curriculum,...summary})=>summary));
