/* v0.14.0.35 — Separately purchased eBooks and authorized Lifetime editions.
 * Database verifies eligibility and KDP distribution rights on every download.
 */
(()=>{'use strict';if(!/^\/my-books(?:\.html)?$/i.test(location.pathname))return;
const covers={FOUNDATION_BOOK_1:'/assets/images/books/foundation-book-1.webp',
 FOUNDATION_BOOK_2:'/assets/images/books/foundation-book-2.webp',
 FOUNDATION_BOOK_3:'/assets/images/books/foundation-book-3.webp',
 DAY_TRADING_BOOK_1:'/assets/images/books/day-trading-book-1.webp',
 READING_THE_TAPE:'/assets/images/books/reading-the-tape.webp'};
async function init(){const root=document.querySelector('#v135-books');if(!root)return;
 const section=document.createElement('section');section.className='gu-digital-library';
 const title=document.createElement('h2');title.textContent='Digital eBooks';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking eligible eBooks…';
 const list=document.createElement('div');list.className='v135-card-grid';section.append(title,status,list);root.parentNode.insertBefore(section,root);
 try{const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc('gu_my_digital_books_v01430');if(error)throw error;
  const books=data?.books||[];status.textContent=books.length?`${books.length} eligible digital editions. Downloads depend on publishing rights and file availability.`:
    'No separate website eBook purchases or eligible Lifetime editions. Book companions and Kindle purchases remain separate.';
  for(const book of books){const card=document.createElement('article');card.className='v135-card';
   const cover=covers[book.code];if(cover){const img=document.createElement('img');img.src=cover;img.alt=`Cover of ${book.title||book.code}`;img.loading='lazy';img.style.cssText='width:100%;max-height:270px;object-fit:contain';card.append(img)}
   const h=document.createElement('h3');h.textContent=book.title||book.code;card.append(h);
   const source=document.createElement('p');source.textContent=book.accessSource==='lifetime'?'Included with your active Lifetime Membership':'Purchased directly from this website';card.append(source);
   if(!book.downloadEnabled){const note=document.createElement('p');note.textContent='Download unavailable until digital distribution rights and the approved file are ready.';card.append(note)}else{
    let formats=null;
    try{
     const found=await sb.rpc('gu_digital_formats_v014305',{p_code:book.code});
     if(!found.error&&found.data?.ok&&Array.isArray(found.data.formats))
      formats=found.data.formats.filter(x=>x==='pdf'||x==='epub');
    }catch{}
    // Existing single-edition downloads continue to work before schema upgrade.
    if(!formats?.length)formats=[null];
    for(const fmt of formats){
    const btn=document.createElement('button');btn.type='button';btn.className='btn';
    btn.textContent=fmt?'Download '+fmt.toUpperCase():'Download eBook';
    const msg=document.createElement('p');msg.setAttribute('role','status');btn.onclick=async()=>{btn.disabled=true;msg.textContent='Checking your access and preparing a secure download…';
     try{const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in required.');
      const r=await fetch('/api/digital-book-download-v01430',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify(fmt?{code:book.code,format:fmt}:{code:book.code})});
      const d=await r.json();if(!r.ok||!d.ok||!d.url)throw Error(d.error||'Download unavailable.');
      const url=new URL(d.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Unsafe download destination.');
      msg.textContent='Opening your secure download…';window.location.assign(url.href);
     }catch(e){msg.textContent=e.message||'Could not download.'}finally{btn.disabled=false}};
    card.append(btn,msg);
    }
   }list.append(card);
  }
 }catch(e){status.textContent='Digital eBooks unavailable: '+(e.message||'Backend not yet installed.')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
