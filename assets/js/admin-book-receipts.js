/* Private Owner receipt review. All user-supplied strings use textContent. */
(()=>{'use strict';
 const by=id=>document.getElementById(id),status=by('book-receipt-admin-status'),
 list=by('book-receipt-admin-list');
 if(!status||!list)return;
 const node=(tag,label)=>{const x=document.createElement(tag);x.textContent=String(label??'');return x};
 let client=null;
 async function api(action,{method='GET',id,body,asBlob=false}={}){
  const s=await client.auth.getSession(),token=s.data?.session?.access_token;
  if(s.error||!token)throw Error('Owner session unavailable.');
  const query=new URLSearchParams({action,...(id?{id}:{})});
  const response=await fetch('/api/admin-book-receipts?'+query,{method,cache:'no-store',
   credentials:'same-origin',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined});
  if(!response.ok)throw Error('Owner receipt request not authorized or unavailable ('+response.status+').');
  if(asBlob)return response.blob();
  const result=await response.json();if(!result.ok)throw Error('Receipt update not confirmed.');
  return result;
 }
 async function refresh(){
  list.replaceChildren();status.textContent='Loading receipt queue…';
  try{
   const result=await api('list');
   if(!Array.isArray(result.claims))throw Error('Receipt list could not be verified.');
   if(!result.claims.length){status.textContent='No receipts in the private queue.';return}
   for(const cl of result.claims){
    const card=node('section','');card.className='card dashboard-space';
    card.append(node('h2',cl.book_code+' — '+cl.status));
    card.append(node('p','Member: '+cl.registered_email+' · Ticket '+cl.ticket_id+
     ' · Retailer: '+cl.provider+' · Order: '+(cl.external_order_reference||'not provided')));
    card.append(node('p','Received '+new Date(cl.received_at).toLocaleString()+
     ' · Due '+new Date(cl.activation_due_at).toLocaleString()));
    const download=node('button','Download private receipt');download.type='button';download.className='btn secondary';
    download.addEventListener('click',async()=>{
     download.disabled=true;
     try{const blob=await api('file',{id:cl.id,asBlob:true});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='receipt-'+cl.id;a.hidden=true;document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1200);
     }catch(e){status.textContent=e.message}finally{download.disabled=false}
    });
    card.append(download);
    if(['approved','rejected'].includes(cl.status)){
     card.append(node('p','Review completed. '+(cl.staff_note||'')));list.append(card);continue;
    }
    const form=document.createElement('form'),label=node('label','Independent verification findings');
    const note=document.createElement('textarea');note.rows=3;note.maxLength=1500;note.minLength=12;note.required=true;
    label.append(note);form.append(label);
    for(const [decision,caption] of [['approve','Approve verified book + Free access'],
      ['awaiting_information','Request more information'],['reject','Reject claim']]){
     const button=node('button',caption);button.type='button';button.className='btn secondary';
     button.addEventListener('click',async()=>{
      const reason=note.value.trim();
      if(reason.length<12){status.textContent='Record your review findings (at least 12 characters).';return}
      if(decision==='approve'&&!confirm('Have you independently verified this retailer receipt, exact book, order and member?'))return;
      button.disabled=true;status.textContent='Recording Owner decision…';
      try{await api('decide',{method:'POST',body:{claimId:cl.id,decision,note:reason,
       ...(decision==='approve'?{confirmPhrase:'APPROVE VERIFIED BOOK PURCHASE'}:{})}});
       await refresh();status.textContent='Owner decision recorded in the member Support ticket.';
      }catch(e){status.textContent=e.message}finally{button.disabled=false}
     });form.append(button);
    }
    card.append(form);list.append(card);
   }
   status.textContent='Private receipt queue: '+result.claims.length+' claims.';
  }catch(e){status.textContent=e.message||'Receipt queue unavailable.'}
 }
 async function init(){try{
  client=await window.getSupabaseClient();if(!client)throw Error('Sign-in service unavailable.');
  await refresh();
  client.auth.onAuthStateChange?.((event,session)=>{if(event==='SIGNED_OUT'||!session?.user){
   list.replaceChildren();status.textContent='Owner signed out.'}});
 }catch(e){status.textContent=e.message}}
 by('book-receipt-admin-refresh')?.addEventListener('click',()=>void refresh());
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init(),{once:true});
 else void init();
})();