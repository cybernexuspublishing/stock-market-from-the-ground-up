(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const M=globalThis.GroundUpToolMath;
 if(!M)throw new Error('Verified educational calculator engine unavailable.');
 const n=M.number;
 function drawMetrics(target,rows){
  const container=document.getElementById(target);container.replaceChildren();
  for(const [label,value] of rows){
   const card=document.createElement('div');card.className='v11-feature available';
   const body=document.createElement('div'),name=document.createElement('strong'),output=document.createElement('small');
   name.textContent=label;output.textContent=String(value);body.append(name,output);card.append(body);container.append(card);
  }
 }

 const money=v=>Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}):'—';
 let SB=null,USER=null,TOOL=null,ACCESS=null;
 function panel(title,body){return `<section class="v11-workbench-panel"><h2>${esc(title)}</h2>${body}</section>`}
 function status(msg,type=''){const e=document.getElementById('tool-status');if(e){e.textContent=msg||'';e.className=`status-message ${type}`}}
 function parseCsv(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return[];const headers=split(lines[0]).map(x=>x.trim().toLowerCase());return lines.slice(1).map(line=>{const p=split(line),o={};headers.forEach((h,i)=>o[h]=p[i]?.trim()??'');return o})}
 function split(line){const out=[];let q=false,cur='';for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out}
 function parseBars(text){const mod=globalThis.GroundUpResearchBarsV014150;if(!mod?.csvBars)throw Error('Verified OHLCV import module did not load.');return mod.csvBars(text)}
 async function workspaceApi(url='',method='GET',body,extra={}){
  if(!SB||!TOOL)throw new Error('A verified tool session is required.');
  const session=(await SB.auth.getSession()).data?.session;
  if(!session?.access_token)throw new Error('Your login session expired. Sign in again.');
  const response=await fetch('/api/advanced-tool-workspace-v014110?tool='+encodeURIComponent(TOOL.tool_code)+url,{
   method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,
    ...(body===undefined?{}:{'content-type':'application/json'}),...extra},
   body:body===undefined?undefined:JSON.stringify(body)});
  const value=await response.json().catch(()=>null);
  if(!response.ok||value?.ok!==true)throw new Error(value?.error||
   'Your saved workspace is unavailable. Check current plan access.');
  return value;
 }
 async function saveRecord(type,title,payload){
  await workspaceApi('','POST',{recordType:type,title,payload});
  status('Saved to your private member workspace.','success');
 }
 async function latestRecords(type){
  if(!USER)return[];
  const d=await workspaceApi(type?'&type='+encodeURIComponent(type):'');
  return d.records||[];
 }
 function download(name,text,type='text/csv'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 function renderRisk(){
  document.getElementById('tool-workbench').innerHTML=
   panel('Risk & Position Sizing','<div class="v11-form-grid">'+
    '<div><label for="r-account">Account size</label><input id="r-account" type="number" min="0.01" value="5000" step="0.01"></div>'+
    '<div><label for="r-risk">Maximum dollar risk</label><input id="r-risk" type="number" min="0.01" value="20" step="0.01"></div>'+
    '<div><label for="r-side">Direction</label><select id="r-side"><option value="LONG">Long</option><option value="SHORT">Short</option></select></div>'+
    '<div><label for="r-entry">Entry</label><input id="r-entry" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="r-stop">Protective stop</label><input id="r-stop" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="r-target">Optional target</label><input id="r-target" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="r-spread">Estimated spread per share</label><input id="r-spread" type="number" min="0" step="0.0001" value="0"></div>'+
    '<div><label for="r-slip">Estimated slippage per share</label><input id="r-slip" type="number" min="0" step="0.0001" value="0"></div></div>'+
    '<div class="actions"><button class="btn" type="button" id="r-calc">Calculate hypothetical position</button></div>'+
    '<div id="r-out" class="v11-feature-grid" aria-live="polite"></div>')+
   panel('Risk constraints','<p>The share count respects the smaller of your maximum loss and a 1× cash-equivalent exposure cap. Short selling requires additional margin/locate/borrow permissions not modeled. Stop orders can gap, slip or fail; the calculated loss is not guaranteed.</p>');
  document.getElementById('r-calc').onclick=()=>{
   const value=id=>n(document.getElementById(id).value);
   const r=M.risk({account:value('r-account'),risk:value('r-risk'),
    entry:value('r-entry'),stop:value('r-stop'),target:value('r-target'),
    spread:value('r-spread'),slippage:value('r-slip'),
    direction:document.getElementById('r-side').value});
   if(!r.ok){drawMetrics('r-out',[]);return status(r.reason,'error')}
   drawMetrics('r-out',[['Risk/share',money(r.perShare)],['Shares',r.shares.toLocaleString()],
    ['Exposure',money(r.exposure)],['Account exposure',r.accountPct.toFixed(1)+'%'],
    ['Target R:R',r.targetR==null?'—':r.targetR.toFixed(2)+'R'],
    ['Worst planned loss (before unmodeled events)',money(r.plannedLoss)],
    ['Binding constraint',r.bindingLimit.replaceAll('_',' ')]]);
   status('Hypothetical risk calculation; no broker execution or historical market data.','success');
  };
 }
 function renderFloat(){
  document.getElementById('tool-workbench').innerHTML=
   panel('Float & Supply','<div class="v11-form-grid">'+
    '<div><label for="f-float">Float shares</label><input id="f-float" type="number" min="1"></div>'+
    '<div><label for="f-out">Shares outstanding</label><input id="f-out" type="number" min="1"></div>'+
    '<div><label for="f-vol">Session volume</label><input id="f-vol" type="number" min="0"></div>'+
    '<div><label for="f-price">Price</label><input id="f-price" type="number" min="0.0001" step="0.0001"></div></div>'+
    '<div class="actions"><button type="button" class="btn" id="f-calc">Analyze</button></div>'+
    '<div id="f-outbox" class="v11-feature-grid" aria-live="polite"></div>')+
   panel('Data provenance','<p>Float and outstanding shares must come from dated, credible disclosures. Turnover does not establish a squeeze, actual short interest, executed order flow, or unrestricted float availability.</p>');
  document.getElementById('f-calc').onclick=()=>{
   const value=id=>n(document.getElementById(id).value);
   const r=M.supply({floatShares:value('f-float'),outstanding:value('f-out'),
    volume:value('f-vol'),price:value('f-price')});
   if(!r.ok){drawMetrics('f-outbox',[]);return status(r.reason,'error')}
   drawMetrics('f-outbox',[['Float turnover',r.turnover.toFixed(2)+'×'],
    ['Float % of outstanding',r.floatPct.toFixed(1)+'%'],
    ['Approximate market cap',money(r.marketCap)],['Approximate float value',money(r.floatValue)]]);
   status('Illustrative float ratios from your inputs; verify source filing dates.','success');
  };
 }
 function renderLiquidity(){
  document.getElementById('tool-workbench').innerHTML=
   panel('Liquidity & Spread','<div class="v11-form-grid">'+
    '<div><label for="l-bid">Bid</label><input id="l-bid" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="l-ask">Ask</label><input id="l-ask" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="l-sh">Whole shares</label><input id="l-sh" type="number" min="1" step="1" value="100"></div>'+
    '<div><label for="l-stop">Optional planned stop distance / share</label><input id="l-stop" type="number" min="0.0001" step="0.0001"></div></div>'+
    '<div class="actions"><button type="button" class="btn" id="l-calc">Analyze hypothetical spread</button></div>'+
    '<div id="l-out" class="v11-feature-grid" aria-live="polite"></div>')+
   panel('Quote limitations','<p>This uses one bid/ask snapshot; actual order fills may face size constraints, changing quotes, fees, slippage and market impact. Invalid and inverted quotes are rejected.</p>');
  document.getElementById('l-calc').onclick=()=>{
   const value=id=>n(document.getElementById(id).value);
   const r=M.liquidity({bid:value('l-bid'),ask:value('l-ask'),
    shares:value('l-sh'),stopDistance:value('l-stop')});
   if(!r.ok){drawMetrics('l-out',[]);return status(r.reason,'error')}
   drawMetrics('l-out',[['Quoted spread',money(r.spread)],
    ['Spread as % of midpoint',r.spreadPct.toFixed(2)+'%'],
    ['One-spread cost',money(r.oneSpreadCost)],
    ['Spread vs planned stop-risk',r.vsRiskPct==null?'—':r.vsRiskPct.toFixed(1)+'%']]);
   status('One quote snapshot only; no verified depth or order fill.','success');
  };
 }
 function renderExecution(){
  document.getElementById('tool-workbench').innerHTML=
   panel('Execution Cost Model','<div class="v11-form-grid">'+
    '<div><label for="e-dec">Decision price</label><input id="e-dec" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="e-fill">Observed hypothetical fill</label><input id="e-fill" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="e-sh">Whole shares</label><input id="e-sh" type="number" min="1" step="1" value="100"></div>'+
    '<div><label for="e-dir">Direction</label><select id="e-dir"><option value="LONG">Long</option><option value="SHORT">Short</option></select></div>'+
    '<div><label for="e-bid">Optional bid</label><input id="e-bid" type="number" min="0.0001" step="0.0001"></div>'+
    '<div><label for="e-ask">Optional ask</label><input id="e-ask" type="number" min="0.0001" step="0.0001"></div></div>'+
    '<div class="actions"><button type="button" class="btn" id="e-calc">Measure execution difference</button></div>'+
    '<div id="e-out" class="v11-feature-grid" aria-live="polite"></div>')+
   panel('Order-type decision prompts','<ul><li><strong>Market:</strong> execution priority, no price certainty.</li><li><strong>Limit:</strong> price boundary, no fill guarantee.</li><li><strong>Stop:</strong> trigger plus potential slippage.</li><li><strong>Stop-limit:</strong> price protection can prevent execution.</li></ul><p>This model compares entered values; it does not generate verified broker fills, partial fills, commissions or borrow costs.</p>');
  document.getElementById('e-calc').onclick=()=>{
   const value=id=>n(document.getElementById(id).value);
   const r=M.execution({decision:value('e-dec'),fill:value('e-fill'),
    shares:value('e-sh'),direction:document.getElementById('e-dir').value,
    bid:value('e-bid'),ask:value('e-ask')});
   if(!r.ok){drawMetrics('e-out',[]);return status(r.reason,'error')}
   drawMetrics('e-out',[['Slippage / share',money(r.slippagePerShare)],
    ['Signed slippage cost',money(r.signedCost)],
    ['Quoted spread',r.quotedSpread==null?'—':money(r.quotedSpread)],
    ['Difference',r.slippagePerShare>0?'Unfavorable':r.slippagePerShare<0?'Favorable':'At decision price']]);
   status('Hypothetical entered comparison; not a broker-confirmed fill.','success');
  };
 }

 function universeWorkbench(scannerOnly=false){
  const engine=globalThis.GroundUpScannerV014145;
  if(!engine)throw Error('Research scanner validation engine unavailable.');
  document.getElementById('tool-workbench').innerHTML=
   panel(scannerOnly?'Research Scanner Builder':'Market Discovery Lab',
    '<p>Use a small, lawful, <strong>personally sourced</strong> dated CSV snapshot. This workbench does NOT provide live market data, genuine trade alerts, or rights-cleared history. Required columns: <code>symbol,price,change_pct,volume,rvol,float,spread_pct</code>. Optional: <code>gap_pct</code>. Unknown and invalid metrics are excluded, never converted to zero.</p>'+
    '<p class="v11-lock-note">Source provenance and capture timestamp are supplied by the researcher; this tool cannot authenticate either. Do not share third-party market data in course materials without permission.</p>'+
    '<div><label for="u-file">Candidate universe CSV (2 MB / 2,000 securities maximum)</label><input id="u-file" type="file" accept=".csv,text/csv"></div>'+
    '<div class="v11-form-grid">'+
    '<div><label for="u-source">Source / permission note (required)</label><input id="u-source" type="text" maxlength="180" placeholder="Your authorized provider or source"></div>'+
    '<div><label for="u-time">Source observation time incl. zone (ISO 8601, required)</label><input id="u-time" type="text" placeholder="2026-10-21T13:00:00-04:00"></div>'+
    '<div><label for="u-minprice">Min price (USD, optional)</label><input id="u-minprice" type="number" min="0" step="any" placeholder="No minimum"></div>'+ 
    '<div><label for="u-maxprice">Max price (USD)</label><input id="u-maxprice" type="number" min="0" step="any" value="20"></div>'+
    '<div><label for="u-change">Min % change</label><input id="u-change" type="number" step="any" value="10"></div>'+
    '<div><label for="u-vol">Min shares traded</label><input id="u-vol" type="number" min="0" step="1" value="1000000"></div>'+
    '<div><label for="u-rvol">Min RVOL (provided; not independently computed)</label><input id="u-rvol" type="number" min="0" step="any" value="2"></div>'+
    '<div><label for="u-float">Max reported float (shares, source dated separately)</label><input id="u-float" type="number" min="0" step="1" value="15000000"></div>'+
    '<div><label for="u-spread">Max quoted spread %</label><input id="u-spread" type="number" min="0" step="any" value="3"></div>'+ 
    '<div><label for="u-mingap">Min reported gap % (optional; CSV gap_pct)</label><input id="u-mingap" type="number" min="0" step="any" placeholder="No gap threshold"></div>'+ 
    '<div><label for="u-maxmcap">Max reported market cap USD (optional; CSV market_cap)</label><input id="u-maxmcap" type="number" min="0" step="any" placeholder="Not required"></div>'+ 
    '<div><label for="u-mindollarvol">Min price × shares proxy USD (optional)</label><input id="u-mindollarvol" type="number" min="0" step="any" placeholder="Not required"></div></div>'+
    '<div class="actions"><button type="button" id="u-run" class="btn">'+(scannerOnly?'Screen snapshot':'Filter snapshot')+'</button>'+
    '<button type="button" id="u-save" class="btn secondary">Save Filter Set</button></div>'+
    '<p id="u-audit" role="status" aria-live="polite"></p><div id="u-results"></div>')+
   panel('Research—not an execution signal',
    '<p>Results are deterministically ordered by supplied % change, then volume, then symbol. No probability, success score, market buy signal, quote verification, or automatic live refresh is implied. Float/RVOL are often outdated or calculated using different providers.</p>');
  let rows=[];
  document.getElementById('u-file').onchange=async event=>{
   try{
    const file=event.target.files?.[0];
    if(!file||file.size>engine.MAX_BYTES)throw Error('Choose a locally authorized CSV smaller than 2 MB.');
    rows=engine.csv(await file.text());
    status(rows.length+' snapshot records parsed locally. Provider rights and timestamps have NOT been authenticated.','success');
   }catch(e){rows=[];document.getElementById('u-results').replaceChildren();status(e.message,'error')}
  };
  const getFilters=()=>({
   minPrice:document.getElementById('u-minprice').value,
   maxPrice:document.getElementById('u-maxprice').value,
   minChange:document.getElementById('u-change').value,
   minVol:document.getElementById('u-vol').value,
   minRvol:document.getElementById('u-rvol').value,
   maxFloat:document.getElementById('u-float').value,
   maxSpread:document.getElementById('u-spread').value,
   minGap:document.getElementById('u-mingap').value,
   maxMarketCap:document.getElementById('u-maxmcap').value,
   minDollarVolume:document.getElementById('u-mindollarvol').value
  });
  const provenance=()=>{
   const label=document.getElementById('u-source').value.trim();
   const at=document.getElementById('u-time').value.trim();
   if(label.length<3||label.length>180)throw Error('Supply a bounded original snapshot source note.');
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(at)||!Number.isFinite(Date.parse(at)))
    throw Error('Supply a valid ISO 8601 source observation timestamp WITH UTC offset.');
   if(Date.parse(at)>Date.now()+300000)throw Error('A snapshot cannot have a future timestamp.');
   return {sourceNote:label,asOf:at,verified:false};
  };
  document.getElementById('u-run').onclick=()=>{
   try{
    if(!rows.length)throw Error('Upload your authorized dated snapshot first.');
    const p=provenance(),result=engine.analyze(rows,getFilters());
    const audit=document.getElementById('u-audit');
    audit.textContent=result.matched+' of '+result.inspected+' records passed supplied thresholds. '+
      'Excluded: '+result.rejections.missingMetric+' incomplete, '+
       result.rejections.invalidInput+' malformed, '+result.rejections.failedThreshold+
      ' below/above filters, '+result.rejections.duplicateTicker+' duplicated. '+
      'Unverified researcher-provided source: '+p.sourceNote+' · '+p.asOf+'.';
    const host=document.getElementById('u-results');host.replaceChildren();
    const wrap=document.createElement('div');wrap.className='v11-matrix';
    const table=document.createElement('table'),caption=document.createElement('caption');
    caption.textContent='Unverified user-supplied snapshot; top 100 matching candidates, not investment recommendations.';
    table.append(caption);
    const head=document.createElement('thead'),tr=document.createElement('tr');
    for(const text of ['Symbol','Price','% change','Volume','RVOL','Reported float','Spread %','Gap % (supplied)','Market cap USD (supplied)','Price × volume proxy']){
     const th=document.createElement('th');th.textContent=text;th.scope='col';tr.append(th);
    }
    head.append(tr);table.append(head);
    const body=document.createElement('tbody');
    for(const row of result.rows){
     const r=document.createElement('tr');
     for(const value of [row.symbol,row.price,row.change,row.volume.toLocaleString(),row.rvol,row.float.toLocaleString(),row.spread,row.gap??'Not supplied',row.marketCap??'Not supplied',Math.round(row.dollarVolume).toLocaleString()]){
      const cell=document.createElement('td');cell.textContent=String(value);r.append(cell);
     }
     body.append(r);
    }
    table.append(body);wrap.append(table);host.append(wrap);
    status('Snapshot filtered. Dates, source rights, RVOL methodology and actual market observations remain unverified.','success');
   }catch(e){document.getElementById('u-results').replaceChildren();status(e.message,'error')}
  };
  document.getElementById('u-save').onclick=async()=>{
   try{const p=provenance();await saveRecord('filter_set',scannerOnly?'Scanner Filter Set':'Discovery Filter Set',
     {filters:engine.filters(getFilters()),...p,kind:'UNVERIFIED_RESEARCH_CRITERIA',liveFeed:false});
    status('Private criteria and provenance note saved; market observations NOT saved or certified.','success');
   }catch(e){status(e.message,'error')}
  };
 }

 async function renderWatchlist(){
  const recs=await latestRecords('watchlist'),host=document.getElementById('tool-workbench');
  host.innerHTML=panel('Watchlist & Conditional Trade Plans',
   '<p>Member-researched candidates only—not auto-executed orders, verified quotes or buy signals.</p>'+
   '<div class="v11-form-grid">'+
   '<div><label for="w-ticker">Ticker</label><input id="w-ticker" maxlength="12"></div>'+
   '<div><label for="w-status">Status</label><select id="w-status"><option>DISCOVERY</option><option>WATCH</option><option>READY</option><option>INVALID</option><option>NO TRADE</option></select></div>'+
   '<div><label for="w-asof">Source observation time with UTC offset</label><input id="w-asof" placeholder="2026-10-21T13:00:00-04:00"></div>'+
   '<div><label for="w-source">Original source / permission note</label><input id="w-source" maxlength="180"></div>'+
   '<div><label for="w-cat">Catalyst</label><input id="w-cat"></div>'+
   '<div><label for="w-level">Level / resistance</label><input id="w-level"></div>'+
   '<div><label for="w-entry">Conditional entry</label><input id="w-entry"></div>'+
   '<div><label for="w-inv">Invalidation or NO TRADE rule</label><input id="w-inv"></div>'+
   '<div><label for="w-stop">Planned stop (not guaranteed)</label><input id="w-stop"></div>'+
   '<div><label for="w-target">Research target (not prediction)</label><input id="w-target"></div></div>'+
   '<label for="w-why">Why further research?</label><textarea id="w-why" rows="3"></textarea>'+
   '<fieldset class="v11-research-gates"><legend>Before marking READY — self-reported research gates</legend>'+
   '<label><input type="checkbox" id="w-gate-source"> I reviewed the original source, issuer identity and publication date.</label>'+
   '<label><input type="checkbox" id="w-gate-structure"> I recorded the chart session, timeframe, previous close and reference levels.</label>'+
   '<label><input type="checkbox" id="w-gate-liquidity"> I considered current spread, volume versus displayed depth and potential slippage.</label>'+
   '<label><input type="checkbox" id="w-gate-invalidation"> I defined a trigger, failure condition and NO TRADE alternative.</label>'+
   '<p class="small">Checks are your own observations, not independent source verification or proof of executable prices.</p></fieldset>'+
   '<div class="actions"><button type="button" class="btn" id="w-save">Save Research Candidate</button></div>')+
   panel('Private saved candidates','<div id="w-list"></div>')+
   panel('Evidence constraints','<p>A self-reported watchlist status never certifies a live market observation, issuer fact, broker fill or future price. Complete primary-source review independently.</p>');
  const list=document.getElementById('w-list');
  const saveButton=document.getElementById('w-save');
  let editing=null;
  if(!recs.length)list.textContent='No saved candidates yet.';
  for(const rec of recs){
   const line=document.createElement('p');
   line.textContent=(rec.title||'')+' · '+(rec.payload?.status||'WATCH')+
    ' · Invalidation: '+(rec.payload?.invalidation||'Unspecified')+
    ' · Source: '+(rec.payload?.sourceNote||'Legacy record: no source')+
    ' · At: '+(rec.payload?.asOf||'Date unknown')+
    ' · Research gates: '+Object.values(rec.payload?.researchGates||{}).filter(Boolean).length+'/4 self-reported reviewed';
   const edit=document.createElement('button');edit.type='button';edit.className='btn secondary';
   edit.textContent='Edit';edit.setAttribute('aria-label','Edit saved candidate '+String(rec.title||''));
   edit.addEventListener('click',()=>{
    if(!rec.updated_at){status('This older record has no update revision. Refresh your workspace before editing.','error');return}
    editing={id:rec.id,revision:rec.updated_at};
    const value=(id,text)=>{const el=document.getElementById(id);if(el)el.value=String(text??'')};
    const p=rec.payload||{};
    value('w-ticker',rec.title);value('w-status',p.status||'WATCH');value('w-asof',p.asOf);
    value('w-source',p.sourceNote);value('w-cat',p.catalyst);value('w-level',p.level);
    value('w-entry',p.entry);value('w-inv',p.invalidation);value('w-stop',p.stop);
    value('w-target',p.target);value('w-why',p.why);
    for(const k of ['source','structure','liquidity','invalidation']){
     const check=document.getElementById('w-gate-'+k);if(check)check.checked=p.researchGates?.[k]===true;
    }
    saveButton.textContent='Update Saved Candidate';
    document.getElementById('w-ticker').focus();
    status('Editing your saved research candidate. Save to update only this version.','success');
   });
   const del=document.createElement('button');del.type='button';del.className='btn secondary';
   del.textContent='Delete';del.setAttribute('aria-label','Delete saved candidate '+String(rec.title||''));
   del.addEventListener('click',async()=>{
    if(!window.confirm('Permanently delete this saved research candidate?'))return;
    try{await workspaceApi('&id='+encodeURIComponent(rec.id),'DELETE');await renderWatchlist();renderWorkspaceManager();
     status('Selected private candidate deleted.','success')}
    catch(e){status(e.message,'error')}
   });
   line.append(' ',edit,' ',del);list.append(line);
  }
  document.getElementById('w-save').onclick=async()=>{
   try{
    const value=id=>document.getElementById(id).value.trim();
    const ticker=value('w-ticker').toUpperCase(),sourceNote=value('w-source'),asOf=value('w-asof');
    if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker))throw Error('A valid stock symbol is required.');
    if(sourceNote.length<3||sourceNote.length>180)throw Error('Source and use-rights note is required.');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(asOf)||
       !Number.isFinite(Date.parse(asOf))||Date.parse(asOf)>Date.now()+300000)
       throw Error('A nonfuture source timestamp with timezone offset is required.');
    if(!value('w-inv'))throw Error('Document a clear invalidation or NO TRADE rule.');
    const researchGates=Object.fromEntries(['source','structure','liquidity','invalidation']
     .map(k=>[k,document.getElementById('w-gate-'+k)?.checked===true]));
    if(value('w-status')==='READY'&&Object.values(researchGates).some(done=>!done))
     throw Error('A READY research state requires all four self-reported review gates. Select WATCH or NO TRADE if anything remains uncertain.');
    const payload={status:value('w-status'),researchGates,catalyst:value('w-cat'),level:value('w-level'),
     entry:value('w-entry'),invalidation:value('w-inv'),stop:value('w-stop'),
     target:value('w-target'),why:value('w-why'),asOf,sourceNote,
     evidenceStatus:'USER_REPORTED_NOT_INDEPENDENTLY_VERIFIED'};
    if(editing){
     await workspaceApi('&id='+encodeURIComponent(editing.id),'PATCH',
      {recordType:'watchlist',title:ticker,payload,expectedUpdatedAt:editing.revision});
    }else await saveRecord('watchlist',ticker,payload);
    const action=editing?'updated':'saved';
    await renderWatchlist();renderWorkspaceManager();
    status('Private conditional plan '+action+'. Market source and outcome remain unverified.','success');
   }catch(e){status(e.message,'error')}
  };
 }
 function renderCatalyst(){
  document.getElementById('tool-workbench').innerHTML=panel('Catalyst & Filing Research',
   '<p>Use a dated primary issuer or regulator source, with timestamp and uncertainty. No inferred causal relationship is automatically proven.</p>'+
   '<div class="v11-form-grid">'+
   '<div><label for="c-ticker">Ticker</label><input id="c-ticker" maxlength="12"></div>'+
   '<div><label for="c-type">Category</label><select id="c-type"><option>Earnings</option><option>8-K / Corporate Event</option><option>Offering / Financing</option><option>FDA / Regulatory</option><option>Contract / Partnership</option><option>Merger / Acquisition</option><option>Split / Reverse Split</option><option>Other</option></select></div>'+
   '<div><label for="c-url">Original HTTPS source URL</label><input id="c-url" type="url"></div>'+
   '<div><label for="c-time">Original publication time with UTC offset</label><input id="c-time" placeholder="2026-10-21T08:30:00-04:00"></div></div>'+
   '<label for="c-fact">Verifiable original-source facts</label><textarea id="c-fact" rows="4"></textarea>'+
   '<label for="c-unc">Alternative explanations / uncertainty</label><textarea id="c-unc" rows="3"></textarea>'+
   '<div class="actions"><button type="button" class="btn" id="c-save">Save Research Note</button>'+
   '<a class="btn secondary" href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer">Open SEC EDGAR</a></div>')+
   panel('Data standard','<p>Researcher-entered data is NOT authenticated. Check original filings, amendments, event time, float changes and supported venue datasets before publishing a historical case.</p>');
  document.getElementById('c-save').onclick=async()=>{
   try{
    const value=id=>document.getElementById(id).value.trim(),t=value('c-ticker').toUpperCase();
    if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(t))throw Error('Valid ticker required.');
    let url;try{url=new URL(value('c-url'))}catch{throw Error('Valid original source HTTPS URL required.')}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||url.href.length>500)
     throw Error('Source must be HTTPS without embedded credentials.');
    const at=value('c-time');
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(at)||
       !Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()+300000)
     throw Error('Exact original release time with offset required.');
    if(value('c-fact').length<15||value('c-unc').length<12)
     throw Error('Record substantive source facts AND a competing explanation/uncertainty.');
    await saveRecord('catalyst',t,{
     category:value('c-type'),url:url.href,timestamp:at,fact:value('c-fact'),
     uncertainty:value('c-unc'),evidenceStatus:'USER_REPORTED_NOT_INDEPENDENTLY_VERIFIED',tradingSignal:false});
    status('Private source note recorded, without claiming independent causality or price verification.','success');
   }catch(e){status(e.message,'error')}
  };
 }
 function aggregate(bars,min){const out=[];let bucket=null;for(const b of bars){const t=new Date(b.time),key=Math.floor(t.getTime()/(min*60000));if(!bucket||bucket.key!==key){bucket={key,time:new Date(t),open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume};out.push(bucket)}else{bucket.high=Math.max(bucket.high,b.high);bucket.low=Math.min(bucket.low,b.low);bucket.close=b.close;bucket.volume+=b.volume}}return out}
 function structureSummary(b){if(b.length<5)return'Not enough bars';const x=b.slice(-5),last=x[x.length-1],prev=x[x.length-3];if(last.high>prev.high&&last.low>prev.low)return'Higher-high / higher-low tendency';if(last.high<prev.high&&last.low<prev.low)return'Lower-high / lower-low tendency';return'Range / mixed structure'}
 function renderMulti(){document.getElementById('tool-workbench').innerHTML=panel('Multi-Timeframe Synchronizer',`<p>Upload user-provided 1-minute OHLCV CSV with explicit timezone offsets, for example 2026-10-22T09:30:00-04:00. Invalid or out-of-order rows are rejected; bars are never fabricated. The tool derives 3m, 5m, and 15m views from one unverified source.</p><input id="m-file" type="file" accept=".csv,text/csv"><div class="actions"><button class="btn" id="m-run">Build Timeframes</button></div><div id="m-out"></div>`);let rows=[],importEpoch=0;document.getElementById('m-file').onchange=async e=>{const epoch=++importEpoch,file=e.target.files?.[0];rows=[];if(!file)return;try{const incoming=parseBars(await file.text());if(epoch!==importEpoch)return;rows=incoming;status(`Loaded ${rows.length} user-provided, unverified OHLCV bars. No missing bars were filled.`,'success')}catch(err){if(epoch!==importEpoch)return;rows=[];status(err.message||'Invalid candle CSV.','error')}};document.getElementById('m-run').onclick=()=>{if(!rows.length)return status('Load 1-minute OHLCV first.','error');const frames=[[1,rows],[3,aggregate(rows,3)],[5,aggregate(rows,5)],[15,aggregate(rows,15)]];
 const math=globalThis.GroundUpScannerV014145;
 const ema9=math?.ema(rows.map(x=>x.close),9),ema20=math?.ema(rows.map(x=>x.close),20);
 const typical=math?.typicalPriceVwap(rows);
 document.getElementById('m-out').innerHTML=`<div class="v11-feature-grid">${frames.map(([m,b])=>`<div class="v11-feature available"><span class="v11-feature-mark">${m}m</span><div><strong>${structureSummary(b)}</strong><small>${b.length} derived bars · last ${money(b.at(-1)?.close)}</small></div></div>`).join('')}</div><div class="v11-feature-grid">${[['EMA 9 (provided close observations)',ema9?money(ema9.value):'Insufficient valid observations'],['EMA 20 (provided close observations)',ema20?money(ema20.value):'Insufficient valid observations'],['Typical-price OHLCV VWAP proxy (NOT trade VWAP)',typical?money(typical.value):'Insufficient valid volume']].map(([label,value])=>`<div class="v11-feature available"><div><strong>${esc(label)}</strong><small>${esc(value)}</small></div></div>`).join('')}</div><div class="v11-lock-note">A lower timeframe can look bullish while a higher timeframe is pressing into resistance. Uploaded observations are not independently verified. EMA uses supplied closing values; any VWAP proxy uses typical-price OHLCV approximation, NOT actual trade-derived VWAP.</div>`}}
 function renderStructure(){document.getElementById('tool-workbench').innerHTML=panel('Market Structure Lab',`<p>Upload user-provided OHLCV with timezone-explicit timestamps. Rows with errors or duplicate timestamps are rejected. A simple pivot detector identifies candidate swing highs/lows. You still decide whether the sequence is meaningful market structure.</p><input id="s-file" type="file" accept=".csv,text/csv"><div class="actions"><button class="btn" id="s-run">Detect Swings</button></div><div id="s-out"></div>`);let rows=[],importEpoch=0;document.getElementById('s-file').onchange=async e=>{const epoch=++importEpoch,file=e.target.files?.[0];rows=[];if(!file)return;try{const incoming=parseBars(await file.text());if(epoch!==importEpoch)return;rows=incoming;status(`Loaded ${rows.length} user-provided, unverified bars.`,'success')}catch(err){if(epoch!==importEpoch)return;rows=[];status(err.message||'Invalid candle CSV.','error')}};document.getElementById('s-run').onclick=()=>{if(rows.length<7)return status('Load at least 7 bars.','error');const piv=[];for(let i=2;i<rows.length-2;i++){const b=rows[i],h=rows.slice(i-2,i+3);if(b.high===Math.max(...h.map(x=>x.high)))piv.push({i,type:'H',price:b.high,time:b.time});if(b.low===Math.min(...h.map(x=>x.low)))piv.push({i,type:'L',price:b.low,time:b.time})}const last=piv.slice(-12);let prevH=null,prevL=null;const annotated=last.map(p=>{let lab=p.type;if(p.type==='H'){lab=prevH==null?'H':p.price>prevH?'HH':'LH';prevH=p.price}else{lab=prevL==null?'L':p.price>prevL?'HL':'LL';prevL=p.price}return {...p,lab}});document.getElementById('s-out').innerHTML=`<div class="v11-matrix"><table><thead><tr><th>Time</th><th>Pivot</th><th>Price</th></tr></thead><tbody>${annotated.map(p=>`<tr><td>${p.time.toLocaleString()}</td><td>${p.lab}</td><td>${p.price}</td></tr>`).join('')}</tbody></table></div><div class="v11-lock-note">Pivot algorithms are aids, not authoritative structure labels. Confirm the swing significance in context.</div>`}}
 function renderHalt(){const scenarios=[['Volatility halt occurs immediately after a vertical expansion.','Pause decision-making. Reassess news, liquidity, expected resume spread, and gap risk before considering any new order.'],['SSR is active after a large decline.','Understand the restriction context, but do not treat SSR itself as a directional signal.'],['Resume prints far from the pre-halt price.','Assume stop execution can differ materially from the planned price; recalculate risk before acting.']];document.getElementById('tool-workbench').innerHTML=panel('Halt / SSR / Abnormal Market Scenarios',scenarios.map((s,i)=>`<details><summary><strong>Scenario ${i+1}</strong> — ${esc(s[0])}</summary><p>${esc(s[1])}</p><label>Your decision</label><textarea rows="3" data-scenario="${i}"></textarea></details>`).join('')+`<div class="actions"><button class="btn" id="h-save">Save Scenario Notes</button></div>`);document.getElementById('h-save').onclick=async()=>{const notes=[...document.querySelectorAll('[data-scenario]')].map(x=>x.value);await saveRecord('scenario_review','Halt / SSR Scenario Review',{notes});status('Scenario review saved.','success')}}
 async function renderPattern(){let labs=[];try{labs=await fetch('data/interactive-lab-index.json').then(r=>r.json())}catch{}document.getElementById('tool-workbench').innerHTML=panel('Pattern & Failure Library',`<div class="v11-form-grid"><div><label>Search concept/context</label><input id="p-q" placeholder="failed breakout, VWAP, range..."></div><div><label>Book</label><select id="p-book"><option value="">All</option><option value="1">Book I</option><option value="2">Book II</option><option value="3">Book III</option></select></div></div><div class="actions"><button class="btn" id="p-run">Search Library</button></div><div id="p-out"></div>`);const engine=globalThis.GroundUpPatternEvidenceV014150;
  if(engine){
   const host=document.getElementById('tool-workbench');
   const section=document.createElement('section');section.className='v11-workbench-panel';
   const title=document.createElement('h2');title.textContent='Observable setup evidence and failure modes';
   const intro=document.createElement('p');intro.textContent='Choose an original educational pattern summary. This is not a verified live signal, execution instruction, or prediction.';
   const label=document.createElement('label');label.htmlFor='p-pattern';label.textContent='Setup or pattern';
   const select=document.createElement('select');select.id='p-pattern';
   for(const pattern of engine.all){const option=document.createElement('option');option.value=pattern.id;option.textContent=pattern.title;select.append(option)}
   const description=document.createElement('div');description.setAttribute('aria-live','polite');
   const renderEvidence=()=>{
    const item=engine.get(select.value);if(!item)return;
    description.replaceChildren();
    for(const [heading,value] of [['What and why',item.description],['Evidence to observe',item.evidence],
      ['What invalidates this reading',item.invalidation],['Independent practice',item.exercise]]){
     const strong=document.createElement('strong');strong.textContent=heading;
     const p=document.createElement('p');p.textContent=value;
     description.append(strong,p);
    }
    const note=document.createElement('p');note.textContent='All examples require source and timestamp review. No automatically identified trade, success probability, or validated historical fill.';
    description.append(note);
   };
   select.addEventListener('change',renderEvidence);
   section.append(title,intro,label,select,description);host.append(section);renderEvidence();
  }
  const run=()=>{const q=document.getElementById('p-q').value.toLowerCase(),b=document.getElementById('p-book').value;const out=labs.filter(x=>(!b||String(x.book)===b)&&(!q||JSON.stringify(x).toLowerCase().includes(q))).slice(0,60);document.getElementById('p-out').innerHTML=`<div class="v11-tool-hub">${out.map(x=>`<article class="v11-tool-card"><div class="eyebrow">${esc(x.id)}</div><h3>${esc(x.concept)}</h3><p>${esc((x.marketContexts||[]).join(' · '))}</p><a class="btn secondary" href="lab-player.html?lab=${encodeURIComponent(x.id)}">Open Lab</a></article>`).join('')}</div>`};document.getElementById('p-run').onclick=run;run()}
 function renderTape(){document.getElementById('tool-workbench').innerHTML=panel('Order Flow & Tape Laboratory',`<p>Upload a Time & Sales CSV. Suggested columns: <code>timestamp,price,size,bid,ask</code>. The first version classifies prints relative to contemporaneous bid/ask and measures pace/size.</p><input id="t-file" type="file" accept=".csv,text/csv"><div class="v11-form-grid"><div><label>Replay rows</label><input id="t-count" type="number" value="100" min="10"></div><div><label>Large-print threshold</label><input id="t-large" type="number" value="5000"></div></div><div class="actions"><button class="btn" id="t-run">Analyze Tape</button></div><div id="t-out"></div>`);let rows=[];document.getElementById('t-file').onchange=async e=>rows=parseCsv(await e.target.files[0].text());document.getElementById('t-run').onclick=()=>{const lim=n(document.getElementById('t-count').value)||100,thr=n(document.getElementById('t-large').value)||5000,x=rows.slice(0,lim).map(r=>{const p=n(r.price),bid=n(r.bid),ask=n(r.ask),size=n(r.size)||0;let side='MID';if(p!=null&&ask!=null&&p>=ask)side='ASK';else if(p!=null&&bid!=null&&p<=bid)side='BID';return {...r,_p:p,_size:size,_side:side}});const ask=x.filter(r=>r._side==='ASK').reduce((a,b)=>a+b._size,0),bid=x.filter(r=>r._side==='BID').reduce((a,b)=>a+b._size,0),avg=x.length?x.reduce((a,b)=>a+b._size,0)/x.length:0,large=x.filter(r=>r._size>=thr).length;document.getElementById('t-out').innerHTML=`<div class="v11-feature-grid">${[['Rows',x.length],['Ask-classified shares',ask.toLocaleString()],['Bid-classified shares',bid.toLocaleString()],['Avg shares/print',avg.toFixed(0)],['Large prints',large]].map(([a,b])=>`<div class="v11-feature available"><span class="v11-feature-mark">✓</span><div><strong>${a}</strong><small>${b}</small></div></div>`).join('')}</div><div class="v11-lock-note">Bid/ask classification is an inference from quote context; it is not proof of buyer/seller intent or hidden liquidity.</div>`}}
 function renderContext(){document.getElementById('tool-workbench').innerHTML=panel('Market Context & Session Lab',`<p>Upload intraday OHLCV with timestamps. The tool separates Morning (04:00–09:30 ET), Day (09:30–16:00 ET), and Night (16:00–20:00 ET), matching the Historical Context Envelope design.</p><input id="mc-file" type="file" accept=".csv,text/csv"><div class="actions"><button class="btn" id="mc-run">Analyze Sessions</button></div><div id="mc-out"></div>`);let rows=[],importEpoch=0;document.getElementById('mc-file').onchange=async e=>{const epoch=++importEpoch,file=e.target.files?.[0];rows=[];document.getElementById('mc-out').replaceChildren();if(!file)return;try{if(file.size>2_000_000)throw Error('CSV must be no larger than 2 MB.');const incoming=parseBars(await file.text());if(epoch!==importEpoch)return;rows=incoming;status(`Loaded ${rows.length} member-supplied, unverified market context bars.`,'success')}catch(err){if(epoch!==importEpoch)return;rows=[];status(err.message||'Invalid candle CSV.','error')}};document.getElementById('mc-run').onclick=()=>{if(!rows.length)return status('Load valid, timezone-explicit OHLCV bars before analyzing sessions.','error');const f=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'});const groups={Morning:[],Day:[],Night:[]};rows.forEach(b=>{const parts=Object.fromEntries(f.formatToParts(b.time).map(p=>[p.type,p.value]));const m=Number(parts.hour)*60+Number(parts.minute);const k=m<570?'Morning':m<960?'Day':'Night';groups[k].push(b)});const summary=Object.entries(groups).map(([k,b])=>{if(!b.length)return[k,'—','—','—'];return[k,money(b[0].open),money(b.at(-1).close),b.reduce((a,x)=>a+x.volume,0).toLocaleString()]});document.getElementById('mc-out').innerHTML=`<div class="v11-session-strip"><span class="v11-session-pre">Morning 04:00–09:30</span><span class="v11-session-rth">Day 09:30–16:00</span><span class="v11-session-ah">Night 16:00–20:00</span></div><div class="v11-matrix"><table><thead><tr><th>Session</th><th>Open</th><th>Close</th><th>Volume</th></tr></thead><tbody>${summary.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}}
 async function renderReview(){const {data}=await SB.from('decision_journal').select('id,ticker,trade_date,status,setup,actual_entry,actual_exit').eq('user_id',USER.id).order('created_at',{ascending:false}).limit(50);document.getElementById('tool-workbench').innerHTML=panel('Trade Review Replay',`<p>Select a paper/simulator-compatible journal record and reopen it in the replay environment. Live-trade reconstruction requires matching historical data for the ticker/date.</p><div class="v11-matrix"><table><thead><tr><th>Trade</th><th>Date</th><th>Setup</th><th>Replay</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${esc(r.ticker||'')}</td><td>${esc(r.trade_date||'')}</td><td>${esc(r.setup||'')}</td><td><a href="simulator.html?journal_id=${r.id}" class="btn secondary">Open Replay</a></td></tr>`).join('')}</tbody></table></div>`)}
 async function renderStrategy(){const {data}=await SB.from('decision_journal').select('setup,status,gross_pnl,r_multiple,mfe_r,mae_r,actual_exit_reason_category,plan_followed').eq('user_id',USER.id).eq('status','closed');const rows=data||[];const groups={};rows.forEach(r=>{const k=r.setup||'Unclassified';(groups[k]??=[]).push(r)});const stats=Object.entries(groups).map(([k,a])=>{const vals=a.map(x=>n(x.r_multiple)).filter(Number.isFinite),wins=vals.filter(x=>x>0).length,avg=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null,mfe=a.map(x=>n(x.mfe_r)).filter(Number.isFinite),mae=a.map(x=>n(x.mae_r)).filter(Number.isFinite);return {k,n:a.length,win:vals.length?wins/vals.length*100:null,avg,mfe:mfe.length?mfe.reduce((x,y)=>x+y,0)/mfe.length:null,mae:mae.length?mae.reduce((x,y)=>x+y,0)/mae.length:null}}).sort((a,b)=>b.n-a.n);document.getElementById('tool-workbench').innerHTML=panel('Strategy Validation',`<div class="v11-lock-note">Small samples are unstable. Treat statistics as evidence to investigate, not proof that a setup will continue performing.</div><div class="v11-matrix"><table><thead><tr><th>Setup</th><th>N</th><th>Win %</th><th>Avg R</th><th>Avg MFE R</th><th>Avg MAE R</th></tr></thead><tbody>${stats.map(s=>`<tr><td>${esc(s.k)}</td><td>${s.n}</td><td>${s.win==null?'—':s.win.toFixed(1)+'%'}</td><td>${s.avg==null?'—':s.avg.toFixed(2)}</td><td>${s.mfe==null?'—':s.mfe.toFixed(2)}</td><td>${s.mae==null?'—':s.mae.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`)}
 function renderOptions(){document.getElementById('tool-workbench').innerHTML=panel('Options Learning & Simulator — Planned Branch',`<p>The data/schema branch is reserved for option chains, calls/puts, strikes, expiration, bid/ask, Greeks, implied volatility, time decay, single-leg and multi-leg strategies, risk graphs, assignment/exercise, and contract P&amp;L.</p><div class="v11-lock-note">This branch remains disabled until the curriculum and data rights are ready. We will not fabricate option-chain or OPRA data.</div>`)}
 function renderWorkspaceManager(){
  const host=document.getElementById('tool-workbench');
  const section=document.createElement('section');section.className='v11-workbench-panel';
  const heading=document.createElement('h2');heading.textContent='Your private tool workspace';
  const description=document.createElement('p');
  description.textContent='Review, export or delete records saved for this specific tool. Saved work is not independently verified market history or graded assessment evidence.';
  const buttons=document.createElement('div');buttons.className='actions';
  const results=document.createElement('div');
  const message=document.createElement('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const makeAction=(name,fn)=>{
   const button=document.createElement('button');button.type='button';button.className='btn secondary';
   button.textContent=name;button.addEventListener('click',fn);buttons.append(button);return button;
  };
  const allRecords=async()=>{
   const data=[];
   for(let offset=0;offset<=10000;offset+=100){
    const r=await workspaceApi('&offset='+offset);
    data.push(...(r.records||[]));
    if(!r.hasMore)return data;
   }
   throw new Error('This workspace exceeds the safe export page limit. Contact support for a full data export.');
  };
  const refresh=async()=>{
   message.textContent='Loading private saved work…';results.replaceChildren();
   try{
    const rows=await allRecords();
    const summary=document.createElement('p');summary.textContent=rows.length+' saved record(s) for '+TOOL.name;
    results.append(summary);
    for(const record of rows.slice(0,100)){
     const row=document.createElement('p');
     row.textContent=(record.title||'Untitled')+' · '+record.record_type+' · '+new Date(record.created_at).toLocaleDateString()+' ';
     const remove=document.createElement('button');remove.type='button';remove.className='btn secondary';
     remove.textContent='Delete';
     remove.addEventListener('click',async()=>{
      if(!window.confirm('Permanently delete this one private tool record?'))return;
      try{await workspaceApi('&id='+encodeURIComponent(record.id),'DELETE');await refresh()}
      catch(e){message.textContent=e.message}
     });
     row.append(remove);results.append(row);
    }
    message.textContent='Records are account-scoped and authorization is checked on every request.';
   }catch(e){message.textContent=e.message}
  };
  makeAction('Refresh my saved work',refresh);
  makeAction('Export all tool records (JSON)',async()=>{
   try{const rows=await allRecords();download('groundup-'+TOOL.tool_code.toLowerCase()+'-workspace.json',
    JSON.stringify({tool:TOOL.tool_code,exportedAt:new Date().toISOString(),records:rows},null,2),'application/json');
    message.textContent=rows.length+' private record(s) exported.'}
   catch(e){message.textContent=e.message}
  });
  makeAction('Delete ALL my saved work for this tool',async()=>{
   if(!window.confirm('Permanently delete ALL saved records for '+TOOL.name+'? This cannot be undone.'))return;
   try{await workspaceApi('&all=true','DELETE',undefined,{'x-confirm-delete':'DELETE_MY_TOOL_WORKSPACE'});
    await refresh();message.textContent='All saved records for this tool deleted.'}
   catch(e){message.textContent=e.message}
  });
  section.append(heading,description,buttons,message,results);host.append(section);
  void refresh();
 }
 async function render(){
  const v6=globalThis.GroundUpMarketWorkbenchesV014146;
  const sessionUser=USER?.id,sessionTool=TOOL?.tool_code;
  if(v6&&v6.supports(TOOL.tool_code))
   return v6.render(TOOL.tool_code,{
    host:document.getElementById('tool-workbench'),status,SB,user:USER,tool:TOOL,
    getSession:()=>SB.auth.getSession(),
    alive:()=>USER?.id===sessionUser&&TOOL?.tool_code===sessionTool
   });
  switch(TOOL.tool_code){case'RISK_POSITION_LAB':return renderRisk();case'FLOAT_SUPPLY_LAB':return renderFloat();case'LIQUIDITY_SPREAD_LAB':return renderLiquidity();case'EXECUTION_LAB':return renderExecution();case'DISCOVERY_LAB':return universeWorkbench(false);case'SCANNER_BUILDER':return universeWorkbench(true);case'WATCHLIST_WORKBENCH':return renderWatchlist();case'CATALYST_RESEARCH':return renderCatalyst();case'MULTI_TIMEFRAME_LAB':return renderMulti();case'MARKET_STRUCTURE_LAB':return renderStructure();case'HALT_SSR_LAB':return renderHalt();case'PATTERN_FAILURE_LIBRARY':return renderPattern();case'ORDER_FLOW_TAPE_LAB':return renderTape();case'MARKET_CONTEXT_LAB':return renderContext();case'TRADE_REVIEW_REPLAY':return renderReview();case'STRATEGY_VALIDATION':return renderStrategy();case'OPTIONS_LAB':return renderOptions();default:document.getElementById('tool-workbench').innerHTML=panel(TOOL.name,`<p>This branch is registered in the platform architecture. Its specialized interactive engine will use the same access, data, journal, Tutor, and assessment infrastructure.</p><a class="btn secondary" href="tools.html">Back to Tool Registry</a>`)}}
 async function init(){
  const gate=document.getElementById('tool-gate');
  try{
   SB=await window.getSupabaseClient();
   const code=(new URLSearchParams(location.search).get('tool')||'').toUpperCase();
   const session=(await SB.auth.getSession()).data?.session;
   if(!session?.access_token){gate.textContent='Sign in to use advanced tools.';return}
   const response=await fetch('/api/advanced-tool-access-v014110?tool='+encodeURIComponent(code),{
    headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
   const access=await response.json().catch(()=>null);
   if(!response.ok||!access?.ok)throw new Error(access?.error||'Tool access could not be verified.');
   const t=access.tool;
   if(!access.authorized){
    gate.innerHTML=`<div class="v11-access-panel"><h2>${esc(t.name)}</h2><p>This tool is not included with your current membership.</p><p><strong>À-la-Carte:</strong> ${(Number(t.individual_price_cents||0)/100).toFixed(2)}/month</p><div class="actions"><a class="btn" href="membership.html">Memberships</a><a class="btn secondary" href="tools.html">All Tools</a></div></div>`;
    return;
   }
   const {data:{user}}=await SB.auth.getUser();
   if(!user||user.id!==session.user.id)throw new Error('Your member session changed. Please sign in again.');
   USER=user;TOOL=t;ACCESS={level:access.accessLevel};
   document.getElementById('tool-category').textContent=t.category;
   document.getElementById('tool-title').textContent=t.name;
   document.getElementById('tool-description').textContent=t.description||'';
   gate.innerHTML='<div id="tool-status" class="status-message" role="status" aria-live="polite"></div>';
   document.getElementById('tool-content').hidden=false;
   await render();
   if(ACCESS.level==='entitled')renderWorkspaceManager();
   else status('Preview calculations are educational only. Private premium workspace saving and exports require a current tool entitlement.');
   SB.auth.onAuthStateChange((_event,nextSession)=>{
    if(nextSession?.user?.id===USER?.id)return;
    USER=null;TOOL=null;ACCESS=null;
    document.getElementById('tool-content').hidden=true;
    document.getElementById('tool-workbench').replaceChildren();
    gate.textContent='Signed out or account changed. Reload the tool to access the current member’s private workspace.';
   });
  }catch(e){gate.textContent=e?.message||'Tool not available.'}
 }
 document.addEventListener('DOMContentLoaded',init);
})();
