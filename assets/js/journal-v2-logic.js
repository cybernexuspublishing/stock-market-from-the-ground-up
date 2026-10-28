/* Trading Journal V2 — original, deterministic educational calculations.
 * This module never grades competency, forecasts results, or reads premium P&L.
 * It deliberately consumes only already-authorized, member-owned Journal rows.
 */
(function(root){
'use strict';
const number = value => {
 if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')return null;
 if(typeof value==='string'&&!value.trim())return null;
 const n=Number(value);return Number.isFinite(n)?n:null;
};
function planRisk({direction,entry,stop,target,quantity,riskBudget}){
 const e=number(entry),s=number(stop),t=number(target),q=number(quantity),b=number(riskBudget);
 const out={valid:false,reason:'Complete direction, entry and stop before calculating risk.',
  riskPerShare:null,plannedRisk:null,targetReward:null,rewardRisk:null,maxWholeShares:null,withinBudget:null};
 if(!['LONG','SHORT'].includes(direction)||e===null||s===null)return out;
 const risk=direction==='LONG'?e-s:s-e;
 if(e<=0||s<=0||!Number.isFinite(risk)||risk<=0){
  out.reason='The stop must be positive and on the risk side of the planned entry.';return out;
 }
 out.valid=true;out.reason=null;out.riskPerShare=risk;
 if(q!==null&&q>0){out.plannedRisk=risk*q}
 if(t!==null&&t>0){
  const reward=direction==='LONG'?t-e:e-t;
  if(reward>0&&q!==null&&q>0)out.targetReward=reward*q;
  if(reward>0)out.rewardRisk=reward/risk;
 }
 if(b!==null&&b>0){
  const max=Math.floor(b/risk);
  out.maxWholeShares=Number.isSafeInteger(max)?max:null;
  if(out.plannedRisk!==null)out.withinBudget=out.plannedRisk<=b+1e-8;
 }
 return out;
}
function validDay(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [y,m,d]=s.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()+1===m&&v.getUTCDate()===d;
}
function mondayUtc(asOf){
 const date=asOf instanceof Date?asOf:new Date(asOf);
 if(!Number.isFinite(date.getTime()))throw Error('Invalid as-of date');
 const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));return start;
}
function processSummary(rows,{asOf=new Date(),weeks=1,type='all'}={}){
 if(!Array.isArray(rows)||!Number.isInteger(weeks)||weeks<1||weeks>12||!['all','live','paper','observation','historical_lab'].includes(type))
  throw Error('Invalid Journal process review filter');
 const current=mondayUtc(asOf),start=new Date(current.getTime()-(weeks-1)*7*86400000),
  end=new Date(current.getTime()+7*86400000);
 const byType={live:{},paper:{},observation:{},historical_lab:{}};
 const tags=new Map();
 let total=0,drafts=0,completed=0,noTrade=0,unknownProcess=0,adherenceYes=0,adherencePartial=0,adherenceNo=0,gradedSelf=0;
 const types={live:0,paper:0,observation:0,historical_lab:0};
 for(const r of rows){
  if(!r||!Object.prototype.hasOwnProperty.call(types,r.journal_type)||!validDay(r.trade_date))continue;
  if(type!=='all'&&r.journal_type!==type)continue;
  const when=new Date(r.trade_date+'T00:00:00Z');
  if(when<start||when>=end||when>(asOf instanceof Date?asOf:new Date(asOf)))continue;
  total++;types[r.journal_type]++;
  const complete=['closed','no_trade','reviewed'].includes(r.status);
  if(complete)completed++;else drafts++;
  if(r.status==='no_trade'||(complete&&r.decision==='NO TRADE'))noTrade++;
  const grade=r.process_grade;
  if(['GOOD','MIXED','BAD'].includes(grade))gradedSelf++;
  else unknownProcess++;
  if(r.plan_followed==='YES')adherenceYes++;
  else if(r.plan_followed==='PARTIAL')adherencePartial++;
  else if(r.plan_followed==='NO')adherenceNo++;
  if(Array.isArray(r.mistakes)){
   for(const name of new Set(r.mistakes.filter(s=>typeof s==='string'&&s.trim()))){
    tags.set(name,(tags.get(name)||0)+1);
   }
  }
 }
 return {start:start.toISOString().slice(0,10),endExclusive:end.toISOString().slice(0,10),
  total,completed,drafts,noTrade,types,unknownProcess,gradedSelf,
  adherence:{yes:adherenceYes,partial:adherencePartial,no:adherenceNo,
   denominator:adherenceYes+adherencePartial+adherenceNo},
  commonMistakes:[...tags].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .slice(0,5).map(([label,count])=>({label,count})),
  note:'Member-entered process observations only; not paid performance analytics, verified executions or graded mastery.'};
}
root.JournalV2=Object.freeze({number,planRisk,processSummary,mondayUtc});
})(typeof window!=='undefined'?window:globalThis);
