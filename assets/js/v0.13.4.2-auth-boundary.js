/* v0.13.4.2: client session and staff authorization boundary.
 * Page HTML remains static/public at the HTTP layer; this blocks DOM rendering until identity is confirmed.
 * All private data/API endpoints must independently enforce authorization server-side/RLS. */
(()=>{
  'use strict';
  const page=document.documentElement;
  const path=location.pathname;
  const getKind=()=>document.body?.dataset?.routeAccess || (document.body?.dataset?.authRequired==='true'?'member':'public');
  const destination=()=>location.pathname+location.search+location.hash;
  const signIn=(extra='')=>location.replace('/signin.html?next='+encodeURIComponent(destination())+extra);
  const hide=()=>{if(!document.getElementById('v1342-access-pending')){
    const el=document.createElement('style');el.id='v1342-access-pending';el.textContent='html body{visibility:hidden!important}';document.head.appendChild(el);
  }};
  const reveal=()=>{document.getElementById('v1342-access-pending')?.remove();document.getElementById('v1341-auth-pending')?.remove();page.dataset.accessResolved='true';};
  async function client(){
    if(typeof window.getSupabaseClient!=='function')return null;
    try{return await window.getSupabaseClient()}catch{return null;}
  }
  async function authorizedForStaff(token){
    try{
      const r=await fetch('/api/admin?action=context',{
        headers:{authorization:'Bearer '+token},cache:'no-store',credentials:'same-origin'
      });
      if(!r.ok)return false;
      const j=await r.json();
      const roles=Array.isArray(j.roles)?j.roles:[];
      const permissions=Array.isArray(j.permissions)?j.permissions:[];
      return roles.includes('OWNER') || roles.includes('SHOWCASE_VIEWER') || permissions.includes('control_panel.access');
    }catch{return false}
  }
  async function gate(){
    const kind=getKind();
    if(kind!=='member'&&kind!=='staff')return;
    hide();
    const sb=await client();
    if(!sb){signIn();return}
    let session=null,confirmedUser=null;
    try{
      const rs=await sb.auth.getSession();session=rs?.data?.session;
      if(session){const ru=await sb.auth.getUser();confirmedUser=ru.error?null:ru.data?.user;}
    }catch{}
    if(!session||!confirmedUser||confirmedUser.id!==session.user?.id){signIn();return}
    // An expired inactivity clock must not be refreshed merely by a new page load.
    if(window.SiteSession?.checkSessionTimeout){
      try{const valid=await window.SiteSession.checkSessionTimeout();if(valid===false){signIn('&expired=1');return}}catch{signIn();return}
    }
    if(kind==='staff'&&!await authorizedForStaff(session.access_token)){
      location.replace('/dashboard.html?error=admin_access_denied');return;
    }
    reveal();
    sb.auth.onAuthStateChange((event)=>{
      if(event==='SIGNED_OUT'){
        hide();signIn();
      }
    });
  }
  // Defer scripts execute before DOMContentLoaded and the middleware's CSS hides the body from first render.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate,{once:true});
  else gate();
})();
