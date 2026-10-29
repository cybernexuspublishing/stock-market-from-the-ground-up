let ESTATE={sb:null,user:null,tax:null,id:null,row:null,snapshot:null};
const F={
  journal_type:'j-type',ticker:'j-ticker',trade_date:'j-date',exit_date:'j-exit-date',direction:'j-direction',session_label:'j-session',timeframe:'j-timeframe',setup:'j-setup',account_label:'j-account-label',decision:'j-decision',catalyst_context:'j-catalyst',market_context:'j-market-context',evidence:'j-evidence',thesis:'j-thesis',entry_reason_category:'j-entry-reason-cat',entry_reason:'j-entry-reason',entry_trigger:'j-trigger',invalidation:'j-invalidation',no_trade_condition:'j-no-trade-condition',planned_entry:'j-planned-entry',planned_stop:'j-planned-stop',planned_target:'j-planned-target',share_quantity:'j-shares',planned_exit_reason_category:'j-planned-exit-cat',planned_exit_reason:'j-planned-exit',emotion_before:'j-emotion-before',entry_time_et:'j-entry-time',exit_time_et:'j-exit-time',actual_entry:'j-actual-entry',actual_exit:'j-actual-exit',highest_while_open:'j-high-open',lowest_while_open:'j-low-open',fees:'j-fees',plan_followed:'j-plan-followed',actual_exit_reason_category:'j-exit-reason-cat',process_grade:'j-process-grade',actual_exit_reason:'j-exit-reason',no_trade_reason:'j-no-trade-reason',emotion_during:'j-emotion-during',emotion_after:'j-emotion-after',result_note:'j-result-note',lesson:'j-lesson'};
