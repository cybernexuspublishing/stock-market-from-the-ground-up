/* D10: safe local CSV-to-OHLCV import for member-provided educational bars.
 * Source files are NEVER authenticated market history or redistribution rights.
 * Reject a corrupted bar/file instead of silently dropping candles.
 * Does not interpolate gaps, infer timezone, or invent an observation.
 */
(function(root){
 'use strict';
 const MAX_BYTES=2_000_000,MAX_BARS=20000,UTF=new TextEncoder();
 const err=(msg)=>{const e=new Error(msg);e.code='UNVERIFIED_OHLCV_INPUT';return e;};
 const numeric=/^(?:[+]?(?:\d+(?:\.\d*)?|\.\d+))$/;
 const iso=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/i;
 function timestamp(value,index){
  const text=String(value??'').trim(),m=iso.exec(text);
  if(!m)throw err('Row '+index+': timestamp must include an explicit time zone (Z or ±HH:MM). Use YYYY-MM-DDTHH:MM:SS-04:00, for example.');
  const [,yy,mm,dd,h,minute,sec='00',ms='0',tz]=m;
  const year=+yy,month=+mm,day=+dd,hour=+h,min=+minute,seconds=+sec;
  if(month<1||month>12||day<1||day>31||hour>23||min>59||seconds>59||
    (tz.length===6&&tz.slice(1,3)==='14'&&tz.slice(4)!=='00'))
   throw err('Row '+index+': invalid date, clock time or offset.');
  const utc=Date.UTC(year,month-1,day,hour,min,seconds,+(ms.padEnd(3,'0')));
  const anchor=new Date(Date.UTC(year,month-1,day));
  if(anchor.getUTCFullYear()!==year||anchor.getUTCMonth()+1!==month||anchor.getUTCDate()!==day)
   throw err('Row '+index+': impossible calendar date.');
  const t=Date.parse(text);
  if(!Number.isFinite(t))throw err('Row '+index+': invalid timestamp.');
  return new Date(t);
 }
 function number(value,label,index){
  if(typeof value!=='string'||!numeric.test(value.trim()))throw err('Row '+index+': '+label+' must be a valid number.');
  const v=Number(value.trim());
  if(!Number.isFinite(v))throw err('Row '+index+': '+label+' is out of range.');
  return v;
 }
 function splitCsv(text){
  if(typeof text!=='string'||UTF.encode(text).length>MAX_BYTES)
   throw err('CSV must be no larger than 2 MB.');
  const rows=[],record=[];let value='',inside=false,afterQuote=false,fieldStarted=false;
  function field(){record.push(value);value='';afterQuote=false;fieldStarted=false;}
  function line(){
   field();if(record.some(x=>x.trim()))rows.push([...record]);record.length=0;
   if(rows.length>MAX_BARS+1)throw err('CSV exceeds 20,000 candle rows.');
  }
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(inside){
    if(ch==='"'){
     if(text[i+1]==='"'){value+='"';i++}
     else{inside=false;afterQuote=true}
    }else{value+=ch}
    continue;
   }
   if(ch==='"'){
    if(fieldStarted||afterQuote)throw err('CSV quotation is malformed.');
    inside=true;fieldStarted=true;continue;
   }
   if(ch===','){field();continue}
   if(ch==='\r'||ch==='\n'){
    line();if(ch==='\r'&&text[i+1]==='\n')i++;continue;
   }
   if(afterQuote&&!/\s/.test(ch))throw err('CSV text follows a closing quote.');
   value+=ch;fieldStarted=true;
  }
  if(inside)throw err('CSV has an unclosed quoted field.');
  if(value.length||record.length||afterQuote)line();
  if(rows.length<2)throw err('CSV needs a header and at least one candle.');
  return rows;
 }
 function csvBars(text){
  const rows=splitCsv(text),headers=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
  if(new Set(headers).size!==headers.length||headers.some(x=>!/^[a-z][a-z0-9_]{0,29}$/.test(x)))
   throw err('CSV header names must be unique and valid.');
  for(const col of ['open','high','low','close','volume'])
   if(!headers.includes(col))throw err('Missing required OHLCV column: '+col+'.');
  const field=(row,k)=>row[headers.indexOf(k)];
  const hasTime=['timestamp','datetime','date_time'].some(x=>headers.includes(x));
  if(!hasTime&&!(headers.includes('date')&&headers.includes('time')))
   throw err('Timestamp column required, or date and time with explicit zone offset.');
  const out=[];let previous=-Infinity;
  for(let i=0;i<rows.length;i++){
   const row=rows[i],index=i+2;
   if(row.length!==headers.length)throw err('Row '+index+': CSV column count does not match header.');
   const raw=['timestamp','datetime','date_time'].map(k=>field(row,k)).find(x=>x!==undefined);
   const stamp=raw??String(field(row,'date')??'')+'T'+String(field(row,'time')??'');
   const time=timestamp(stamp,index),epoch=time.getTime();
   if(epoch<=previous)throw err('Row '+index+': timestamps must be strictly increasing; duplicates and out-of-order candles cannot be silently repaired.');
   const [open,high,low,close,volume]=['open','high','low','close','volume'].map(k=>number(field(row,k),k,index));
   if(open<=0||high<=0||low<=0||close<=0||low>high||high<Math.max(open,close)||low>Math.min(open,close)||
     !Number.isSafeInteger(volume)||volume<0)
    throw err('Row '+index+': impossible OHLC price relationship or invalid whole-share volume.');
   out.push({time,open,high,low,close,volume});
   previous=epoch;
  }
  if(!out.length)throw err('No observations supplied.');
  return out;
 }
 root.GroundUpResearchBarsV014150=Object.freeze({csvBars});
})(typeof globalThis!=='undefined'?globalThis:window);
