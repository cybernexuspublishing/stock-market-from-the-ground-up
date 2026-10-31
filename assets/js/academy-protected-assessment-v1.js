/* Protected Boot Camp day assessment UI.
 * All cases are obtained from an entitlement-checked server, without answer keys.
 * No client-side grading, grade writes, payments, or automatic mastery.
 */
(function(root){'use strict';
const codes=new Set(['tape10','indicators10','filings7']);
const el=(tag,text,cl)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cl)n.className=cl;return n};
function mount(target,{programCode,day}={}){
 if(!target||!codes.has(programCode)||!Number.isInteger(day)||day<1||day>(programCode==='filings7'?7:10))
  return null;
 let epoch=0,disposed=false,busy=false;
 target.hidden=false;target.replaceChildren();
 const heading=el('h4','Independent protected assessment');
 const message=el('p','Checking the approved assessment and eligibility.','academy-assessment-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const detail=el('div',undefined,'academy-assessment-detail');
 target.append(heading,message,detail);
 async function token(){
  const client=await root.getSupabaseClient?.();
  const {data,error}=await client?.auth?.getSession?.()||{};
  if(error||!data?.session?.access_token)throw Error('Sign in again before taking a protected assessment.');
  return data.session.access_token;
 }
 async function request(body){
  const jwt=await token();
  const response=await fetch('/api/academy-protected-assessment-v1?program='+encodeURIComponent(programCode)+'&day='+day,{
   method:body===undefined?'GET':'POST',cache:'no-store',credentials:'same-origin',
   headers:{authorization:'Bearer '+jwt,...(body===undefined?{}:{'content-type':'application/json'})},
   body:body===undefined?undefined:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error(data.error||data.reason||'Protected assessment unavailable.');
  return data;
 }
 function report(text){message.textContent=text}
 async function load(){
  const current=++epoch;busy=true;detail.replaceChildren();report('Checking independently approved assessment access…');
  try{
   const payload=await request();
   if(disposed||epoch!==current)return;
   if(payload.officialAssessment!==true||!payload.assessment){
    report(payload.reason==='assessment_not_reviewed'?'Independent assessment is pending editorial approval. No official grade can be recorded.':
     payload.reason==='no_fresh_reviewed_case'?'No new approved independent retake is available. The original submission remains preserved.':
     'No protected independent assessment has been released for this study day.');
    return;
   }
   const assessment=payload.assessment;
   if(!Array.isArray(assessment.questions)||assessment.questions.length<4)throw Error('Invalid independent assessment data.');
   report('Independent first submission. No hints or worked answers are shown during grading.');
   const form=el('form');form.noValidate=true;
   const used=new Set();
   assessment.questions.forEach((q,i)=>{
    const field=el('fieldset',undefined,'academy-assessment-question');
    const legend=el('legend',(i+1)+'. '+q.prompt);
    field.append(legend);
    const name='academy-assess-'+q.id;
    if(used.has(q.id))throw Error('Duplicate assessment question.');
    used.add(q.id);
    for(const option of q.options){
     const label=el('label',undefined,'academy-assessment-option');
     const radio=el('input');radio.type='radio';radio.name=name;radio.value=option.code;radio.required=true;
     label.append(radio,el('span',option.label));field.append(label);
    }
    form.append(field);
   });
   const submit=el('button','Submit independent assessment','btn');submit.type='submit';form.append(submit);
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||disposed)return;
    const answers={};
    for(const q of assessment.questions){
     const options=[...form.querySelectorAll('input[type=radio]')].filter(x=>x.name==='academy-assess-'+q.id);
     const selected=options.find(x=>x.checked);
     if(!selected){report('Complete every question before submitting. Your first graded answer is final.');return}
     answers[q.id]=selected.value;
    }
    busy=true;submit.disabled=true;report('Submitting first independent answers securely…');
    const attempt=++epoch;
    try{
     const payload=await request({caseCode:assessment.caseCode,answers});
     if(disposed||epoch!==attempt)return;
     detail.replaceChildren();
     report('Your independent first submission has been recorded by the protected assessment service.');
     const summary=el('p','Recorded score: '+Number(payload.result?.score||0).toFixed(2)+'%. Correct answers and protected grading rubrics are not returned to the browser.');
     const refresh=el('button','Check for a fresh independent retake','btn secondary');refresh.type='button';refresh.onclick=load;
     detail.append(summary,refresh);
    }catch(e){
     if(!disposed&&epoch===attempt){
      report(String(e.message||'Assessment could not be recorded.')+' Do not assume that the first submission was lost; reload to verify its status.');
      const verify=el('button','Verify submission status','btn secondary');verify.type='button';verify.onclick=load;detail.append(verify);
     }
    }finally{if(!disposed&&epoch===attempt)busy=false}
   });
   detail.append(form);
  }catch(e){
   if(!disposed&&epoch===current)report(String(e.message||'Protected assessment service unavailable.'));
  }finally{if(!disposed&&epoch===current)busy=false}
 }
 void load();
 return{dispose(){disposed=true;epoch++;target.replaceChildren();target.hidden=true}};
}
root.GroundUpAcademyProtectedAssessmentV1=Object.freeze({mount});
})(typeof window!=='undefined'?window:globalThis);