const PLAN_KEYS=['journal_type','ticker','trade_date','direction','session_label','timeframe','setup','account_label','decision','catalyst_context','market_context','evidence','thesis','entry_reason_category','entry_reason','entry_trigger','invalidation','no_trade_condition','planned_entry','planned_stop','planned_target','share_quantity','planned_exit_reason_category','planned_exit_reason','emotion_before'];
const ACTUAL_KEYS=['exit_date','entry_time_et','exit_time_et','actual_entry','actual_exit','highest_while_open','lowest_while_open','fees','plan_followed','actual_exit_reason_category','process_grade','actual_exit_reason','no_trade_reason','emotion_during','emotion_after','result_note','lesson'];
function e(id){return document.getElementById(id)}
function msg(id,text,type=''){const el=e(id);if(!el)return;el.textContent=text||'';el.className=`status-message ${type}`}
function setOptions(select,items){items.forEach(x=>select.insertAdjacentHTML('beforeend',`<option value="${window.JournalTools.esc(x)}">${window.JournalTools.esc(x)}</option>`))}
function fieldValue(key){const id=F[key];if(!id)return null;const el=e(id);if(!el)return null;if(key==='setup'&&el.value==='__CUSTOM__')return e('j-setup-custom')?.value.trim()||null;if(el.type==='number'){return el.value===''?null:Number(el.value)}return el.value===''?null:el.value}
function collect(keys){const out={};keys.forEach(k=>out[k]=fieldValue(k));return out}
function setField(key,val){const el=e(F[key]);if(!el)return;
 if(key==='setup'&&el.tagName==='SELECT'&&val!=null&&String(val)&&
  ![...el.options].some(o=>o.value===String(val))){
  const option=document.createElement('option');
  option.value=String(val);option.textContent=String(val)+' (previously recorded)';
  el.append(option);
 }
 el.value=val==null?'':String(val);
 if(key==='setup')updateSetupCustom();
}
function updateSetupCustom(){
 const field=e('j-setup'),custom=e('j-setup-custom'),label=e('j-setup-custom-label');
 if(!field||!custom||!label)return;
 const active=field.value==='__CUSTOM__';
 custom.hidden=label.hidden=!active;custom.required=active;
 custom.disabled=!!ESTATE.snapshot;field.disabled=!!ESTATE.snapshot;
}
function mistakes(){return [...document.querySelectorAll('input[name="journal-mistake"]:checked')].map(x=>x.value)}
function fill(row){Object.keys(F).forEach(k=>setField(k,row[k]));document.querySelectorAll('input[name="journal-mistake"]').forEach(x=>x.checked=(row.mistakes||[]).includes(x.value))}
function planLocked(){return !!ESTATE.snapshot}
function applyLockState(){const locked=planLocked();PLAN_KEYS.forEach(k=>{const el=e(F[k]);if(el)el.disabled=locked});updateSetupCustom();e('lock-plan').disabled=locked;e('save-plan').disabled=locked;if(locked){e('plan-lock-state').innerHTML=`<div class="plan-lock-banner"><strong>Pre-trade plan locked:</strong> ${new Date(ESTATE.snapshot.locked_at).toLocaleString()}. The snapshot below is immutable; actual execution and post-trade review remain editable.</div>`;renderSnapshot();e('locked-plan-panel').hidden=false;e('plan-vs-actual').hidden=false}else{e('plan-lock-state').innerHTML='<div class="notice"><strong>Plan not locked yet.</strong> Save your pre-trade reasoning, then lock it before the outcome whenever practical.</div>';e('locked-plan-panel').hidden=true;e('plan-vs-actual').hidden=true}}
function pair(label,value){return `<dt>${window.JournalTools.esc(label)}</dt><dd>${window.JournalTools.esc(value??'—')}</dd>`}
function renderSnapshot(){if(!ESTATE.snapshot)return;const s=ESTATE.snapshot.snapshot||{};const html=`<dl>${pair('Ticker',s.ticker)}${pair('Date',s.trade_date)}${pair('Direction',s.direction)}${pair('Session',s.session_label)}${pair('Setup',s.setup)}${pair('Decision',s.decision)}${pair('Thesis',s.thesis)}${pair('Reason for entry',s.entry_reason)}${pair('Entry trigger',s.entry_trigger)}${pair('Invalidation',s.invalidation)}${pair('NO TRADE condition',s.no_trade_condition)}${pair('Planned entry',s.planned_entry)}${pair('Planned stop',s.planned_stop)}${pair('Planned target',s.planned_target)}${pair('Shares',s.share_quantity)}${pair('Planned exit reason',s.planned_exit_reason)}${pair('State before entry',s.emotion_before)}</dl>`;e('locked-plan-body').innerHTML=html;e('plan-compare-body').innerHTML=html}
function renderMetrics(row){const JT=window.JournalTools,m=JT.compute(row);const vals=[['Gross P&L',m.gross_pnl==null?'—':JT.money(m.gross_pnl)],['Net P&L',m.net_pnl==null?'—':JT.money(m.net_pnl)],['Initial planned risk',m.initial_planned_risk==null?'—':JT.money(m.initial_planned_risk)],['Result in R',m.r_multiple==null?'—':`${JT.dec(m.r_multiple,2)}R`],['MFE / share',m.mfe_per_share==null?'—':JT.money(m.mfe_per_share)],['MAE / share',m.mae_per_share==null?'—':JT.money(m.mae_per_share)],['MFE in R',m.mfe_r==null?'—':`${JT.dec(m.mfe_r,2)}R`],['MAE in R',m.mae_r==null?'—':`${JT.dec(m.mae_r,2)}R`],['Gross MFE captured',m.mfe_capture_pct==null?'—':JT.pct(m.mfe_capture_pct)],['Time in trade',m.duration_minutes==null?'—':`${m.duration_minutes} min`],['Outcome',JT.outcome({...row,...m})],['Process / outcome',JT.processOutcome({...row,...m})]];e('metric-grid').innerHTML=vals.map(([a,b])=>`<div class="metric-box"><span>${JT.esc(a)}</span><strong>${JT.esc(b)}</strong></div>`).join('');if(planLocked()){e('actual-compare-body').innerHTML=`<dl>${pair('Actual entry',row.actual_entry)}${pair('Actual exit',row.actual_exit)}${pair('Actual exit reason',row.actual_exit_reason)}${pair('Plan followed',row.plan_followed)}${pair('Process grade',row.process_grade)}${pair('Net P&L',m.net_pnl==null?'—':JT.money(m.net_pnl))}${pair('R multiple',m.r_multiple==null?'—':`${JT.dec(m.r_multiple,2)}R`)}${pair('MFE',m.mfe_r==null?'—':`${JT.dec(m.mfe_r,2)}R`)}${pair('MAE',m.mae_r==null?'—':`${JT.dec(m.mae_r,2)}R`)}</dl>`}}
function showReplayProvenance(){
 const old=e('journal-replay-provenance');if(old)old.remove();
 const oldEditor=e('journal-replay-reflection');if(oldEditor)oldEditor.remove();
 const snap=ESTATE.snapshot?.snapshot;
 const code=typeof snap?.datasetCode==='string'?snap.datasetCode:'';
 if(!code)return;
 const fictional=snap.originalSynthetic===true||/^GUSIM_/.test(code);
 const box=document.createElement('aside');box.id='journal-replay-provenance';box.className='notice';
 box.setAttribute('role','note');
 box.textContent=fictional?
  'ORIGINAL FICTIONAL REPLAY — Invented educational prices and dates, not actual market history. The recorded first decision is locked; no order execution, P&L or Lab grade was verified. Dataset: '+code:
  'SERVER-CONTROLLED REPLAY — The first observed decision is locked. Source verification and rights are controlled separately. Neither a real broker fill nor a Lab pass was established. Dataset: '+code;
 e('entry-status-line').insertAdjacentElement('afterend',box);
 e('entry-record-type').textContent=fictional?'Original Fictional Replay':'Server-Controlled Replay / Learning';
 // A replay is a LOCKED observation and is not a brokerage execution.
 // Keep trading entry/exit/P&L controls for independently documented actual
 // trades only. The database also blocks fabricated direct-table writes.
 const actualSection=e('j-actual-entry')?.closest('section');
 if(actualSection)actualSection.hidden=true;
 const metrics=e('metric-grid')?.closest('section');if(metrics)metrics.hidden=true;
 const comparison=e('plan-vs-actual');if(comparison)comparison.hidden=true;
 const editor=document.createElement('section');
 editor.id='journal-replay-reflection';editor.className='journal-card journal-section';
 editor.setAttribute('aria-label','Replay learning reflection');
 editor.innerHTML='<h2>Replay reflection — ungraded</h2><p class="journal-small">The original first decision is immutable. You may add personal reflections, but you cannot enter broker fills, financial performance, or competency grades for this educational replay. The 1D / 7D / 30D reviews record distinct outcome-hidden and post-reveal observations.</p><label for="replay-lesson">Lesson learned</label><textarea id="replay-lesson" rows="4" maxlength="5000"></textarea><label for="replay-note">Additional observations</label><textarea id="replay-note" rows="4" maxlength="5000"></textarea><label for="replay-emotion">State after reflection (optional)</label><input id="replay-emotion" maxlength="200"><div class="journal-actions"><button class="btn secondary" id="save-replay-reflection" type="button">Save Reflection</button><a class="btn secondary" href="review-queue.html">View Spaced Reviews</a></div><p id="replay-reflection-status" role="status" aria-live="polite"></p>';
 e('plan-lock-state').insertAdjacentElement('afterend',editor);
 e('replay-lesson').value=ESTATE.row.lesson||'';
 e('replay-note').value=ESTATE.row.result_note||'';
 e('replay-emotion').value=ESTATE.row.emotion_after||'';
 e('save-replay-reflection').onclick=async()=>{
  const btn=e('save-replay-reflection'),notice=e('replay-reflection-status');
  btn.disabled=true;notice.textContent='Saving private reflection…';
  try{
   const patch={lesson:e('replay-lesson').value,result_note:e('replay-note').value,
    emotion_after:e('replay-emotion').value,updated_at:new Date().toISOString()};
   const {error}=await ESTATE.sb.from('decision_journal').update(patch)
    .eq('id',ESTATE.id).eq('user_id',ESTATE.user.id);
   if(error)throw error;
   notice.textContent='Reflection saved. No financial outcome or skill grade was created.';
  }catch(err){notice.textContent='Reflection not saved: '+String(err.message||'Backend unavailable.')}
  finally{btn.disabled=false}
 };
}
async function loadSnapshot(){const {data,error}=await ESTATE.sb.from('trade_plan_snapshots').select('*').eq('journal_id',ESTATE.id).maybeSingle();if(error)throw error;ESTATE.snapshot=data||null}
async function loadRow(){const {data,error}=await ESTATE.sb.from('decision_journal').select('*').eq('id',ESTATE.id).eq('user_id',ESTATE.user.id).single();if(error)throw error;ESTATE.row=data;fill(data);await loadSnapshot();e('entry-record-type').textContent=(ESTATE.tax.journalTypes.find(x=>x.value===data.journal_type)?.label||data.journal_type||'Journal Record');e('entry-title').textContent=`${data.ticker||'Journal'} — ${data.trade_date||''}`;e('entry-status-line').textContent=`Status: ${String(data.status||'draft').replace('_',' ')}${data.plan_locked_at?' · Pre-trade plan locked':''}`;const sim=e('open-simulator');if(sim){sim.hidden=data.journal_type!=='paper'||['closed','no_trade','reviewed'].includes(data.status);sim.href=`simulator.html?journal_id=${data.id}`;}applyLockState();renderMetrics(data);showReplayProvenance();window.dispatchEvent(new CustomEvent('gu-journal-record-loaded',{detail:{status:data.status,locked:!!ESTATE.snapshot}}))}
async function savePlan(){msg('plan-message','Saving…');const patch=collect(PLAN_KEYS);patch.updated_at=new Date().toISOString();const {error}=await ESTATE.sb.from('decision_journal').update(patch).eq('id',ESTATE.id).eq('user_id',ESTATE.user.id);if(error){msg('plan-message',error.message,'error');return false}msg('plan-message','Pre-trade draft saved.','success');await loadRow();window.dispatchEvent(new CustomEvent('gu-journal-plan-saved',{detail:{id:ESTATE.id}}));return true}
function validatePlanForLock(){const p=collect(PLAN_KEYS),missing=[];const need=(v,label)=>{if(v==null||String(v).trim()==='')missing.push(label)};need(p.journal_type,'Record type');need(p.ticker,'Ticker');need(p.trade_date,'Trade / observation date');need(p.session_label,'Session / time of day');need(p.timeframe,'Primary timeframe');need(p.setup,'Setup / exercise');need(p.decision,'Decision');need(p.evidence,'Visible evidence');need(p.market_context,'Market context');need(p.no_trade_condition,'What would make this a NO TRADE?');if(p.decision==='ENTER'){need(p.direction,'Direction');need(p.thesis,'Trade thesis');need(p.entry_reason_category,'Reason for entry — category');need(p.entry_reason,'Reason for entry — exact wording');need(p.entry_trigger,'Entry trigger');need(p.invalidation,'Invalidation');if(p.planned_entry==null)missing.push('Planned entry');if(p.planned_stop==null)missing.push('Planned stop / risk boundary');if(p.share_quantity==null||Number(p.share_quantity)<=0)missing.push('Planned / constant share quantity');need(p.planned_exit_reason_category,'Planned exit reason');need(p.planned_exit_reason,'Planned exit logic')}
if(p.decision==='ENTER'){
 const e=Number(p.planned_entry),s=Number(p.planned_stop),q=Number(p.share_quantity),t=p.planned_target;
 if(p.planned_entry!==null&&e<=0)missing.push('Planned entry must be positive');
 if(p.planned_stop!==null&&s<=0)missing.push('Planned stop must be positive');
 if(p.planned_entry!==null&&p.planned_stop!==null&&e>0&&s>0&&
   !(p.direction==='LONG'?e>s:p.direction==='SHORT'?s>e:false))
   missing.push('Stop must be on the risk side of the planned entry');
 if(p.share_quantity!==null&&(!Number.isFinite(q)||q<=0))
   missing.push('Share quantity must be positive');
 if(t!==null&&p.planned_entry!==null&&!(p.direction==='LONG'?Number(t)>e:p.direction==='SHORT'?Number(t)<e:false))
   missing.push('Target must be on the reward side of the planned entry');
}
return [...new Set(missing)]}
async function lockPlan(){if(planLocked())return;const missing=validatePlanForLock();if(missing.length){msg('plan-message',`Complete these fields before locking: ${missing.join(', ')}.`,'error');return}if(!window.confirm('Lock this pre-trade plan? The plan fields cannot be changed after the snapshot is created.'))return;if(!(await savePlan()))return;msg('plan-message','Locking pre-trade snapshot…');const {error}=await ESTATE.sb.rpc('lock_trade_plan',{target_journal_id:ESTATE.id});if(error){msg('plan-message',error.message,'error');return}msg('plan-message','Pre-trade plan locked.','success');await loadRow()}
async function saveActual(extra={}){
 msg('actual-message','Saving…');
 if(!ESTATE.row||!ESTATE.user){msg('actual-message','Journal session is unavailable; reload.','error');return false}
 const actual=collect(ACTUAL_KEYS);
 const patch={...actual,mistakes:mistakes(),...extra,updated_at:new Date().toISOString()};
 // V2: after a closed trade is edited, its recorded financial values must be
 // recomputed with the *same* changed execution data in the update.
 // This prevents saving fresh fills against an obsolete P&L/R calculation.
 if(ESTATE.row.status==='closed'&&extra.status!== 'no_trade'){
  const next={...ESTATE.row,...patch};
  if(next.fees===null||Number(next.fees)<0){
   msg('actual-message','Enter explicit nonnegative fees (use 0 when no fees).','error');return false;
  }
  if(next.actual_entry!==null&&Number(next.actual_entry)<=0||
     next.actual_exit!==null&&Number(next.actual_exit)<=0){
   msg('actual-message','Actual entry and exit prices must be positive.','error');return false;
  }
  Object.assign(patch,window.JournalTools.compute(next));
 }
 const {data,error}=await ESTATE.sb.from('decision_journal').update(patch)
  .eq('id',ESTATE.id).eq('user_id',ESTATE.user.id)
  .eq('updated_at',ESTATE.row.updated_at).select('id').maybeSingle();
 if(error){msg('actual-message',error.message,'error');return false}
 if(!data){
  msg('actual-message','This Journal record changed in another session. Reload and review its latest values before saving.','error');
  await loadRow();return false;
 }
 msg('actual-message','Actuals and calculated results saved.','success');
 await loadRow();window.dispatchEvent(new CustomEvent('gu-journal-actual-updated'));return true;
}
async function closeAndCalculate(){if(!e('j-exit-date').value&&e('j-date').value)e('j-exit-date').value=e('j-date').value;const current={...ESTATE.row,...collect(PLAN_KEYS),...collect(ACTUAL_KEYS),mistakes:mistakes()},missing=[];const need=(v,label)=>{if(v==null||String(v).trim()==='')missing.push(label)};need(current.direction,'Direction');if(current.actual_entry==null)missing.push('Actual average entry');if(current.actual_exit==null)missing.push('Actual average exit');if(current.share_quantity==null||Number(current.share_quantity)<=0)missing.push('Share quantity');if(current.actual_entry!==null&&Number(current.actual_entry)<=0)missing.push('Actual entry must be positive');if(current.actual_exit!==null&&Number(current.actual_exit)<=0)missing.push('Actual exit must be positive');if(current.fees==null||Number(current.fees)<0)missing.push('Explicit fees must be entered (0 when none)');need(current.plan_followed,'Plan followed?');need(current.actual_exit_reason_category,'Actual reason for exit');need(current.actual_exit_reason,'Actual exit reason — exact wording');need(current.process_grade,'Process grade');if(missing.length){msg('actual-message',`Complete these required fields before closing: ${[...new Set(missing)].join(', ')}.`,'error');return}const metrics=window.JournalTools.compute(current);const ok=await saveActual({...metrics,status:'closed',closed_at:ESTATE.row?.closed_at||new Date().toISOString()});if(ok)msg('actual-message','Trade closed and review metrics saved. 1-day, 7-day, and 30-day review tasks were scheduled.','success')}
async function recordNoTrade(){const decision=fieldValue('decision')||'NO TRADE';if(!['NO TRADE','OBSERVATION ONLY','WATCH'].includes(decision)){msg('actual-message','Change Decision to NO TRADE, OBSERVATION ONLY, or WATCH before recording a no-trade result.','error');return}const current={...ESTATE.row,...collect(PLAN_KEYS),...collect(ACTUAL_KEYS)};const missing=[];for(const [v,label] of [[current.ticker,'Ticker'],[current.trade_date,'Trade / observation date'],[current.session_label,'Session / time of day'],[current.timeframe,'Primary timeframe'],[current.setup,'Setup / exercise'],[current.evidence,'Visible evidence'],[current.market_context,'Market context'],[current.no_trade_condition,'What would make this a NO TRADE?'],[current.no_trade_reason,'Reason for passing / no trigger']])if(v==null||String(v).trim()==='')missing.push(label);if(missing.length){msg('actual-message',`Complete these required fields before recording NO TRADE: ${[...new Set(missing)].join(', ')}.`,'error');return}const ok=await saveActual({decision,status:'no_trade',closed_at:new Date().toISOString(),gross_pnl:null,net_pnl:null,r_multiple:null,mfe_per_share:null,mae_per_share:null,mfe_dollars:null,mae_dollars:null,mfe_r:null,mae_r:null,mfe_capture_pct:null});if(ok)msg('actual-message','NO TRADE / observation record completed. Review tasks were scheduled without fabricating P&L.','success')}
async function initEntry(){const gate=e('entry-gate');try{ESTATE.id=Number(new URLSearchParams(location.search).get('id'));if(!ESTATE.id)throw new Error('Missing journal record ID.');ESTATE.sb=await window.getSupabaseClient();const {data:{user}}=await ESTATE.sb.auth.getUser();if(!user){gate.innerHTML='<div class="notice">Sign in to open this journal record.</div>';return}ESTATE.user=user;
 ESTATE.sb.auth.onAuthStateChange((_event,nextSession)=>{
  if(nextSession?.user?.id===ESTATE.user?.id)return;
  // Preserve completed server records but scrub client-held private content
  // immediately when the authenticated identity changes.
  ESTATE.row=null;ESTATE.snapshot=null;ESTATE.user=null;
  e('entry-content').hidden=true;
  // Hidden form inputs still contain private data and can be inspected.
  // Scrub them instead of merely hiding a prior member's Journal record.
  e('entry-form')?.querySelectorAll('input,textarea,select').forEach(x=>{
   if(x.type==='checkbox'||x.type==='radio')x.checked=false;
   else x.value='';
  });
  e('journal-replay-provenance')?.remove();
  e('journal-replay-reflection')?.remove();
  e('locked-plan-body')?.replaceChildren();
  e('metric-grid')?.replaceChildren();
  for(const id of ['entry-record-type','entry-title','entry-status-line',
   'plan-lock-state','plan-compare-body','actual-compare-body']){
    if(e(id))e(id).textContent='';
  }
  gate.textContent='Account changed. Reload under the current member to open the appropriate private Journal record.';
 });
 ESTATE.tax=await window.JournalTools.taxonomy();
 const setup=e('j-setup');
 if(setup){
  for(const value of ESTATE.tax.setups||[]){
   const opt=document.createElement('option');opt.value=value;opt.textContent=value;setup.append(opt);
  }
  const other=document.createElement('option');other.value='__CUSTOM__';
  other.textContent='Other — describe my setup';setup.append(other);
  setup.addEventListener('change',updateSetupCustom);
 }
 e('j-type').innerHTML=ESTATE.tax.journalTypes.map(x=>`<option value="${x.value}">${x.label}</option>`).join('');setOptions(e('j-session'),ESTATE.tax.sessions);setOptions(e('j-entry-reason-cat'),ESTATE.tax.entryReasons);setOptions(e('j-planned-exit-cat'),ESTATE.tax.exitReasons);setOptions(e('j-exit-reason-cat'),ESTATE.tax.exitReasons);e('mistake-grid').innerHTML=ESTATE.tax.mistakes.map(x=>`<label><input type="checkbox" name="journal-mistake" value="${window.JournalTools.esc(x)}"> ${window.JournalTools.esc(x)}</label>`).join('');await loadRow();gate.innerHTML='';e('entry-content').hidden=false;e('save-plan').onclick=savePlan;e('lock-plan').onclick=lockPlan;e('save-actual').onclick=()=>saveActual();e('close-calc').onclick=closeAndCalculate;e('record-no-trade').onclick=recordNoTrade;ACTUAL_KEYS.forEach(k=>{const el=e(F[k]);if(el)el.addEventListener('input',()=>renderMetrics({...ESTATE.row,...collect(PLAN_KEYS),...collect(ACTUAL_KEYS)}))})}catch(err){gate.innerHTML=`<div class="notice">${window.JournalTools.esc(err.message)}</div>`}}
document.addEventListener('DOMContentLoaded',initEntry);
