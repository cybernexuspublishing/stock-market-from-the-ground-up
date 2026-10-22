/* v0.14.0.146 — unverified member-supplied observations only.
 * Educational research, NEVER live quotes, a broker fill, true aggressor
 * identification, verified historical tape, or investable backtest signals.
 */
(function(root){
 'use strict';
 const LIMIT_BYTES=2_000_000,MAX_ROWS=20000;
 const fail=s=>{throw new Error(s)};
 const num=x=>{
  if(typeof x==='number')return Number.isFinite(x)?x:null;
  if(typeof x!=='string'||!x.trim()||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(x.trim()))return null;
  const v=Number(x);return Number.isFinite(v)?v:null;
 };
 const dateMs=x=>typeof x==='string'&&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(x.trim())&&
  Number.isFinite(Date.parse(x))?Date.parse(x):null;
 function csv(text,mandatory,limit=MAX_ROWS){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMIT_BYTES)fail('Upload a CSV not exceeding 2 MB.');
  const records=[];let row=[],field='',quoted=false,closed=false;
  const emit=()=>{row.push(field);if(row.some(x=>x.trim()))records.push(row);row=[];field='';closed=false;if(records.length>limit+1)fail('CSV has too many rows.')};
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
   if(c==='"'&&field===''){quoted=true;continue}
   if(c==='"')fail('Invalid CSV quotation.');
   if(c===','||c==='\r'||c==='\n'){
    if(c===','){row.push(field);field='';closed=false}else{emit();if(c==='\r'&&text[i+1]==='\n')i++}
   }else{if(closed&&!/\s/.test(c))fail('Unexpected characters after quotation.');field+=c}
  }
  if(quoted)fail('Unterminated CSV quotation.');
  if(field.length||row.length)emit();
  if(records.length<2)fail('Provide a header and at least one observation.');
  const heads=records.shift().map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
  if(new Set(heads).size!==heads.length||heads.some(h=>!/^[a-z][a-z0-9_]{0,39}$/.test(h)))
   fail('Duplicate or invalid CSV headers.');
  if(mandatory.some(k=>!heads.includes(k)))fail('Required columns: '+mandatory.join(', '));
  return records.map((row,i)=>{
   if(row.length!==heads.length)fail('Invalid column count at CSV record '+(i+2)+'.');
   return Object.fromEntries(heads.map((h,j)=>[h,row[j].trim()]));
  });
 }
 function tape(text){
  const rows=csv(text,['timestamp','price','size'],10000);
  return rows.map((r,i)=>{
   const timestamp=dateMs(r.timestamp),price=num(r.price),size=num(r.size);
   if(timestamp===null||price===null||price<=0||size===null||!Number.isSafeInteger(size)||size<1)
    fail('Invalid tape time, price or positive whole-share quantity at record '+(i+2)+'.');
   const bid=r.bid===undefined||r.bid===''?null:num(r.bid);
   const ask=r.ask===undefined||r.ask===''?null:num(r.ask);
   if((bid===null)!==(ask===null)||bid!==null&&(bid<=0||ask<bid))
    fail('Invalid paired bid/ask at tape record '+(i+2)+'.');
   const quoteTime=typeof r.quote_timestamp==='string'&&r.quote_timestamp?dateMs(r.quote_timestamp):null;
   if(r.quote_timestamp&&quoteTime===null)fail('Invalid quote timestamp at tape record '+(i+2)+'.');
   const fresh=bid!==null&&quoteTime!==null&&timestamp>=quoteTime&&timestamp-quoteTime<=1000;
   let quoteClass='UNCLASSIFIED';
   if(fresh&&ask>bid){
    if(Math.abs(price-ask)<1e-8)quoteClass='AT_ASK';
    else if(Math.abs(price-bid)<1e-8)quoteClass='AT_BID';
   }
   return {timestamp,price,size,bid,ask,quoteTime,quoteClass,
    quoteContext:fresh?'WITHIN_1_SECOND':'MISSING_OR_STALE'};
  });
 }
 function tapeSummary(rows,count,largeThreshold){
  if(!Array.isArray(rows)||!Number.isSafeInteger(count)||count<1||count>10000||
   !Number.isSafeInteger(largeThreshold)||largeThreshold<1)fail('Invalid replay count or large-print threshold.');
  const selected=rows.slice(0,count);
  let atAsk=0,atBid=0,unknown=0,large=0,shares=0,quoteContext=0;
  for(const r of selected){
   if(!Number.isSafeInteger(r.size)||r.size<1)fail('Invalid tape record.');
   shares+=r.size;
   if(r.size>=largeThreshold)large++;
   if(r.quoteContext==='WITHIN_1_SECOND')quoteContext++;
   if(r.quoteClass==='AT_ASK')atAsk+=r.size;
   else if(r.quoteClass==='AT_BID')atBid+=r.size;
   else unknown+=r.size;
  }
  return {rows:selected.length,shares,atAsk,atBid,unknown,large,
   average:selected.length?shares/selected.length:null,quoteContext,
   inference:'Quote-relative print location is not aggressor identity, order-book depth, participant intent, or trading advice.'};
 }
 function bars(text){
  const data=csv(text,['open','high','low','close','volume'],MAX_ROWS),seen=new Set();
  const out=data.map((r,i)=>{
   const stamp=r.timestamp||r.datetime||r.date_time||r.date,at=dateMs(stamp);
   const open=num(r.open),high=num(r.high),low=num(r.low),close=num(r.close),volume=num(r.volume);
   if(at===null||seen.has(at)||[open,high,low,close,volume].some(v=>v===null)||
    low<=0||high<Math.max(open,close)||low>Math.min(open,close)||volume<0)
    fail('Invalid, duplicate or timezone-ambiguous OHLCV at record '+(i+2)+'.');
   seen.add(at);return{timestamp:at,time:new Date(at),open,high,low,close,volume};
  });
  return out.sort((a,b)=>a.timestamp-b.timestamp);
 }
 const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 function sessions(input){
  if(!Array.isArray(input)||input.length>MAX_ROWS)fail('Invalid OHLCV collection.');
  const map=new Map();let excluded=0;
  for(const b of input){
   if(!Number.isFinite(b.timestamp)||!Number.isFinite(b.volume)||b.volume<0)fail('Invalid OHLCV record.');
   const p=Object.fromEntries(ny.formatToParts(new Date(b.timestamp)).map(x=>[x.type,x.value]));
   const m=Number(p.hour)*60+Number(p.minute);
   if(m<240||m>=1200){excluded++;continue}
   const session=m<570?'Pre-market':m<960?'Regular':'After-hours';
   const day=p.year+'-'+p.month+'-'+p.day,key=day+'|'+session;
   if(!map.has(key))map.set(key,{day,session,open:b.open,close:b.close,volume:0,bars:0});
   const row=map.get(key);row.close=b.close;row.volume+=b.volume;row.bars++;
  }
  return {groups:[...map.values()].sort((a,b)=>a.day.localeCompare(b.day)||
    ['Pre-market','Regular','After-hours'].indexOf(a.session)-['Pre-market','Regular','After-hours'].indexOf(b.session)),
    excluded,timezone:'America/New_York',dataStatus:'UNVERIFIED_MEMBER_UPLOADED_OHLCV'};
 }
 function confirmedPivots(input){
  if(!Array.isArray(input)||input.length>MAX_ROWS)fail('Invalid OHLCV collection.');
  const pivots=[];
  for(let i=2;i<input.length-2;i++){
   const block=input.slice(i-2,i+3),b=input[i];
   if(!block.every(x=>Number.isFinite(x.high)&&Number.isFinite(x.low)&&Number.isFinite(x.timestamp)))fail('Invalid pivot input.');
   if(block.filter(x=>x.high===b.high).length===1&&block.every(x=>x.high<=b.high))
    pivots.push({type:'H',price:b.high,time:b.timestamp,confirmedAt:input[i+2].timestamp});
   if(block.filter(x=>x.low===b.low).length===1&&block.every(x=>x.low>=b.low))
    pivots.push({type:'L',price:b.low,time:b.timestamp,confirmedAt:input[i+2].timestamp});
  }
  let high=null,low=null;
  return pivots.map(p=>{
   const label=p.type==='H'?(high===null?'H':p.price>high?'HH':'LH'):(low===null?'L':p.price>low?'HL':'LL');
   if(p.type==='H')high=p.price;else low=p.price;
   return {...p,label,lookaheadGuard:'CONFIRMED_ONLY_AFTER_TWO_SUBSEQUENT_BARS'};
  });
 }
 root.GroundUpMarketAnalysisV014146=Object.freeze({csv,tape,tapeSummary,bars,sessions,confirmedPivots,
  LIMIT_BYTES,MAX_ROWS});
})(globalThis);
