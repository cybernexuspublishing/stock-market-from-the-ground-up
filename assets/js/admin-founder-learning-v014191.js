(()=>{'use strict';
const el=x=>document.getElementById(x);
const make=(t,v)=>{const n=document.createElement(t);if(v!==undefined)n.textContent=String(v);return n};
let db;
async function api(body){
 const jwt=(await db.auth.getSession()).data?.session?.access_token;
 if(!jwt)throw Error('Owner sign-in is required.');
 const r=await fetch('/api/admin-founder-commons-v014179',{method:body?'POST':'GET',
 headers:{authorization:'Bearer '+jwt,...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.ok)throw Error(d.error||'Editorial operation was not confirmed.');
 return d;
}
async function render(){
 const d=await api(),cases=el('f600-admin-cases'),releases=el('f600-admin-learning-releases');
 cases.replaceChildren();releases.replaceChildren();
 if(!(d.caseProposals||[]).length)cases.append(make('p','No member case proposals yet.'));
 for(const item of d.caseProposals||[]){
  const box=make('article');box.className='gu-f600-ballot';box.setAttribute('role','listitem');
  box.append(make('h3',item.title),make('p','Status: '+item.review_state),make('p',item.scenario));
  if(['submitted','under_review'].includes(item.review_state)){
   const select=make('select');
   for(const state of ['under_review','accepted','declined']){
    const option=make('option',state.replaceAll('_',' '));option.value=state;select.append(option)
   }
   const note=make('textarea');note.rows=3;note.maxLength=1500;note.placeholder='Document the editorial decision and rationale';
   const submit=make('button','Save decision');submit.className='btn';submit.type='button';
   const result=make('p');result.setAttribute('role','status');
   submit.onclick=async()=>{
    submit.disabled=true;try{
     await api({action:'review_case',id:item.id,state:select.value,staffReply:note.value});
     result.textContent='Editorial review saved.';await render()
    }catch(e){result.textContent=e.message;submit.disabled=false}
   };
   box.append(select,note,submit,result);
  }cases.append(box);
 }
 for(const entry of d.learningReleases||[]){
  const p=make('p',entry.title+' · '+entry.category+' · '+entry.audience+' · '+entry.review_state);
  releases.append(p)
 }
 if(!releases.childNodes.length)releases.append(make('p','No editorially approved resources published.'));
}
async function init(){
 try{db=await window.getSupabaseClient();await render()}catch(e){el('f600-learning-admin-status').textContent=e.message;return}
 const form=el('f600-teaching-form'),note=el('f600-learning-admin-status');
 form.onsubmit=async event=>{
  event.preventDefault();const x=new FormData(form),submit=form.querySelector('button[type=submit]');
  submit.disabled=true;note.textContent='Recording rights-cleared editorial publication…';
  try{
   await api({action:'publish_teaching',slug:x.get('slug'),title:x.get('title'),body:x.get('body'),
    category:x.get('category'),audience:x.get('audience'),competencyCode:x.get('competencyCode'),
    rightsConfirmed:x.get('rightsConfirmed')==='on'});
   note.textContent='Editorial release published to the eligible founding audience.';form.reset();await render()
  }catch(e){note.textContent=e.message}finally{submit.disabled=false}
 };
}
init();
})();