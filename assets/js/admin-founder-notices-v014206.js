/* Founder notice management; every action re-verifies the Owner JWT at the server. */
(()=>{'use strict';
const el=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
let db;
async function api(body){
 const token=(await db.auth.getSession()).data?.session?.access_token;
 if(!token)throw Error('Owner sign-in required.');
 const opt={method:body?'POST':'GET',headers:{authorization:'Bearer '+token}};
 if(body){opt.headers['content-type']='application/json';opt.body=JSON.stringify(body)}
 const r=await fetch('/api/admin-founder-commons-v014179',opt),x=await r.json().catch(()=>({}));
 if(!r.ok||x.ok!==true)throw Error(x.error||'Owner action was not verified.');
 return x;
}
async function refresh(){
 const list=el('f600-notice-list'),d=await api();list.replaceChildren();
 for(const x of d.targetedNotices||[]){
  const card=make('article');card.className='gu-f600-ballot';card.setAttribute('role','listitem');
  card.append(make('strong',x.title),make('p','Audience: '+x.audience+' · Priority: '+x.priority+' · '+x.publication_state));
  if(x.publication_state==='published'){
   const btn=make('button','Withdraw notice');btn.type='button';btn.className='btn secondary';
   const message=make('p');message.setAttribute('role','status');
   btn.onclick=async()=>{btn.disabled=true;try{await api({action:'withdraw_founder_notice',id:x.id});message.textContent='Notice withdrawn.';await refresh()}catch(e){message.textContent=e.message;btn.disabled=false}};
   card.append(btn,message)
  }
  list.append(card);
 }
 if(!list.childNodes.length)list.append(make('p','No targeted founder notices are published.'));
}
async function start(){
 const form=el('f600-notice-form');if(!form)return;
 try{db=await window.getSupabaseClient();await refresh()}
 catch(e){el('f600-notice-status').textContent=e.message;return}
 form.onsubmit=async ev=>{
  ev.preventDefault();const data=new FormData(form),note=el('f600-notice-status'),btn=form.querySelector('button[type=submit]');
  btn.disabled=true;note.textContent='Publishing to the selected, private founder audience…';
  try{
   await api({action:'publish_founder_notice',noticeCode:data.get('noticeCode'),title:data.get('title'),
    body:data.get('body'),audience:data.get('audience'),priority:data.get('priority')});
   note.textContent='Founder notice published to the verified eligible audience.';form.reset();await refresh()
  }catch(e){note.textContent='Not published: '+e.message}
  finally{btn.disabled=false}
 };
}
start();
})();