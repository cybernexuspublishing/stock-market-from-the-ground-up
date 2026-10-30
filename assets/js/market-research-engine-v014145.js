/* v0.14.0.145 — offline first-party scanner research engine.
 * USER-SUPPLIED SNAPSHOTS ARE UNVERIFIED INPUT, NEVER LIVE FEEDS.
 * Source provenance, time basis, stale data, exchange coverage and vendor
 * redistribution rights must be established independently before teaching.
 */
(function(root){
 'use strict';
 const MAX_BYTES=2_000_000,MAX_ROWS=2000;
 const symbol=/^[A-Z][A-Z0-9.-]{0,11}$/;
 const number=v=>{
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(typeof v!=='string'||!v.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v.trim()))return null;
  const n=Number(v);return Number.isFinite(n)?n:null;
 };
 const fail=message=>Object.assign(new Error(message),{code:'SCANNER_INVALID_INPUT'});
 function csv(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)
   throw fail('CSV exceeds 2 MB; use a smaller personally authorized snapshot.');
  const rows=[];let col='',record=[],quoted=false,closed=false;
  const emit=()=>{record.push(col);col='';if(record.some(c=>c.trim()))rows.push(record);record=[];closed=false};
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){col+='"';i++}else{quoted=false;closed=true}}else col+=c;continue;}
   if(c==='"'&&col===''){quoted=true;continue}
   if(c==='"')throw fail('Invalid CSV quoting.');
   if(c===','||c==='\n'||c==='\r'){
    if(c===','){record.push(col);col='';closed=false}
    else{emit();if(c==='\r'&&text[i+1]==='\n')i++}
    if(rows.length>MAX_ROWS+1)throw fail('CSV has more than 2,000 securities.');
   }else{
    if(closed&&!/\s/.test(c))throw fail('CSV contains content after a closing quote.');
    col+=c;
   }
  }
  if(quoted)throw fail('Unclosed CSV quotation.');
  if(col.length||record.length)emit();
  if(rows.length<2)throw fail('CSV requires a header and at least one security.');
  const headers=rows.shift().map(s=>s.replace(/^\uFEFF/,'').trim().toLowerCase());
  if(new Set(headers).size!==headers.length)throw fail('Duplicate CSV headers are not supported.');
  const required=['symbol','price','change_pct','volume','rvol','float','spread_pct'];
  if(required.some(h=>!headers.includes(h)))throw fail('Required CSV headers: '+required.join(', ')+'.');
  if(headers.some(x=>!/^[a-z][a-z0-9_]{0,39}$/.test(x)))throw fail('Invalid CSV header.');
  return rows.map((values,i)=>{
   if(values.length!==headers.length)throw fail('Wrong column count on record '+(i+2)+'.');
   return Object.fromEntries(headers.map((h,j)=>[h,values[j].trim()]));
  });
 }
 const defaults=Object.freeze({minPrice:null,maxPrice:20,minChange:10,minVol:1000000,minRvol:2,maxFloat:15000000,maxSpread:3,minGap:null,maxMarketCap:null,minDollarVolume:null,minVwapDistancePct:null});
 function filters(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw fail('Invalid filters.');
  if(Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw fail('Unsupported scanner filter.');
  const out={};
  for(const [k,defaultValue] of Object.entries(defaults)){
   const v=input[k]===undefined?defaultValue:input[k];
   if(v===null||v===''){out[k]=null;continue}
   const n=number(v);
   if(n===null||n<0||n>1e13)throw fail('Invalid filter '+k+'.');
   out[k]=n;
  }
  if(out.minPrice!==null&&out.maxPrice!==null&&out.minPrice>out.maxPrice)
   throw fail('Minimum price cannot exceed maximum price.');
  return out;
 }
 function analyze(raw,settings={}){
  if(!Array.isArray(raw)||raw.length>MAX_ROWS)throw fail('At most 2,000 input securities are allowed.');
  const f=filters(settings),seen=new Set(),eligible=[],reasons={invalidInput:0,missingMetric:0,failedThreshold:0,duplicateTicker:0};
  for(const row of raw){
   if(!row||typeof row!=='object'){reasons.invalidInput++;continue}
   const ticker=String(row.symbol||'').trim().toUpperCase();
   if(!symbol.test(ticker)){reasons.invalidInput++;continue}
   if(seen.has(ticker)){reasons.duplicateTicker++;continue}
   seen.add(ticker);
   const x={
    symbol:ticker,price:number(row.price),change:number(row.change_pct),
    volume:number(row.volume),rvol:number(row.rvol),float:number(row.float),
    spread:number(row.spread_pct),gap:number(row.gap_pct),
    marketCap:number(row.market_cap),vwap:number(row.vwap)
   };
   if(x.price===null||x.price<=0||x.volume===null||x.volume<0||
      x.rvol===null||x.rvol<0||x.float===null||x.float<=0||
      x.spread===null||x.spread<0||x.change===null){reasons.missingMetric++;continue}
   x.dollarVolume=x.price*x.volume; // Research-only price × reported volume proxy, not verified tape turnover.
   x.vwapDistancePct=x.vwap!==null&&x.vwap>0?(x.price-x.vwap)/x.vwap*100:null;
   if((f.minVwapDistancePct!==null&&x.vwapDistancePct===null)||
      (f.minGap!==null&&x.gap===null)||
      (f.maxMarketCap!==null&&(x.marketCap===null||x.marketCap<=0))||
      (f.minDollarVolume!==null&&!Number.isFinite(x.dollarVolume))){reasons.missingMetric++;continue}
   if((f.minVwapDistancePct!==null&&x.vwapDistancePct<f.minVwapDistancePct)||
      (f.minPrice!==null&&x.price<f.minPrice)||
      (f.minGap!==null&&x.gap<f.minGap)||
      (f.maxMarketCap!==null&&x.marketCap>f.maxMarketCap)||
      (f.minDollarVolume!==null&&x.dollarVolume<f.minDollarVolume)||
      (f.maxPrice!==null&&x.price>f.maxPrice)||
      (f.minChange!==null&&x.change<f.minChange)||
      (f.minVol!==null&&x.volume<f.minVol)||
      (f.minRvol!==null&&x.rvol<f.minRvol)||
      (f.maxFloat!==null&&x.float>f.maxFloat)||
      (f.maxSpread!==null&&x.spread>f.maxSpread)){reasons.failedThreshold++;continue}
   // No opaque trading-signal or success probability. Explicit deterministic
   // ordering is a research convenience, never a buy/sell ranking.
   eligible.push(x);
  }
  eligible.sort((a,b)=>b.change-a.change||b.volume-a.volume||a.symbol.localeCompare(b.symbol));
  return {rows:eligible.slice(0,100),matched:eligible.length,inspected:raw.length,rejections:reasons,filters:f,
   sourceStatus:'UNVERIFIED_MEMBER_IMPORTED_SNAPSHOT',asOf:'NOT_INFERRED',
   score:'NONE',recommendations:false,marketDataCertified:false,memberTrades:false};
 }
 function ema(values,period){
  if(!Array.isArray(values)||!Number.isInteger(period)||period<2||period>200)return null;
  if(values.length<period||values.length>20000)return null;
  const nums=values.map(number);
  if(nums.some(v=>v===null||v<=0))return null;
  let result=nums.slice(0,period).reduce((a,b)=>a+b,0)/period;
  const weight=2/(period+1);
  for(let i=period;i<nums.length;i++)result=nums[i]*weight+result*(1-weight);
  return {value:result,period,samples:nums.length,
    label:'EMA OF PROVIDED OBSERVATIONS — NOT VERIFIED MARKET HISTORY'};
 }
 function sma(values,period){
  if(!Array.isArray(values)||!Number.isInteger(period)||period<2||period>200||
     values.length<period||values.length>20000)return null;
  const nums=values.slice(-period).map(number);
  if(nums.some(v=>v===null||v<=0))return null;
  return {value:nums.reduce((sum,v)=>sum+v,0)/period,period,samples:period,
   label:'SMA OF SUPPLIED CLOSES — SOURCE NOT INDEPENDENTLY VERIFIED'};
 }
 // Seed Wilder ATR with the first period complete true-range observations,
 // beginning at bar 2 because the preceding close is mandatory.
 function wilderAtr(bars,period=14){
  if(!Array.isArray(bars)||!Number.isInteger(period)||period<2||period>200||
     bars.length<period+1||bars.length>20000)return null;
  const values=[];let prior=null;
  for(const bar of bars){
   if(!bar||typeof bar!=='object')return null;
   const high=number(bar.high),low=number(bar.low),close=number(bar.close);
   if([high,low,close].some(v=>v===null)||low<=0||high<low||close<low||close>high)return null;
   if(prior!==null)values.push(Math.max(high-low,Math.abs(high-prior),Math.abs(low-prior)));
   prior=close;
  }
  let atr=values.slice(0,period).reduce((sum,v)=>sum+v,0)/period;
  for(let i=period;i<values.length;i++)atr=((period-1)*atr+values[i])/period;
  return {value:atr,period,trueRangeSamples:values.length,
   seed:'SMA of first period TR observations beginning at bar 2',
   label:'WILDER ATR FROM SUPPLIED OHLC — NOT VERIFIED EXCHANGE HISTORY'};
 }
 function typicalPriceVwap(bars){
  if(!Array.isArray(bars)||!bars.length||bars.length>20000)return null;
  let total=0,quantity=0;
  for(const bar of bars){
   const high=number(bar.high),low=number(bar.low),close=number(bar.close),volume=number(bar.volume);
   if([high,low,close,volume].some(x=>x===null)||low<=0||high<low||close<low||close>high||volume<0)return null;
   total+=((high+low+close)/3)*volume;quantity+=volume;
  }
  if(!quantity)return null;
  return {value:total/quantity,totalVolume:quantity,source:'TYPICAL_PRICE_OHLCV_APPROXIMATION',
   label:'Approximate (H+L+C)/3×volume weighted proxy, NOT trade-derived VWAP, no national tape claim'};
 }
 root.GroundUpScannerV014145=Object.freeze({csv,filters,analyze,ema,sma,wilderAtr,typicalPriceVwap,MAX_ROWS,MAX_BYTES});
})(globalThis);
