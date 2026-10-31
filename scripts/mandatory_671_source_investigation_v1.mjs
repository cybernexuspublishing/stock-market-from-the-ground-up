// Read-only research audit: NO Lab answer keys, accounts, grades, or accepted status.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/research/stockstotrade/';
function csvParse(raw){
 const parse=s=>{let parts=[],v='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){v+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){parts.push(v);v=''}else v+=c}
  parts.push(v);return parts};
 const lines=raw.trimEnd().split(/\r?\n/),head=parse(lines.shift());
 return lines.map(line=>Object.fromEntries(parse(line).map((v,i)=>[head[i],v])));
}
const baseline=csvParse(readFileSync(root+'canonical_671_source_integrity_acceptance_v1.csv','utf8'));
const authorities=csvParse(readFileSync(root+'primary_authority_research_catalog_v1.csv','utf8'));
assert.equal(baseline.length,671);assert.equal(baseline.filter(x=>x.unit_kind==='lab').length,419);
assert.equal(baseline.filter(x=>x.unit_kind==='academy').length,252);
const sourceIds=new Set(authorities.map(x=>x.source_id));
assert.equal(sourceIds.size,20);
function findTopic(title){
 const t=String(title).toLowerCase();
 const rules=[
 [/margin|pdt|pattern.day.trad|buying power|account constraint/,'FINRA_MARGIN','Confirm broker-specific margin transition, effective dates and any historical rule version.'],
 [/settlement|clearing|t\+1|t\+2/,'SEC_T1','Verify business-day settlement calculations, dated security scope and exceptions.'],
 [/short.sale|short.selling|short.sale.restriction|borrow|locate|ssr/,'SEC_SHO','Verify 10% trigger, venue/exception coverage and borrow evidence.'],
 [/stop|stop.loss|stop.limit|invalidation/,'SEC_STOP','Recompute planned stop versus actual gap/slippage loss and test a failed stop case.'],
 [/market order|limit order|order type|order select|partial fill/,'SEC_ORDER','Compare execution uncertainty, limit non-fill and independently worked fictional instructions.'],
 [/vwap|volume.weighted/,'CHART_VWAP','Verify completed-bar formula, session reset, warmup and bar proxy versus trade-price limitation.'],
 [/ema|moving average|sma\b|exponential/,'CHART_EMA','Recalculate seed, weighting, indicator period and choppy-counterexample.'],
 [/candle|wick|ohlc|doji/,'CHART_CANDLE','Recompute body, wick, range, denominator zero and transfer to a distinct fictional bar.'],
 [/etf|index fund|mutual fund|market index/,'SEC_ETF','Verify share/underlying index distinction, product identity and fees.'],
 [/market cap|capitalization|shares outstanding/,'SEC_MARKETCAP','Recompute share count times price; avoid conflating with cash or enterprise valuation.'],
 [/filing|edgar|catalyst|earnings|issuer|press.release|disclosure/,'SEC_EDGAR','Locate exact issuer filing, public-access timestamp, period and contradiction before a historical decision.'],
 [/premarket|after.hours|opening cross|market open|session|trading hour|time.of.day/,'NASDAQ_OPEN','Verify exchange/date/time-zone, trading hours, holidays and future-session changes.'],
 [/bid|ask|spread|quote|level ii|time.and.sales|tape/,'SEC_BIDASK','Verify quote versus trade, timestamp, size, market-data feed and original replay limits.'],
 [/liquidity|slippage|market depth|execution|volume/,'FINRA_LIQ','Verify spread/liquidity mechanics with quoted size and an adverse execution counterexample.'],
 [/trade lifecycle|confirmation|clearing house/,'FINRA_LIFECYCLE','Verify execution, confirmation, clearing and settlement states.'],
 [/performance|predict|backtest|profitability|win rate|return claim/,'SEC_PERFORMANCE','Obtain sample, expenses, out-of-sample tests, adjustment and date-specific evidence.'],
 [/replay|historical|pattern|scanner|breakout|squeeze|simulator|strategy/,'SOURCE_DISCOVERY_REQUIRED','Research exact dated source, authorized OHLCV if historical, counterexample, and no-future-bar transfer; no strategy edge without evidence.'],
 [/trade|risk|portfolio/,'FINRA_MISCONCEPTION','Identify exact source-supported teaching claim and recompute the individual risk example.']
 ];
 for(const [re,id,step] of rules)if(re.test(t))return{id,step};
 return {id:'SOURCE_DISCOVERY_REQUIRED',step:'Locate an authoritative source for this exact topic; record URL, claim, source date, attempted queries, counter-evidence and formula inputs.'};
}
const freeSources=['SEC_EXEC','CHART_CANDLE','SEC_EDGAR_TIME','SEC_EDGAR','SEC_STOP'];
const rows=baseline.map(row=>{
 const isFree=row.unit_kind==='academy'&&/^free5:[1-5]$/.test(row.unit_id);
 const lookup=isFree?{id:freeSources[Number(row.unit_id.slice(-1))-1],
  step:'Research claim and original calculation/counterexample/transfer are documented in data/free-foundations-evidence-v1.json; independent lesson/editor review remains mandatory.'}
  :findTopic(row.unit_title);
 assert(lookup.id==='SOURCE_DISCOVERY_REQUIRED'||sourceIds.has(lookup.id));
 const researchStatus=isFree?'specific_claim_sources_researched':
  lookup.id==='SOURCE_DISCOVERY_REQUIRED'?'unresolved_requires_active_source_discovery':'family_authority_researched_unit_not_verified';
 return {kind:row.unit_kind,id:row.unit_id,title:row.unit_title,original_candidate:row.source_id,
  researched_authority:lookup.id,research_status:researchStatus,
  math_status:isFree?'original_worked_example_documented':'individual_recalculation_required',
  counterexample_transfer:isFree?'original_ungraded_examples_documented':'individual_failure_and_transfer_review_required',
  editorial_approval:'not_approved',
  mandatory_next_action:lookup.step+' Independently review this exact instructional unit before approval.'};
});
const csv=v=>{const s=String(v??'');return /[,\r\n"]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const columns=Object.keys(rows[0]);
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/mandatory-671-research-queue.csv',columns.join(',')+'\n'+rows.map(x=>columns.map(k=>csv(x[k])).join(',')).join('\n')+'\n');
const status=Object.fromEntries([...new Set(rows.map(r=>r.research_status))].map(k=>[k,rows.filter(r=>r.research_status===k).length]));
const summary={documentId:'SMFGU-CURRICULUM-RESEARCH-009',baseline:671,labs:419,academy:252,
 reviewedTopicAuthorityPages:authorities.length,counts:status,
 approvedByResearch:0,
 caution:'Topic-level reference is not claim-level verification or editorial approval. Unmatched material requires additional actual primary-source investigation.'};
writeFileSync('artifacts/mandatory-671-research-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log('671-unit mandatory research: '+JSON.stringify(summary));
