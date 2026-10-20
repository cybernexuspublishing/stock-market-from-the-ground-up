let RSTATE={sb:null,user:null,reviews:[],journals:{},snapshots:{},replayState:{},replayAvailable:false};
async function replayAPI(action,reviewId=null,note=null){
 const {data:{session}}=await RSTATE.sb.auth.getSession();
 if(!session?.access_token||session.user?.id!==RSTATE.user.id)throw Error('Current member session is required.');
 const method=['states','access'].includes(action)?'GET':'POST';
 const r=await fetch('/api/journal-replay-review-v014118?action='+encodeURIComponent(action),{
  method,cache:'no-store',headers:{authorization:'Bearer '+session.access_token,
   ...(method==='POST'?{'content-type':'application/json'}:{})},
  ...(method==='POST'?{body:JSON.stringify({reviewId,note})}:{})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok!==true)throw Error(data.error||'Private replay review unavailable.');
 return data;
}

function pair(a,b){return `<dt>${window.JournalTools.esc(a)}</dt><dd>${window.JournalTools.esc(b??'—')}</dd>`}
function metric(a,b){return `<div class="metric-box"><span>${window.JournalTools.esc(a)}</span><strong>${window.JournalTools.esc(b)}</strong></div>`}
function revCard(r){
  const JT=window.JournalTools,j=RSTATE.journals[r.journal_id]||{},s=RSTATE.snapshots[r.journal_id]?.snapshot||{},due=new Date(r.due_at),done=!!r.completed_at;
  const replay=!!s.replaySessionId, prior=RSTATE.replayState[r.id],locked=!!prior?.lockedAt;
  const notReady=replay&&(!RSTATE.replayAvailable||due>new Date());
  const priorText=locked?JT.esc(prior.preRevealNote):'';
  const caveat=replay?'<p class="journal-small">SERVER REPLAY: review the locked first decision, not an independently confirmed execution. Journal outcomes and P&L remain unverified. No competency grade is awarded.</p>':'';
  const blocker=notReady?'<p class="journal-small">Replay review requires its due date and current authorized training access.</p>':'';
  return `<article class="review-card" data-review="${r.id}" data-journal="${r.journal_id}">
    <div class="journal-toolbar"><span class="review-stage">${JT.esc(r.review_stage)} REVIEW</span><span class="journal-pill ${done?'closed':''}">${done?'Completed':due<=new Date()?'Due':'Upcoming'}</span><a class="text-link" href="journal-entry.html?id=${j.id}">Open record →</a></div>
    <h3>${JT.esc(j.ticker||'')} · ${JT.esc(j.trade_date||'')}</h3>${caveat}${blocker}
    <div class="locked-plan"><dl>${pair('Setup',s.setup||j.setup)}${pair('Direction',s.direction||j.direction)}${pair('Thesis',s.thesis)}${pair('Reason for entry',s.entry_reason)}${pair('Trigger',s.entry_trigger)}${pair('Invalidation',s.invalidation)}${pair('Planned exit',s.planned_exit_reason)}${pair('Decision',s.decision||j.decision)}</dl></div>
    ${done?`<p><strong>Your review:</strong> ${JT.esc(r.review_notes||'—')}</p><div class="journal-small">Completed ${new Date(r.completed_at).toLocaleString()}</div>`:`<div class="journal-form"><label>Before revealing the outcome, what do you notice about the original decision?</label><textarea class="review-notes" rows="4" ${locked?'readonly':''} ${notReady?'disabled':''} placeholder="What was strong, weak, missing, or worth repeating in the plan itself?">${priorText}</textarea><div class="journal-actions"><button class="btn secondary reveal-outcome" type="button" ${notReady?'disabled':''}>${replay?'Lock Notes & Reveal':'Reveal Outcome'}</button><button class="btn complete-review" type="button" disabled>Complete Review</button></div>${replay?'<label>Comparison after revealing (required to complete)<textarea class="review-after" rows="4" placeholder="Compare the original decision with what was actually observed. No simulated fills may be claimed."></textarea></label>':''}<div class="review-outcome outcome-hidden"><div class="journal-small">Outcome data has not been loaded yet.</div></div><div class="status-message"></div></div>`}
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
    const replay=!!RSTATE.snapshots[Number(card.dataset.journal)]?.snapshot?.replaySessionId;
    const after=card.querySelector('.review-after');
    if(reveal)reveal.onclick=async()=>{
      if(notes.value.trim().length<(replay?20:1)){status.textContent=replay?'Write at least 20 characters of first-decision assessment before reveal.':'Write your outcome-hidden review before revealing the result.';status.className='status-message error';notes.focus();return}
      reveal.disabled=true;status.textContent='Loading outcome…';status.className='status-message';
      try{
        if(replay){
          const id=Number(card.dataset.review);
          await replayAPI('lock',id,notes.value.trim());
          // The first note is immutable on the server; never offer editing after lock.
          notes.readOnly=true;
          await replayAPI('reveal',id);
        }
        const j=await loadOutcome(Number(card.dataset.journal));
        outcome.innerHTML=replay?
          '<p class="journal-small">No authenticated brokerage execution or price outcome is established by this replay. These fields remain empty unless independently evidenced elsewhere.</p>'+outcomeHTML(j):
          outcomeHTML(j);
        outcome.classList.remove('outcome-hidden');complete.disabled=false;
        status.textContent=replay?'First decision notes locked. Enter a separate post-reveal comparison.':'Outcome revealed. Compare it with the reasoning you wrote before revealing.';
        status.className='status-message success'
      }
      catch(err){reveal.disabled=false;status.textContent=err.message;status.className='status-message error'}
    };
    if(complete)complete.onclick=async()=>{
      if(!notes.value.trim()){status.textContent='Write the outcome-hidden review first.';status.className='status-message error';return}
      if(outcome.classList.contains('outcome-hidden')){status.textContent='Reveal the outcome before completing this review.';status.className='status-message error';return}
      try{
        if(replay){
          if(!after||after.value.trim().length<20){status.textContent='Enter at least 20 characters of post-reveal comparison.';status.className='status-message error';after?.focus();return}
          await replayAPI('complete',Number(card.dataset.review),after.value.trim());
        }else{
          const {error}=await RSTATE.sb.from('journal_reviews').update({review_notes:notes.value.trim(),completed_at:new Date().toISOString()}).eq('id',Number(card.dataset.review)).eq('user_id',RSTATE.user.id);
          if(error)throw error;
        }
        await loadReviews();
      }catch(err){status.textContent=err.message;status.className='status-message error'}
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
  if(Object.values(RSTATE.snapshots).some(x=>x.snapshot?.replaySessionId)&&RSTATE.replayAvailable){
    try{
      const result=await replayAPI('states');
      RSTATE.replayState=Object.fromEntries(result.states.map(x=>[x.reviewId,x]));
    }catch{RSTATE.replayAvailable=false;RSTATE.replayState={}}
  }else RSTATE.replayState={};
  render()
}
async function initReview(){
  const gate=document.getElementById('review-gate');
  try{
    RSTATE.sb=await window.getSupabaseClient();const {data:{user}}=await RSTATE.sb.auth.getUser();
    if(!user){gate.innerHTML='<div class="notice">Sign in to use the review queue.</div>';return}
    RSTATE.user=user;const access=window.SiteAccess?await window.SiteAccess.get():{isMember:false};
    // A standalone Market Simulator/Historical Replay entitlement must also
    // permit review of its OWN locked replay decisions without requiring an
    // unrelated Full Learning Access membership.
    try{const replay=await replayAPI('access');RSTATE.replayAvailable=replay.authorized===true}catch{RSTATE.replayAvailable=false}
    if(!access.isMember&&!RSTATE.replayAvailable){gate.innerHTML='<div class="notice">An active membership or authorized replay training entitlement is required to open the review queue. Existing Journal records are preserved.</div>';return}
    await loadReviews();gate.innerHTML='';document.getElementById('review-content').hidden=false
  }catch(err){gate.innerHTML=`<div class="notice">${window.JournalTools.esc(err.message)}</div>`}
}
document.addEventListener('DOMContentLoaded',initReview);
