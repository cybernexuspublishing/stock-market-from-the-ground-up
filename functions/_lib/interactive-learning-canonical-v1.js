/* Original research-grounded, fictional teaching supplements for four
 * existing canonical Labs. Internal Cloudflare Function dependency ONLY.
 * Do not serve this as a static public file or use it to award mastery.
 * No future replay candles or protected answer keys appear in this module.
 */
import {isBetaCandidateLab} from './lab-beta-scope-v014286.js';
export const INTERACTIVE_BETA_CONTENT_VERSION='2026-10-26-IL-original-v1';
const INTRO_BY_LAB=Object.freeze({
 'F2-C06-L01':{
  slug:'chart_standard_vs_derived_ohlc',
  title:'Standard OHLC and Derived Heikin Ashi',
  objective:'Distinguish the price observations of an OHLC candle from calculated Heikin Ashi values; explain why a synthetic wick cannot prove a trade fill.',
  prerequisites:['Know that OHLC means Open, High, Low and Close.'],
  start:'A standard candle summarizes four price fields in a specified interval. Other chart styles calculate displayed values from those fields.',
  learn:'Heikin Ashi derives its displayed close from the average of standard open, high, low and close, and its open from the prior derived open and close. Calculated extremes may differ from observed price extremes.',
  initialObservation:'FICTIONAL: previous derived open and close each equal $10.00. Current standard O=$12.00, H=$13.00, L=$12.00, C=$13.00. No trade or order record is supplied.',
  decisionPrompt:'Before calculating the derived candle, record whether a calculated wick at $10 would prove an executable fill at that price. Explain your evidence.',
  limitations:'Derived display values are not independently verified trades, broker executions, order-book history or licensed market observations.'
 },
 'DT-C06-L03':{
  slug:'asof_time_no_future_data',
  title:'As-of Time, Provisional Bars and Historical Decisions',
  objective:'Identify what was knowable at an earlier decision timestamp without using the completed daily bar to infer future data.',
  prerequisites:['Know the difference between an interval that is still updating and one that has closed.'],
  start:'A historical decision is evaluated against data available at that time, not the most recent completed chart screenshot.',
  learn:'Before the trading session is finished, the daily high is a provisional high-so-far. The finalized high cannot be used as if known earlier.',
  initialObservation:'FICTIONAL 11:05 snapshot: the current daily HIGH SO FAR=$18.40 and the daily bar is PROVISIONAL. Nothing later in the day is shown.',
  decisionPrompt:'Record whether the final completed daily high is knowable at 11:05. Identify the actual observation and one no-trade reason.',
  limitations:'No later bar, verified feed, market time-series license or execution evidence is included in this initial snapshot.'
 },
 'F3-C01-L03':{
  slug:'range_break_and_failure',
  title:'Range Probe Versus Completed Close-Based Breakout',
  objective:'Apply a closing-threshold rule established before seeing the later outcome, and distinguish a confirmed break from a still-unobserved failure.',
  prerequisites:['Know a candle close and the difference between price touching a level and closing beyond it.'],
  start:'Write the rules first. A temporary price probe does not automatically satisfy a close-based breakout rule.',
  learn:'For this fictional exercise, a completed close strictly above $20.50 qualifies as an upward break, strictly below $19.50 as downward; equality remains inside. Failure needs the subsequent completed close.',
  initialObservation:'FICTIONAL: upper closing boundary=$20.50; lower=$19.50; first completed close=$20.60. The following close has not been revealed.',
  decisionPrompt:'Classify the first close using the predeclared rule. Can you already know whether the NEXT close will make the break fail?',
  limitations:'The example is an invented decision rule, not a predictive signal. No future outcome, liquidity, spread or fill is supplied.'
 },
 'DT-C49-L01':{
  slug:'journal_evidence_denominators',
  title:'Journal Results: Resolved Trades Versus Unknown Outcomes',
  objective:'Compute an honest resolved-outcome win rate and average while excluding genuinely unknown values from the denominator.',
  prerequisites:['Know percentages, positive and negative numbers, and the distinction between zero and missing data.'],
  start:'A journal may contain exact $0 flat outcomes and outcomes with no evidence. They do not mean the same thing.',
  learn:'Count wins as positive net results, losses as negative and resolved flats as exactly zero; a missing fifth record is not automatically a flat or loss.',
  initialObservation:'FICTIONAL journal: four resolved results +$120, -$50, -$30, $0; one additional record has an UNKNOWN result. No broker fills are claimed.',
  decisionPrompt:'State the current resolved win-rate denominator. Predict what would change if the unknown fifth result were subsequently verified as exactly $0.',
  limitations:'A small set of invented outcomes cannot validate a profitable trading strategy; fees, risk and broker reconciliation are unverified.'
 }
});
export const INTERACTIVE_BETA_CANONICAL_IDS=Object.freeze(Object.keys(INTRO_BY_LAB));
if(INTERACTIVE_BETA_CANONICAL_IDS.some(id=>!isBetaCandidateLab(id)))throw Error('Interactive supplement outside approved 336-Lab scope');
export function originalInteractiveIntro(labId){
 const r=INTRO_BY_LAB[labId];if(!r)return null;
 return {id:labId,slug:r.slug,title:r.title,objective:r.objective,
  prerequisites:[...r.prerequisites],what:r.start,why:r.learn,
  currentObservation:r.initialObservation,decisionPrompt:r.decisionPrompt,
  stage:'Start',ungraded:true,contentVersion:INTERACTIVE_BETA_CONTENT_VERSION,
  dataClassification:'fictional_illustrative',
  limitations:r.limitations,futureObservationsIncluded:false,
  officialGradingAvailable:false,brokerConfirmedExecution:false};
}
