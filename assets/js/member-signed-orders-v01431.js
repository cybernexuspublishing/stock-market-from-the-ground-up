/* v31: payment-confirmed signed physical orders displayed separately from digital book licenses. */
(()=>{'use strict';if(!/^\/my-purchases(?:\.html)?$/.test(location.pathname))return;
async function init(){if(document.querySelector('[data-gu-my-signed-orders]'))return;const main=document.querySelector('main');if(!main)return;
 const section=document.createElement('section');section.dataset.guMySignedOrders='1';section.className='section gu-my-signed-orders';const heading=document.createElement('h2');heading.textContent='Signed Paperback & Hardcover Orders';const state=document.createElement('p');state.setAttribute('role','status');state.textContent='Loading paid signed-edition orders…';const list=document.createElement('div');section.append(heading,state,list);main.append(section);
 try{const client=await window.getSupabaseClient(),{data,error}=await client.rpc('gu_signed_my_orders_v01431');if(error)throw error;const rows=data?.orders||[];
  state.textContent=rows.length?'Your verified physical orders and fulfillment progress:':'No paid signed-edition orders. These are separate from downloadable eBooks.';
  for(const row of rows){const card=document.createElement('article');card.className='gu-signed-card';const h=document.createElement('h3');h.textContent=row.code+' — '+row.edition;const desc=document.createElement('p');desc.textContent='Payment '+row.status+' · '+row.fulfillment.replaceAll('_',' ');card.append(h,desc);if(row.trackingCode){const tracking=document.createElement('p');tracking.textContent='Tracking: '+row.trackingCarrier+' '+row.trackingCode;card.append(tracking)}list.append(card)}
 }catch(e){state.textContent='Signed-order history unavailable: '+(e.message||'Backend not ready')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
