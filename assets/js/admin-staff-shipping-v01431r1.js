/* Optional ADMIN shipping visibility. Owner sets server-side enablement. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const E=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
async function auth(){const sb=await window.getSupabaseClient();return{sb,token:(await sb.auth.getSession()).data?.session?.access_token}}
async function refresh(root){const status=root.querySelector('[data-gu-status]'),list=root.querySelector('[data-gu-list]');list.replaceChildren();status.textContent='Checking authorized paid-order access…';
 try{const {sb}=await auth(),{data,error}=await sb.rpc('gu_staff_signed_orders_v01431r1');if(error)throw error;
 if(data?.allowed!==true){status.textContent='ADMIN shipping access is disabled. OWNER can enable it under Communications & Member Messages.';return}
 status.textContent=(data.orders||[]).length+' paid/on-hold orders available to authorized shipping staff.';
 for(const o of data.orders||[]){const card=E('article');card.className='admin-card';card.append(E('h4','@'+(o.username||'Unavailable')+' — '+o.code+' / '+o.edition),E('p','Payment: '+o.status+' · Fulfillment: '+o.fulfillment));
 const view=E('button','View Buyer Shipping Information'),detail=E('pre','');view.type='button';view.className='btn secondary';detail.className='gu-shipping-detail';detail.setAttribute('role','status');
 view.onclick=async()=>{view.disabled=true;detail.textContent='Verifying staff password confirmation and paid-order identity…';try{const {token}=await auth();let r=await fetch('/api/signed-book-owner-detail?id='+encodeURIComponent(o.id),{headers:{authorization:'Bearer '+token},cache:'no-store'}),d=await r.json();
 if(r.status===403&&d.error==='PASSWORD_RECONFIRM_REQUIRED'&&window.GroundUpAdminPasswordConfirm){await window.GroundUpAdminPasswordConfirm.ensure();r=await fetch('/api/signed-book-owner-detail?id='+encodeURIComponent(o.id),{headers:{authorization:'Bearer '+token},cache:'no-store'});d=await r.json()}
 if(!r.ok||!d.ok)throw Error(d.error||'Shipping data unavailable');const a=d.address||{};
 detail.textContent=[d.recipient,a.line1,a.line2,[a.city,a.state,a.postalCode].filter(Boolean).join(' '),a.country,d.phone].filter(Boolean).join('\n');setTimeout(()=>{detail.textContent='Shipping information hidden; retrieve again if still needed.'},60000);
 }catch(e){detail.textContent=e.message}finally{view.disabled=false}};
 card.append(view,detail);list.append(card)}
 }catch(e){status.textContent='Paid shipping queue unavailable: '+e.message}
}
function mount(){const p=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!p)return false;if(p.querySelector('[data-gu-shipping-r1]'))return true;
 const box=E('section');box.className='gu-shipping-r1';box.dataset.guShippingR1='1';box.append(E('h2','Owner / Authorized ADMIN Shipping Queue'),E('p','Buyer addresses are requested directly from Stripe only when a staff member with recent password confirmation views a verified paid order. No address is stored in browser caches or application order tables.'));
 const button=E('button','Refresh Paid Shipping Queue');button.type='button';button.className='btn secondary';const status=E('p','Ready');status.dataset.guStatus='1';status.setAttribute('role','status');const list=E('div');list.dataset.guList='1';button.onclick=()=>refresh(box);box.append(button,status,list);p.append(box);return true}
let n=0;const t=setInterval(()=>{if(mount()||++n>120)clearInterval(t)},250);
})();
