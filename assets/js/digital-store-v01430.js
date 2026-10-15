/* Digital storefront honors independent OWNER sale toggle and active KDP restrictions. */
(()=>{'use strict';if(!/^\/store(?:\.html)?$/i.test(location.pathname))return;
let done=false;
async function apply(){if(done||!document.querySelector('#store-products .product-card')||!window.getSupabaseClient)return;
 done=true;
 // Remove ambiguous old website purchase links: unverified flags are not rights.
 const container=document.getElementById('store-products');
 for(const a of container.querySelectorAll('a'))if(a.textContent.trim()==='Buy on Website')a.remove();
 try{const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc('gu_digital_public_catalog_v01430');
  if(error||!Array.isArray(data))return;
  for(const item of data){if(!/^[A-Z0-9_]{3,90}$/.test(item.code||''))continue;
   const card=[...container.querySelectorAll('.product-card')].find(c=>c.dataset.code===item.code);if(!card)continue;
   const target=card.querySelector('.library-actions');if(!target)continue;
   const a=document.createElement('a');a.href='/checkout.html?type=book&code='+encodeURIComponent(item.code);
   a.textContent='Buy eBook Direct — Download';a.className='btn';a.dataset.digitalBuyV01430='1';
   target.append(a);
  }
 }catch{ /* on network failure do not advertise direct digital purchases */ }
}
let tries=0;const poll=setInterval(()=>{void apply();if(done||++tries>100)clearInterval(poll)},200);
})();
