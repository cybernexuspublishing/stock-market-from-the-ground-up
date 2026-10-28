window.JournalTools=(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  // Financial inputs must distinguish an absent observation from a measured zero.
  function num(v){
    if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
    if(typeof v==='string'&&!v.trim())return null;
    const n=Number(v);
    return Number.isFinite(n)?n:null;
  }
  function money(v){const n=num(v);return n===null?'—':n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2})}
  function dec(v,d=2){const n=num(v);return n===null?'—':n.toFixed(d)}
  function pct(v,d=1){const n=num(v);return n===null?'—':`${n.toFixed(d)}%`}
  // A wall-clock ET input is not a UTC timestamp. Reject ambiguous and nonexistent
  // DST local times rather than manufacture a trading duration.
  function eastTimeMs(date,time){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!/^\d{2}:\d{2}(?::\d{2})?$/.test(String(time||'')))return null;
    const [y,m,d]=date.split('-').map(Number),[h,min,sec=0]=time.split(':').map(Number);
    if(h>23||min>59||sec>59)return null;
    const utc=Date.UTC(y,m-1,d,h,min,sec);
    const reference=new Date(utc);
    if(reference.getUTCFullYear()!==y||reference.getUTCMonth()+1!==m||reference.getUTCDate()!==d)return null;
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const matches=[];
    for(const hours of [4,5]){
      const candidate=utc+hours*3600000;
      const p=Object.fromEntries(fmt.formatToParts(new Date(candidate)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
      if(p.year===y&&p.month===m&&p.day===d&&p.hour===h&&p.minute===min&&p.second===sec)matches.push(candidate);
    }
    return matches.length===1?matches[0]:null;
  }
  function compute(j){
    const direction=j.direction,shares=num(j.share_quantity),entry=num(j.actual_entry),exit=num(j.actual_exit),
      plannedEntry=num(j.planned_entry),stop=num(j.planned_stop),hi=num(j.highest_while_open),
      lo=num(j.lowest_while_open),feeInput=num(j.fees);
    const out={gross_pnl:null,net_pnl:null,risk_per_share:null,initial_planned_risk:null,r_multiple:null,
      mfe_per_share:null,mae_per_share:null,mfe_dollars:null,mae_dollars:null,mfe_r:null,mae_r:null,
      mfe_capture_pct:null,duration_minutes:null};
    const validDir=direction==='LONG'||direction==='SHORT';
    const validSize=shares!==null&&shares>0;
    // Fees must be known and nonnegative before we represent a net result.
    if(validDir&&validSize&&entry!==null&&entry>0&&exit!==null&&exit>0){
      out.gross_pnl=(direction==='LONG'?(exit-entry):(entry-exit))*shares;
      if(feeInput!==null&&feeInput>=0)out.net_pnl=out.gross_pnl-feeInput;
    }
    // The initial risk denominator is the original planned entry-stop distance,
    // not a stop recomputed retrospectively from the actual fill.
    if(validDir&&validSize&&plannedEntry!==null&&plannedEntry>0&&stop!==null&&stop>0){
      const risk=direction==='LONG'?plannedEntry-stop:stop-plannedEntry;
      if(risk>0){out.risk_per_share=risk;out.initial_planned_risk=risk*shares;
        if(out.net_pnl!==null)out.r_multiple=out.net_pnl/out.initial_planned_risk}
    }
    if(validDir&&validSize&&entry!==null&&entry>0&&hi!==null&&lo!==null&&
       hi>=lo&&lo>0&&hi>=entry&&lo<=entry&&
       (exit===null||(hi>=exit&&lo<=exit))){
      out.mfe_per_share=Math.max(0,direction==='LONG'?hi-entry:entry-lo);
      out.mae_per_share=Math.max(0,direction==='LONG'?entry-lo:hi-entry);
      out.mfe_dollars=out.mfe_per_share*shares;out.mae_dollars=out.mae_per_share*shares;
      if(out.initial_planned_risk>0){out.mfe_r=out.mfe_dollars/out.initial_planned_risk;out.mae_r=out.mae_dollars/out.initial_planned_risk}
      if(out.gross_pnl!==null&&out.gross_pnl>0&&out.mfe_dollars>0){
        const capture=out.gross_pnl/out.mfe_dollars*100;
        if(capture>=0&&capture<=100+1e-8)out.mfe_capture_pct=Math.min(100,capture);
      }
    }
    const a=eastTimeMs(j.trade_date,j.entry_time_et),b=eastTimeMs(j.exit_date,j.exit_time_et);
    if(a!==null&&b!==null&&b>=a)out.duration_minutes=Math.round((b-a)/60000);
    return out;
  }
  function outcome(j){
    if(j.status==='no_trade'||j.decision==='NO TRADE'||j.decision==='OBSERVATION ONLY')return 'NO TRADE';
    if(j.status!=='closed'&&j.status!=='reviewed')return 'UNRESOLVED';
    const n=num(j.net_pnl);
    if(n===null)return 'UNRESOLVED';
    return n>0?'WIN':n<0?'LOSS':'FLAT';
  }
  function processOutcome(j){const p=j.process_grade||'UNGRADED',o=outcome(j);return `${p} PROCESS / ${o}`}
  async function taxonomy(){const r=await fetch('data/journal-taxonomy.json',{cache:'no-store'});if(!r.ok)throw new Error('Unable to load journal taxonomy.');return r.json()}
  function toCSV(rows){if(!rows.length)return '';const cols=['id','journal_type','status','ticker','trade_date','direction','session_label','timeframe','setup','entry_reason_category','entry_reason','entry_trigger','invalidation','planned_entry','planned_stop','planned_target','share_quantity','actual_entry','actual_exit','actual_exit_reason_category','actual_exit_reason','gross_pnl','net_pnl','r_multiple','mfe_r','mae_r','mfe_capture_pct','plan_followed','process_grade','lesson','created_at'];const q=v=>{
    let value=String(v??'');
    // Quoting a CSV cell does not prevent spreadsheet formula execution.
    // Prefix risky leading characters (including optional whitespace) with a
    // literal apostrophe when opened by Excel/Sheets/LibreOffice.
    if(!(typeof v==='number' && Number.isFinite(v)) && /^[\s\uFEFF]*[=+@-]/u.test(value))value="'"+value;
    return '"'+value.replace(/"/g,'""')+'"';
  };return [cols.join(','),...rows.map(r=>cols.map(c=>q(Array.isArray(r[c])?r[c].join('|'):r[c])).join(','))].join('\n')}
  function downloadCSV(text,name){const blob=new Blob([text],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return {esc,num,money,dec,pct,compute,outcome,processOutcome,taxonomy,toCSV,downloadCSV};
})();
