/* v0.13.5 controlled layout repair. Scope strictly to Market Commons and Admin.
   Never replace existing forum, membership, role or payment components. */
(()=>{'use strict';
 const path=location.pathname.toLowerCase().replace(/\/+$/,'');
 const admin=path==='/admin'||path==='/admin.html';
 const commons=path==='/market-commons'||path==='/market-commons.html';
 if(!admin&&!commons)return;
 const one=(s,root=document)=>root.querySelector(s);
 const all=(s,root=document)=>[...root.querySelectorAll(s)];
 const title=x=>String(x||'').replace(/\s+/g,' ').trim();
 function refineAdmin(){
   document.body.classList.add('v135-admin-integrity');
   const shell=one('main.admin-shell');if(!shell)return;
   const aside=one('.admin-sidebar',shell),main=one('.admin-main',shell);
   if(!aside||!main)return;
   // Both nodes must be direct grid children, in original sidebar -> content order.
   if(aside.parentElement!==shell)shell.prepend(aside);
   if(main.parentElement!==shell)aside.after(main);
   if(shell.firstElementChild!==aside)shell.prepend(aside);
   if(aside.nextElementSibling!==main)aside.after(main);
   // Never detach the original sidebar/main, never change their content.
   const liveVersion=document.querySelector('meta[name="application-version"]')?.content||'v0.14.0.12';
   all('#v133-build',shell).forEach(el=>el.textContent='PRODUCTION · '+liveVersion);
   const badge=one('.fe-admin-topbar .fe-chip.info',shell);
   if(badge)badge.textContent=liveVersion;
 }
 function refineCommons(){
   document.body.classList.add('v135-commons-integrity');
   const main=one('main');if(!main)return;
   const wrap=one(':scope > .wrap',main)||one('.wrap',main);
   const nav=one('#v134-commons-member-nav');
   if(nav&&wrap){
     // Keep a single standalone navigation bar aligned with the main container.
     nav.classList.add('v135-commons-nav-aligned');
     if(!nav.hasAttribute('aria-label'))nav.setAttribute('aria-label','Member navigation');
   }
   // The original main already has a heading; preserve it and its contextual actions.
   const breadcrumbs=all('nav.fe-breadcrumbs',main);
   if(breadcrumbs.length>1)breadcrumbs.slice(1).forEach(x=>x.remove());
   // The legacy page header may insert a duplicate Home / Market Commons trail.
   // Keep detailed sub-forum breadcrumb trails; only remove an exact duplicate at page root.
   // Duplicate inline breadcrumb fragments from older enhancements must not appear
   // below the page introduction; do not touch detailed forum/topic breadcrumbs.
   if(breadcrumbs.length){
     all('nav, p, div, small',wrap).forEach(node=>{
       if(node===breadcrumbs[0]||node.classList.contains('fe-breadcrumbs')||
          node.closest('.v13-commons-shell')||node.closest('.v132-forum-detail'))return;
       if(node.children.length>3||[...node.children].some(x=>!['A','SPAN','SMALL'].includes(x.tagName)))return;
       const text=title(node.textContent).toLowerCase().replace(/[›]/g,'/');
       if(/^home\s*\/\s*market commons$/.test(text))node.remove();
     });
   }
   all('nav[aria-label="Breadcrumb"],nav[aria-label="Breadcrumbs"]',main).forEach(node=>{
     if(node.classList.contains('fe-breadcrumbs'))return;
     if(node.closest('.v132-forum-detail,.v132-forum-topic,.v13-commons-shell'))return;
     if(breadcrumbs.length&&title(node.textContent).toLowerCase()===title(breadcrumbs[0].textContent).toLowerCase())node.remove();
   });
 }
 function tick(){if(admin)refineAdmin();else refineCommons();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
 setTimeout(tick,300);setTimeout(tick,1200);
})();
