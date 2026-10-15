/* Paid, nonrefunded website ebook orders only. Companion books are independent. */
(()=>{'use strict';if(!/^\/my-books(?:\.html)?$/i.test(location.pathname))return;
async function init(){const root=document.querySelector('#v135-books');if(!root)return;
 const section=document.createElement('section');section.className='gu-digital-library';
 const title=document.createElement('h2');title.textContent='Purchased Digital eBooks';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking your verified digital purchases…';
 const list=document.createElement('div');list.className='v135-card-grid';section.append(title,status,list);root.parentNode.insertBefore(section,root);
 try{const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc('gu_my_digital_books_v01430');if(error)throw error;
  const books=data?.books||[];status.textContent=books.length?books.length+' website eBook purchases found.':'No verified direct digital eBook purchases. Amazon purchases and companion keys are separate.';
  for(const book of books){const card=document.createElement('article');card.className='v135-card';
   const h=document.createElement('h3');h.textContent=book.title||book.code;card.append(h);
   if(!book.downloadEnabled){const note=document.createElement('p');note.textContent='Download temporarily unavailable while publishing rights or file availability are restricted.';card.append(note)}else{
    const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.textContent='Download Purchased eBook';
    const msg=document.createElement('p');msg.setAttribute('role','status');btn.onclick=async()=>{btn.disabled=true;msg.textContent='Confirming your paid order and preparing a short-lived private download…';
     try{const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in required.');
      const r=await fetch('/api/digital-book-download-v01430',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({code:book.code})});
      const d=await r.json();if(!r.ok||!d.ok||!d.url)throw Error(d.error||'Download unavailable.');
      const url=new URL(d.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Unsafe download destination.');
      msg.textContent='Opening private download…';window.location.assign(url.href);
     }catch(e){msg.textContent=e.message||'Could not download.'}finally{btn.disabled=false}};
    card.append(btn,msg);
   }list.append(card);
  }
 }catch(e){status.textContent='Digital purchases are not available: '+(e.message||'Backend not yet installed.')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
