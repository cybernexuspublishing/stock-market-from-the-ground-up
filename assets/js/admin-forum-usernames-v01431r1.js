/* Market Commons admin tables: resolve known member UUID cells to usernames only.
 * Unknown/off-page identities remain unchanged, never guessed or confused with order IDs.
 */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const containers=['#admin-forum-topics','#admin-forum-posts','#admin-forum-reports'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let directory=new Map(),ready=false,loading=false;
async function load(){if(loading||ready)return;loading=true;try{const sb=await window.getSupabaseClient(),{data,error}=await sb.rpc('gu_staff_console_v01431r1');if(error||!data?.ok)return;directory=new Map((data.members||[]).map(x=>[x.id?.toLowerCase(),'@'+x.username]));ready=true;apply()}catch{/* Never fabricate identity when directory is unavailable */}finally{loading=false}}
function apply(){if(!ready)return;for(const selector of containers){const root=document.querySelector(selector);if(!root)continue;
 const table=root.querySelector('table');if(!table)continue;
 const headers=[...table.querySelectorAll('thead th')].map(h=>h.textContent.toLowerCase());
 for(const row of table.querySelectorAll('tbody tr'))for(const [j,cell] of [...row.cells].entries()){
  if(cell.dataset.guResolvedUsername==='1'||cell.children.length||!/(member|author|reporter|requester|user|recipient|actor)/.test(headers[j]||''))continue;
  const id=cell.textContent.trim().toLowerCase();if(!uuid.test(id))continue;
  const name=directory.get(id);if(!name)continue;cell.textContent=name;cell.dataset.guResolvedUsername='1';
 }
}}
function mount(){const app=document.querySelector('#admin-app');if(!app||app.hidden||!document.querySelector('#admin-gate')?.hidden)return false;
 const observer=new MutationObserver(()=>apply());for(const x of containers){const root=document.querySelector(x);if(root)observer.observe(root,{childList:true,subtree:true})}
 void load();return true}
let attempts=0;const wait=setInterval(()=>{if(mount()||++attempts>100)clearInterval(wait)},250);
})();
