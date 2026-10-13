window.JournalTools=(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
  function money(v){const n=num(v);return n===null?'—':n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2})}
  function dec(v,d=2){const n=num(v);return n===null?'—':n.toFixed(d)}
  function pct(v,d=1){const n=num(v);return n===null?'—':`${n.toFixed(d)}%`}
  function compute(j){
    const direction=j.direction, shares=num(j.share_quantity), entry=num(j.actual_entry), exit=num(j.actual_exit), stop=num(j.planned_stop), hi=num(j.highest_while_open), lo=num(j.lowest_while_open), fees=num(j.fees)||0;
    const out={gross_pnl:null,net_pnl:null,risk_per_share:null,initial_planned_risk:null,r_multiple:null,mfe_per_share:null,mae_per_share:null,mfe_dollars:null,mae_dollars:null,mfe_r:null,mae_r:null,mfe_capture_pct:null,duration_minutes:null};
    if(direction&&shares!==null&&shares>0&&entry!==null&&exit!==null){out.gross_pnl=(direction==='LONG'?(exit-entry):(entry-exit))*shares;out.net_pnl=out.gross_pnl-fees}
    if(direction&&shares!==null&&shares>0&&entry!==null&&stop!==null){
      const risk=direction==='LONG'?entry-stop:stop-entry;
      if(risk>0){out.risk_per_share=risk;out.initial_planned_risk=risk*shares;if(out.net_pnl!==null)out.r_multiple=out.net_pnl/out.initial_planned_risk}
    }
    if(direction&&shares!==null&&shares>0&&entry!==null&&hi!==null&&lo!==null){
      out.mfe_per_share=Math.max(0,direction==='LONG'?hi-entry:entry-lo);
      out.mae_per_share=Math.max(0,direction==='LONG'?entry-lo:hi-entry);
      out.mfe_dollars=out.mfe_per_share*shares;out.mae_dollars=out.mae_per_share*shares;
      if(out.initial_planned_risk>0){out.mfe_r=out.mfe_dollars/out.initial_planned_risk;out.mae_r=out.mae_dollars/out.initial_planned_risk}
      if(out.gross_pnl!==null&&out.gross_pnl>0&&out.mfe_dollars>0)out.mfe_capture_pct=(out.gross_pnl/out.mfe_dollars)*100;
    }
    if(j.trade_date&&j.exit_date&&j.entry_time_et&&j.exit_time_et){
      const a=Date.parse(`${j.trade_date}T${j.entry_time_et}Z`),b=Date.parse(`${j.exit_date}T${j.exit_time_et}Z`);if(Number.isFinite(a)&&Number.isFinite(b)&&b>=a)out.duration_minutes=Math.round((b-a)/60000)
    }
    return out;
  }
  function outcome(j){const n=num(j.net_pnl);if(j.status==='no_trade'||j.decision==='NO TRADE'||j.decision==='OBSERVATION ONLY')return 'NO TRADE';if(n===null)return 'UNRESOLVED';if(n>0)return 'WIN';if(n<0)return 'LOSS';return 'FLAT'}
  function processOutcome(j){const p=j.process_grade||'UNGRADED',o=outcome(j);return `${p} PROCESS / ${o}`}
  async function taxonomy(){const r=await fetch('data/journal-taxonomy.json',{cache:'no-store'});if(!r.ok)throw new Error('Unable to load journal taxonomy.');return r.json()}
  function toCSV(rows){if(!rows.length)return '';const cols=['id','journal_type','status','ticker','trade_date','direction','session_label','timeframe','setup','entry_reason_category','entry_reason','entry_trigger','invalidation','planned_entry','planned_stop','planned_target','share_quantity','actual_entry','actual_exit','actual_exit_reason_category','actual_exit_reason','gross_pnl','net_pnl','r_multiple','mfe_r','mae_r','mfe_capture_pct','plan_followed','process_grade','lesson','created_at'];const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;return [cols.join(','),...rows.map(r=>cols.map(c=>q(Array.isArray(r[c])?r[c].join('|'):r[c])).join(','))].join('\n')}
  function downloadCSV(text,name){const blob=new Blob([text],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return {esc,num,money,dec,pct,compute,outcome,processOutcome,taxonomy,toCSV,downloadCSV};
})();
