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

async function initBookStripeTest(){
 const root=document.getElementById('v135-books');if(!root)return;
 try{
  const sb=await window.getSupabaseClient();
  const eligible=await sb.rpc('gu_book_test_eligible_v1');
  if(eligible.error||eligible.data?.eligible!==true)return;
  const box=document.createElement('section');box.className='gu-digital-library gu-book-stripe-test';
  box.style.cssText='margin:1rem 0;padding:1.25rem;border:1px solid #7496b7;border-radius:14px';
  const h=document.createElement('h2');h.textContent='Stripe TEST — Foundations Book I EPUB';
  const info=document.createElement('p');
  info.textContent='Sandbox purchase and file-delivery acceptance only. No real charge, LIVE membership or customer entitlement.';
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:.65rem;flex-wrap:wrap';
  const buy=document.createElement('button');buy.className='btn';buy.type='button';buy.textContent='TEST Checkout — $10.99 (test card)';
  const check=document.createElement('button');check.className='btn secondary';check.type='button';check.textContent='Refresh TEST purchase';
  const open=document.createElement('button');open.className='btn secondary';open.type='button';open.textContent='Download TEST EPUB';
  open.disabled=true;
  let ready=false,owned=false;
  const authenticated=async()=>{const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error('Sign in again.');return session.access_token};
  async function verify(){
   status.textContent='Checking signed TEST purchase ledger…';
   try{
    const {data,error}=await sb.rpc('gu_my_book_test_v1');
    if(error||data?.ok!==true)throw Error('TEST ledger unavailable.');
    owned=Array.isArray(data.books)&&data.books.some(b=>b.code==='FOUNDATION_BOOK_1'&&b.testOnly===true);
    open.disabled=!ready||!owned;
    buy.disabled=!ready||owned;
    status.textContent=owned?'Verified TEST purchase: EPUB download available.':'No paid TEST EPUB for this account. A completed Checkout must be confirmed by the signed webhook.';
    if(new URLSearchParams(location.search).get('test_epub')==='complete'&&!owned)
     status.textContent='Stripe TEST Checkout returned. Signed payment confirmation is still pending; use Refresh TEST purchase.';
   }catch(e){open.disabled=true;buy.disabled=true;status.textContent='TEST ledger unavailable: '+(e.message||'verification failed');}
  }
  actions.append(buy,check,open);box.append(h,info,status,actions);
  root.parentNode.insertBefore(box,root.nextSibling);
  const r=await fetch('/api/book-stripe-test-checkout-v1',{cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  ready=r.ok&&d.testing===true&&d.ready===true;
  await verify();
  if(!ready){buy.disabled=true;open.disabled=true;status.textContent='Book Stripe TEST is not enabled in Cloudflare. No payment can be initiated.';return;}
  check.onclick=()=>verify();
  buy.onclick=async()=>{
   buy.disabled=true;status.textContent='Preparing account-bound Stripe TEST checkout…';
   try{
    const jwt=await authenticated();
    const result=await fetch('/api/book-stripe-test-checkout-v1',{
     method:'POST',headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},
     body:JSON.stringify({code:'FOUNDATION_BOOK_1',format:'epub'})});
    const data=await result.json().catch(()=>({}));
    if(!result.ok||!data.ok||!data.testing)throw Error(data.error||'TEST checkout unavailable.');
    const url=new URL(data.url);
    if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Unsafe checkout destination.');
    location.assign(url.href);
   }catch(e){status.textContent='TEST checkout unavailable: '+e.message;buy.disabled=false;}
  };
  open.onclick=async()=>{
   open.disabled=true;status.textContent='Verifying paid TEST access and preparing private EPUB…';
   try{
    const jwt=await authenticated();
    const r=await fetch('/api/book-stripe-test-download-v1',{
     method:'POST',headers:{authorization:'Bearer '+jwt,'content-type':'application/json'},
     body:JSON.stringify({code:'FOUNDATION_BOOK_1',format:'epub'})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.ok||!data.testOnly)throw Error(data.error||'TEST download denied.');
    const url=new URL(data.url);
    if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||
      !url.pathname.startsWith('/storage/v1/object/sign/gu-digital-ebooks/FOUNDATION_BOOK_1/'))
     throw Error('Unsafe EPUB URL.');
    location.assign(url.href);
   }catch(e){status.textContent='TEST download denied: '+e.message;open.disabled=!owned;}
  };
 }catch{/* Other members must never see TEST purchase UI. */}
}
function boot(){init();initBookStripeTest()}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
