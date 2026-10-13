(()=>{'use strict';
const BUILD='v0.13.3',path=(location.pathname||'/').toLowerCase();
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function sb(){for(let i=0;i<50;i++){if(typeof window.getSupabaseClient==='function'){try{return await window.getSupabaseClient()}catch{}}await sleep(80)}return null}
async function session(){try{return (await (await sb())?.auth.getSession())?.data?.session||null}catch{return null}}
function repairLegacyLinks(){
  qa('a[href]').forEach(a=>{
    const raw=(a.getAttribute('href')||'').trim(),low=raw.toLowerCase();
    if(low==='forum.html'||low==='/forum.html'||low==='forum')a.setAttribute('href','market-commons.html');
    if(/^account(?:\.html)?(?:\?|$)/i.test(raw)){
      const u=new URL(raw,location.href),tab=u.searchParams.get('tab');
      const map={access:'access',settings:'settings',profile:'overview'};
      a.setAttribute('href',`dashboard.html${map[tab]?`?tab=${map[tab]}`:''}`);
      if(/profile/i.test(a.textContent||''))a.textContent='Dashboard';
    }
    if(/^(?:profile|my-library)(?:\.html)?(?:\?|$)/i.test(raw)){
      const isBooks=/my-library/i.test(raw);a.setAttribute('href',`dashboard.html?tab=${isBooks?'books':'overview'}`);
      if(!isBooks&&/profile/i.test(a.textContent||''))a.textContent='Dashboard';
    }
  });
}
async function stableFooter(){
  const footer=q('footer.footer,footer');if(!footer)return;
  const ses=await session(),signed=!!ses;
  footer.dataset.v133='1';
  footer.innerHTML=`<div class="wrap v133-footer-grid">
    <div><strong>The Stock Market: From the Ground Up</strong><p>Books, guided learning, research, historical practice, simulation, journaling, and market-skill development.</p></div>
    <div><strong>Learn</strong><a href="learn.html">Learning System</a><a href="${signed?'labs.html':'lab-samples.html'}">${signed?'Lab Registry':'Sample Labs'}</a><a href="market-tutor.html">Market Tutor</a></div>
    <div><strong>Practice</strong><a href="simulator.html">Simulator</a><a href="journal.html">Trading Journal</a><a href="tools.html">All Tools</a><a href="market-commons.html">Market Commons</a></div>
    <div><strong>Account</strong>${signed?'<a href="dashboard.html">Dashboard</a><a href="dashboard.html?tab=access">Membership & Access</a><a href="dashboard.html?tab=books">My Books</a><a href="dashboard.html?tab=settings">Settings</a><a href="dashboard.html?tab=billing">Purchases & Billing</a>':'<a href="signin.html">Sign In</a><a href="create-account.html">Create Account</a><a href="membership.html">Membership</a>'}</div>
    <div><strong>Company</strong><a href="store.html">Store</a><a href="advertise.html">Advertise</a><a href="about.html">About</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="help.html">Help</a></div>
  </div><div class="wrap v133-footer-bottom"><span>© ${new Date().getFullYear()} J. S. Grant. Published under the Crown & Lantern Press imprint.</span></div>`;
}
async function homeBooks(){
  if(!(path==='/'||/\/index\.html$/.test(path)))return;
  for(let i=0;i<35&&!q('#v132-home');i++)await sleep(80);
  const root=q('#v132-home');if(!root||q('#v133-books'))return;
  try{
    const client=await sb();if(!client)return;
    const {data,error}=await client.from('catalog_products').select('product_code,short_title,title,cover_image_url,publication_status,sort_order,active,store_visible').eq('product_type','book').eq('active',true).order('sort_order');
    if(error)throw error;
    const books=(data||[]).filter(x=>x.store_visible!==false&&x.cover_image_url);
    if(!books.length)return;
    const sec=document.createElement('section');sec.id='v133-books';sec.className='wrap v133-book-shelf';
    sec.innerHTML=`<div class="eyebrow">The Books</div><h2>Learn the concepts. Then practice them.</h2><p>The books provide the structured curriculum; the platform extends that curriculum into historical Labs, simulation, research, review, and community discussion.</p><div class="v133-book-grid">${books.map(b=>`<a class="v133-book-card" href="product.html?code=${encodeURIComponent(b.product_code)}"><img src="${esc(b.cover_image_url)}" alt="Cover of ${esc(b.short_title||b.title)}" loading="lazy"><strong>${esc(b.short_title||b.title)}</strong><small>${esc(String(b.publication_status||'coming_soon').replaceAll('_',' '))}</small></a>`).join('')}</div>`;
    const band=q('.v132-home-band',root);if(band)band.insertAdjacentElement('afterend',sec);else root.appendChild(sec);
  }catch(e){console.warn('[v0.13.3] book shelf skipped',e)}
}
function adminBuild(){
  if(!/\/admin(?:\.html)?$/.test(path))return;
  const add=()=>{const host=q('.admin-sidebar')||q('.admin-shell');if(!host||q('#v133-build'))return false;const b=document.createElement('div');b.id='v133-build';b.className='v133-build-badge';b.textContent=`PRODUCTION · ${BUILD}`;host.prepend(b);return true};
  if(!add()){const mo=new MutationObserver(()=>{if(add())mo.disconnect()});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),8000)}
}
async function adminGuideEditor(){
  if(!/\/admin(?:\.html)?$/.test(path))return;
  const ses=await session();if(!ses)return;
  let dialog=q('#v133-guide-editor');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='v133-guide-editor';dialog.className='v133-guide-editor';dialog.innerHTML=`<form method="dialog"><div class="admin-heading"><div><div class="eyebrow">Market Commons</div><h2>Edit Official Guide</h2></div></div><label>Sub-forum<select data-f></select></label><label>Title<input data-title maxlength="180" required></label><label>Guide body<textarea data-body required></textarea></label><div class="v132-grid two"><label><input data-pin type="checkbox"> Pinned</label><label><input data-lock type="checkbox"> Locked</label></div><div class="actions"><button value="cancel" class="btn secondary">Cancel</button><button type="button" class="btn" data-save>Save Guide</button></div><div class="status-message" data-msg></div></form>`;document.body.appendChild(dialog)}
  const open=async(card=null)=>{
    const forums=qa('[data-forum]').map(c=>({code:c.dataset.forum,name:q('h3',c)?.textContent||c.dataset.forum}));
    q('[data-f]',dialog).innerHTML=forums.map(x=>`<option value="${esc(x.code)}">${esc(x.name)}</option>`).join('');
    dialog.dataset.id=card?.dataset.topic||'';
    q('[data-title]',dialog).value=card?.querySelector('strong')?.textContent?.replace(/^OFFICIAL\s*/,'')||'';
    q('[data-body]',dialog).value='';
    q('[data-pin]',dialog).checked=true;q('[data-lock]',dialog).checked=false;
    if(card){
      try{
        const client=await sb();const {data}=await client.from('commons_topics').select('forum_code,title,body,is_pinned,is_locked').eq('id',Number(card.dataset.topic)).single();
        if(data){q('[data-f]',dialog).value=data.forum_code;q('[data-title]',dialog).value=data.title;q('[data-body]',dialog).value=data.body;q('[data-pin]',dialog).checked=!!data.is_pinned;q('[data-lock]',dialog).checked=!!data.is_locked}
      }catch{}
    }
    dialog.showModal();
  };
  q('[data-save]',dialog).onclick=async()=>{
    const msg=q('[data-msg]',dialog);msg.textContent='Saving…';
    try{
      const r=await fetch('/api/admin-v0133?action=commons_topic_save',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${ses.access_token}`},body:JSON.stringify({id:dialog.dataset.id?Number(dialog.dataset.id):null,forumCode:q('[data-f]',dialog).value,title:q('[data-title]',dialog).value,body:q('[data-body]',dialog).value,isPinned:q('[data-pin]',dialog).checked,isLocked:q('[data-lock]',dialog).checked})});
      const j=await r.json();if(!r.ok||j.ok===false)throw new Error(j.error||`HTTP ${r.status}`);dialog.close();location.reload();
    }catch(e){msg.textContent=e.message}
  };
  const enhance=()=>{
    const host=q('#v13-commons-admin');if(!host)return;
    const heading=host.closest('.admin-panel')?.querySelector('.admin-heading')||host.parentElement?.querySelector('.admin-heading');
    if(heading&&!q('#v133-new-guide')){const b=document.createElement('button');b.id='v133-new-guide';b.type='button';b.className='btn';b.textContent='New Official Guide';b.onclick=()=>open();heading.appendChild(b)}
    qa('[data-topic]',host).forEach(card=>{if(q('[data-v133-edit]',card))return;const a=q('.actions',card);if(!a)return;const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.v133Edit='1';b.textContent='Edit';b.onclick=()=>open(card);a.prepend(b)})
  };
  const mo=new MutationObserver(enhance);mo.observe(document.documentElement,{childList:true,subtree:true});enhance();
}
function acceptanceCleanup(){
  repairLegacyLinks();
  // Never display a numeric alert badge when its computed unread count is zero.
  qa('.fe-notify-count,[data-notification-count]').forEach(el=>{const n=Number((el.textContent||'').trim());if(Number.isFinite(n)&&n<=0)el.hidden=true});
}
document.addEventListener('DOMContentLoaded',async()=>{
  document.body.dataset.build=BUILD;
  acceptanceCleanup();
  await Promise.allSettled([stableFooter(),homeBooks(),adminGuideEditor()]);
  adminBuild();
  new MutationObserver(acceptanceCleanup).observe(document.documentElement,{childList:true,subtree:true});
});
})();