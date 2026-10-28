/* Talia guided Chart Lab V2: revealed-only, educational, no grades/reveals or signals.
 * Member Lab linkage must be authorized by existing simulator-lab-context endpoint.
 */
(()=>{'use strict';
const labPattern=/^(?:(?:F[123]|DT|TAPE)-C\d{2}-L\d{2}|SITE-\d{3})$/;
const model={bars:[],label:'',tier:'STANDARD',lab:null};
let host=null,heading=null,facts=null,cues=null,questions=null,answer=null,status=null,link=null;
const node=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el};
const say=t=>{if(status)status.textContent=t};
const tiers=()=>window.CrownlightChartTiers?.getStatus?.()||{tier:'STANDARD',selected:'STANDARD',verified:false};
function educationalFacts(){
 const mapped=model.bars.map(b=>({time:new Date(b.timestamp),open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume}));
 return window.CrownlightChartTutor?.analyze?.(mapped)||null;
}
function render(){
 if(!host||host.hidden)return;
 facts.replaceChildren();cues.replaceChildren();questions.replaceChildren();
 const guide=educationalFacts(),t=tiers();
 heading.textContent='Talia · Chart Reading Lab'+(model.label?' — '+model.label:'');
 if(!guide){say('Load fictional or provider-authorized replay candles before chart analysis. Future bars stay hidden.');return}
 const intro=node('p','',guide.sampleSize+' revealed candles · '+(t.selected||'Standard')+' view. Observations are provisional until confirmed.');
 facts.append(intro);
 for(const f of guide.facts){const item=node('p');item.append(node('strong','',f.name+': '),node('span','',f.reading));facts.append(item)}
 for(const c of guide.cues||[])cues.append(node('p','',c));
 for(const q of guide.questions||[]){const li=node('li','',q);questions.append(li)}
 if(t.tier==='PROFESSIONAL'&&t.selected==='PROFESSIONAL'){
  questions.append(node('li','Compare the synchronized volume/momentum pane to the price pane. Are both using only revealed observations?'));
 }
 say('Teaching guidance only. Explain your own evidence, invalidation, and no-trade conditions before advancing replay.');
}
async function labContext(id){
 const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to verify a Lab reference.');
 const r=await fetch('/api/simulator-lab-context?lab='+encodeURIComponent(id),{
  headers:{authorization:'Bearer '+session.access_token},cache:'no-store'
 });
 const body=await r.json();
 if(!r.ok||body?.ok!==true)throw Error(body?.error||'Lab access was not verified.');
 if(body.labId!==id)throw Error('Lab identity mismatch');
 return body;
}
async function attachLab(){
 const id=String(host.querySelector('[data-cl-lab-id]').value||'').trim().toUpperCase();
 link.hidden=true;model.lab=null;
 if(!labPattern.test(id)){say('Enter a valid Lab reference (for example F1-C02-L01).');return}
 try{
  const verified=await labContext(id);
  model.lab=verified;
  const field=document.getElementById('sim-lab-id');if(field)field.value=verified.labId;
  // Verified Lab metadata never creates or pretends historical bars were loaded.
  link.href='/lab-player.html?lab='+encodeURIComponent(id);link.hidden=false;
  say('Verified Lab: '+verified.title+'. '+(verified.referenceDate?'Reference date '+verified.referenceDate+'. ':'')+
   'This does not load market data, provide an unearned Lab grant, or guarantee an intraday start time.');
 }catch(e){say(e.message)}
}
function build(){
 const region=document.querySelector('.sim-chart-panel');if(!region||host)return;
 host=node('section','cl-talia-guided');host.setAttribute('aria-label','Talia guided chart practice');
 const toggle=node('button','cl-talia-toggle','Talia · Guided Chart Reading');toggle.type='button';
 toggle.setAttribute('aria-expanded','false');
 const inner=node('div','cl-talia-body');inner.hidden=true;
 toggle.addEventListener('click',()=>{
  inner.hidden=!inner.hidden;toggle.setAttribute('aria-expanded',String(!inner.hidden));
  if(!inner.hidden)render();
 });
 heading=node('h3','','Talia · Chart Reading Lab');
 const notice=node('p','cl-talia-disclaimer','Start with the observed candle, not a prediction. This practice never produces a trading signal or a grade.');
 facts=node('div','cl-talia-facts');cues=node('div','cl-talia-cues');
 const sub=node('h4','','Your evidence and invalidation');questions=node('ol','cl-talia-questions');
 answer=node('textarea','cl-talia-answer');answer.rows=3;answer.maxLength=2400;
 answer.placeholder='Write your own observed evidence, invalidation, and reasons to choose NO TRADE.';
 answer.setAttribute('aria-label','Ungraded chart reading observation');
 const actions=node('div','cl-talia-actions');
 const confirm=node('button','','Review my observation');confirm.type='button';
 confirm.addEventListener('click',()=>{
  if(!answer.value.trim()){say('Record your observation before reviewing it.');answer.focus();return}
  say('Observation recorded in this teaching session (ungraded). Check it against the revealed candles and your invalidation rule. No future bars or mastery credit were used.');
 });
 const copy=node('button','','Copy to Journal');copy.type='button';
 copy.addEventListener('click',async()=>{
  if(!answer.value.trim()){say('Write an observation first.');return}
  try{await navigator.clipboard.writeText('Crownlight · '+model.label+'\n'+answer.value.trim());
   say('Copied. Open Journal to decide whether to save it to your member record. No automatic submission.')}
  catch{say('Browser clipboard blocked. Select and copy your text manually.')}
 });
 const journal=node('a','', 'Open Journal');journal.href='/journal.html';
 actions.append(confirm,copy,journal);
 const lb=node('div','cl-talia-lab-link');
 const labInput=node('input');labInput.type='text';labInput.dataset.clLabId='';labInput.maxLength=20;
 labInput.placeholder='Lab ID (e.g. F1-C02-L01)';labInput.setAttribute('aria-label','Lab reference');
 const validate=node('button','','Verify Lab');validate.type='button';validate.addEventListener('click',()=>void attachLab());
 link=node('a','','Open verified Lab');link.hidden=true;link.rel='noopener';lb.append(labInput,validate,link);
 status=node('p','cl-talia-status');status.role='status';status.setAttribute('aria-live','polite');
 inner.append(heading,notice,facts,cues,sub,questions,answer,actions,lb,status);
 host.append(toggle,inner);
 const switcher=document.getElementById('cl-chart-tier-switcher');if(switcher)switcher.insertAdjacentElement('afterend',host);else region.append(host);
 const sourceLab=new URLSearchParams(location.search).get('lab')||'';
 if(labPattern.test(sourceLab)){labInput.value=sourceLab;void attachLab()}
}
window.addEventListener('crownlight:revealed-bars',e=>{
 const d=e.detail||{};model.bars=Array.isArray(d.bars)?d.bars.map(b=>({...b})):[];model.label=String(d.symbol||'REPLAY').slice(0,32);
 if(host&&!host.querySelector('.cl-talia-body').hidden)render();
});
window.addEventListener('crownlight:tier-mounted',()=>{if(host&&!host.querySelector('.cl-talia-body').hidden)render()});
window.addEventListener('crownlight:tier-permission',e=>{
 if(!e.detail?.verified){model.bars=[];model.lab=null;model.label='';if(answer)answer.value='';if(link)link.hidden=true;
  facts?.replaceChildren();cues?.replaceChildren();questions?.replaceChildren();
  if(heading)heading.textContent='Talia · Chart Reading Lab';
  say('Session changed. Private chart observations were cleared. Sign in and load permitted replay data again.');}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
window.CrownlightTaliaV2={getStatus:()=>({revealed:model.bars.length,labVerified:!!model.lab})};
})();