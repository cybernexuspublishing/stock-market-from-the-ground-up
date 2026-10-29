/* Canonical Navigation: mobile drawer + desktop signed-in profile menu.
 * Both old modules retain their separate lexical scopes and init semantics. */
/* CANONICAL_MOBILE_NAV */
(()=>{
  'use strict';

  const BUILD='v0.13.4.1';
  const path=(location.pathname||'/').replace(/\/+$/,'')||'/';
  const MOBILE_BREAKPOINT=900;
  const PROTECTED_PATHS=new Set([
    '/dashboard','/dashboard.html',
    '/account','/account.html',
    '/access','/access.html',
    '/settings','/settings.html',
    '/data-connections','/data-connections.html',
    '/my-library','/my-library.html',
    '/my-purchases','/my-purchases.html',
    '/admin','/admin.html',
    '/owner-roadmap','/owner-roadmap.html',
    '/checkout','/checkout.html'
  ]);

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function isProtected(){
    return PROTECTED_PATHS.has(path)||document.body?.dataset?.authRequired==='true';
  }

  function nextUrl(){return `${location.pathname}${location.search}${location.hash||''}`}

  async function supabaseClient(){
    for(let i=0;i<40;i++){
      if(typeof window.getSupabaseClient==='function'){
        try{return await window.getSupabaseClient()}catch{}
      }
      await sleep(50);
    }
    return null;
  }

  async function session(){
    const sb=await supabaseClient();
    if(!sb)return null;
    try{return (await sb.auth.getSession()).data.session||null}catch{return null}
  }

  function releaseProtectedPage(){
    q('#v1341-auth-pending')?.remove();
    document.documentElement.classList.remove('v1341-auth-pending');
    document.body?.classList.remove('v1341-auth-pending');
  }

  async function enforceProtectedRoute(){
    if(!isProtected())return true;
    const ses=await session();
    if(ses){releaseProtectedPage();return true}
    const next=encodeURIComponent(nextUrl());
    location.replace(`/signin.html?next=${next}`);
    return false;
  }

  function hrefPath(anchor){
    try{return new URL(anchor.getAttribute('href')||'',location.href).pathname.replace(/\/+$/,'')||'/'}catch{return ''}
  }

  const PRIVATE_LINK_PATHS=new Set([
    '/dashboard','/dashboard.html','/account','/account.html','/access','/access.html',
    '/settings','/settings.html','/data-connections','/data-connections.html',
    '/my-library','/my-library.html','/my-purchases','/my-purchases.html','/admin','/admin.html','/owner-roadmap','/owner-roadmap.html'
  ]);

  function sanitizeSignedOutNavigation(){
    qa('header a,footer a').forEach(a=>{
      const p=hrefPath(a),label=(a.textContent||'').trim();
      if(PRIVATE_LINK_PATHS.has(p)){
        if(/membership/i.test(label)){
          a.href='/membership.html';
          a.textContent='Membership Plans';
        }else if(/account|profile|dashboard|settings|library|purchases|billing|admin/i.test(label)){
          a.remove();
        }
      }
      if(/membership\s*&\s*access/i.test(label)){
        a.href='/membership.html';
        a.textContent='Membership Plans';
      }
    });
  }

  function mobileBaseItems(){
    return [
      ['Home','/'],
      ['Learning System','/learn.html'],
      ['Boot Camp Academy','/bootcamp-academy.html'],
      ['Sample Labs','/lab-samples.html'],
      ['Market Commons','/market-commons.html'],
      ['Store','/store.html'],
      ['Membership Plans','/membership.html'],
      ['Help & Documentation','/help.html']
    ];
  }

  function signedInItems(access){
    const items=[
      ['Dashboard','/dashboard.html'],
      ['Membership & Access','/dashboard.html?tab=access'],
      ['Skill Development','/dashboard.html?tab=skills'],
      ['My Books','/dashboard.html?tab=books'],
      ['Settings','/dashboard.html?tab=settings'],
      ['Support','/dashboard.html?tab=support'],
      ['Purchases & Billing','/dashboard.html?tab=billing'],
      ['Activity','/dashboard.html?tab=activity'],
      ['Historical Labs','/labs.html'],
      ['Boot Camp Academy','/bootcamp-academy.html'],
      ['Replay Training','/ondemand-training.html'],
      ['Skill Assessments','/assessments.html'],
      ['Books & Previews','/book-preview.html'],
      ['Simulator','/simulator.html'],
      ['Trading Journal','/journal.html'],
      ['Market Tutor','/market-tutor.html'],
      ['All Tools','/tools.html'],
      ['Market Commons','/market-commons.html'],
      ['Store','/store.html'],
      ['Help & Documentation','/help.html']
    ];
    if(access?.controlPanel)items.push(['Admin Control Center','/admin.html']);
    if((access?.staffRoles||[]).includes('OWNER'))items.push(['Website Development Roadmap','/owner-roadmap.html']);
    return items;
  }

  async function getAccess(){
    try{
      if(window.PlatformAccess?.get)return await window.PlatformAccess.get();
    }catch{}
    const ses=await session();
    return {authenticated:!!ses,controlPanel:false,username:ses?.user?.user_metadata?.username||''};
  }

  function ensureDrawer(){
    let drawer=q('#v1341-mobile-drawer');
    if(drawer)return drawer;

    drawer=document.createElement('div');
    drawer.id='v1341-mobile-drawer';
    drawer.className='v1341-mobile-drawer';
    drawer.hidden=true;
    drawer.innerHTML=`
      <div class="v1341-mobile-backdrop" data-mobile-close></div>
      <section class="v1341-mobile-panel" role="dialog" aria-modal="true" aria-labelledby="v1341-mobile-title" tabindex="-1">
        <header class="v1341-mobile-head">
          <div><span>Navigation</span><h2 id="v1341-mobile-title">The Stock Market: From the Ground Up</h2></div>
          <button type="button" class="v1341-mobile-close" data-mobile-close aria-label="Close navigation">×</button>
        </header>
        <div class="v1341-mobile-search-wrap">
          <label for="v1341-mobile-search">Find a destination</label>
          <input id="v1341-mobile-search" type="search" autocomplete="off" placeholder="Search menu…">
        </div>
        <nav class="v1341-mobile-links" aria-label="Mobile site navigation"></nav>
        <p class="v1341-mobile-empty" role="status" hidden>No matching destinations. Try another search.</p>
        <div class="v1341-mobile-auth"></div>
      </section>`;
    document.body.appendChild(drawer);

    const panel=q('.v1341-mobile-panel',drawer);
    const search=q('#v1341-mobile-search',drawer);
    const close=()=>{
      drawer.hidden=true;
      document.body.classList.remove('v1341-mobile-open');
      q('#v1341-mobile-menu')?.setAttribute('aria-expanded','false');
      q('#v1341-mobile-menu')?.setAttribute('aria-label','Open site navigation');
      q('#v1341-mobile-menu')?.focus({preventScroll:true});
    };
    qa('[data-mobile-close]',drawer).forEach(x=>x.addEventListener('click',close));
    drawer.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return}
      if(e.key!=='Tab')return;
      const focusable=qa('a[href],button:not([disabled]),input:not([disabled])',panel).filter(x=>!x.hidden&&x.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===panel){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===panel){e.preventDefault();first.focus()}
      else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    });
    search.addEventListener('input',()=>{
      const term=search.value.trim().toLowerCase();
      let matches=0;
      qa('[data-mobile-item]',drawer).forEach(a=>{a.hidden=!!term&&!a.textContent.toLowerCase().includes(term);if(!a.hidden)matches++});
      const empty=q('.v1341-mobile-empty',drawer);
      if(empty)empty.hidden=matches!==0;
    });
    drawer._close=close;
    return drawer;
  }

  async function populateDrawer(drawer){
    const access=await getAccess();
    const signed=!!access?.authenticated;
    const items=signed?signedInItems(access):mobileBaseItems();
    const links=q('.v1341-mobile-links',drawer);
    const auth=q('.v1341-mobile-auth',drawer);
    links.innerHTML=items.map(([label,href])=>`<a data-mobile-item href="${esc(href)}"><span>${esc(label)}</span><span aria-hidden="true">›</span></a>`).join('');
    if(signed){
      const username=access?.username?`@${esc(access.username)}`:'Signed in';
      auth.innerHTML=`<div class="v1341-mobile-user"><strong>${username}</strong><span>${esc(access?.planName||'Member account')}</span></div><a href="/dashboard.html?tab=sparks" class="v1341-mobile-sparks">Crownlight Sparks: <strong data-sparks-balance>—</strong> · View wallet</a><a href="/store-sparks.html">Buy more Sparks</a><button type="button" class="v1341-mobile-signout">Sign Out</button>`;
      void window.GroundUpRefreshSparkWallet?.(access);
      q('.v1341-mobile-signout',auth)?.addEventListener('click',async()=>{
        const sb=await supabaseClient();
        await sb?.auth.signOut({scope:'local'});
        window.SiteSession?.clearSessionClock?.();
        location.href='/signin.html';
      });
    }else{
      auth.innerHTML='<a class="v1341-mobile-primary" href="/signin.html">Sign In</a><a class="v1341-mobile-secondary" href="/create-account.html">Create Account</a>';
    }
  }

  function installMobileMenu(){
    // Remove the older button because it was inserted inside .navlinks, whose parent is hidden on phones.
    qa('.fe-mobile-menu-button').forEach(x=>{if(x.id!=='v1341-mobile-menu')x.remove()});
    const header=q('.site-header')||q('header');
    const nav=q('.site-header .nav',header)||q('.nav',header)||header;
    if(!nav||q('#v1341-mobile-menu'))return;

    const btn=document.createElement('button');
    btn.id='v1341-mobile-menu';
    btn.className='fe-mobile-menu-button v1341-mobile-menu-button';
    btn.type='button';
    btn.setAttribute('aria-controls','v1341-mobile-drawer');
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-label','Open site navigation');
    btn.innerHTML='<span aria-hidden="true" class="v1341-menu-icon">☰</span><span>Menu</span>';
    nav.appendChild(btn);

    const drawer=ensureDrawer();
    let opening=false;
    btn.addEventListener('click',async()=>{
      if(opening||!drawer.hidden)return;
      opening=true;btn.disabled=true;
      try{await populateDrawer(drawer)}catch(error){
        console.error('Unable to load mobile navigation',error);
        opening=false;btn.disabled=false;return;
      }
      opening=false;btn.disabled=false;
      q('#v1341-mobile-search',drawer).value='';
      qa('[data-mobile-item]',drawer).forEach(x=>x.hidden=false);
      const empty=q('.v1341-mobile-empty',drawer);if(empty)empty.hidden=true;
      drawer.hidden=false;
      document.body.classList.add('v1341-mobile-open');
      btn.setAttribute('aria-expanded','true');
      btn.setAttribute('aria-label','Site navigation open');
      requestAnimationFrame(()=>q('.v1341-mobile-panel',drawer)?.focus());
    });
  }

  async function installSignedOutSanitizer(){
    const ses=await session();
    if(ses)return;
    sanitizeSignedOutNavigation();
    const header=q('header'),footer=q('footer');
    const observer=new MutationObserver(()=>sanitizeSignedOutNavigation());
    if(header)observer.observe(header,{childList:true,subtree:true});
    if(footer)observer.observe(footer,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),30000);
  }

  function responsiveSafety(){
    const viewport=()=>{
      document.documentElement.dataset.v1341Mobile=innerWidth<=MOBILE_BREAKPOINT?'1':'0';
      if(innerWidth>MOBILE_BREAKPOINT){
        const d=q('#v1341-mobile-drawer');
        if(d&&!d.hidden)d._close?.();
      }
    };
    viewport();
    addEventListener('resize',viewport,{passive:true});
  }

  async function init(){
    document.body?.setAttribute('data-mobile-auth-build',BUILD);
    if(!(await enforceProtectedRoute()))return;
    installMobileMenu();
    responsiveSafety();
    await installSignedOutSanitizer();

    const sb=await supabaseClient();
    sb?.auth?.onAuthStateChange?.((event,authSession)=>{
      if(event==='SIGNED_OUT'&&isProtected()){
        location.replace(`/signin.html?next=${encodeURIComponent(nextUrl())}`);
        return;
      }
      // Rebuild the mobile drawer from current session state on the next open.
      if(event==='SIGNED_OUT')sanitizeSignedOutNavigation();
    });
  }

  // The script is loaded with defer by middleware, so DOM is normally ready here.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* CANONICAL_DESKTOP_NAV */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const path=(location.pathname||'/').toLowerCase();
  const SIGNED_OUT={authenticated:false,planCode:'FREE',planName:'Free',tools:[],books:[],staffRoles:[],adFree:false,controlPanel:false};
  let accessCache=null,authSubscription=null,navGuard=null,navItemsCache=null,forumPostsCache=null,labControlsCache=null,siteSettingsCache=null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function sbReady(){
    for(let i=0;i<50;i++){
      if(typeof window.getSupabaseClient==='function'){
        try{return await window.getSupabaseClient()}catch{}
      }
      await sleep(100);
    }
    return null;
  }

  async function adminContext(token){
    if(!token)return null;
    try{
      const r=await fetch('/api/admin?action=context',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
      if(!r.ok)return null;
      const j=await r.json();
      return j?.ok?j:null;
    }catch{return null}
  }

  async function access(force=false){
    if(accessCache&&!force)return accessCache;
    const sb=await sbReady();
    if(!sb)return {...SIGNED_OUT};

    let session=null;
    try{session=(await sb.auth.getSession())?.data?.session||null}catch{}
    if(!session){accessCache={...SIGNED_OUT};return accessCache}

    // Never turn a valid signed-in session into a fake signed-out state just because
    // an access RPC or admin table is temporarily unavailable.
    const fallback={
      authenticated:true,userId:session.user?.id||null,email:session.user?.email||'',
      planCode:'FREE',planName:'Free',tools:[],books:[],staffRoles:[],adFree:false,controlPanel:false,
      accessDegraded:false
    };

    try{
      const {data,error}=await sb.rpc('my_platform_access');
      if(error)throw error;
      accessCache={...fallback,...(data||{}),authenticated:true};
    }catch(e){
      accessCache={...fallback,accessDegraded:true,accessError:String(e?.message||e||'')};
    }

    // Resolve username separately so navigation remains correct even if platform-access
    // metadata is temporarily degraded.
    try{
      const {data:p}=await sb.from('profiles').select('username,display_name').eq('id',session.user.id).maybeSingle();
      accessCache.username=p?.username||p?.display_name||session.user?.user_metadata?.username||'';
    }catch{accessCache.username=session.user?.user_metadata?.username||''}

    // If platform access could not resolve staff state, ask the server-side admin API.
    if(accessCache.accessDegraded||!(accessCache.staffRoles||[]).length){
      const ctx=await adminContext(session.access_token);
      if(ctx){
        accessCache.staffRoles=ctx.roles||accessCache.staffRoles||[];
        accessCache.controlPanel=(ctx.permissions||[]).includes('control_panel.access');
      }
    }
    return accessCache;
  }
  window.PlatformAccess={get:()=>access(false),refresh:()=>{accessCache=null;return access(true)}};

  async function publicRows(table,select='*',order='sort_order'){
    const sb=await sbReady();if(!sb)return [];
    try{let q=sb.from(table).select(select);if(order)q=q.order(order,{ascending:true});const {data,error}=await q;if(error)throw error;return data||[]}catch{return []}
  }
  async function navItems(force=false){if(navItemsCache&&!force)return navItemsCache;navItemsCache=await publicRows('site_navigation_items','*','sort_order');return navItemsCache}
  async function forumPosts(force=false){if(forumPostsCache&&!force)return forumPostsCache;forumPostsCache=await publicRows('forum_official_posts','*','sort_order');return forumPostsCache}
  async function labControls(force=false){if(labControlsCache&&!force)return labControlsCache;labControlsCache=await publicRows('platform_labs','*','sort_order');return labControlsCache}
  async function publicSettings(force=false){if(siteSettingsCache&&!force)return siteSettingsCache;const rows=await publicRows('site_settings','setting_key,value,public_read','setting_key');siteSettingsCache=Object.fromEntries(rows.filter(x=>x.public_read!==false).map(x=>[x.setting_key,x.value]));return siteSettingsCache}

  function styles(){
    if(document.querySelector('link[href*="platform.css"]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/css/platform.css';document.head.appendChild(l);
  }

  function removeLegacy(){
    document.querySelectorAll('div,section,aside,p').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(t.startsWith('Digital-sales control:')&&t.length<700)el.remove();
    });
    document.querySelectorAll('a[href*="corrections.html"],a[href*="verification.html"]').forEach(a=>a.remove());
  }

  function removeLearningIdentityCopy(){
    const exact=/^your username is also your permanent display name and forum identity\.?$/i;
    document.querySelectorAll('p,small,div').forEach(el=>{
      if(el.children.length===0&&exact.test((el.textContent||'').trim()))el.remove();
    });
    document.querySelectorAll('h1,h2,h3,h4,.eyebrow').forEach(el=>{
      if(/^learning identity$/i.test((el.textContent||'').trim()))el.remove();
    });
  }

  function passwordToggles(root=document){
    root.querySelectorAll('input[type="password"],input[data-v11-password="1"]').forEach(i=>{
      if(i.dataset.v11Pw)return;
      i.dataset.v11Pw='1';i.dataset.v11Password='1';
      const b=document.createElement('button');b.type='button';b.className='password-visibility-toggle';b.textContent='Show password';b.setAttribute('aria-pressed','false');
      b.onclick=()=>{const show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'Hide password':'Show password';b.setAttribute('aria-pressed',String(show));i.focus({preventScroll:true})};
      i.insertAdjacentElement('afterend',b);
    });
  }

  function signInEnhancements(){
    if(!(path.endsWith('/signin.html')||path.endsWith('/signin')))return;
    const form=document.querySelector('form');if(!form)return;
    const candidates=[...form.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="submit"])')];
    const identifier=candidates.find(i=>i.type==='email'||/user|email|login|identifier/i.test(`${i.id} ${i.name} ${i.placeholder}`))||candidates[0];
    if(identifier){
      if(identifier.id){const label=document.querySelector(`label[for="${CSS.escape(identifier.id)}"]`);if(label)label.textContent='Username/Email Address'}
      identifier.placeholder='Username/Email Address';identifier.autocomplete='username';
      const remembered=localStorage.getItem('v11.remember.identifier')||'';
      if(remembered&&!identifier.value)identifier.value=remembered;
    }
    const password=form.querySelector('input[type="password"],input[data-v11-password="1"]');if(password)password.autocomplete='current-password';
    if(!document.getElementById('v11-remember-me')){
      const row=document.createElement('label');row.className='v11-remember-row';row.title='Remembers your Username/Email Address. Passwords are never stored by this site.';row.innerHTML='<input type="checkbox" id="v11-remember-me"> <span>Remember me</span>';
      const submit=form.querySelector('button[type="submit"],input[type="submit"]');
      if(submit){const actions=submit.closest('.gu-auth-primary-actions');(actions||submit).insertAdjacentElement('beforebegin',row)}else form.appendChild(row);
      const cb=row.querySelector('input');cb.checked=localStorage.getItem('v11.remember.enabled')==='1';
    }
    if(!form.dataset.v11RememberBound){
      form.dataset.v11RememberBound='1';
      form.addEventListener('submit',()=>{
        const cb=document.getElementById('v11-remember-me');
        if(cb?.checked&&identifier?.value.trim()){
          localStorage.setItem('v11.remember.enabled','1');
          localStorage.setItem('v11.remember.identifier',identifier.value.trim());
        }else{
          localStorage.removeItem('v11.remember.enabled');
          localStorage.removeItem('v11.remember.identifier');
        }
      },true);
    }
  }

  function requiredStars(root=document){
    root.querySelectorAll('input[required],select[required],textarea[required]').forEach(el=>{
      if(!el.id)return;const lab=document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if(lab&&!lab.querySelector('.required-star'))lab.insertAdjacentHTML('beforeend',' <span class="required-star" aria-hidden="true">*</span>');
    });
  }

  function labTextareas(){
    const isLab=path.endsWith('/lab-player.html')||path.endsWith('/lab-player')||document.getElementById('player-workspace')||document.getElementById('player-lab-id');
    if(!isLab)return;
    document.querySelectorAll('main textarea').forEach(b=>{
      b.classList.add('v11-lab-textarea');
      b.rows=Math.max(8,Number(b.rows||0));
    });
  }

  function countdown(date){
    if(!date)return 'No expiration';const d=new Date(date),ms=d-Date.now();if(!Number.isFinite(ms))return '';if(ms<=0)return 'Expired';
    const days=Math.floor(ms/86400000),hrs=Math.floor(ms%86400000/3600000),mins=Math.floor(ms%3600000/60000);
    return days>0?`${days}d ${hrs}h`:`${hrs}h ${mins}m`;
  }
  function staffPublic(roles){return (roles||[]).filter(r=>['OWNER','ADMIN','MODERATOR','COMMUNITY_MANAGER','SUPPORT'].includes(r))}
  function staffLabel(role){return role==='OWNER'?'OWNER / SUPER ADMIN':role}
  function shortPlan(a){
    if((a.staffRoles||[]).includes('OWNER')||a.planCode==='LIFETIME')return 'Lifetime Membership';
    if(a.planCode==='FULL_ANNUAL')return 'Annual Membership';
    if(a.planCode==='FULL_MONTHLY')return 'Monthly Membership';
    if(a.planCode==='PICK_WHAT_YOU_WANT'||a.planCode==='A_LA_CARTE'||(a.planCode==='FREE'&&(a.toolPasses||[]).length))return 'Pick What You Want Membership';
    if(a.planCode==='BOOK_TRIAL')return 'Trial Membership';
    return 'Free Membership';
  }
  function hasTool(a,code){return !!(a.tools||[]).find(t=>t.toolCode===code&&t.included)}
  function safeNavHref(raw){
    const value=String(raw??'').trim();
    if(!value||/^(?:javascript|data|vbscript):/i.test(value)||value.startsWith('//')||/[\x00-\x1f\x7f\\]/.test(value))return '#';
    try{const url=new URL(value,location.origin);if(url.origin!==location.origin||!['http:','https:'].includes(url.protocol))return '#';return url.pathname+url.search+url.hash}
    catch{return '#'}
  }
  function navLink(label,href){return `<a href="${esc(safeNavHref(href))}">${esc(label)}</a>`}

  // One navigation data source: the same filtered groups used in the top bar.
  // Keep the existing member/Admin sidebars and all of their original handlers.
  function workspaceNavigation(a){
    const kind=document.body.dataset.guMemberNavigation||document.body.dataset.guWorkspace;
    // The public website must never acquire a member navigation panel,
    // even while the visitor has an authenticated session.
    if(!a.authenticated){document.querySelector('#gu-workspace-sidebar')?.remove();document.getElementById('gu-workspace-toggle')?.remove();return;}
    if(!['member','admin','learning'].includes(kind))return;
    const header=document.querySelector('.site-header');
    if(header&&!header.dataset.guWorkspaceMeasured){
      header.dataset.guWorkspaceMeasured='1';
      const measure=()=>document.body.style.setProperty('--gu-workspace-header',header.getBoundingClientRect().height+'px');
      measure();if(window.ResizeObserver)new ResizeObserver(measure).observe(header);
    }
    let sidebar=document.querySelector(kind==='member'?'.gu-member-side-menu':kind==='admin'?'.admin-sidebar':'#gu-workspace-sidebar');
    if(kind==='learning'){
      if(!sidebar){sidebar=document.createElement('aside');sidebar.id='gu-workspace-sidebar';sidebar.className='gu-workspace-sidebar';sidebar.setAttribute('aria-label','Member workspace navigation');document.querySelector('main')?.before(sidebar);}
      const entry=(label,href)=>`<a href="${esc(safeNavHref(href))}">${esc(label)}</a>`;
      sidebar.innerHTML=`<div class="gu-workspace-identity"><span>MEMBER WORKSPACE</span><strong>Learning &amp; practice</strong></div><nav aria-label="Member sections"><div class="gu-workspace-group">${entry('Dashboard','/dashboard.html')}${entry('Labs','/labs.html')}${entry('Boot Camp Academy','/bootcamp-academy.html')}${entry('Skill Development','/dashboard.html?tab=skills')}${entry('Trading Journal','/journal.html')}${entry('My Books','/dashboard.html?tab=books')}${entry('Membership & Access','/dashboard.html?tab=access')}${entry('Settings','/dashboard.html?tab=settings')}</div></nav>`;
    }
    if(!sidebar)return;
    const canonical=value=>{const u=new URL(value,location.origin);return (u.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/').replace(/^\/index$/,'/')};
    const tab=new URLSearchParams(location.search).get('tab')||'';
    sidebar.querySelectorAll('a[href]').forEach(link=>{
      const u=new URL(link.getAttribute('href'),location.href);
      const current=u.origin===location.origin&&canonical(u.href)===canonical(location.href)&&(kind!=='member'||(u.searchParams.get('tab')||'')===tab);
      if(current)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    if(!sidebar.id)sidebar.id=kind==='member'?'gu-member-sidebar':'gu-admin-sidebar';
    if(!document.getElementById('gu-workspace-toggle')){
      const button=document.createElement('button');button.id='gu-workspace-toggle';button.type='button';button.className='gu-workspace-toggle';button.setAttribute('aria-controls',sidebar.id);
      const set=collapsed=>{document.body.classList.toggle('gu-workspace-collapsed',collapsed);document.body.classList.toggle('gu-learning-panel-open',kind==='learning'&&!collapsed);sidebar.hidden=collapsed;button.setAttribute('aria-expanded',String(!collapsed));button.textContent=collapsed?'Member menu':'Close menu';};
      const preferenceKey='gu.workspace.'+kind+'.collapsed';
      let collapsed=kind==='learning'||matchMedia('(max-width:900px)').matches;try{const saved=localStorage.getItem(preferenceKey);if(saved!==null)collapsed=saved==='true'}catch(_){}
      set(collapsed);button.addEventListener('click',()=>{const next=!document.body.classList.contains('gu-workspace-collapsed');set(next);try{localStorage.setItem(preferenceKey,String(next))}catch(_){}});
      header?.querySelector('.nav')?.prepend(button);
    }
  }

  function makeNav(a,items=[]){
    const nav=document.querySelector('.navlinks');if(!nav)return;
    const signed=!!a.authenticated;
    const allowed=i=>i&&i.active!==false&&i.public_visible!==false&&(i.auth_mode==='any'||!i.auth_mode||(signed&&i.auth_mode==='signed_in')||(!signed&&i.auth_mode==='signed_out'));
    const groups={learn:[],trade:[],research:[],top:[]};
    (items||[]).filter(allowed).forEach(i=>{if(groups[i.menu_group])groups[i.menu_group].push(i)});
    const fallback={
      learn:[{label:'Learning System',href:'learn.html',tool_code:'INTERACTIVE_LEARNING'},{label:signed?'Lab Registry':'Try Sample Labs',href:signed?'labs.html':'lab-samples.html',tool_code:signed?'INTERACTIVE_LEARNING':null},{label:'Market Tutor',href:'market-tutor.html',tool_code:'MARKET_TUTOR'},{label:'All Learning Tools',href:'tools.html#learn'}],
      trade:[{label:'Market Simulator',href:'simulator.html',tool_code:'MARKET_SIMULATOR'},{label:'Trading Journal',href:'journal.html',tool_code:'JOURNAL_ANALYTICS'},{label:'Order Flow & Tape Lab',href:'advanced-tool.html?tool=ORDER_FLOW_TAPE_LAB',tool_code:'ORDER_FLOW_TAPE_LAB'},{label:'Risk & Position Sizing',href:'advanced-tool.html?tool=RISK_POSITION_LAB',tool_code:'RISK_POSITION_LAB'},{label:'All Trade Labs',href:'tools.html#trade'}],
      research:[{label:'Market Discovery Lab',href:'advanced-tool.html?tool=DISCOVERY_LAB',tool_code:'DISCOVERY_LAB'},{label:'Scanner Builder',href:'advanced-tool.html?tool=SCANNER_BUILDER',tool_code:'SCANNER_BUILDER'},{label:'Watchlist Workbench',href:'advanced-tool.html?tool=WATCHLIST_WORKBENCH',tool_code:'WATCHLIST_WORKBENCH'},{label:'Catalyst & Filing Research',href:'advanced-tool.html?tool=CATALYST_RESEARCH',tool_code:'CATALYST_RESEARCH'},{label:'All Research Tools',href:'tools.html#research'}],
      top:[{item_code:'TOP_COMMONS',label:'Market Commons',href:'forum.html',style_variant:'community'},{item_code:'TOP_STORE',label:'Store',href:'store.html',style_variant:'store'}]
    };
    for(const k of Object.keys(groups))if(!groups[k].length)groups[k]=fallback[k];
    const render=i=>navLink(i.label,i.href);
    const learn=`<div class="v11-nav-group"><button class="v11-nav-button" type="button">Learn <span aria-hidden="true">▾</span></button><div class="v11-menu">${groups.learn.map(render).join('')}<a href="/assessments.html">Skill Assessments</a><a href="/book-preview.html">Books &amp; Previews</a></div></div>`;
    const tools=`<div class="v11-nav-group v12-tools-group"><button class="v11-nav-button" type="button">Tools <span aria-hidden="true">▾</span></button><div class="v11-menu v12-mega-menu"><section><div class="v12-menu-title">Trade Lab</div>${groups.trade.map(render).join('')}<a href="/ondemand-training.html">Replay Training</a></section><section><div class="v12-menu-title">Research</div>${groups.research.map(render).join('')}</section></div></div>`;
    let profile='';
    if(signed){
      const roles=staffPublic(a.staffRoles);const username=a.username||window.__siteUsername||document.querySelector('.account-trigger')?.textContent?.replace(/[▾@]/g,'').trim()||'Account';
      profile=`<div class="v11-nav-group v11-profile-group v13-profile-hover"><button class="v11-nav-button v12-profile-button" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="v1356-account-menu">@${esc(username)} <span aria-hidden="true">▾</span></button><div class="v11-menu v13-profile-menu" id="v1356-account-menu"><div class="v11-profile-summary"><strong>${esc(shortPlan(a))}</strong><span>${a.renewsAt?'Renews in '+countdown(a.renewsAt):a.expiresAt?'Expires in '+countdown(a.expiresAt):a.planCode==='LIFETIME'||roles.includes('OWNER')?'Never expires':''}</span>${roles.length?`<div class="v11-staff-badges">${roles.map(r=>`<span class="v11-badge staff">${esc(staffLabel(r))}</span>`).join('')}</div>`:''}</div><a href="dashboard.html">Dashboard</a><a href="dashboard.html?tab=access">Membership &amp; Access</a><a href="dashboard.html?tab=skills">Skill Development</a><a href="dashboard.html?tab=books">My Books</a><a href="dashboard.html?tab=billing">Purchases &amp; Billing</a><a href="dashboard.html?tab=settings">Settings</a><a href="/mfa-security.html">Security / MFA</a><a href="dashboard.html?tab=support">Support</a>${a.controlPanel?'<a href="admin.html">Admin Control Center</a>':''}${roles.includes('OWNER')?'<a href="/owner-roadmap.html">Website Development Roadmap</a>':''}<a href="#" id="v11-signout">Sign Out</a></div></div>`;
    }
    const sparkWallet=signed?`<details class="gu-nav-sparks" aria-label="Crownlight Sparks wallet"><summary aria-label="View your Crownlight Sparks wallet"><img src="/assets/img/crownlight-spark.svg" alt="" width="19" height="19"> <strong data-sparks-balance>—</strong> <span>Sparks</span></summary><div class="gu-nav-sparks-popup"><strong>Crownlight Sparks</strong><p>Available: <span data-sparks-popup-balance>—</span></p><p class="small">Redeem Sparks for optional practice and eligible temporary ad-free access. Prices are shown at redemption. Core teaching and regular practice retries remain included; assisted answers do not award mastery.</p><a href="/dashboard.html?tab=sparks">How to use &amp; wallet details</a><a class="btn" href="/store-sparks.html">Buy more Sparks</a></div></details>`:'';
    const top=groups.top.map(i=>`<a class="v12-top-link ${esc(i.style_variant||'')}" href="${esc(safeNavHref(i.href||'#'))}">${esc(i.label)}</a>`).join('');
    nav.className='navlinks v11-nav v12-nav';nav.dataset.v11Owned='1';
    nav.innerHTML=`${learn}${tools}${top}${signed?sparkWallet+profile:'<a class="nav-cta v12-signin" href="signin.html">Sign In</a>'}`;
    // Only one canonical profile menu and one Dashboard destination is emitted.
    // Older plugin renderers must not copy links into the profile dropdown.
    const accountMenu=nav.querySelector('#v1356-account-menu');
    if(accountMenu){const seen=new Set();for(const link of accountMenu.querySelectorAll(':scope > a[href]')){
      const href=new URL(link.getAttribute('href'),location.origin);const key=link.textContent.trim().toLowerCase()==='dashboard'?'DASHBOARD':href.pathname+href.search;
      if(seen.has(key))link.remove();else seen.add(key);
    }}
    nav.querySelectorAll('.v11-nav-group>.v11-nav-button').forEach(b=>b.onclick=e=>{
      if(b.closest('.v11-profile-group'))return; // handled by the delayed, pin-capable profile menu
      e.stopPropagation();const g=b.parentElement;
      nav.querySelectorAll('.v11-nav-group').forEach(x=>{if(x!==g)x.classList.remove('open')});
      g.classList.toggle('open');
    });
    // Profile presentation/interaction has one owner. Hover, focus, click and touch
    // all use the same node; do not rewrite this menu from another enhancer.
    nav._groundUpNavController?.abort();nav._groundUpNavController=new AbortController();
    const profileGroup=nav.querySelector('.v11-profile-group');
    const sparks=nav.querySelector('.gu-nav-sparks');
    if(sparks){
      let hoverOpen=null,hoverClose=null;
      const clearTimers=()=>{clearTimeout(hoverOpen);clearTimeout(hoverClose)};
      const closeProfile=()=>{const pg=nav.querySelector('.v11-profile-group');
        pg?.classList.remove('open');pg?.querySelector('.v12-profile-button')?.setAttribute('aria-expanded','false')};
      sparks.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;
        clearTimers();hoverOpen=setTimeout(()=>{closeProfile();sparks.open=true},420)});
      sparks.addEventListener('pointerleave',event=>{if(event.pointerType==='touch')return;
        clearTimers();hoverClose=setTimeout(()=>{if(!sparks.matches(':focus-within'))sparks.open=false},520)});
      sparks.addEventListener('toggle',()=>{if(sparks.open)closeProfile()});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'){clearTimers();sparks.open=false}},
        {signal:nav._groundUpNavController.signal});
    }
    if(profileGroup){
      const trigger=profileGroup.querySelector('.v12-profile-button');
      let pinned=false,closeTimer=null;
      const cancelClose=()=>{if(closeTimer!==null){clearTimeout(closeTimer);closeTimer=null}};
      const update=open=>{cancelClose();if(open){const spark=nav.querySelector('.gu-nav-sparks');if(spark)spark.open=false;}profileGroup.classList.toggle('open',open);trigger?.setAttribute('aria-expanded',String(open))};
      const scheduleClose=()=>{
        if(pinned)return;
        cancelClose();closeTimer=setTimeout(()=>{
          closeTimer=null;
          if(!profileGroup.matches(':hover')&&!profileGroup.contains(document.activeElement))update(false);
        },550);
      };
      profileGroup.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')update(true)});
      profileGroup.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')scheduleClose()});
      profileGroup.addEventListener('focusin',()=>update(true));
      profileGroup.addEventListener('focusout',e=>{if(!profileGroup.contains(e.relatedTarget))scheduleClose()});
      trigger?.addEventListener('click',e=>{
        e.stopPropagation();pinned=!pinned;update(pinned);
      });
      trigger?.addEventListener('keydown',e=>{
        if(e.key==='Escape'){pinned=false;update(false);trigger.focus();}
        else if(e.key==='ArrowDown'){e.preventDefault();update(true);profileGroup.querySelector('.v13-profile-menu a[href]')?.focus();}
      });
      document.addEventListener('keydown',e=>{
        if(e.key==='Escape'&&profileGroup.classList.contains('open')){pinned=false;update(false);trigger?.focus();}
      },{signal:nav._groundUpNavController?.signal});
      document.addEventListener('click',e=>{
        if(!profileGroup.contains(e.target)){pinned=false;update(false);}
      },{signal:nav._groundUpNavController?.signal});
    }
    if(document.body.dataset.guWorkspace){
      const buttons=[...nav.querySelectorAll('.v11-nav-group:not(.v11-profile-group)>.v11-nav-button')];
      buttons.forEach((button,index)=>{
        const menu=button.nextElementSibling;if(!menu)return;
        menu.id='gu-primary-menu-'+index;button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-haspopup','true');button.setAttribute('aria-expanded','false');
        button.addEventListener('click',()=>buttons.forEach(b=>b.setAttribute('aria-expanded',String(b.parentElement.classList.contains('open')))));
        button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();button.parentElement.classList.add('open');button.setAttribute('aria-expanded','true');menu.querySelector('a')?.focus();}});
      });
      nav.addEventListener('keydown',event=>{if(event.key==='Escape'){const group=event.target.closest('.v11-nav-group');if(group&&!group.classList.contains('v11-profile-group')){event.preventDefault();group.classList.remove('open');const b=group.querySelector('button');b?.setAttribute('aria-expanded','false');b?.focus();}}},{signal:nav._groundUpNavController.signal});
      document.addEventListener('click',event=>{if(!nav.contains(event.target))buttons.forEach(b=>b.setAttribute('aria-expanded','false'));},{signal:nav._groundUpNavController.signal});
    }
    const so=document.getElementById('v11-signout');if(so)so.onclick=async e=>{e.preventDefault();const sb=await sbReady();await sb?.auth.signOut();accessCache=null;location.href='index.html'};
    if(!document.documentElement.dataset.v11NavClose){document.documentElement.dataset.v11NavClose='1';document.addEventListener('click',()=>document.querySelectorAll('.v11-nav-group.open').forEach(x=>x.classList.remove('open')))}
  }

  function installNavGuard(a){
    navGuard?.disconnect?.();const nav=document.querySelector('.navlinks');if(!nav||!a.authenticated)return;
    navGuard=new MutationObserver(()=>{
      const text=(nav.textContent||'');
      if(/\bSign In\b/i.test(text)||!nav.querySelector('.v11-profile-group')){
        navGuard.disconnect();navItems().then(items=>makeNav(a,items));setTimeout(()=>installNavGuard(a),0);
      }
    });
    navGuard.observe(nav,{childList:true,subtree:true,characterData:true});
  }

  function applyAccountIdentity(a){
    if(!a.authenticated)return;
    const roles=staffPublic(a.staffRoles);
    const plan=shortPlan(a);
    // Normalize legacy membership wording on signed-in account/dashboard surfaces only.
    if(path.endsWith('/account.html')||path.endsWith('/dashboard.html')||path.endsWith('/access.html')){
      document.querySelectorAll('h1,h2,h3,strong,.membership-name,.access-name').forEach(el=>{
        const t=(el.textContent||'').trim();
        if(/^(Full Learning Access|Lifetime Platform Access|Full Platform(?: — (?:Monthly|Annual))?|Free Reader|Learning Member)$/i.test(t))el.textContent=plan;
      });
    }
    // Replace the obsolete generic account badge when it is present on legacy pages.
    document.querySelectorAll('.pill,.badge,.account-tier,[id*="tier"],[class*="tier"]').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^(Learning Member|Free Reader|Book Owner|Book Owner Companion Access)$/i.test(t)){
        el.textContent=plan;el.classList.add('v11-plan-badge');
        const host=el.parentElement;
        if(host&&roles.length&&!host.querySelector('.v11-inline-staff')){
          const wrap=document.createElement('span');wrap.className='v11-inline-staff';
          wrap.innerHTML=roles.map(r=>`<span class="v11-badge staff">${esc(staffLabel(r))}</span>`).join('');host.appendChild(wrap);
        }
      }
    });
    // Ensure staff identity is visible on account/dashboard cards even when the legacy badge cannot be found.
    if(roles.length&&(path.endsWith('/account.html')||path.endsWith('/dashboard.html'))&&!document.getElementById('v11-account-staff-line')){
      const card=document.querySelector('.profile-card,.account-card,.dashboard-profile,.card');
      if(card){const d=document.createElement('div');d.id='v11-account-staff-line';d.className='v11-account-staff-line';d.innerHTML=`<span class="v11-account-label">Staff</span>${roles.map(r=>`<span class="v11-badge staff">${esc(staffLabel(r))}</span>`).join('')}`;card.appendChild(d)}
    }
  }

  function featurePanel(a){
    const targetPaths=['/dashboard.html'];if(!targetPaths.some(x=>path.endsWith(x)))return;if(document.getElementById('v11-access-summary'))return;
    const main=document.querySelector('main .wrap, main');if(!main)return;const roles=staffPublic(a.staffRoles);const available=(a.tools||[]).filter(t=>t.status!=='planned').slice(0,12);const box=document.createElement('section');box.id='v11-access-summary';box.className='v11-access-panel';
    box.innerHTML=`<div class="v11-access-head"><div><div class="eyebrow">Your platform access</div><h2>${esc(shortPlan(a))}</h2><div class="v11-chip-row">${roles.map(r=>`<span class="v11-badge staff">${esc(staffLabel(r))}</span>`).join('')}${a.adFree?'<span class="v11-badge active">Ad-Free</span>':''}</div></div><div>${a.renewsAt?`<div class="v11-countdown">Renews in ${countdown(a.renewsAt)}</div><small>${new Date(a.renewsAt).toLocaleString()}</small>`:a.expiresAt?`<div class="v11-countdown">Expires in ${countdown(a.expiresAt)}</div><small>${new Date(a.expiresAt).toLocaleString()}</small>`:a.planCode==='LIFETIME'||roles.includes('OWNER')?'<div class="v11-countdown">Never expires</div>':''}</div></div><div class="v11-feature-grid">${available.map(t=>`<div class="v11-feature ${t.included?'available':'unavailable'}"><span class="v11-feature-mark">${t.included?'✓':'✕'}</span><div>${t.included?`<a href="${esc(t.href||'tools.html')}">${esc(t.name)}</a>`:`<strong>${esc(t.name)}</strong>`}<small>${t.included?'Included':`À-la-Carte $${((t.individualPriceCents||2999)/100).toFixed(2)}/mo`}</small></div></div>`).join('')}</div><div class="actions" style="margin-top:1rem"><a class="btn secondary" href="account.html?tab=access">View Full Access Matrix</a><a class="btn secondary" href="membership.html">Membership Options</a></div>`;
    main.insertBefore(box,main.children[1]||null);
  }


  function membershipTone(code,roles=[]){
    if(roles.includes('OWNER')||code==='LIFETIME')return 'lifetime';
    if(code==='FULL_ANNUAL')return 'annual';
    if(code==='FULL_MONTHLY')return 'monthly';
    if(code==='PICK_WHAT_YOU_WANT'||code==='A_LA_CARTE')return 'pick';
    if(code==='BOOK_TRIAL')return 'trial';
    return 'free';
  }
  function prettyDate(v){try{return v?new Date(v).toLocaleString():''}catch{return ''}}
  function planTiming(a){
    if((a.staffRoles||[]).includes('OWNER')||a.planCode==='LIFETIME')return {headline:'Never expires',detail:'Permanent access'};
    if(a.renewsAt)return {headline:`Renews in ${countdown(a.renewsAt)}`,detail:prettyDate(a.renewsAt)};
    if(a.expiresAt)return {headline:`Expires in ${countdown(a.expiresAt)}`,detail:prettyDate(a.expiresAt)};
    return {headline:'No scheduled expiration',detail:''};
  }
  function removeCreateAccountBoilerplate(){
    if(!(path.endsWith('/create-account.html')||path.endsWith('/create-account')))return;
    const rx=/your username is your permanent profile and forum identity/i;
    document.querySelectorAll('p,small,div').forEach(el=>{if(el.children.length===0&&rx.test((el.textContent||'').trim()))el.remove()});
  }
  function embeddedSettingsMode(){
    if(!(path.endsWith('/settings.html')||path.endsWith('/settings')))return false;
    const embedded=new URLSearchParams(location.search).get('embedded')==='1';
    if(!embedded){location.replace('account.html?tab=settings');return true}
    document.documentElement.classList.add('v121-embedded-settings');
    document.querySelectorAll('header,footer,.site-header,.footer').forEach(x=>x.hidden=true);
    document.querySelectorAll('input[name*="username" i],input[id*="username" i],input[name*="display" i],input[id*="display" i],input[name="first_name"],input[name="last_name"]').forEach(i=>{i.readOnly=true;i.disabled=true;i.closest('label,.field,.form-group')?.classList.add('v121-readonly-identity')});
    document.querySelectorAll('button,a').forEach(el=>{if(/change username|save.*name|display name/i.test(el.textContent||''))el.hidden=true});
    return true;
  }
  async function profileTabs(a){
    if(!a.authenticated||!(path.endsWith('/account.html')||path.endsWith('/account')))return;
    const main=document.querySelector('main .wrap,main');if(!main||document.getElementById('v121-profile-shell'))return;
    const sb=await sbReady();let user=null,p={};
    try{user=(await sb.auth.getUser())?.data?.user||null}catch{}
    try{const q=await sb.from('profiles').select('*').eq('id',user?.id).maybeSingle();p=q.data||{}}catch{}
    [...main.children].forEach(el=>{el.dataset.v121Legacy='1';el.hidden=true});
    const roles=staffPublic(a.staffRoles),tone=membershipTone(a.planCode,roles),timing=planTiming(a),username=p.username||a.username||user?.user_metadata?.username||'Member';
    const books=(a.books||[]).filter(b=>b.included),tools=(a.tools||[]).filter(t=>t.status!=='retired');
    const shell=document.createElement('section');shell.id='v121-profile-shell';shell.className='v121-profile-shell';shell.hidden=false;
    shell.innerHTML=`<section class="v121-profile-hero"><div><div class="eyebrow">Member profile</div><h1>@${esc(username)}</h1><div class="v121-email">${esc(user?.email||a.email||'')}</div><div class="v121-quick-links"><a href="dashboard.html">Dashboard</a><a href="labs.html">Labs</a><a href="journal.html">Journal</a><a href="simulator.html">Simulator</a><a href="market-tutor.html">Tutor</a><a href="my-library.html">My Library</a><a href="my-purchases.html">Purchases</a>${a.controlPanel?'<a href="admin.html">Admin</a>':''}</div></div><div class="v121-membership-badge ${tone}"><span>${esc(shortPlan(a))}</span><small>${esc(timing.headline)}</small></div></section>
      ${roles.length?`<div class="v121-role-row"><span>Staff</span>${roles.map(r=>`<span class="v11-badge staff">${esc(staffLabel(r))}</span>`).join('')}</div>`:''}
      <div class="v121-tabs" role="tablist"><button type="button" data-v121-tab="profile">Profile</button><button type="button" data-v121-tab="access">Membership & Access</button><button type="button" data-v121-tab="settings">Settings</button></div>
      <section class="v121-tab-panel" data-v121-panel="profile"><div class="v121-grid two"><article class="v121-card"><div class="eyebrow">Account</div><h2>Account summary</h2><dl class="v121-dl"><div><dt>Username</dt><dd>@${esc(username)}</dd></div><div><dt>Email</dt><dd>${esc(user?.email||a.email||'')}</dd></div><div><dt>Membership</dt><dd>${esc(shortPlan(a))}</dd></div><div><dt>Book access</dt><dd>${books.length} active branch${books.length===1?'':'es'}</dd></div></dl></article><article class="v121-card"><div class="eyebrow">Library</div><h2>Your books</h2>${books.length?`<ul class="v121-clean-list">${books.slice(0,6).map(b=>`<li>✓ ${esc(b.shortTitle||b.title)}</li>`).join('')}</ul><a class="btn secondary" href="my-library.html">Open My Library</a>`:'<p>No companion book branches are active yet.</p><a class="btn secondary" href="store.html">Browse Store</a>'}</article></div></section>
      <section class="v121-tab-panel" data-v121-panel="access"><div class="v121-access-hero"><div><div class="eyebrow">Current membership</div><div class="v121-membership-badge ${tone} large"><span>${esc(shortPlan(a))}</span><small>${esc(timing.headline)}</small></div>${timing.detail?`<div class="v121-date-detail">${esc(timing.detail)}</div>`:''}</div><div class="v121-access-stats"><div><strong>${tools.filter(t=>t.included).length}</strong><span>Tools included</span></div><div><strong>${books.length}</strong><span>Books included</span></div></div></div><div class="v121-feature-head"><div><h2>Your included features</h2><p>Available features open directly from this list.</p></div><button type="button" class="btn secondary" id="v121-feature-toggle">Show all</button></div><div class="v11-feature-grid" id="v121-feature-list">${tools.map((t,i)=>`<div class="v11-feature ${t.included?'available':'unavailable'}" data-v121-feature="${i}"><span class="v11-feature-mark">${t.included?'✓':'✕'}</span><div>${t.included?`<a href="${esc(t.href||'tools.html')}">${esc(t.name)}</a>`:`<strong>${esc(t.name)}</strong>`}<small>${t.included?'Included with your membership':'Not included'}</small></div></div>`).join('')}</div></section>
      <section class="v121-tab-panel" data-v121-panel="settings"><div class="v121-settings-wrap"><iframe title="Account settings" id="v121-settings-frame" src="settings.html?embedded=1" loading="lazy"></iframe></div></section>`;
    main.appendChild(shell);
    const qs=new URLSearchParams(location.search),initial=['profile','access','settings'].includes(qs.get('tab'))?qs.get('tab'):'profile';
    const activate=name=>{shell.querySelectorAll('[data-v121-tab]').forEach(b=>{const on=b.dataset.v121Tab===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});shell.querySelectorAll('[data-v121-panel]').forEach(p=>p.hidden=p.dataset.v121Panel!==name);history.replaceState(null,'',`account.html${name==='profile'?'':`?tab=${name}`}`)};
    shell.querySelectorAll('[data-v121-tab]').forEach(b=>b.onclick=()=>activate(b.dataset.v121Tab));activate(initial);
    const list=shell.querySelector('#v121-feature-list'),btn=shell.querySelector('#v121-feature-toggle');let all=false;const refresh=()=>{[...list.children].forEach((x,i)=>x.hidden=!all&&i>=5);btn.textContent=all?'Show top 5':'Show all';};btn.onclick=()=>{all=!all;refresh()};refresh();
  }
  function removeMembershipCompanionBlock(){
    if(!(path.endsWith('/membership.html')||path.endsWith('/membership')))return;
    document.querySelectorAll('h1,h2,h3').forEach(h=>{if(/^Book Companion Access$/i.test((h.textContent||'').trim())){const host=h.closest('section,article,.card,.product-card')||h.parentElement;host?.remove()}});
    document.querySelectorAll('p').forEach(p=>{if(/Book Companion Access remains separate from membership/i.test(p.textContent||''))p.textContent='Use the platform free, choose only the tools you want, or unlock the complete platform.'});
  }
  function authPageLayout(){
    const signin=path.endsWith('/signin.html')||path.endsWith('/signin'),signup=path.endsWith('/create-account.html')||path.endsWith('/create-account');if(!signin&&!signup)return;
    document.body.classList.add('v121-auth-page');const form=document.querySelector('main form,form');if(!form)return;const center=form.closest('.card,.panel,section')||form.parentElement;if(!center||document.getElementById('v121-auth-grid'))return;
    const grid=document.createElement('div');grid.id='v121-auth-grid';grid.className='v121-auth-grid';center.parentNode.insertBefore(grid,center);grid.innerHTML='<aside class="v121-auth-ad left" id="v121-auth-ad-left" hidden></aside><div class="v121-auth-center"></div><aside class="v121-auth-ad right" id="v121-auth-ad-right" hidden></aside><aside class="v121-auth-ad bottom" id="v121-auth-ad-bottom" hidden></aside>';grid.querySelector('.v121-auth-center').appendChild(center);
  }
  async function serveAdInto(slot,host,a){
    if(!host||a?.adFree)return;try{const sb=await sbReady();const ses=(await sb?.auth.getSession())?.data?.session;const sid=sessionStorage.getItem('v12.ad.sid')||(()=>{const x=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());sessionStorage.setItem('v12.ad.sid',x);return x})();const r=await fetch(`/api/ads?action=serve&slot=${encodeURIComponent(slot)}&page=${encodeURIComponent(location.pathname)}&sid=${encodeURIComponent(sid)}`,{headers:ses?{authorization:`Bearer ${ses.access_token}`}:{},cache:'no-store'});if(!r.ok)return;const j=await r.json();if(!j?.creative)return;const c=j.creative;host.hidden=false;host.innerHTML=`<div class="v11-ad-label">${esc(c.disclosure_label||'Advertisement')}</div><div class="v11-ad-body">${c.image_url?`<img src="${esc(c.image_url)}" alt="${esc(c.alt_text||'Sponsored advertisement')}">`:''}<a href="/api/ads?action=click&creative=${encodeURIComponent(c.id)}&sid=${encodeURIComponent(sid)}" target="_blank" rel="sponsored noopener"><strong>${esc(c.headline||'Sponsored')}</strong>${c.body?`<div>${esc(c.body)}</div>`:''}</a></div>`}catch{}
  }
  async function authPageAds(a){
    const signin=path.endsWith('/signin.html')||path.endsWith('/signin'),signup=path.endsWith('/create-account.html')||path.endsWith('/create-account');if(!signin&&!signup)return;authPageLayout();const pre=signin?'SIGNIN':'SIGNUP';await serveAdInto(`${pre}_LEFT`,document.getElementById('v121-auth-ad-left'),a);await serveAdInto(`${pre}_RIGHT`,document.getElementById('v121-auth-ad-right'),a);await serveAdInto(`${pre}_BOTTOM`,document.getElementById('v121-auth-ad-bottom'),a);
  }
  function modernFooter(a){
    const footer=document.querySelector('footer.footer,footer');if(!footer)return;
    const signed=!!a.authenticated;
    if(footer.dataset.guLegalFooter==='1'&&footer.dataset.guFooterAuthenticated===String(signed))return;
    footer.dataset.v121='1';footer.dataset.guLegalFooter='1';footer.dataset.guFooterAuthenticated=String(signed);
    footer.innerHTML=`<div class="wrap v121-footer-grid gu-legal-footer-grid">
    <div class="gu-footer-brand"><strong>The Stock Market: From the Ground Up</strong><p>Books, interactive learning, research, simulation, journaling, and market-skill development.</p></div>
    <div><strong>Learn</strong><a href="/learn.html">Learning System</a><a href="${signed?'/labs.html':'/lab-samples.html'}">${signed?'Lab Registry':'Sample Labs'}</a><a href="/market-tutor.html">Market Tutor</a><a href="/philosophy.html">Teaching Philosophy</a></div>
    <div><strong>Platform</strong><a href="/tools.html">All Tools</a><a href="/simulator.html">Simulator</a><a href="/journal.html">Journal</a><a href="/market-commons.html">Market Commons</a></div>
    <div><strong>Account</strong>${signed?'<a href="/dashboard.html">Dashboard</a><a href="/dashboard.html?tab=access">Membership & Access</a><a href="/dashboard.html?tab=books">My Books</a><a href="/dashboard.html?tab=settings">Settings</a><a href="/dashboard.html?tab=billing">Purchases & Billing</a>':'<a href="/signin.html">Sign In</a><a href="/create-account.html">Create Account</a><a href="/membership.html">Membership</a>'}</div>
    <div><strong>Company</strong><a href="/store.html">Store</a><a href="/advertise.html">Advertise</a><a href="/about.html">About</a><a href="/help.html">Help</a></div>
    <div><strong>Legal</strong><a href="/terms.html">Terms of Service</a><a href="/privacy.html">Privacy Policy</a><a href="/refund-policy.html">Refunds & Cancellation</a><a href="/subscription-terms.html">Subscription & Billing</a><a href="/cookie-policy.html">Cookie Policy</a><a href="/educational-disclaimer.html">Trading Disclaimer</a><a href="/dmca-takedown-policy.html">DMCA Takedown</a><a href="/legal.html"><b>All Policies</b></a></div>
    <div><strong>Transparency</strong><a href="/editorial-guidelines.html">Editorial Guidelines</a><a href="/affiliate-disclosure.html">Affiliate Disclosure</a><a href="/related-entities-disclosure.html">Related Entities</a><a href="/ai-use-disclosure.html">AI Use Disclosure</a><a href="/advertising-disclosure.html">Advertising Disclosure</a><a href="/community-guidelines.html">Community Guidelines</a><a href="/accessibility.html">Accessibility</a></div>
  </div><div class="wrap v121-footer-bottom gu-footer-bottom"><span>© ${new Date().getFullYear()} J. S. Grant. Published under the Crown & Lantern Press imprint.</span><span class="gu-footer-motto">Learn It. Understand It. Practice It. Trade It.</span></div>`;
  }

  function gateRegistry(a){
    if(path.endsWith('/labs.html')||path.endsWith('/labs')){
      if(!a.authenticated){location.replace('/signin.html?next='+encodeURIComponent(location.pathname+location.search+location.hash));return false}
      document.getElementById('v011-lab-registry-gate')?.remove();document.body.style.visibility='visible';
    }
    return true;
  }

  async function communityEnhancements(){
    if(!(path.endsWith('/forum.html')||path.endsWith('/forum')))return;
    const settings=await publicSettings();const name=String(settings['community.name']||'The Ground-Up Market Commons'),tagline=String(settings['community.tagline']||'A working community for market reasoning, trade review, research, and evidence-based discussion.');
    document.querySelectorAll('h1').forEach(h=>{if(/forum|community|stock.?market discussion/i.test(h.textContent||''))h.textContent=name});
    document.title=`${name} | The Stock Market: From the Ground Up`;
    document.querySelectorAll('a[href*="forum.html"]').forEach(a=>{if(/community|forum/i.test(a.textContent||''))a.textContent='Market Commons'});
    if(document.getElementById('v12-official-discussions'))return;
    const posts=await forumPosts();if(!posts.length)return;
    const main=document.querySelector('main .wrap, main');if(!main)return;
    const sec=document.createElement('section');sec.id='v12-official-discussions';sec.className='v12-commons-intro';
    sec.innerHTML=`<div class="eyebrow">Official discussion guides</div><h2>${esc(name)}</h2><p>${esc(tagline)}</p><div class="v12-official-post-grid">${posts.map(p=>`<article class="v12-official-post ${p.pinned?'pinned':''}"><div class="v12-post-meta"><span>${esc(p.category)}</span>${p.pinned?'<strong>Pinned</strong>':''}</div><h3>${esc(p.title)}</h3>${p.summary?`<p>${esc(p.summary)}</p>`:''}<details><summary>Read discussion guide</summary><p>${esc(p.body)}</p><small>${esc(p.author_label||'Site Administration')}</small></details></article>`).join('')}</div>`;
    main.insertBefore(sec,main.firstElementChild?.nextSibling||main.firstChild);
  }

  async function applyLabControls(){
    // v0.13.5.7: the member Registry fetches only its selected book. Do not
    // fetch 419 records here, hide matching text nodes or append all-site Labs.
    if(path.endsWith('/labs.html')||path.endsWith('/labs'))return;
    if(!path.endsWith('/lab-player.html')&&!path.endsWith('/lab-player'))return;
    const id=(new URLSearchParams(location.search).get('lab')||'').trim().toUpperCase();
    if(!/^[A-Z0-9._-]{2,90}$/.test(id))return;
    const s=await sbReady();if(!s)return;
    const r=await s.from('platform_labs').select('lab_id,active').eq('lab_id',id).limit(1);
    if(!r.error&&r.data?.[0]?.active===false)location.replace('labs.html');
  }

  function addSimLab(){
    const lab=(new URLSearchParams(location.search).get('lab')||document.getElementById('player-lab-id')?.textContent||'').trim();
    if(!/^F[123]-C\d\d-L\d\d$/i.test(lab)||document.getElementById('v11-sim-lab-link'))return;
    const host=document.querySelector('.interactive-lab-head')||document.querySelector('main .wrap');if(!host)return;
    const d=document.createElement('div');d.id='v11-sim-lab-link';d.className='actions';d.innerHTML=`<a class="btn secondary" href="simulator.html?lab=${encodeURIComponent(lab)}">Simulate This Lab</a>`;host.appendChild(d);
  }

  async function adSlot(a){
    if(a.adFree||['/admin.html','/simulator.html','/market-tutor.html','/journal-entry.html','/advanced-tool.html'].some(x=>path.endsWith(x)))return;
    let slot=null;if(path==='/'||path.endsWith('/index.html'))slot='HOME_INLINE';else if(path.endsWith('/store.html'))slot='STORE_INLINE';else if(path.endsWith('/forum.html'))slot='COMMUNITY_INLINE';else if(path.endsWith('/dashboard.html'))slot='FREE_DASHBOARD';else if(path.endsWith('/lab-samples.html'))slot='SAMPLE_LABS';if(!slot)return;
    const main=document.querySelector('main .wrap,main');if(!main)return;const el=document.createElement('aside');el.className='v11-ad-slot';el.hidden=true;main.appendChild(el);await serveAdInto(slot,el,a);if(el.hidden)el.remove();
  }

  function installSparkNavStyle(){
    if(document.getElementById('gu-sparks-nav-style'))return;
    const css=document.createElement('style');css.id='gu-sparks-nav-style';
    css.textContent=`.gu-nav-sparks{position:relative;align-self:center;z-index:30;font-size:.86rem}
    .gu-nav-sparks summary{display:flex;align-items:center;gap:.3rem;list-style:none;cursor:pointer;
      border:1px solid var(--border,#a78b4d);border-radius:999px;padding:.37rem .65rem;
      white-space:nowrap;font-variant-numeric:tabular-nums}
    .gu-nav-sparks summary::-webkit-details-marker{display:none}
    .gu-nav-sparks summary:focus-visible{outline:3px solid #e6bf61;outline-offset:2px}
    .gu-nav-sparks-popup{position:absolute;top:calc(100% + .45rem);right:0;min-width:265px;max-width:min(92vw,340px);
      padding:1rem;background:var(--surface,#151d25);border:1px solid var(--border,#8d7b53);
      border-radius:.8rem;box-shadow:0 15px 35px #0006;color:var(--text,#f5f5f5)}
    .gu-nav-sparks-popup a{display:block;margin-top:.7rem}
    .gu-nav-sparks-popup p{margin:.55rem 0}
    @media(max-width:1050px){.gu-nav-sparks{display:none}}`;
    document.head.appendChild(css);
  }
  let sparksRefreshInFlight=false,sparksWalletInterval=null;
  async function refreshSparkWallet(a){
    if(!a?.authenticated||sparksRefreshInFlight)return;
    sparksRefreshInFlight=true;
    try{return await updateSparkWallet(a)}
    finally{sparksRefreshInFlight=false}
  }
  async function updateSparkWallet(a){
    const targets=[...document.querySelectorAll('[data-sparks-balance],[data-sparks-popup-balance]')];
    const dashboard=document.getElementById('member-sparks-wallet');
    if(!targets.length&&!dashboard)return;
    const sb=await sbReady();if(!sb)return;
    const session=(await sb.auth.getSession())?.data?.session;
    if(!session?.access_token)return;
    try{
      const resp=await fetch('/api/member-sparks-balance',{headers:{authorization:'Bearer '+session.access_token},
        cache:'no-store',credentials:'same-origin'});
      if(!resp.ok)throw Error('Wallet unavailable');
      const v=await resp.json(),w=v?.wallet;
      if(v?.ok!==true||!Number.isSafeInteger(w?.available)||w.available<0)throw Error('Wallet unavailable');
      for(const el of targets)el.textContent=w.available.toLocaleString();
      const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=String(value)};
      put('sparks-wallet-total',w.available.toLocaleString());
      put('sparks-wallet-included',w.included.toLocaleString());
      put('sparks-wallet-purchased',w.purchased.toLocaleString());
      put('sparks-wallet-manual',w.manual.toLocaleString());
      put('sparks-wallet-expiry',w.nextExpiry?new Date(w.nextExpiry).toLocaleDateString():'Never');
      put('sparks-wallet-status','Current private balance, verified from your Sparks ledger.');
      window.dispatchEvent(new CustomEvent('crownlight:sparks-balance',{detail:{
        available:w.available,included:w.included,purchased:w.purchased,manual:w.manual
      }}));
    }catch{
      const el=document.getElementById('sparks-wallet-status');
      if(el)el.textContent='Your wallet could not be verified. No balance has been assumed.';
    }
  }
  // Exactly one wallet heartbeat per document; never poll invisible tabs,
  // overlap requests, keep an old account's number after sign-out, or
  // re-run the monthly Free Spark grant in this five-second read path.
  function stopSparksHeartbeat(){
    if(sparksWalletInterval!==null){clearInterval(sparksWalletInterval);sparksWalletInterval=null}
  }
  function ensureSparksHeartbeat(authenticated){
    if(!authenticated){
      stopSparksHeartbeat();
      document.querySelectorAll('[data-sparks-balance],[data-sparks-popup-balance]')
        .forEach(el=>el.textContent='—');
      return;
    }
    if(sparksWalletInterval!==null)return;
    sparksWalletInterval=setInterval(()=>{
      if(document.visibilityState==='hidden'||!document.querySelector('[data-sparks-balance]'))return;
      void refreshSparkWallet({authenticated:true});
    },5000);
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&document.querySelector('[data-sparks-balance]'))
      void refreshSparkWallet({authenticated:true});
  });
  window.addEventListener('pagehide',stopSparksHeartbeat);
  window.addEventListener('pageshow',()=>{if(document.querySelector('[data-sparks-balance]'))ensureSparksHeartbeat(true)});
  window.GroundUpRefreshSparkWallet=(a)=>refreshSparkWallet(a);
  async function renderSessionAware(force=false){
    const a=await access(force);if(!gateRegistry(a))return;
    const items=await navItems(force);makeNav(a,items);installSparkNavStyle();ensureSparksHeartbeat(a?.authenticated===true);void refreshSparkWallet(a);workspaceNavigation(a);installNavGuard(a);applyAccountIdentity(a);featurePanel(a);await profileTabs(a);modernFooter(a);await Promise.all([adSlot(a),authPageAds(a),communityEnhancements(),applyLabControls()]);
  }

  async function watchAuth(){
    const sb=await sbReady();if(!sb?.auth?.onAuthStateChange)return;
    try{authSubscription?.unsubscribe?.()}catch{}
    const {data}=sb.auth.onAuthStateChange(async(event)=>{
      if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED','INITIAL_SESSION'].includes(event)){
        accessCache=null;await sleep(25);await renderSessionAware(true);
      }
    });
    authSubscription=data?.subscription||null;
  }

  async function init(){
    styles();if(embeddedSettingsMode())return;removeLegacy();removeLearningIdentityCopy();removeCreateAccountBoilerplate();removeMembershipCompanionBlock();authPageLayout();document.querySelectorAll('a[href*="forum.html"]').forEach(a=>{if(/community|forum/i.test(a.textContent||''))a.textContent='Market Commons'});passwordToggles();signInEnhancements();requiredStars();labTextareas();addSimLab();
    const obs=new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1){passwordToggles(n);requiredStars(n);removeLearningIdentityCopy();labTextareas()}})));
    obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),20000);
    await renderSessionAware(false);await watchAuth();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
