/* Crownlight Watchlist Intelligence V2 — deterministic, offline-safe research helpers.
 * Premium records remain server-owned. Never infer executions, live quotes or grades.
 */
(function(root){
 'use strict';
 const STAGES=Object.freeze(['DISCOVER','RESEARCH','ANALYZE','MONITOR','PLAN','PRACTICE','REVIEW','LEARN']);
 const TOKEN=/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/;
 const ASOF=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
 const CATS=Object.freeze(['SUPPORT','RESISTANCE','BREAKOUT','PULLBACK','INVALIDATION','OTHER']);
 const fail=x=>{throw Error(x)};
 const text=(v,max)=>String(v??'').trim().slice(0,max);
 const symbol=s=>/^[A-Z][A-Z0-9.-]{0,11}$/.test(String(s||''));
 const time=s=>typeof s==='string'&&ASOF.test(s)&&Number.isFinite(Date.parse(s))&&Date.parse(s)<=Date.now()+300000;
 const labels=v=>{
  const out=[];for(const raw of Array.isArray(v)?v:String(v||'').split(',')){
   const t=text(raw,40);if(t&&!TOKEN.test(t))fail('Tags must contain letters, numbers, spaces, periods, underscores or hyphens.');
   if(t&&!out.some(x=>x.toLowerCase()===t.toLowerCase()))out.push(t);
  }
  if(out.length>8)fail('Use no more than eight distinct tags.');
  return out;
 };
 function safeRecord(r){
  if(!r||r.record_type!=='watchlist'||!symbol(String(r.title||'').toUpperCase())||
   !Number.isSafeInteger(Number(r.id))||Number(r.id)<=0)fail('An authenticated saved Watchlist record is required.');
  const p=r.payload&&typeof r.payload==='object'&&!Array.isArray(r.payload)?r.payload:{};
  return {id:Number(r.id),title:String(r.title).toUpperCase(),revision:r.updated_at,
   payload:p,folder:text(p.folder||'Unfiled',40),tags:labels(p.tags),
   archived:p.archived===true,stage:STAGES.includes(p.workflowStage)?p.workflowStage:'DISCOVER',
   history:Array.isArray(p.researchHistory)?p.researchHistory.slice(-50):[],
   annotations:Array.isArray(p.chartAnnotations)?p.chartAnnotations.slice(-40):[]};
 }
 function csvCell(value){
  let s=String(value??'').replace(/\u0000/g,'');
  // A CSV cell is untrusted even if quoted; spreadsheet importers can execute
  // formula prefixes after whitespace or control characters.
  if(/^[\u0001-\u0020]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 }
 function exportCsv(records){
  const head=['Symbol','Stage','Status','Folder','Tags','Archived','Observation time','Source note','Invalidation','Research checkpoints','Chart annotations'];
  const rows=[head.map(csvCell).join(',')];
  for(const r of records){const x=safeRecord(r),p=x.payload;
   rows.push([x.title,x.stage,p.status||'WATCH',x.folder,x.tags.join(' | '),x.archived?'Yes':'No',p.asOf||'',p.sourceNote||'',p.invalidation||'',x.history.length,x.annotations.length].map(csvCell).join(','));
  }
  return '\uFEFF'+rows.join('\r\n')+'\r\n';
 }
 function checkpoint(rec,{action='REVIEW',note,at}={}){
  const r=safeRecord(rec),n=text(note,480);
  if(n.length<12)fail('Record at least 12 characters of evidence or a reason for the change.');
  if(!time(at))fail('Provide an ISO 8601 observation timestamp with timezone offset.');
  const event={kind:text(action,40),note:n,at,verification:'MEMBER_REPORTED_NOT_VERIFIED'};
  return {...r.payload,researchHistory:[...r.history,event].slice(-50)};
 }
 function setMetadata(rec,{folder,tags,archived,stage,at,note}={}){
  const r=safeRecord(rec),nextStage=String(stage||r.stage);
  if(!STAGES.includes(nextStage))fail('Unknown candidate research stage.');
  const f=text(folder||'Unfiled',40);
  if(!TOKEN.test(f))fail('Invalid research folder.');
  const archive=archived===true,previousArchived=r.archived,progress=nextStage!==r.stage;
  const changed=archive!==previousArchived||progress||f!==r.folder||
    JSON.stringify(labels(tags??r.tags))!==JSON.stringify(r.tags);
  if(!changed)return r.payload;
  const updated={...r.payload,folder:f,tags:labels(tags??r.tags),archived:archive,workflowStage:nextStage};
  // Every saved organization, stage or archive change gets a dated history
  // event. A passive folder/tag change is not claimed as research validation.
  return checkpoint({...rec,payload:updated},{
   action:archive!==previousArchived?(archive?'ARCHIVE':'RESTORE'):
     progress?'STAGE_CHANGE':'ORGANIZATION_CHANGE',
   note:text(note,480)||'Member updated candidate research organization or workflow metadata.',
   at});
 }
 function annotation(rec,{kind='OTHER',at,price,note,timeframe='1D'}={}){
  const r=safeRecord(rec),value=Number(price),comment=text(note,360);
  if(!CATS.includes(kind))fail('Unknown annotation type.');
  if(!time(at))fail('A nonfuture observation timestamp with UTC offset is required.');
  if(!Number.isFinite(value)||value<=0||value>10000000)fail('Enter a positive, finite reference price.');
  if(comment.length<12)fail('Describe the chart level and its limitations.');
  const item={kind,at,price:value,timeframe:text(timeframe,24)||'1D',note:comment,
   verification:'MANUAL_ANNOTATION_NOT_LIVE_MARKET_DATA'};
  return {...r.payload,chartAnnotations:[...r.annotations,item].slice(-40)};
 }
 const MONITOR_TYPES=Object.freeze(['ABOVE_REFERENCE','BELOW_REFERENCE','INSIDE_RANGE','OUTSIDE_RANGE']);
 function monitoringRule(rec,{type='ABOVE_REFERENCE',low,high,at,note}={}){
  const x=safeRecord(rec),v=Number(low),upper=high==null||high===''?null:Number(high),n=text(note,360);
  if(!MONITOR_TYPES.includes(type))fail('Unsupported manual monitoring rule.');
  if(!time(at))fail('A dated, nonfuture source observation with offset is required.');
  if(!Number.isFinite(v)||v<=0||v>10000000)fail('Monitoring reference must be a positive price.');
  if(type.endsWith('_RANGE')&&(!Number.isFinite(upper)||upper<=v||upper>10000000))
   fail('A range rule requires a higher upper reference level.');
  if(n.length<12)fail('Document the research reason and invalidation limits.');
  const rule={type,low:v,high:type.endsWith('_RANGE')?upper:null,at,note:n,
   verification:'MEMBER_DEFINED_RULE_NOT_AUTOMATED_ALERT'};
  const previous=Array.isArray(x.payload.monitoringRules)?x.payload.monitoringRules.slice(-9):[];
  const base={...x.payload,monitoringRules:[...previous,rule]};
  return checkpoint({...rec,payload:base},{action:'MONITOR_RULE',at,
   note:'Member created a manual research monitoring rule: '+n});
 }
 function evaluateMonitoring(rec,{price,at,sourceNote}={}){
  const x=safeRecord(rec),p=Number(price),note=text(sourceNote,180);
  if(!Number.isFinite(p)||p<=0||p>10000000)fail('A valid member-entered observed price is required.');
  if(!time(at)||note.length<8)fail('Manual monitoring requires dated source evidence.');
  const rules=Array.isArray(x.payload.monitoringRules)?x.payload.monitoringRules.slice(-10):[];
  const results=rules.map((r,i)=>{
   if(!r||!MONITOR_TYPES.includes(r.type))return null;
   const trigger=r.type==='ABOVE_REFERENCE'?p>r.low:r.type==='BELOW_REFERENCE'?p<r.low:
    r.type==='INSIDE_RANGE'?p>=r.low&&p<=r.high:p<r.low||p>r.high;
   return {ruleIndex:i,matched:trigger,kind:r.type,action:trigger?'REVIEW_RESEARCH_ONLY':'NO_FLAG',
    note:r.note||'',live:false,brokerOrder:false};
  }).filter(Boolean);
  return {symbol:x.title,at,sourceNote:note,price:p,results,source:'MEMBER_ENTERED_UNVERIFIED_SNAPSHOT',
   noAutomaticNotifications:true,noTradeSignal:true};
 }
 function filters(records,{folder='',tag='',stage='',includeArchived=false,query=''}={}){
  const needle=text(query,120).toUpperCase();
  return (Array.isArray(records)?records:[]).filter(r=>{
   let x;try{x=safeRecord(r)}catch{return false}
   return (includeArchived||!x.archived)&&(!folder||x.folder===folder)&&
    (!tag||x.tags.includes(tag))&&(!stage||x.stage===stage)&&
    (!needle||x.title.includes(needle)||String(x.payload.why||'').toUpperCase().includes(needle));
  });
 }
 function reminders(records,{now=Date.now(),staleDays=7}={}){
  if(!Number.isFinite(now)||!Number.isFinite(staleDays)||staleDays<1)fail('Invalid review horizon.');
  return (Array.isArray(records)?records:[]).flatMap(rec=>{
   let x;try{x=safeRecord(rec)}catch{return []}
   if(x.archived)return [];
   const date=Date.parse(x.payload.asOf||'');
   const alerts=[];
   if(!Number.isFinite(date))alerts.push('Missing observation time');
   else if(now-date>staleDays*86400000)alerts.push('Research snapshot requires manual freshness review');
   if(!String(x.payload.sourceNote||'').trim())alerts.push('Missing source provenance');
   if(!String(x.payload.invalidation||'').trim())alerts.push('No documented invalidation');
   return alerts.length?[{id:x.id,symbol:x.title,alerts,delivery:'IN_PAGE_MANUAL_REVIEW_ONLY'}]:[];
  });
 }
 function stats(records){
  const items=(Array.isArray(records)?records:[]).flatMap(r=>{try{return[safeRecord(r)]}catch{return []}});
  const byStage=Object.fromEntries(STAGES.map(s=>[s,0]));
  for(const r of items)if(!r.archived)byStage[r.stage]++;
  return {total:items.length,active:items.filter(x=>!x.archived).length,archived:items.filter(x=>x.archived).length,
   byStage,source:'SAVED_MEMBER_RESEARCH_NOT_VERIFIED_MARKET_HISTORY'};
 }
 const engine=Object.freeze({STAGES,CATS,MONITOR_TYPES,safeRecord,labels,csvCell,exportCsv,
  checkpoint,setMetadata,annotation,monitoringRule,evaluateMonitoring,filters,reminders,stats,time});
 root.GroundUpWatchlistResearchCoreV2=engine;
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;
})(globalThis);
