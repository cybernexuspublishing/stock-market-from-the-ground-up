/* Authenticated member Support workspace in the EXISTING Dashboard.
 * Backs the sidebar's ?tab=support link with /api/support: no parallel
 * ticket database, public tickets, staff impersonation or billing changes.
 * Ticket content and private messages are never inserted as HTML.
 */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);
 if(params.get('tab')!=='support')return;
 const by=id=>document.getElementById(id);
 const panel=by('member-support-panel'),form=by('member-support-form'),
  status=by('member-support-status'),list=by('member-support-list'),
  detail=by('member-support-detail');
 if(!panel||!form||!status||!list||!detail)return;
 let client=null,memberId='',epoch=0,selectedTicket=null,busy=false;
 const text=(tag,value,cls='')=>{
  const el=document.createElement(tag);el.textContent=String(value??'');
  if(cls)el.className=cls;return el;
 };
 const setStatus=(message,error=false)=>{
  status.textContent=message;status.dataset.state=error?'error':'info';
 };
 const datetime=value=>{
  const d=new Date(value||'');return Number.isFinite(d.getTime())?d.toLocaleString():'Date unavailable';
 };
 const clearPrivate=()=>{
  ++epoch;memberId='';selectedTicket=null;list.replaceChildren();
  detail.replaceChildren();panel.hidden=true;form.reset();
 };
 async function session(){
  if(!client||!memberId)throw Error('Sign in to continue.');
  const response=await client.auth.getSession();
  const value=response.data?.session;
  if(response.error||!value?.access_token||value.user?.id!==memberId)
   throw Error('Member session changed. Sign in and reopen Support.');
  return value;
 }
 async function call(action,{method='GET',body,query={}}={}){
  const run=epoch,userId=memberId,token=(await session()).access_token;
  const queryString=new URLSearchParams({action,...query}).toString();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/support?'+queryString,{
    method,cache:'no-store',credentials:'same-origin',signal:controller.signal,
    headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined
   });
   const value=await response.json().catch(()=>({}));
   if(run!==epoch||userId!==memberId)throw Error('Account changed during the request. Reload Support.');
   const current=await session();
   if(current.user.id!==userId)throw Error('Account changed during the request.');
   if(!response.ok||value.ok!==true)
    throw Error(String(value.error||'Support request was not confirmed.').slice(0,220));
   return value;
  }finally{clearTimeout(timeout)}
 }
 function rowButton(ticket){
  const item=document.createElement('li');
  const button=document.createElement('button');
  button.type='button';button.className='btn secondary';
  button.textContent=(ticket.ticket_number?'#'+ticket.ticket_number+' · ':'')+
   (ticket.subject||'Support request');
  button.addEventListener('click',()=>void openTicket(ticket.id));
  item.append(button,text('span',' '+(ticket.status||'Status unavailable')+
   ' · '+datetime(ticket.updated_at||ticket.created_at),'small'));
  return item;
 }
 async function loadTickets(){
  setStatus('Loading your private support requests…');
  try{
   const value=await call('list');
   list.replaceChildren();
   if(!Array.isArray(value.tickets))throw Error('Unexpected Support ticket list.');
   if(value.tickets.length===0)list.append(text('li','No support requests yet. Your new report will appear here.'));
   else for(const row of value.tickets)list.append(rowButton(row));
   setStatus('Only support requests belonging to your signed-in account are shown.');
  }catch(e){setStatus(e.message||'Support requests could not be loaded.',true)}
 }
 async function openTicket(id){
  const ticketId=Number(id);
  if(!Number.isSafeInteger(ticketId)||ticketId<1)return;
  detail.replaceChildren();detail.append(text('p','Loading this private support request…'));
  try{
   const v=await call('detail',{query:{id:String(ticketId)}});
   if(!v.ticket||!Array.isArray(v.messages))throw Error('Support detail could not be verified.');
   selectedTicket=ticketId;detail.replaceChildren();
   const heading=text('h3',v.ticket.subject||'Support request');
   heading.tabIndex=-1;detail.append(heading);
   detail.append(text('p','Status: '+String(v.ticket.status||'unknown')+
    ' · Updated: '+datetime(v.ticket.updated_at)));
   const messages=document.createElement('ol');
   messages.setAttribute('aria-label','Support conversation');
   for(const m of v.messages){
    const item=document.createElement('li');
    item.append(text('strong',m.author_kind==='staff'?'Support team':'Member'),
     text('span',' · '+datetime(m.created_at),'small'),
     text('p',m.body||''));
    messages.append(item);
   }
   if(!v.messages.length)messages.append(text('li','No messages are recorded yet.'));
   detail.append(messages);
   const closed=['closed','resolved'].includes(v.ticket.status);
   const actions=document.createElement('form');
   actions.className='v1352-grid';
   if(!closed){
    const label=text('label','Add a private reply');
    const reply=document.createElement('textarea');
    reply.rows=4;reply.maxLength=10000;reply.minLength=1;reply.required=true;
    label.append(reply);actions.append(label);
    const submit=text('button','Send reply','btn');
    submit.type='submit';actions.append(submit);
    actions.addEventListener('submit',async event=>{
     event.preventDefault();if(busy||!reply.value.trim())return;
     busy=true;submit.disabled=true;
     setStatus('Submitting your private reply…');
     try{
      await call('reply',{method:'POST',body:{id:ticketId,body:reply.value.trim()}});
      await openTicket(ticketId);await loadTickets();
      setStatus('Reply submitted and retrieved from your Support record.');
     }catch(e){setStatus((e.message||'Unable to confirm reply.')+
      ' Review the conversation before retrying.',true)}
     finally{busy=false;submit.disabled=false}
    });
   }else{
    const reopen=text('button','Reopen this request','btn secondary');
    reopen.type='button';
    reopen.addEventListener('click',async()=>{
     if(busy)return;busy=true;reopen.disabled=true;
     setStatus('Reopening your Support request…');
     try{
      await call('reopen',{method:'POST',body:{id:ticketId}});
      await openTicket(ticketId);await loadTickets();
      setStatus('The request was reopened.');
     }catch(e){setStatus(e.message||'Reopening could not be confirmed.',true)}
     finally{busy=false;reopen.disabled=false}
    });
    actions.append(reopen);
   }
   detail.append(actions);heading.focus({preventScroll:true});
  }catch(e){detail.replaceChildren(text('p',e.message||'Support detail unavailable.'));
   setStatus('Could not verify this support request.',true)}
 }
 async function create(event){
  event.preventDefault();if(busy)return;
  const category=form.elements.category.value,
   subject=form.elements.subject.value.trim(),
   description=form.elements.description.value.trim();
  if(subject.length<3||subject.length>180||description.length<10||description.length>9500){
   setStatus('Provide a short subject and at least 10 characters of factual detail.',true);return;
  }
  const labId=params.get('lab');
  const isLab=labId&&/^[A-Za-z0-9_-]{3,90}$/.test(labId);
  const fullDescription=isLab?'Lab ID: '+labId+'\n'+description:description;
  busy=true;
  const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  setStatus('Submitting a private report; no identifying data will be posted publicly…');
  try{
   const answer=await call('create',{method:'POST',body:{category,subject,description:fullDescription}});
   if(!answer.ticket?.id)throw Error('Support did not confirm the ticket identifier.');
   form.reset();await loadTickets();await openTicket(answer.ticket.id);
   setStatus('Your support request was created. Use its private conversation for updates.');
  }catch(e){
   setStatus((e.message||'Support submission was not confirmed.')+
     ' Review your ticket list before submitting again to avoid duplicates.',true);
   await loadTickets();
  }finally{busy=false;submit.disabled=false}
 }
 form.addEventListener('submit',event=>void create(event));
 by('member-support-refresh')?.addEventListener('click',()=>void loadTickets());
 async function init(){
  try{
   client=await window.getSupabaseClient();
   if(!client)throw Error('Sign-in service is unavailable.');
   const response=await client.auth.getUser();
   const user=response.data?.user;
   if(response.error||!user?.id)throw Error('Sign in to open your private Support workspace.');
   memberId=user.id;++epoch;panel.hidden=false;
   const lab=params.get('lab');
   if(lab&&/^[A-Za-z0-9_-]{3,90}$/.test(lab)){
    form.elements.category.value='historical_labs';
    form.elements.subject.value='Lab '+lab+' — beta report';
    by('member-support-context').textContent='Reporting a concern with Lab '+lab+
      '. Explain your expected result, actual result and steps to reproduce.';
   }
   client.auth.onAuthStateChange?.((event,next)=>{
    if(event==='SIGNED_OUT'||next?.user?.id!==memberId){
     clearPrivate();setStatus('Account changed. Sign in again to view your own support requests.',true);
    }
   });
   await loadTickets();
  }catch(e){clearPrivate();setStatus(e.message||'Support is currently unavailable.',true)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
 else void init();
})();