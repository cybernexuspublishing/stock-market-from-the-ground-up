/* v0.13.5.3: authenticated member heartbeat; no IDs in public response. */
(()=>{'use strict';let busy=false,last=0;
async function tick(){if(document.hidden||busy||Date.now()-last<70000)return;busy=true;
 try{const sb=await window.getSupabaseClient?.();if(!sb)return;const s=(await sb.auth.getSession()).data?.session;if(!s)return;
  last=Date.now();await fetch('/api/home-member-stats-v01353?action=heartbeat',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+s.access_token}});
 }catch{}finally{busy=false}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
document.addEventListener('visibilitychange',tick);setInterval(tick,90000);
})();
