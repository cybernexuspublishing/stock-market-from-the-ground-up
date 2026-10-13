let RSTATE={sb:null,user:null,reviews:[],journals:{},snapshots:{}};
function pair(a,b){return `<dt>${window.JournalTools.esc(a)}</dt><dd>${window.JournalTools.esc(b??'—')}</dd>`}
function metric(a,b){return `<div class="metric-box"><span>${window.JournalTools.esc(a)}</span><strong>${window.JournalTools.esc(b)}</strong></div>`}
function revCard(r){
  const JT=window.JournalTools,j=RSTATE.journals[r.journal_id]||{},s=RSTATE.snapshots[r.journal_id]?.snapshot||{},due=new Date(r.due_at),done=!!r.completed_at;
  return `<article class="review-card" data-review="${r.id}" data-journal="${r.journal_id}">
    <div class="journal-toolbar"><span class="review-stage">${JT.esc(r.review_stage)} REVIEW</span><span class="journal-pill ${done?'closed':''}">${done?'Completed':due<=new Date()?'Due':'Upcoming'}</span><a class="text-link" href="journal-entry.html?id=${j.id}">Open record →</a></div>
    <h3>$${JT.esc(j.ticker||'')} · ${JT.esc(j.trade_date||'')}</h3>
    <div class="locked-plan"><dl>${pair('Setup',s.setup||j.setup)}${pair('Direction',s.direction||j.direction)}${pair('Thesis',s.thesis)}${pair('Reason for entry',s.entry_reason)}${pair('Trigger',s.entry_trigger)}${pair('Invalidation',s.invalidation)}${pair('Planned exit',s.planned_exit_reason)}${pair('Decision',s.decision||j.decision)}</dl></div>
    ${done?`<p><strong>Your review:</strong> ${JT.esc(r.review_notes||'—')}</p><div class="journal-small">Completed ${new Date(r.completed_at).toLocaleString()}</div>`:`<div class="journal-form"><label>Before revealing the outcome, what do you notice about the original decision?</label><textarea class="review-notes" rows="4" placeholder="What was strong, weak, missing, or worth repeating in the plan itself?"></textarea><div class="journal-actions"><button class="btn secondary reveal-outcome" type="button">Reveal Outcome</button><button class="btn complete-review" type="button" disabled>Complete Review</button></div><div class="review-outcome outcome-hidden"><div class="journal-small">Outcome data has not been loaded yet.</div></div><div class="status-message"></div></div>`}
  </article>`
}
async function loadOutcome(journalId){
  const {data,error}=await RSTATE.sb.from('decision_journal')
    .select('id,actual_exit,net_pnl,r_multiple,mfe_r,mae_r,actual_exit_reason,no_trade_reason,plan_followed,process_grade,status')
    .eq('id',journalId).eq('user_id',RSTATE.user.id).single();
  if(error)throw error; return data;
}
function outcomeHTML(j){
  const JT=window.JournalTools;
  return `<div class="metrics-grid">${metric('Actual exit',j.actual_exit==null?'—':j.actual_exit)}${metric('Net P&L',j.net_pnl==null?'—':JT.money(j.net_pnl))}${metric('R result',j.r_multiple==null?'—':`${JT.dec(j.r_multiple,2)}R`)}${metric('MFE',j.mfe_r==null?'—':`${JT.dec(j.mfe_r,2)}R`)}${metric('MAE',j.mae_r==null?'—':`${JT.dec(j.mae_r,2)}R`)}${metric('Actual exit reason',j.actual_exit_reason||j.no_trade_reason||'—')}${metric('Plan followed',j.plan_followed||'—')}${metric('Process grade',j.process_grade||'—')}</div>`
}
function bind(){
  document.querySelectorAll('.review-card:not([data-bound])').forEach(card=>{
    card.dataset.bound='1';
    const reveal=card.querySelector('.reveal-outcome'),complete=card.querySelector('.complete-review'),outcome=card.querySelector('.review-outcome'),notes=card.querySelector('.review-notes'),status=card.querySelector('.status-message');
    if(reveal)reveal.onclick=async()=>{
      if(!notes.value.trim()){status.textContent='Write your outcome-hidden review before revealing the result.';status.className='status-message error';notes.focus();return}
      reveal.disabled=true;status.textContent='Loading outcome…';status.className='status-message';
      try{const j=await loadOutcome(Number(card.dataset.journal));outcome.innerHTML=outcomeHTML(j);outcome.classList.remove('outcome-hidden');complete.disabled=false;status.textContent='Outcome revealed. Compare it with the reasoning you wrote before revealing.';status.className='status-message success'}
      catch(err){reveal.disabled=false;status.textContent=err.message;status.className='status-message error'}
    };
    if(complete)complete.onclick=async()=>{
      if(!notes.value.trim()){status.textContent='Write the outcome-hidden review first.';status.className='status-message error';return}
      if(outcome.classList.contains('outcome-hidden')){status.textContent='Reveal the outcome before completing this review.';status.className='status-message error';return}
      const {error}=await RSTATE.sb.from('journal_reviews').update({review_notes:notes.value.trim(),completed_at:new Date().toISOString()}).eq('id',Number(card.dataset.review)).eq('user_id',RSTATE.user.id);
      if(error){status.textContent=error.message;status.className='status-message error';return}
      await loadReviews()
    }
  })
}
function render(){
  const now=new Date(),due=RSTATE.reviews.filter(r=>!r.completed_at&&new Date(r.due_at)<=now),up=RSTATE.reviews.filter(r=>!r.completed_at&&new Date(r.due_at)>now),done=RSTATE.reviews.filter(r=>r.completed_at);
  document.getElementById('review-kpis').innerHTML=[['Due now',due.length],['Upcoming',up.length],['Completed',done.length],['Open records',new Set(RSTATE.reviews.filter(r=>!r.completed_at).map(r=>r.journal_id)).size]].map(([a,b])=>`<div class="journal-kpi"><strong>${b}</strong><span>${a}</span></div>`).join('');
  document.getElementById('due-reviews').innerHTML=due.map(revCard).join('')||'<div class="journal-card">Nothing is due right now.</div>';
  document.getElementById('upcoming-reviews').innerHTML=up.slice(0,20).map(revCard).join('')||'<div class="journal-card">No upcoming reviews.</div>';
  document.getElementById('completed-reviews').innerHTML=done.slice(0,20).map(revCard).join('')||'<div class="journal-card">No completed reviews yet.</div>';
  bind()
}
async function loadReviews(){
  const {data,error}=await RSTATE.sb.from('journal_reviews').select('*').eq('user_id',RSTATE.user.id).order('due_at',{ascending:true});
  if(error)throw error;RSTATE.reviews=data||[];
  const ids=[...new Set(RSTATE.reviews.map(r=>r.journal_id))];
  if(ids.length){
    // Deliberately fetch only plan-safe metadata here. Outcome fields are fetched only after the learner writes the delayed review and clicks Reveal Outcome.
    const [jr,sn]=await Promise.all([
      RSTATE.sb.from('decision_journal').select('id,ticker,trade_date,setup,direction,decision,status').in('id',ids).eq('user_id',RSTATE.user.id),
      RSTATE.sb.from('trade_plan_snapshots').select('*').in('journal_id',ids).eq('user_id',RSTATE.user.id)
    ]);
    if(jr.error)throw jr.error;if(sn.error)throw sn.error;
    RSTATE.journals=Object.fromEntries((jr.data||[]).map(x=>[x.id,x]));
    RSTATE.snapshots=Object.fromEntries((sn.data||[]).map(x=>[x.journal_id,x]))
  }else{RSTATE.journals={};RSTATE.snapshots={}}
  render()
}
async function initReview(){
  const gate=document.getElementById('review-gate');
  try{
    RSTATE.sb=await window.getSupabaseClient();const {data:{user}}=await RSTATE.sb.auth.getUser();
    if(!user){gate.innerHTML='<div class="notice">Sign in to use the review queue.</div>';return}
    RSTATE.user=user;const access=window.SiteAccess?await window.SiteAccess.get():{isMember:false};
    if(!access.isMember){gate.innerHTML='<div class="notice"><strong>Full Learning Access feature:</strong> The 1D / 7D / 30D outcome-hidden review queue requires an active trial or membership. Your journal records remain intact. <a href="membership.html">View access options</a>.</div>';return}
    await loadReviews();gate.innerHTML='';document.getElementById('review-content').hidden=false
  }catch(err){gate.innerHTML=`<div class="notice">${window.JournalTools.esc(err.message)}</div>`}
}
document.addEventListener('DOMContentLoaded',initReview);
