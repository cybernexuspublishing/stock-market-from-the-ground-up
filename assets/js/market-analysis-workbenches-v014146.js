/* v0.14.0.146 — D06 existing educational workbenches; no new SKUs.
 * Research data are locally supplied and unverified; no automatic trading.
 */
(function(root){
 'use strict';
 const A=root.GroundUpMarketAnalysisV014146;
 if(!A)throw Error('Market research engine missing.');
 const allowed=new Set(['ORDER_FLOW_TAPE_LAB','MULTI_TIMEFRAME_LAB','MARKET_STRUCTURE_LAB',
  'MARKET_CONTEXT_LAB','TRADE_REVIEW_REPLAY','STRATEGY_VALIDATION','PATTERN_FAILURE_LIBRARY']);
 const esc=x=>String(x??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;',"'":'&#39;'}[s]));
 const money=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('en-US',
  {style:'currency',currency:'USD',maximumFractionDigits:2}):'—';
 function panel(title,body){return '<section class="v11-workbench-panel"><h2>'+esc(title)+'</h2>'+body+'</section>'}
 function metrics(target,values){
  const box=target.querySelector('.v146-output');
  if(!box)return;
  box.innerHTML='<div class="v11-feature-grid">'+values.map(([title,val])=>
   '<div class="v11-feature available"><div><strong>'+esc(title)+'</strong><small>'+esc(val)+'</small></div></div>').join('')+'</div>';
 }
 async function load(file,kind){
  if(!file)throw Error('Choose a local CSV file.');
  if(file.size>A.LIMIT_BYTES)throw Error('CSV exceeds 2 MB.');
  return A[kind](await file.text());
 }
 function wireCsv(c,kind,action){
  let rows=[];
  const picker=c.host.querySelector('input[type=file]'),run=c.host.querySelector('.v146-run');
  picker.addEventListener('change',async e=>{
   rows=[];const out=c.host.querySelector('.v146-output');if(out)out.replaceChildren();
   try{
    rows=await load(e.currentTarget.files?.[0],kind);
    c.status('Parsed '+rows.length+' member-supplied observations; authenticity unverified.','success');
   }catch(err){c.status(err.message,'error')}
  });
  run.addEventListener('click',()=>{
   if(!rows.length)return c.status('Upload a valid local CSV first.','error');
   try{action(rows);c.status('Local research calculation only; no source authenticity, signal or fill certified.','success')}
   catch(err){c.status(err.message,'error')}
  });
 }
 function tape(c){
  c.host.innerHTML=panel('Order Flow & Tape Research',
   '<p>Upload original, lawfully possessed Time &amp; Sales CSV. Required: <code>timestamp,price,size</code> with time-zone offsets. Optional matched <code>bid,ask,quote_timestamp</code> allows exact at-quote categorization ONLY with a quote timestamp no more than 1 second before the print. No true aggressor inference.</p>'+
   '<label for="v146-file">Local tape CSV (max 2 MB and 10,000 prints)</label><input id="v146-file" type="file" accept=".csv,text/csv">'+
   '<div class="v11-form-grid"><div><label for="v146-n">First N prints</label><input id="v146-n" type="number" min="1" max="10000" step="1" value="100"></div>'+
   '<div><label for="v146-large">Large print threshold in shares</label><input id="v146-large" type="number" min="1" step="1" value="5000"></div></div>'+
   '<div class="actions"><button type="button" class="btn v146-run">Analyze locally</button></div><div class="v146-output" aria-live="polite"></div>')+
   panel('Scope and limitations','<p>Matching a print to a near-time quote is only descriptive. Odd lots, late reports, reporting venue, quote updates, hidden liquidity, consolidated-vs-venue data and executions cannot be reconstructed from this CSV. Neither buying intent nor buying pressure is established.</p>');
  wireCsv(c,'tape',rows=>{
   const out=A.tapeSummary(rows,Number(c.host.querySelector('#v146-n').value),
    Number(c.host.querySelector('#v146-large').value));
   metrics(c.host,[['Included prints',out.rows],['Total reported shares',out.shares.toLocaleString()],
    ['At-ask classified shares',out.atAsk.toLocaleString()],['At-bid classified shares',out.atBid.toLocaleString()],
    ['Unclassified shares',out.unknown.toLocaleString()],['Fresh quote-context prints',out.quoteContext],
    ['Average shares/print',out.average?.toFixed(2)??'—'],['Large prints',out.large]]);
  });
 }
 function multi(c){
  c.host.innerHTML=panel('Multi-Timeframe Research',
   '<p>Upload personally sourced <code>timestamp,open,high,low,close,volume</code> with ISO 8601 UTC offsets. All candles and inferred indicators are unverified. UTC-aligned 3/5/15-minute buckets can be partial.</p>'+
   '<label for="v146-file">Local OHLCV CSV (max 2 MB)</label><input id="v146-file" type="file" accept=".csv,text/csv">'+
   '<div class="actions"><button type="button" class="btn v146-run">Derive timeframes</button></div>'+
   '<div class="v146-output" aria-live="polite"></div>')+
   panel('Interpretation controls','<p>Derived candles do not verify exchange trade prints, market scope, timestamps, auction volume, adjusted corporate actions or a consolidated market tape. EMA uses supplied closes; OHLCV typical-price weighted values are NOT trade-level VWAP.</p>');
  wireCsv(c,'bars',rows=>{
   const frames=[1,3,5,15].map(min=>{
    const buckets=new Map();
    for(const bar of rows){
     const key=Math.floor(bar.timestamp/(min*60000));
     if(!buckets.has(key))buckets.set(key,{high:bar.high,low:bar.low,close:bar.close,volume:bar.volume});
     else {const v=buckets.get(key);v.high=Math.max(v.high,bar.high);v.low=Math.min(v.low,bar.low);v.close=bar.close;v.volume+=bar.volume}
    }
    return[min,buckets.size,rows.length?rows.at(-1).close:null];
   });
   const M=root.GroundUpScannerV014145,closes=rows.map(x=>x.close);
   const ema9=M?.ema(closes,9),ema20=M?.ema(closes,20),sma20=M?.sma(closes,20),
     atr14=M?.wilderAtr(rows,14),proxy=M?.typicalPriceVwap(rows);
   metrics(c.host,[...frames.map(([minutes,n,last])=>[minutes+'-minute UTC buckets',n+' · last '+money(last)]),
    ['EMA 9 of supplied closes',ema9?money(ema9.value):'Insufficient data'],
    ['EMA 20 of supplied closes',ema20?money(ema20.value):'Insufficient data'],
    ['SMA 20 of supplied closes',sma20?money(sma20.value):'Insufficient data'],
    ['Wilder ATR 14 of supplied OHLC (bar 2 seed)',atr14?money(atr14.value):'Requires 15 valid bars'],
    ['Typical-price OHLCV proxy (NOT trade VWAP)',proxy?money(proxy.value):'Insufficient volume']]);
  });
 }
 function structure(c){
  c.host.innerHTML=panel('Market Structure & Confirmed Pivots',
   '<p>Candidate five-candle extrema require TWO subsequent candles for confirmation and cannot be known when the pivot candle first closes. Equal highs/lows are excluded.</p>'+
   '<label for="v146-file">Timezone-offset OHLCV CSV (max 2 MB)</label><input id="v146-file" type="file" accept=".csv,text/csv">'+
   '<div class="actions"><button type="button" class="btn v146-run">Show confirmed pivots</button></div>'+
   '<div class="v146-output" aria-live="polite"></div>')+
   panel('No-lookahead standard','<p>The pivot becomes observable only at the confirmation timestamp, not at its retrospective pivot timestamp. A pivot is NOT proof of future direction. The observations have not been historically verified.</p>');
  wireCsv(c,'bars',rows=>{
   const out=c.host.querySelector('.v146-output');const pivots=A.confirmedPivots(rows);
   out.innerHTML='<div class="v11-matrix"><table><thead><tr><th>Observed at (UTC)</th><th>Confirmable at (UTC)</th><th>Pivot</th><th>Input price</th></tr></thead><tbody>'+
    pivots.slice(-40).map(p=>'<tr><td>'+esc(new Date(p.time).toISOString())+'</td><td>'+
     esc(new Date(p.confirmedAt).toISOString())+'</td><td>'+esc(p.label)+'</td><td>'+
     money(p.price)+'</td></tr>').join('')+'</tbody></table></div><p>'+
    pivots.length+' retrospectively confirmed candidates; only last 40 shown.</p>';
  });
 }
 function context(c){
  c.host.innerHTML=panel('Market Context & Session Research',
   '<p>New York daylight-saving time is applied per calendar day. Pre-market 04:00–09:30, regular 09:30–16:00, after-hours 16:00–20:00 ET. Out-of-session observations are excluded; holiday/early-close decisions require independent review.</p>'+
   '<label for="v146-file">Timezone-offset OHLCV CSV (max 2 MB)</label><input id="v146-file" type="file" accept=".csv,text/csv">'+
   '<div class="actions"><button type="button" class="btn v146-run">Group ET sessions</button></div>'+
   '<div class="v146-output" aria-live="polite"></div>');
  wireCsv(c,'bars',rows=>{
   const result=A.sessions(rows);
   const out=c.host.querySelector('.v146-output');
   out.innerHTML='<div class="v11-matrix"><table><thead><tr><th>ET date</th><th>Session</th><th>Bars</th><th>Open</th><th>Close</th><th>Volume</th></tr></thead><tbody>'+
    result.groups.map(g=>'<tr><td>'+esc(g.day)+'</td><td>'+esc(g.session)+'</td><td>'+
     g.bars+'</td><td>'+money(g.open)+'</td><td>'+money(g.close)+'</td><td>'+
     g.volume.toLocaleString()+'</td></tr>').join('')+'</tbody></table></div><p>'+
     result.excluded+' observations excluded outside 04:00–20:00 ET. This is not a verified consolidated session.</p>';
  });
 }
 async function privateJournal(c,action){
  if(!c.alive())throw Error('Member session changed.');
  const before=c.user?.id,token=(await c.getSession()).data?.session;
  if(!token?.access_token||token.user?.id!==before)throw Error('Member session changed.');
  const r=await fetch('/api/advanced-journal-insights?action='+action,{
   cache:'no-store',headers:{authorization:'Bearer '+token.access_token}});
  const body=await r.json().catch(()=>null);
  const current=(await c.SB.auth.getUser()).data?.user;
  if(!c.alive()||current?.id!==before)throw Error('Member session changed.');
  if(!r.ok||body?.ok!==true||body.tool!==c.tool.tool_code)
   throw Error(body?.error||'Private Journal research unavailable.');
  return body;
 }
 async function review(c){
  c.host.innerHTML=panel('Trade Review & Private Journal',
   '<p>Open original member journal entries to review plans, observations, decisions and lessons. An entry alone never authorizes historical replay; real source rights and replay access are separate.</p>'+
   '<div class="v146-output" aria-live="polite">Loading private journal…</div>');
  try{
   const data=await privateJournal(c,'review'),out=c.host.querySelector('.v146-output');
   if(!out)return;
   out.innerHTML=data.records.length?'<div class="v11-matrix"><table><thead><tr><th>Ticker</th><th>Date</th><th>Mode</th><th>Status</th><th>Original record</th></tr></thead><tbody>'+
    data.records.filter(x=>Number.isSafeInteger(Number(x.id))&&Number(x.id)>0).map(x=>
     '<tr><td>'+esc(x.ticker||'—')+'</td><td>'+esc(x.trade_date||'—')+'</td><td>'+
     esc(x.journal_type||'—')+'</td><td>'+esc(x.status||'—')+'</td><td>'+
     '<a class="btn secondary" href="journal-entry.html?id='+encodeURIComponent(x.id)+'">Open Journal</a></td></tr>'
    ).join('')+'</tbody></table></div>':'No saved journal entries found.';
  }catch(e){if(c.alive()){c.host.querySelector('.v146-output').textContent=e.message;c.status(e.message,'error')}}
 }
 async function strategy(c){
  c.host.innerHTML=panel('Strategy Validation — Descriptive Evidence',
   '<p>Private closed journal records are grouped separately by LIVE and PAPER mode; no fabricated backtest results. Win percentage and R statistics are withheld below 20 measured observations. Blank R is NEVER a zero or a loss. All inputs are user-reported, not broker-certified.</p>'+
   '<div class="v146-output" aria-live="polite">Loading private statistics…</div>');
  try{
   const data=await privateJournal(c,'strategy'),out=c.host.querySelector('.v146-output');
   if(!out)return;
   const fmt=(x,d=2)=>typeof x==='number'&&Number.isFinite(x)?x.toFixed(d):'Insufficient';
   out.innerHTML=data.groups.length?'<div class="v11-matrix"><table><thead><tr><th>Mode</th><th>Setup</th><th>Closed</th><th>Measured R</th><th>Win %</th><th>Avg R</th><th>MFE R</th><th>MAE R</th></tr></thead><tbody>'+
    data.groups.map(x=>'<tr><td>'+esc(x.journalType)+'</td><td>'+esc(x.setup)+'</td><td>'+
     x.records+'</td><td>'+x.measured+'</td><td>'+fmt(x.winPct,1)+'</td><td>'+
     fmt(x.averageR)+'</td><td>'+fmt(x.averageMfeR)+'</td><td>'+
     fmt(x.averageMaeR)+'</td></tr>').join('')+'</tbody></table></div>':
    'No eligible closed paper or live observations.';
  }catch(e){if(c.alive()){c.host.querySelector('.v146-output').textContent=e.message;c.status(e.message,'error')}}
 }
 async function patterns(c){
  c.host.innerHTML=panel('Pattern & Failure Concept Index',
   '<p>Search existing canonical concept registrations. A registry identifier is NOT independent approval of historical prices, screenshots, source licenses, dated catalysts, Lab answers or rubrics.</p>'+
   '<div class="v11-form-grid"><div><label for="v146-q">Search concept</label><input id="v146-q"></div>'+
   '<div><label for="v146-book">Book</label><select id="v146-book"><option value="">All</option><option value="1">I</option><option value="2">II</option><option value="3">III</option></select></div></div>'+
   '<div class="actions"><button type="button" class="btn v146-run">Search catalog</button></div>'+
   '<div class="v146-output" aria-live="polite"></div>');
  try{
   const res=await fetch('data/interactive-lab-index.json',{cache:'no-store'});
   if(!res.ok)throw Error('Lab index unavailable.');
   const labs=await res.json();
   if(!c.alive())return;
   if(!Array.isArray(labs)||labs.length>500||labs.some(x=>!/^[A-Z0-9-]{4,40}$/.test(String(x?.id||''))))
    throw Error('Lab concept index integrity error.');
   const search=()=>{
    const q=c.host.querySelector('#v146-q').value.toLowerCase().slice(0,120),
     book=c.host.querySelector('#v146-book').value;
    const rows=labs.filter(x=>(!book||String(x.book)===book)&&
     (!q||[x.concept,...(Array.isArray(x.marketContexts)?x.marketContexts:[])].join(' ').toLowerCase().includes(q)));
    c.host.querySelector('.v146-output').innerHTML='<p>'+rows.length+' matching concept registrations, showing first 60.</p>'+
     '<div class="v11-tool-hub">'+rows.slice(0,60).map(x=>
      '<article class="v11-tool-card"><strong>'+esc(x.id)+'</strong><h3>'+esc(x.concept)+'</h3>'+
      '<p>'+esc((x.marketContexts||[]).join(' · '))+'</p>'+
      '<a class="btn secondary" href="lab-player.html?lab='+encodeURIComponent(x.id)+
      '">Open access-controlled Lab</a></article>').join('')+'</div>';
   };
   c.host.querySelector('.v146-run').addEventListener('click',search);
   search();
  }catch(e){if(c.alive()){c.host.querySelector('.v146-output').textContent=e.message;c.status(e.message,'error')}}
 }
 const views={ORDER_FLOW_TAPE_LAB:tape,MULTI_TIMEFRAME_LAB:multi,
  MARKET_STRUCTURE_LAB:structure,MARKET_CONTEXT_LAB:context,
  TRADE_REVIEW_REPLAY:review,STRATEGY_VALIDATION:strategy,PATTERN_FAILURE_LIBRARY:patterns};
 root.GroundUpMarketWorkbenchesV014146=Object.freeze({
  supports:code=>allowed.has(code),render:(code,ctx)=>{
   if(!allowed.has(code))throw Error('Unsupported research workbench.');
   return views[code](ctx);
  }
 });
})(globalThis);
