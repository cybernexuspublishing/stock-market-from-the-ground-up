(()=>{'use strict';
const el=id=>document.getElementById(id);
const create=(tag,content)=>{const x=document.createElement(tag);if(content!==undefined)x.textContent=String(content);return x};
async function start(){
 const status=el('f600-learning-status');let db;
 try{
 db=await window.getSupabaseClient();
 const u=(await db.auth.getUser()).data?.user;if(!u){location.replace('signin.html?next=%2Ffounder-learning-studio.html');return}
 const [a,b]=await Promise.all([db.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'}),db.rpc('gu_founder_commons_access_v014174',{p_scope:'council'})]);
 if(a.error||a.data!==true){status.textContent='Founding membership access is required.';return}
 const extended=!b.error&&b.data===true;
 el('f600-learning-content').hidden=false;status.textContent='Member access verified.';
 const resources=el('f600-learning-releases');
 const releases=await db.from('gu_founder_educational_releases_v014190').select('id,title,category,body,competency_code').eq('review_state','approved').order('available_from',{ascending:false}).limit(25);
 resources.replaceChildren();
 if(releases.error)resources.append(create('p','Reviewed materials are unavailable.'));
 else for(const x of releases.data||[]){const item=create('article');item.className='gu-f600-blueprint-item';item.setAttribute('role','listitem');item.append(create('h3',x.title),create('p',x.category.replaceAll('_',' ')),create('p',x.body));resources.append(item)}
 if(!resources.childNodes.length)resources.append(create('p','No reviewed resources are published yet.'));
 const form=el('f600-case-form'),note=el('f600-case-feedback');
 el('f600-case-instructions').textContent=extended?'Submit a teaching case for editorial consideration once every 60 days.':'Only eligible Extended Founders may submit case-study proposals.';
 form.hidden=!extended;
 async function loadHistory(){
 const list=el('f600-case-history'),r=await db.from('gu_founder_case_submissions_v014190').select('id,title,review_state,staff_reply').order('created_at',{ascending:false}).limit(20);
 list.replaceChildren();if(r.error){list.append(create('p','History unavailable.'));return}
 for(const x of r.data||[]){const row=create('article');row.className='gu-f600-ballot';row.append(create('h3',x.title),create('p',x.review_state.replaceAll('_',' ')));if(x.staff_reply)row.append(create('p',x.staff_reply));
 if(['submitted','under_review'].includes(x.review_state)){const btn=create('button','Withdraw proposal');btn.type='button';btn.onclick=async()=>{btn.disabled=true;const v=await db.rpc('gu_founder_withdraw_case_v014190',{p_id:x.id});note.textContent=v.data?.ok?'Withdrawn.':'Could not withdraw.';await loadHistory()};row.append(btn)}list.append(row)}
 if(!list.childNodes.length)list.append(create('p','No case proposals yet.'));
 }
 await loadHistory();
 form.onsubmit=async event=>{event.preventDefault();const btn=el('f600-case-submit');btn.disabled=true;note.textContent='Submitting for editorial review…';
 try{const r=await db.rpc('gu_founder_submit_case_v014190',{p_title:el('f600-case-name').value,p_scenario:el('f600-case-text').value,p_allow_attribution:el('f600-case-credit').checked});
 note.textContent=r.data?.ok?'Proposal received for editorial review.':r.data?.error==='ONE_PER_60_DAYS'?'Only one proposal per 60 days.':'Submission was not accepted.';
 if(r.data?.ok){form.reset();await loadHistory()}
 }catch{note.textContent='Submission unavailable.'}finally{btn.disabled=false}};
 }catch{status.textContent='The learning studio is temporarily unavailable.'}
}
start();
})();