/* Founders Commons 0.14.0.178: authentication and Supabase RLS are authoritative.
 * Reuses canonical Market Commons topics, replies and moderation; no shadow forum.
 */
(()=>{'use strict';
const el=id=>document.getElementById(id),status=el('gu-f600-status');
const known=[
 ['F600_HEADQUARTERS','megaphone'],['F600_LOUNGE','users'],['F600_BUGS','shield-alert'],
 ['F600_SUGGESTIONS','lightbulb'],['F600_LEARNING','book-open'],['F600_MEMBERSHIP','credit-card'],
 ['F600_COUNCIL','palette'],['F600_TRACKER','clipboard-check']
];
const allowCodes=new Set(known.map(x=>x[0]));
function message(s){status.textContent=s}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n}
function appendText(parent,tag,value,cls){const n=node(tag,value,cls);parent.append(n);return n}
function link(href,text,cls){const n=node('a',text,cls);n.href=href;return n}
function errorNotice(parent,detail){parent.replaceChildren(node('p',detail,'gu-f600-empty'))}
function planName(plan){return plan==='LIFETIME'?'Lifetime Member':plan==='FOUNDING_60'?'60-Day Extended':plan==='FOUNDING_30'?'30-Day Standard':plan==='FOUNDING_14'?'14-Day Starter':'Not currently subscribed'}
function identity(info,qa=false){
 const p=el('gu-f600-identity');p.replaceChildren();
 if(info?.founderNumber){
  appendText(p,'strong','Founding #'+String(info.founderNumber).padStart(4,'0'));
  appendText(p,'span','Current access: '+planName(info.currentPlan));
  appendText(p,'span',info.earnedTier==='FOUNDING_60'?'Earned Extended Founder':info.earnedTier==='FOUNDING_14'?'Earned Starter Founder':'Standard Founder');
 }else if(qa){
  appendText(p,'strong','Authorized Beta Tester');
  appendText(p,'span','Temporary 30-day learning QA access · no paid Founding status or benefits');
 }else appendText(p,'strong','Founders moderator');
}
async function loadForums(sb,council){
 const host=el('gu-f600-forums');
 const {data,error}=await sb.from('commons_forums').select('forum_code,name,description').eq('section_name','Founders Commons').eq('active',true).order('sort_order');
 if(error)throw new Error('The authorized forum directory is unavailable.');
 const forums=(data||[]).filter(f=>allowCodes.has(f.forum_code));
 if(!forums.length)throw new Error('Your Founders Commons directory is not available.');
 host.replaceChildren();
 for(const f of forums){
  if(!council&&f.forum_code==='F600_COUNCIL')continue;
  const card=node('article',undefined,'gu-f600-forum');
  appendText(card,'p',f.forum_code==='F600_COUNCIL'?'EXTENDED DESIGN COUNCIL':'FOUNDING MEMBERS','gu-f600-forum-kicker');
  appendText(card,'h3',f.name);
  appendText(card,'p',f.description||'Share a constructive educational discussion.');
  card.append(link('market-commons.html?forum='+encodeURIComponent(f.forum_code),'Explore discussions','gu-f600-forum-link'));
  host.append(card);
 }
 if(!council){const councilCard=node('article',undefined,'gu-f600-forum gu-f600-locked');appendText(councilCard,'h3','Founding Design Council');appendText(councilCard,'p','Exclusive voting and design discussions for eligible Extended Founders.');host.append(councilCard)}
}
async function loadIssues(sb){
 const host=el('gu-f600-issues');
 const {data,error}=await sb.from('gu_founder_issues_v014176').select('topic_id,issue_kind,issue_state,updated_at').order('updated_at',{ascending:false}).limit(12);
 if(error){errorNotice(host,'Issue status is temporarily unavailable. Discussions remain accessible.');return}
 host.replaceChildren();
 for(const i of data||[]){
  const row=node('div',undefined,'gu-f600-issue');row.setAttribute('role','listitem');
  const inner=node('div');
  appendText(inner,'strong',i.issue_kind==='bug'?'Bug report':'Product suggestion');
  appendText(inner,'span','Status: '+String(i.issue_state||'submitted').replaceAll('_',' '));
  row.append(inner,link('market-commons.html?topic='+Number(i.topic_id),'View discussion'));
  host.append(row);
 }
 if(!host.childNodes.length)errorNotice(host,'No tracked reports yet. Start an evidence-based discussion.');
}
async function loadBallots(sb,council){
 const host=el('gu-f600-ballots');
 if(!council){errorNotice(host,'Design Council ballots are reserved for eligible Extended Founders.');return}
 const {data,error}=await sb.from('gu_founder_design_ballots_v014176')
   .select('id,title,description,choices,state,opens_at,closes_at')
   .eq('state','open').order('opens_at',{ascending:false}).limit(8);
 if(error){errorNotice(host,'Ballots are unavailable. Your voting privileges have not changed.');return}
 host.replaceChildren();
 if(!(data||[]).length){host.append(node('p','No active ballot is open. Approved design options will appear here when voting begins.','gu-f600-empty'));return}
 for(const b of data){
  const card=node('section',undefined,'gu-f600-ballot');
  appendText(card,'h3',b.title);appendText(card,'p',b.description);
  const list=node('div',undefined,'gu-f600-options');const group='founding-ballot-'+b.id;
  const choices=Array.isArray(b.choices)?b.choices.filter(x=>typeof x==='string'&&x.length<101):[];
  for(const choice of choices){
   const label=node('label');const input=node('input');input.type='radio';input.name=group;input.value=choice;
   label.append(input,document.createTextNode(' '+choice));list.append(label);
  }
  const submit=node('button','Cast my one vote','btn');submit.type='button';
  const notice=node('p','', 'gu-f600-vote-status');notice.setAttribute('role','status');
  submit.addEventListener('click',async()=>{
   const chosen=list.querySelector('input:checked');
   if(!chosen){notice.textContent='Choose an available design option first.';return}
   submit.disabled=true;notice.textContent='Verifying your ballot…';
   try{
    const {data:result,error:voteError}=await sb.rpc('gu_founder_cast_design_vote_v014176',{p_ballot_id:b.id,p_choice:chosen.value});
    if(voteError)throw voteError;
    if(!result?.ok){notice.textContent=result?.error==='ALREADY_VOTED'?'You have already voted on this ballot.':'This ballot cannot accept your vote.';return}
    notice.textContent='Your design vote was recorded.';list.querySelectorAll('input').forEach(x=>x.disabled=true);
   }catch{notice.textContent='Unable to record a verified vote. Your vote has not been confirmed.';submit.disabled=false}
  });
  card.append(list,submit,notice);host.append(card);
 }
}
async function main(){
 try{
  const sb=await window.getSupabaseClient(),user=(await sb.auth.getUser()).data?.user;
  if(!user){location.replace('signin.html?next='+encodeURIComponent('/founders-commons.html'));return}
  const {data:me,error:e}=await sb.rpc('gu_founder_my_status_v014174');if(e)throw e;
  let isMember=me?.eligible===true,sharedAccess=isMember,isQA=false;
  // Staff oversight is not founder membership and never permits casting design votes.
  const staff=await sb.rpc('gu_commons_staff_read_v20261028');
  const staffRead=!staff.error&&staff.data===true;
  sharedAccess=sharedAccess||staffRead;
  if(!sharedAccess){
   const {data:access,error:ae}=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
   sharedAccess=!ae&&access===true;
   if(sharedAccess){
    // Only a server-confirmed, self-scoped and unexpired Owner QA pass gets
    // the Beta Tester label. No founder number, purchase benefit or Council.
    const {data:qa,error:qe}=await sb.rpc('gu_founder_noncommercial_qa_v014289',{p_user:user.id});
    isQA=!qe&&qa===true;
   }
  }
  if(!sharedAccess){message('Neither qualifying founding membership nor Owner-authorized educational beta access could be verified.');el('gu-f600-access').hidden=false;return}
  identity(me,isQA);el('gu-f600-content').hidden=false;
  message(staffRead&&!isMember?'Authorized community staff oversight verified.':(isQA?'Temporary educational beta access verified.':'Private Founders Commons access verified.'));
  const council=me?.council===true;
  await Promise.allSettled([loadForums(sb,council||staffRead),loadIssues(sb),loadBallots(sb,council)]).then(results=>{
   if(results[0].status==='rejected')errorNotice(el('gu-f600-forums'),'Could not load the permitted community sections.');
  });
 }catch{message('Membership verification or the community service is unavailable. No private data was loaded.');el('gu-f600-access').hidden=false}
}
main();
})();