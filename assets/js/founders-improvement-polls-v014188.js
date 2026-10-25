/* Shared Founding 600 improvement poll, one verified vote per eligible account. */
(()=>{'use strict';
const node=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x};
async function run(){
 const host=document.getElementById('gu-f600-improvement-polls');if(!host)return;
 try{
  const sb=await window.getSupabaseClient();
  if(!(await sb.auth.getUser()).data?.user)return;
  const {data:access,error:accessError}=await sb.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
  if(accessError||access!==true){host.replaceChildren(node('p','A current founding membership is required to participate.'));return}
  const {data,error}=await sb.from('gu_founder_improvement_polls_v014188').select('id,title,description,choices,opens_at,closes_at,state')
   .eq('state','open').order('opens_at',{ascending:false}).limit(10);
  if(error){host.replaceChildren(node('p','Community voting is temporarily unavailable.'));return}
  host.replaceChildren();
  if(!(data||[]).length){host.append(node('p','No improvement poll is currently open. Your suggestion submissions remain welcome.'));return}
  for(const poll of data){
   const card=node('section',undefined,'gu-f600-ballot');
   card.append(node('h3',poll.title),node('p',poll.description));
   const options=node('fieldset'),legend=node('legend','Choose one option'),radioName='founder-poll-'+poll.id;
   options.append(legend);
   for(const choice of Array.isArray(poll.choices)?poll.choices:[]){
    if(typeof choice!=='string'||choice.length>100)continue;
    const label=node('label'),input=node('input');input.type='radio';input.name=radioName;input.value=choice;
    label.append(input,document.createTextNode(' '+choice));options.append(label)
   }
   const vote=node('button','Cast my vote','btn');vote.type='button';
   const status=node('p','');status.setAttribute('role','status');
   vote.onclick=async()=>{
    const selected=options.querySelector('input:checked');
    if(!selected){status.textContent='Choose an option first.';return}
    vote.disabled=true;status.textContent='Verifying and recording your vote…';
    try{
     const r=await sb.rpc('gu_founder_improvement_vote_v014188',{p_poll_id:poll.id,p_choice:selected.value});
     if(r.error||r.data?.ok!==true){
      status.textContent=r.data?.error==='ALREADY_VOTED'?'You have already voted in this poll.':'This poll cannot accept your vote.';
      return
     }
     status.textContent='Your single vote has been recorded.';options.querySelectorAll('input').forEach(i=>i.disabled=true);
    }catch{status.textContent='Your vote could not be confirmed. You may try again.'}
    finally{vote.disabled=false}
   };
   card.append(options,vote,status);host.append(card);
  }
 }catch{host.replaceChildren(node('p','Community voting could not be loaded.'))}
}
run();
})();