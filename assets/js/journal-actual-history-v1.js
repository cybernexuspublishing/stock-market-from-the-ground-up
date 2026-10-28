/* Private post-closure correction log. No member write route. */
(function(){
'use strict';
const labels={actual_entry:'Average entry',actual_exit:'Average exit',entry_time_et:'Entry time (ET)',
exit_time_et:'Exit time (ET)',exit_date:'Exit date',highest_while_open:'High while open',
lowest_while_open:'Low while open',fees:'Fees',plan_followed:'Plan adherence',process_grade:'Process grade',
actual_exit_reason:'Actual exit explanation',actual_exit_reason_category:'Exit category',
no_trade_reason:'Reason for passing',emotion_during:'State during',emotion_after:'State after',
mistakes:'Mistake tags',result_note:'Outcome note',lesson:'Lesson learned',gross_pnl:'Gross P&L',
net_pnl:'Net P&L',r_multiple:'R multiple',mfe_r:'MFE in R',mae_r:'MAE in R',
mfe_capture_pct:'MFE capture %',status:'Record status',closed_at:'Closed at'};
const node=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n};
function readable(v){if(v==null)return 'Not recorded';if(typeof v==='string')return v;if(Array.isArray(v))return v.join(', ');return JSON.stringify(v)}
async function boot(){
 const root=document.getElementById('entry-form');if(!root||document.getElementById('gu-actual-history'))return;
 const panel=document.createElement('section');panel.id='gu-actual-history';panel.className='journal-card journal-section';
 panel.append(node('h2','Actual-record correction history'),
  node('p','Changes made after a record is closed are preserved separately. The original pre-trade plan stays locked. This history is private to the account owner.'));
 const refresh=document.createElement('button');refresh.type='button';refresh.className='btn secondary';refresh.textContent='Refresh correction history';
 const output=document.createElement('div');output.id='gu-history-list';output.setAttribute('aria-live','polite');
 panel.append(refresh,output);root.append(panel);
 const id=Number(new URLSearchParams(location.search).get('id'));
 if(!Number.isSafeInteger(id)||id<=0){output.textContent='Invalid Journal ID.';refresh.disabled=true;return}
 let sb,user;
 try{sb=await window.getSupabaseClient();
  const auth=await sb.auth.getUser();user=auth?.data?.user;
  if(!user)throw Error('Sign in to view private corrections.');
  const row=await sb.from('decision_journal').select('id').eq('id',id).eq('user_id',user.id).maybeSingle();
  if(row.error||!row.data)throw Error('Journal record unavailable to this account.');
 }catch(e){output.textContent=e.message;refresh.disabled=true;return}
 async function load(){
  const auth=await sb.auth.getUser();
  if(auth?.data?.user?.id!==user.id){output.replaceChildren(node('p','Session changed; private history hidden.'));refresh.disabled=true;return}
  const r=await sb.from('journal_actual_history_v1').select('id,changed_at,changes')
   .eq('journal_id',id).eq('user_id',user.id).order('changed_at',{ascending:false}).limit(51);
  if(r.error){output.replaceChildren(node('p','Correction history unavailable: '+r.error.message));return}
  output.replaceChildren();
  const rows=r.data||[];
  if(!rows.length){output.append(node('p','No changes have been recorded after this Journal record was closed.'));return}
  for(const entry of rows.slice(0,50)){
   const detail=document.createElement('details');detail.className='gu-history-item';
   detail.append(node('summary','Correction recorded '+new Date(entry.changed_at).toLocaleString()));
   const dl=document.createElement('dl');dl.className='gu-history-fields';
   for(const [key,v] of Object.entries(entry.changes||{})){
    dl.append(node('dt',labels[key]||key),node('dd',readable(v?.before)+' → '+readable(v?.after)));
   }
   detail.append(dl);output.append(detail);
  }
  if(rows.length>50)output.append(node('p','Showing the latest 50 correction events. Earlier events are retained in private storage.'));
 }
 refresh.addEventListener('click',()=>load());
 window.addEventListener('gu-journal-actual-updated',()=>load());
 sb.auth.onAuthStateChange((_event,session)=>{
  if(session?.user?.id!==user.id){output.replaceChildren(node('p','Private corrections hidden after account change.'));refresh.disabled=true}
 });
 await load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
