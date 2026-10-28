(() => {
  'use strict';
  const BUILD='v0.13.4';
  const path=(location.pathname||'/').toLowerCase();
  if(!/\/dashboard(\.html)?$/.test(path)) return;
  // Canonical member Support and protected book-receipt forms are owned by
  // member-support-panel.js; legacy Dashboard must not replace their DOM.
  if(new URLSearchParams(location.search).get('tab')==='support')return;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeLocalHref(value, fallback='#'){const raw=String(value||'').trim();if(!raw||raw.startsWith('//')||raw.includes('\\')||/[\u0000-\u001f]/.test(raw))return fallback;try{const u=new URL(raw,location.origin);return u.origin===location.origin&&['http:','https:'].includes(u.protocol)?u.pathname+u.search+u.hash:fallback}catch{return fallback}}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=(m,t='info')=>window.SiteUI?.toast?.(m,t)||console.log(`[${t}] ${m}`);
  async function getSB(){for(let i=0;i<60;i++){if(typeof window.getSupabaseClient==='function'){try{return await window.getSupabaseClient()}catch{}}await sleep(75)}return null}
  async function getSession(){const s=await getSB();try{return (await s?.auth.getSession()).data.session||null}catch{return null}}
  async function api(url,options={}){const ses=await getSession();const r=await fetch(url,{...options,headers:{'content-type':'application/json',...(ses?{authorization:`Bearer ${ses.access_token}`}:{ }),...(options.headers||{})},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw new Error(j.error||`HTTP ${r.status}`);return j}
  async function uiApi(action,options={}){return api(`/api/ui-state?action=${encodeURIComponent(action)}`,options)}
  async function savePref(key,value){return uiApi('preference_save',{method:'POST',body:JSON.stringify({key,value})})}
  function featureGroup(tool){const x=`${tool?.category||''} ${tool?.name||''}`.toLowerCase();if(/research|discovery|scanner|watchlist|catalyst|filing|float|context|supply/.test(x))return'Research';if(/journal|simulator|risk|execution|liquidity|tape|order flow|review|strategy|options|trade/.test(x))return'Trade Labs';return'Learning'}
  function timing(a){if(a?.renewsAt)return`Renews ${new Date(a.renewsAt).toLocaleDateString()}`;if(a?.expiresAt)return`Expires ${new Date(a.expiresAt).toLocaleDateString()}`;if(a?.planCode==='LIFETIME'||(a?.staffRoles||[]).includes('OWNER'))return'Never expires';return'Current'}
  async function access(){
    // The canonical access module can initialize after this Dashboard controller.
    // Retry briefly; never render missing entitlements as a Free or empty plan.
    for(let attempt=0;attempt<3;attempt++){
      try{const result=await window.PlatformAccess?.get?.();if(result)return result}
      catch(error){console.warn('[dashboard] Membership service request failed:',error?.message||error)}
      if(attempt<2)await sleep(350);
    }
    return null;
  }
  async function competencyApi(action='summary',params={}){
    const qs=new URLSearchParams({action,...Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!==''))});
    return api(`/api/competencies?${qs}`);
  }
  function skillStatusClass(status){return String(status||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
  function skillScoreLabel(x){return x?.score===null||x?.score===undefined?'Not Yet Assessed':`${Math.round(Number(x.score))}%`}
  const SKILL_ICON_CODES=new Set(["CHART_STRUCTURE", "CANDLE_READING", "VWAP_CONTEXT", "EMA_CONTEXT", "VOLUME_ANALYSIS", "MULTI_TIMEFRAME", "BREAKOUT_RECOGNITION", "FAILED_BREAKOUT", "PULLBACK_RECOGNITION", "HOD_PM_LEVELS", "RCT_RECOGNITION", "SQUEEZE_CONTEXT", "RISK_PER_SHARE", "POSITION_SIZING", "RISK_REWARD", "ORDER_SELECTION", "SLIPPAGE_SPREAD", "CATALYST_ANALYSIS", "FLOAT_SUPPLY", "SEC_FILINGS", "CANDIDATE_QUALITY", "MARKET_REGIME", "TAPE_READING", "LEVEL2_READING", "HALTS_LULD", "ENTER_WATCH_NO_TRADE", "INVALIDATION_DISCIPLINE", "CHASE_FOMO_DISCIPLINE", "MFE_MAE_REVIEW", "INDEPENDENT_PLAN"]);
  function skillIllustration(code,name){const key=String(code||'').toUpperCase();const icon=SKILL_ICON_CODES.has(key)?key.toLowerCase().replace(/_/g,'-'):'independent-plan';return `<img class="skill-illustration" src="/assets/images/skill-illustrations/${icon}.svg?v=graphics-20261026" alt="${esc(name||key)} concept illustration (not historical market data)" loading="lazy" decoding="async" width="144" height="132">`;}


  let legacySnapshot={text:'',bars:[]};
  function captureLegacyProgress(root){
    const snap={text:String(root?.innerText||''),bars:[]};
    if(!root)return snap;
    qa('progress,[role="progressbar"],[aria-valuenow]',root).forEach(el=>{
      const raw=el.value??el.getAttribute?.('aria-valuenow')??el.getAttribute?.('data-progress');
      const n=Number(raw);
      if(!Number.isFinite(n))return;
      const max=Number(el.max??el.getAttribute?.('aria-valuemax')??100)||100;
      const value=Math.max(0,Math.min(100,Math.round(max===1?n*100:(n/max)*100)));
      const box=el.closest('article,section,.card,[class*="progress"],[class*="book"]')||el.parentElement;
      snap.bars.push({text:String(box?.innerText||''),value});
    });
    return snap;
  }
  function pct(v){
    if(v===null||v===undefined||v==='')return null;
    const raw=String(v).trim(),hadPct=raw.includes('%');
    let n=Number(raw.replace('%',''));
    if(!Number.isFinite(n))return null;
    if(!hadPct&&n>0&&n<=1)n*=100;
    if(n<0||n>100)return null;
    return Math.round(n);
  }
  function walkProgress(v,path=[],out=[]){
    if(v===null||v===undefined)return out;
    if(typeof v==='number'||typeof v==='string'){
      const n=pct(v),key=path[path.length-1]||'';
      if(n!==null&&/(book|foundation|day.?trading|tape|f[123])/i.test(key))out.push({id:key,percent:n});
      return out;
    }
    if(Array.isArray(v)){v.forEach((x,i)=>walkProgress(x,[...path,String(i)],out));return out}
    if(typeof v!=='object')return out;
    const id=v.productCode||v.product_code||v.bookCode||v.book_code||v.code||v.shortTitle||v.short_title||v.title||v.name||path[path.length-1]||'';
    const raw=v.percent??v.progressPercent??v.progress_percent??v.completionPercent??v.completion_percent??v.progress??v.completion??v.value;
    const n=pct(raw);
    if(id&&n!==null)out.push({id:String(id),percent:n});
    Object.entries(v).forEach(([k,x])=>walkProgress(x,[...path,k],out));
    return out;
  }
  function aliases(book){return [book?.productCode,book?.title,book?.shortTitle,book?.family].filter(Boolean).map(x=>String(x).toLowerCase().replace(/[^a-z0-9]+/g,''))}
  function matchProgress(book,candidates){
    const aa=aliases(book);
    const exact=candidates.find(c=>aa.includes(String(c.id||'').toLowerCase().replace(/[^a-z0-9]+/g,'')));
    if(exact)return exact.percent;
    const fuzzy=candidates.find(c=>{const id=String(c.id||'').toLowerCase().replace(/[^a-z0-9]+/g,'');return aa.some(a=>a.length>=6&&(id.includes(a)||a.includes(id)))});
    if(fuzzy)return fuzzy.percent;
    const texts=[...legacySnapshot.bars.map(x=>({id:x.text,percent:x.value}))];
    const byBar=texts.find(c=>{const id=String(c.id||'').toLowerCase().replace(/[^a-z0-9]+/g,'');return aa.some(a=>a.length>=6&&id.includes(a))});
    if(byBar)return byBar.percent;
    const txt=String(legacySnapshot.text||'').toLowerCase();
    for(const a of aa){if(a.length<6)continue;const loose=String(book?.shortTitle||book?.title||book?.productCode||'').toLowerCase();const i=txt.indexOf(loose);if(i>=0){const m=txt.slice(Math.max(0,i-120),i+loose.length+220).match(/(100|[1-9]?\d)\s*%/);if(m)return Number(m[1])}}
    return null;
  }
  async function bookProgress(books){
    const candidates=[];
    try{const j=await uiApi('preferences');(j.preferences||[]).filter(x=>/(book.*progress|progress.*book|learning.*progress|progress)/i.test(x.pref_key||'')).forEach(x=>walkProgress(x.pref_value,[x.pref_key],candidates))}catch{}
    try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/(book|learning|progress)/i.test(k))continue;const raw=localStorage.getItem(k);try{walkProgress(JSON.parse(raw),[k],candidates)}catch{walkProgress(raw,[k],candidates)}}}catch{}
    return books.map(book=>({book,percent:matchProgress(book,candidates)}));
  }
  function cleanBookAccessFrame(frame){
    const prune=()=>{try{const doc=frame.contentDocument;if(!doc)return;const blocks=Array.from(doc.querySelectorAll('section,article,fieldset,.card,[class*="card"],[class*="panel"]'));blocks.forEach(el=>{const t=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if((t.includes('profile identity')||t.includes('username / display name')||t.includes('your username is created when you register'))&&!t.includes('redeem book key')&&!t.includes('book key'))el.remove()});Array.from(doc.querySelectorAll('h1,h2,h3,h4,p,label')).forEach(el=>{const t=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();if(t==='profile identity'||t==='username / display name'||t.includes('your username is created when you register'))el.remove()})}catch{}};
    frame.addEventListener('load',()=>{prune();try{const doc=frame.contentDocument;if(doc?.body){const mo=new MutationObserver(prune);mo.observe(doc.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),8000)}}catch{}});
  }

  function enforcePanelState(hub,code){qa('[data-v1322-panel]',hub).forEach(p=>{const on=p.dataset.v1322Panel===code;p.hidden=!on;p.setAttribute('aria-hidden',String(!on));p.style.display=on?'grid':'none';});qa('[data-v1322-tab]',hub).forEach(b=>{const on=b.dataset.v1322Tab===code;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});}

  async function renderOverview(host){
    const [a,act,skill]=await Promise.all([access(),uiApi('activity').catch(()=>({activity:[]})),competencyApi('summary').catch(()=>({skills:[],snapshot:{strongest:[],attention:[],recommended:null}}))]);
    // Authenticated user metadata may be shown, but never infer paid access.
    const session=await getSession();
    const readerName=a?.username||session?.user?.user_metadata?.username||'';
    const accessMissing=!a;
    const books=(a?.books||[]).filter(b=>b.included);
    const progress=await bookProgress(books);
    const recent=(act.activity||[]).slice(0,4);
    const includedTools=(a?.tools||[]).filter(x=>x.included&&x.status!=='retired').length;
    const progressCards=progress.length?progress.slice(0,6).map(({book,percent})=>{const label=percent===null?'Not started':`${percent}% complete`;const width=percent===null?0:percent;return`<article class="v1324-progress-card"><div class="v1324-progress-top"><strong>${esc(book.shortTitle||book.title||'Book')}</strong><span>${esc(label)}</span></div><div class="v1324-progress-track" role="progressbar" aria-label="${esc(book.shortTitle||book.title||'Book')} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${width}"><span style="width:${width}%"></span></div></article>`}).join(''):'<div class="fe-state">Book progress will appear here as you work through the learning system.</div>';
    host.innerHTML=`<section class="v1321-overview">${accessMissing?'<div class="notice" role="status">Membership and library information is temporarily unavailable. Refresh the Dashboard to retry; displayed counts are withheld until confirmed.</div>':''}<div class="v132-dashboard-hero"><div><div class="eyebrow">Member Dashboard</div><h1>Welcome back${readerName?`, ${esc(readerName)}`:''}</h1><p>Your current learning position, book progress, and fastest ways back into practice.</p></div><div class="v121-membership-badge lifetime"><span>${esc(accessMissing?'Membership unavailable':a.planName||'Membership')}</span><small>${esc(accessMissing?'Unable to confirm current plan':timing(a))}</small></div></div><div class="v1324-summary-grid" hidden aria-hidden="true"></div><section class="gu-member-start" aria-label="Start learning"><div><div class="eyebrow">YOUR NEXT MOVE</div><h2>Continue your learning</h2><p>Choose an exercise, follow a guided Boot Camp, or review your decisions.</p></div><div class="gu-member-start-actions"><a class="btn" href="labs.html">Start a Lab</a><a class="btn secondary" href="bootcamp-academy.html">Boot Camp Academy</a><a class="btn secondary" href="journal.html">Open Journal</a><a class="btn secondary" href="simulator.html">Market Simulator</a></div></section><section class="v134-skill-snapshot"><div class="v1324-block-head"><div><div class="eyebrow">Skill Development</div><h2>Skill Snapshot</h2></div><button type="button" class="v1321-link-button" data-open-skills>View Skill Development</button></div><div class="v134-snapshot-grid">${(()=>{
      const strong=skill?.snapshot?.strongest||[],attention=skill?.snapshot?.attention||[],rec=skill?.snapshot?.recommended;
      const card=(label,x)=>x?`<article><span>${label}</span><strong>${esc(x.name)}</strong><small>${esc(skillScoreLabel(x))} · ${esc(x.status||'')}</small></article>`:`<article><span>${label}</span><strong>Not Yet Assessed</strong><small>Complete graded practice to establish evidence.</small></article>`;
      return card('Strongest',strong[0])+card('Needs Attention',attention[0])+(rec?`<article class="recommended"><span>Recommended Next</span><strong>${esc(rec.name||rec.label||'Practice')}</strong><small>${esc(rec.reason||'Build evidence for this skill.')}</small></article>`:`<article class="recommended"><span>Recommended Next</span><strong>Start a graded Lab</strong><small>Your first scored evidence will build this snapshot.</small></article>`);
    })()}</div></section>
    <section class="v1324-overview-block"><div class="v1324-block-head"><div><div class="eyebrow">Learning Progress</div><h2>Progress by Book</h2></div><button type="button" class="v1321-link-button" data-open-books>View My Books</button></div><div class="v1324-progress-grid">${progressCards}</div></section><section class="v1324-overview-split"><div><div class="v1324-block-head"><div><div class="eyebrow">Continue</div><h2>Quick Access</h2></div></div><div class="v1321-quick-grid"><a href="labs.html"><strong>Historical Labs</strong><span>Continue structured practice</span></a><a href="simulator.html"><strong>Simulator</strong><span>Replay and simulated decisions</span></a><a href="journal.html"><strong>Journal</strong><span>Review trades and process</span></a><a href="market-commons.html"><strong>Market Commons</strong><span>Forum and trade discussion</span></a></div></div><div><div class="v1324-block-head"><div><div class="eyebrow">Recent</div><h2>Recent Activity</h2></div><button type="button" class="v1321-link-button" data-open-activity>View all</button></div><div class="v1324-recent-list">${recent.length?recent.map(r=>`<a href="${esc(safeLocalHref(r.href))}" ${r.href?'':'aria-disabled="true"'}><strong>${esc(r.title||r.activity_type||'Activity')}</strong><small>${new Date(r.created_at||r.at).toLocaleString()}</small></a>`).join(''):'<div class="fe-state">Recent activity will appear as you use the platform.</div>'}</div></div></section></section>`;
    q('[data-open-skills]',host)?.addEventListener('click',()=>activate('skills'));
    q('[data-open-books]',host)?.addEventListener('click',()=>activate('books'));
    q('[data-open-activity]',host)?.addEventListener('click',()=>activate('activity'));
  }

  async function renderAccess(host){const a=await access();if(!a){host.innerHTML='<div class="fe-state error">Membership information is unavailable.</div>';return}const tools=(a.tools||[]).filter(x=>x.status!=='retired');const groups=['Learning','Trade Labs','Research'];host.innerHTML=`<section class="v1321-access-head"><div><div class="eyebrow">Membership & Access</div><h1>${esc(a.planName||'Free Membership')}</h1><p>${esc(timing(a))}</p></div><div class="v1321-access-count"><strong>${tools.filter(x=>x.included).length}</strong><span>features included</span></div></section><section class="v1321-feature-groups">${groups.map(g=>{const xs=tools.filter(x=>featureGroup(x)===g);return`<article class="v1321-feature-group" data-group="${esc(g)}"><header><div><h2>${esc(g)}</h2><small>${xs.filter(x=>x.included).length} of ${xs.length} included</small></div><button class="v1321-link-button" type="button" data-toggle>Show all</button></header><div class="v1321-feature-list">${xs.map((x,i)=>`<div class="v1321-feature-row ${x.included?'yes':'no'}" data-item data-i="${i}"><span class="v1321-mark">${x.included?'✓':'✕'}</span>${x.included?`<a href="${esc(safeLocalHref(x.href,'/tools.html'))}">${esc(x.name)}</a>`:`<span>${esc(x.name)}</span>`}<small>${x.included?'Included':'Not included'}</small></div>`).join('')||'<div class="fe-state">No features in this group.</div>'}</div></article>`}).join('')}</section>`;qa('[data-group]',host).forEach(group=>{let all=false;const btn=q('[data-toggle]',group),rows=qa('[data-item]',group);const sync=()=>{rows.forEach((r,i)=>r.hidden=!all&&i>=4);btn.textContent=all?'Show top 4':'Show all'};btn.onclick=()=>{all=!all;sync()};sync()})}

  async function renderSkills(host){
    host.innerHTML='<div class="fe-state">Loading skill development…</div>';
    try{
      const j=await competencyApi('summary'),skills=j.skills||[];
      const grouped={};skills.forEach(x=>(grouped[x.category]??=[]).push(x));
      const statusOrder=['Needs Work','Developing','Proficient','Mastered','Not Yet Assessed'];
      const list=Object.entries(grouped).map(([category,xs])=>`<section class="v134-skill-group"><header><div><div class="eyebrow">${esc(category)}</div><h2>${esc(category)}</h2></div><span>${xs.filter(x=>x.evidenceCount>0).length} assessed / ${xs.length}</span></header><div class="v134-skill-grid">${xs.sort((a,b)=>{const ai=statusOrder.indexOf(a.status),bi=statusOrder.indexOf(b.status);return (ai<0?99:ai)-(bi<0?99:bi)||a.name.localeCompare(b.name)}).map(x=>`<button type="button" class="v134-skill-card ${skillStatusClass(x.status)}" data-skill="${esc(x.code)}"><span class="v134-skill-thumb">${skillIllustration(x.code,x.name)}</span><span class="v134-skill-score">${esc(skillScoreLabel(x))}</span><strong>${esc(x.name)}</strong><small>${esc(x.status||'Not Yet Assessed')} · ${Number(x.evidenceCount||0)} evidence item${Number(x.evidenceCount||0)===1?'':'s'}</small><span class="v134-skill-trend">${x.trend==='up'?'↑ Improving':x.trend==='down'?'↓ Review needed':x.trend==='flat'?'→ Stable':'No trend yet'}</span></button>`).join('')}</div></section>`).join('');
      host.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Skill Development</div><h1>Competency Intelligence</h1><p>Scores are based only on recorded assessment evidence. Completion alone does not create a mastery score.</p></div></div><div class="v134-score-model"><span>Knowledge</span><span>Recognition</span><span>Decision</span><span>Execution / Process</span></div><div class="v134-skill-sections">${list||'<div class="fe-state">No competencies are configured.</div>'}</div><aside class="v134-skill-detail" data-skill-detail hidden></aside>`;
      qa('[data-skill]',host).forEach(b=>b.onclick=()=>openSkillDetail(b.dataset.skill,host));
    }catch(e){host.innerHTML=`<div class="fe-state error"><strong>Unable to load Skill Development.</strong><span>${esc(e.message)}</span><button class="btn secondary" data-retry>Retry</button></div>`;q('[data-retry]',host)?.addEventListener('click',()=>renderSkills(host))}
  }
  async function openSkillDetail(code,host){
    const pane=q('[data-skill-detail]',host);if(!pane)return;
    pane.hidden=false;pane.innerHTML='<div class="fe-state">Loading skill details…</div>';pane.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const j=await competencyApi('detail',{code}),x=j.skill||{},subs=j.subScores||{},labs=j.related?.labs||[],topics=j.related?.topics||[],tools=j.related?.tools||[];
      const score=(v)=>v===null||v===undefined?'Not assessed':`${Math.round(Number(v))}%`;
      pane.innerHTML=`<div class="v134-detail-head"><div class="v134-detail-graphic">${skillIllustration(code,x.name||code)}</div><div><div class="eyebrow">${esc(x.category||'Skill')}</div><h2>${esc(x.name||code)}</h2><p>${esc(x.description||'')}</p></div><button type="button" class="btn secondary" data-close-skill>Close</button></div><div class="v134-detail-score"><strong>${esc(skillScoreLabel(x))}</strong><span>${esc(x.status||'Not Yet Assessed')}</span><small>${Number(x.evidenceCount||0)} evidence items · ${Number(x.criticalErrors||0)} critical errors · ${Number(x.consecutivePasses||0)} consecutive passes</small></div><div class="v134-subscore-grid">${[['Knowledge',subs.knowledge],['Recognition',subs.recognition],['Decision',subs.decision],['Execution / Process',subs.process]].map(([l,v])=>`<div><span>${l}</span><strong>${score(v)}</strong></div>`).join('')}</div><section><h3>What this skill involves</h3><p>${esc(x.description||'Review the curriculum guide and related Labs for the specific skill definition.')}</p><p class="small">An illustration is a navigation aid, not a historical chart or market-data source.</p></section><section><h3>What to improve</h3><p>${esc(x.diagnosis||x.nextStep||'Complete graded practice to build enough evidence for a targeted diagnosis.')}</p></section><section><h3>Recommended Labs</h3><div class="v134-related-list">${labs.length?labs.map(l=>`<a href="${esc(safeLocalHref(l.href,'/labs.html'))}"><strong>${esc(l.title)}</strong><small>${esc(l.labId||'Lab')}</small></a>`).join(''):'<span>No mapped Labs yet.</span>'}</div></section><section><h3>Related Platform Guides</h3><div class="v134-related-list">${topics.length?topics.map(t=>`<a href="market-commons.html?topic=${encodeURIComponent(t.id)}"><strong>${esc(t.title)}</strong><small>Market Commons guide</small></a>`).join(''):'<span>No mapped guides yet.</span>'}</div></section><section><h3>Related Tools</h3><div class="v134-related-list">${tools.length?tools.map(t=>`<a href="${esc(safeLocalHref(t.href,'/tools.html'))}"><strong>${esc(t.name)}</strong><small>${esc(t.category||'Platform tool')}</small></a>`).join(''):'<span>No mapped tools yet.</span>'}</div></section>`;
      q('[data-close-skill]',pane).onclick=()=>{pane.hidden=true};
    }catch(e){pane.innerHTML=`<div class="fe-state error">${esc(e.message)}</div>`}
  }

  async function renderBooks(host){const a=await access(),books=a?.books||[];host.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">My Books</div><h1>Book & Companion Access</h1><p>Book access is separate from membership access.</p></div><a class="btn secondary" href="store.html">Open Store</a></div><div class="v1321-book-grid">${books.length?books.map(b=>`<article class="v1321-book"><span class="${b.included?'yes':'no'}">${b.included?'✓ Included':'✕ Not included'}</span><strong>${esc(b.shortTitle||b.title||'Book')}</strong><small>${esc(b.publicationStatus||'')}</small></article>`).join(''):'<div class="fe-state">No book access is currently assigned to this account.</div>'}</div>`}

  async function credentialList(host){
    host.innerHTML='<div class="fe-state">Loading secure connections…</div>';
    try{
      const result=await api('/api/credentials?action=list');
      const connections=new Map((result.connections||[]).map(row=>[row.service_code,row]));
      const providers=[
        {code:'TIINGO_BYO',name:'Tiingo',fields:[['token','Personal API token']]},
        {code:'ALPACA_BYO',name:'Alpaca Market Data (IEX)',fields:[['apiKey','API Key ID'],['apiSecret','API Secret']]}
      ];
      host.innerHTML=providers.map(provider=>{
        const saved=connections.get(provider.code);
        const verified=saved?.status==='connected'&&Boolean(saved.last_tested_at);
        const state=verified?'Connected — verified':saved?.status==='verification_failed'?'Verification failed':saved?'Saved — not verified':'Not connected';
        const selected=saved?.metadata?.accountType;
        const account=provider.code==='ALPACA_BYO'&&['paper','live'].includes(selected)?
          '<small>Selected account: '+(selected==='paper'?'Paper Trading':'Live (market data only)')+'</small>':'';
        return '<article class="v1321-connection" data-service="'+provider.code+'"><div><strong>'+provider.name+'</strong>'+
          '<span class="v1321-status '+(verified?'ok':'')+'">'+state+'</span>'+
          '<small>'+(saved?'Stored credentials '+esc(saved.masked_hint||'••••'):'Each member connects their own API credentials.')+'</small>'+
          account+(provider.code==='ALPACA_BYO'&&saved?.metadata?.paperAccountVerifiedAt?'<small>Paper Trading: provider verified · no orders submitted during verification</small>':'')+(saved?.last_tested_at?'<small>Last verified: '+new Date(saved.last_tested_at).toLocaleString()+'</small>':'')+
          '</div><div class="actions"><button class="btn secondary" type="button" data-add>'+(saved?'Change Account / Replace':'Choose Account & Connect')+'</button>'+
          (provider.code==='ALPACA_BYO'&&saved?'<button class="btn secondary" type="button" data-verify>Test Market Data</button><button class="btn secondary" type="button" data-verify-paper>Verify Saved Paper Account</button>':'')+
          (saved?'<button class="btn secondary" type="button" data-remove>Remove</button>':'')+
          '</div><p class="v1321-connection-feedback" aria-live="polite"></p></article>';
      }).join('');
      qa('[data-service]',host).forEach(card=>{
        const provider=providers.find(x=>x.code===card.dataset.service);
        const current=connections.get(provider.code);
        const status=q('.v1321-connection-feedback',card);
        q('[data-add]',card).onclick=()=>{
          const old=document.querySelector('.v1321-provider-dialog');
          if(old)old.remove();
          const modal=document.createElement('dialog');
          modal.className='v1321-provider-dialog';
          modal.setAttribute('aria-labelledby','v1321-provider-title');
          const alpaca=provider.code==='ALPACA_BYO';
          const previous=current?.metadata?.accountType==='live'?'live':'paper';
          const choice=alpaca?
            '<fieldset><legend>Choose which Alpaca account to connect</legend>'+
            '<label class="v1321-provider-choice"><input type="radio" name="alpacaAccount" value="paper" '+(previous==='paper'?'checked':'')+'> Paper Trading account <small>Recommended for initial market-data setup</small></label>'+
            '<label class="v1321-provider-choice"><input type="radio" name="alpacaAccount" value="live" '+(previous==='live'?'checked':'')+'> Live account — market data only <small>No live orders or brokerage transactions are enabled</small></label>'+
            '</fieldset><p class="v1321-provider-hint">The market-data endpoint is selected automatically. Only one Alpaca key pair is active per website member; connecting another replaces the previous pair.</p>':
            '<p class="v1321-provider-hint">Connect your own Tiingo token. The endpoint is configured automatically.</p>';
          modal.innerHTML='<h2 id="v1321-provider-title">Connect '+provider.name+'</h2>'+
            choice+provider.fields.map(([key,label])=>
              '<label class="v1321-provider-field">'+label+'<span class="v1321-secret-wrap">'+
              '<input type="password" data-provider-field="'+key+'" autocomplete="new-password" data-lpignore="true" data-1p-ignore="true" aria-label="'+label+'">'+
              '<button class="btn secondary" type="button" data-show-secret>Show</button></span></label>'
            ).join('')+
            '<p class="v1321-provider-hint">Keys are encrypted on the server and are never displayed after saving.</p>'+
            '<p class="v1321-provider-feedback" role="status" aria-live="polite"></p>'+
            '<div class="actions"><button type="button" class="btn" data-save-provider>Verify Market Data & Save</button>'+
            '<button type="button" class="btn secondary" data-cancel-provider>Cancel</button></div>';
          document.body.appendChild(modal);
          const close=()=>{modal.close();modal.remove()};
          q('[data-cancel-provider]',modal).onclick=close;
          modal.addEventListener('close',()=>modal.remove(),{once:true});
          qa('[data-show-secret]',modal).forEach(button=>button.onclick=()=>{
            const field=q('[data-provider-field]',button.parentElement);
            const show=field.type==='password';field.type=show?'text':'password';
            button.textContent=show?'Hide':'Show';
          });
          q('[data-save-provider]',modal).onclick=async()=>{
            const btn=q('[data-save-provider]',modal),notice=q('.v1321-provider-feedback',modal);
            const fields=qa('[data-provider-field]',modal);
            if(fields.some(field=>!field.value.trim())){notice.textContent='Enter all required API credential fields.';return}
            const values=Object.fromEntries(fields.map(field=>[field.dataset.providerField,field.value]));
            const accountType=alpaca?q('input[name="alpacaAccount"]:checked',modal)?.value:null;
            btn.disabled=true;notice.textContent='Verifying your credentials against the market-data provider…';
            try{
              const response=await api('/api/credentials?action=save',{method:'POST',
                body:JSON.stringify({serviceCode:provider.code,values,...(alpaca?{accountType}:{})})});
              if(response.verified!==true)throw Error('Market-data verification was not confirmed.');
              close();await credentialList(host);toast('Market-data account verified and saved securely.','ok');
            }catch(error){notice.textContent=error.message||'Connection verification failed. No credentials were changed.'}
            finally{btn.disabled=false}
          };
          modal.showModal();
        };
        const verify=q('[data-verify]',card);
        if(verify)verify.onclick=async()=>{
          verify.disabled=true;status.textContent='Testing the saved Alpaca IEX connection…';
          try{
            const result=await api('/api/credentials?action=verify',{method:'POST',body:JSON.stringify({serviceCode:'ALPACA_BYO'})});
            if(result.verified!==true)throw Error('Market-data test not confirmed.');
            await credentialList(host);
            toast('Alpaca IEX historical data verified.','ok');
          }catch(error){status.textContent=error.message||'Alpaca market-data test failed.';verify.disabled=false}
        };
        const paper=q('[data-verify-paper]',card);
        if(paper)paper.onclick=async()=>{
          paper.disabled=true;status.textContent='Checking your encrypted keys against Alpaca Paper Trading — no orders will be placed…';
          try{
            const result=await api('/api/credentials?action=verify-paper',{method:'POST',
              body:JSON.stringify({serviceCode:'ALPACA_BYO'})});
            if(result.paperVerified!==true)throw Error('Paper account authentication was not confirmed.');
            await credentialList(host);
            toast('Your saved Alpaca Paper Trading account has been verified. No orders placed.','ok');
          }catch(error){status.textContent=error.message||'Paper account test failed. Market-data connection was not changed.';paper.disabled=false}
        };
        const remove=q('[data-remove]',card);
        if(remove)remove.onclick=async()=>{
          if(!confirm('Remove your saved '+provider.name+' connection from this website account?'))return;
          remove.disabled=true;
          try{await api('/api/credentials?action=delete',{method:'POST',body:JSON.stringify({serviceCode:provider.code})});await credentialList(host)}
          catch(error){status.textContent=error.message;remove.disabled=false}
        };
      });
    }catch(error){host.innerHTML='<div class="fe-state error">'+esc(error.message)+'</div>'}
  }

  async function settingsPanel(host){host.innerHTML=`<div class="v1321-settings"><nav class="v1321-settings-nav" aria-label="Settings sections">${[['account','Account'],['security','Security'],['connections','Connections & API Keys'],['book','Book Access'],['notifications','Notifications'],['accessibility','Display & Accessibility'],['privacy','Privacy'],['danger','Danger Zone']].map(([c,l])=>`<button type="button" data-setting="${c}">${l}</button>`).join('')}</nav><section class="v1321-settings-body" data-settings-body></section></div>`;const body=q('[data-settings-body]',host);let settingsRequest=0;async function show(code){const request=++settingsRequest;qa('[data-setting]',host).forEach(b=>b.classList.toggle('active',b.dataset.setting===code));if(code==='account'){let j={profile:{}};try{j=await api('/api/account?action=identity')}catch{}const p=j.profile||{},name=[p.firstName,p.lastName].filter(Boolean).join(' ')||'—';if(request!==settingsRequest)return;body.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Account</div><h2>Account Information</h2></div></div><article class="v13-card"><div class="v1324-account-facts"><div><span>Name</span><strong>${esc(name)}</strong></div><div><span>Username</span><strong>${p.username?`@${esc(p.username)}`:'—'}</strong></div></div><div class="v1324-email-edit"><label>Email Address<input type="email" data-email value="${esc(p.email||'')}" autocomplete="email"></label><button class="btn" type="button" data-change-email>Change Email</button></div></article>`;q('[data-change-email]',body)?.addEventListener('click',async()=>{const email=String(q('[data-email]',body)?.value||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email)){toast('Enter a valid email address.','bad');return}if(email===String(p.email||'').toLowerCase()){toast('That is already your email address.','info');return}try{const sb=await getSB();if(!sb)throw new Error('Account service is unavailable.');const redirect=`${location.origin}/dashboard.html?tab=settings`;const {error}=await sb.auth.updateUser({email},{emailRedirectTo:redirect});if(error)throw error;toast('Email change requested. Check your email to confirm it.','ok')}catch(e){toast(e.message||'Unable to change email.','bad')}})}
    else if(code==='security'){const sb=await getSB(),ses=(await sb?.auth.getSession())?.data?.session,u=ses?.user;let timeout=30;try{const {data}=await sb.from('profiles').select('session_timeout_minutes').eq('id',u.id).maybeSingle();timeout=Number(data?.session_timeout_minutes||30)}catch{}if(request!==settingsRequest)return;body.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Security</div><h2>Security & Sessions</h2></div></div><article class="v13-card"><div class="v1321-security-list"><div><strong>Email verification</strong><span>${u?.email_confirmed_at?'Verified':'Not verified'}</span></div><div><strong>Last sign in</strong><span>${u?.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():'Unavailable'}</span></div><label><strong>Automatic sign-out</strong><select data-timeout><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="480">8 hours</option><option value="1440">24 hours</option></select></label></div><div class="actions"><button class="btn" type="button" data-save-timeout>Save Security Settings</button><a class="btn secondary" href="signin.html?reset=1">Password / Sign-in Help</a></div></article>`;q('[data-timeout]',body).value=String(timeout);q('[data-save-timeout]',body).onclick=async()=>{try{const v=Number(q('[data-timeout]',body).value);const {error}=await sb.from('profiles').update({session_timeout_minutes:v}).eq('id',u.id);if(error)throw error;toast('Security settings saved.','ok')}catch(e){toast(e.message,'bad')}}}
    else if(code==='connections'){if(request!==settingsRequest)return;body.innerHTML='<div class="v1321-section-head"><div><div class="eyebrow">Secure Connections</div><h2>Connections & API Keys</h2><p>Keys are encrypted server-side and attached to your account.</p></div></div><div data-connections></div>';await credentialList(q('[data-connections]',body))}
    else if(code==='book'){if(request!==settingsRequest)return;body.innerHTML='<div class="v1321-section-head"><div><div class="eyebrow">Book Access</div><h2>Book Keys & Companion Access</h2><p>Redeem a qualifying book key or review companion access.</p></div></div><article class="v13-card v1324-book-access"><iframe class="v13-settings-frame" data-book-access-frame src="settings.html?embedded=1&section=book-access" title="Book key and companion access settings"></iframe></article>';cleanBookAccessFrame(q('[data-book-access-frame]',body))}
    else if(code==='notifications'){let prefs={};try{const j=await uiApi('preferences');prefs=(j.preferences||[]).find(x=>x.pref_key==='notifications')?.pref_value||{}}catch{}if(request!==settingsRequest)return;body.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Notifications</div><h2>Notification Preferences</h2></div></div><article class="v13-card v1321-toggle-list"><label><span>Community replies</span><input type="checkbox" data-n="community" ${prefs.community!==false?'checked':''}></label><label><span>Learning releases</span><input type="checkbox" data-n="learning" ${prefs.learning!==false?'checked':''}></label><label><span>Product and book releases</span><input type="checkbox" data-n="releases" ${prefs.releases!==false?'checked':''}></label><label><span>Billing and account notices</span><input type="checkbox" checked disabled></label><button class="btn" type="button" data-save-notifications>Save Notification Preferences</button></article>`;q('[data-save-notifications]',body).onclick=async()=>{const v={};qa('[data-n]',body).forEach(x=>v[x.dataset.n]=x.checked);await savePref('notifications',v);toast('Notification preferences saved.','ok')}}
    else if(code==='accessibility'){if(request!==settingsRequest)return;body.innerHTML='<div data-display-settings></div><p><a href="accessibility.html">Accessibility information</a></p>';if(window.SiteDisplay)window.SiteDisplay.render(q('[data-display-settings]',body));else q('[data-display-settings]',body).innerHTML='<p>Display controls are loading. <a href="settings.html">Open account display settings</a>.</p>'}
    else if(code==='privacy'){let p={};try{p=(await api('/api/account?action=consent')).preferences||{}}catch{}if(request!==settingsRequest)return;body.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Privacy</div><h2>Privacy & Data</h2></div></div><article class="v13-card v1321-toggle-list"><label><span>Optional analytics</span><input type="checkbox" data-c="analytics" ${p.analytics?'checked':''}></label><label><span>Advertising personalization</span><input type="checkbox" data-c="advertisingPersonalization" ${p.advertising_personalization?'checked':''}></label><label><span>Marketing email</span><input type="checkbox" data-c="marketingEmail" ${p.marketing_email?'checked':''}></label><label><span>Community email</span><input type="checkbox" data-c="communityEmail" ${p.community_email!==false?'checked':''}></label><div class="actions"><button class="btn" type="button" data-save-privacy>Save Privacy Preferences</button><a class="btn secondary" href="privacy.html">Privacy Policy</a></div></article>`;q('[data-save-privacy]',body).onclick=async()=>{const v={};qa('[data-c]',body).forEach(x=>v[x.dataset.c]=x.checked);await api('/api/account?action=consent',{method:'POST',body:JSON.stringify(v)});toast('Privacy preferences saved.','ok')}}
    else if(code==='danger'){if(request!==settingsRequest)return;body.innerHTML='<div class="v1321-section-head"><div><div class="eyebrow">Danger Zone</div><h2>Delete Account</h2></div></div><article class="v13-card v1321-danger"><button class="btn danger" type="button" data-delete-account>Delete Account</button></article>';q('[data-delete-account]',body).onclick=async()=>{const phrase=prompt('Type DELETE ACCOUNT exactly to permanently delete this account.');if(phrase!=='DELETE ACCOUNT'){toast('Account deletion cancelled.','warn');return}try{await api('/api/account?action=delete',{method:'POST',body:JSON.stringify({confirmation:phrase,reason:''})});location.href='index.html'}catch(e){toast(e.message,'bad')}}}
  }
  qa('[data-setting]',host).forEach(b=>b.onclick=()=>show(b.dataset.setting));const requested=new URLSearchParams(location.search).get('section');await show(['account','security','connections','book','notifications','accessibility','privacy','danger'].includes(requested)?requested:'account')}

  async function renderHelp(host){host.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Help & Documentation</div><h1>Help Center</h1><p>Find setup instructions, account help, and platform documentation.</p></div><a class="btn secondary" href="help.html">Open Full Documentation</a></div><div class="v1321-help-grid"><a href="help.html#tokens-tiingo"><strong>API Keys & Tokens</strong><span>Connect Tiingo and supported providers.</span></a><a href="help.html"><strong>Membership & Access</strong><span>Understand plans, book access, and tools.</span></a><a href="market-commons.html"><strong>Market Commons</strong><span>Forum help and community guidance.</span></a><button type="button" data-open-support><strong>Contact Support</strong><span>Create and track a support request.</span></button></div>`;q('[data-open-support]',host).onclick=()=>activate('support')}

  async function renderSupport(host){host.innerHTML='<div class="v1321-section-head"><div><div class="eyebrow">Support</div><h1>Support Requests</h1><p>Create and track requests from your account.</p></div><button class="btn" type="button" data-new-ticket>New Support Request</button></div><div data-ticket-list></div>';const list=q('[data-ticket-list]',host);async function load(){try{const j=await api('/api/support?action=list');list.innerHTML=(j.tickets||[]).length?(j.tickets||[]).map(t=>`<article class="v1321-ticket"><div><strong>${esc(t.ticket_number)} · ${esc(t.subject)}</strong><small>${esc(t.category)} · ${esc(t.status)} · ${new Date(t.updated_at).toLocaleString()}</small></div></article>`).join(''):'<div class="fe-state">No support tickets yet.</div>'}catch(e){list.innerHTML=`<div class="fe-state error">${esc(e.message)}</div>`}}q('[data-new-ticket]',host).onclick=async()=>{const subject=prompt('Support request subject:');if(!subject)return;const description=prompt('Describe what you need help with:');if(!description)return;try{await api('/api/support?action=create',{method:'POST',body:JSON.stringify({category:'other',subject,description})});toast('Support request created.','ok');await load()}catch(e){toast(e.message,'bad')}};await load()}

  async function renderBilling(host){host.innerHTML='<div class="fe-state">Loading billing history…</div>';try{const sb=await getSB(),ses=await getSession();if(!sb||!ses)throw new Error('Sign in required.');const [subs,orders]=await Promise.all([sb.from('site_subscriptions').select('*').eq('user_id',ses.user.id).order('created_at',{ascending:false}),sb.from('site_orders').select('*').eq('user_id',ses.user.id).order('created_at',{ascending:false}).limit(30)]);host.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Purchases & Billing</div><h1>Billing</h1><p>Membership, renewal state, orders, and receipts.</p></div><a class="btn secondary" href="membership.html">Membership Options</a></div><div class="v1321-billing-grid"><article class="v13-card"><h3>Subscriptions</h3>${(subs.data||[]).length?(subs.data||[]).map(s=>`<div class="v1321-line"><span><strong>${esc(s.plan_code||'Membership')}</strong><small>${esc(s.status||'')}</small></span><span>${s.current_period_end?new Date(s.current_period_end).toLocaleDateString():'—'}</span></div>`).join(''):'<p>No direct-site subscription history.</p>'}</article><article class="v13-card"><h3>Orders & Receipts</h3>${(orders.data||[]).length?(orders.data||[]).map(o=>`<div class="v1321-line"><span><strong>${esc(o.order_number||`Order ${o.id}`)}</strong><small>${new Date(o.created_at).toLocaleDateString()}</small></span><span>${Number(o.total_cents||0)?`$${(Number(o.total_cents)/100).toFixed(2)}`:esc(o.status||'')}</span></div>`).join(''):'<p>No website purchases yet.</p>'}</article></div>`}catch(e){host.innerHTML=`<div class="fe-state error">${esc(e.message)}</div>`}}

  function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  async function renderActivity(host){host.innerHTML='<div class="fe-state">Loading activity…</div>';try{const j=await uiApi('activity'),rows=j.activity||[];host.innerHTML=`<div class="v1321-section-head"><div><div class="eyebrow">Activity</div><h1>Account Activity</h1><p>Your recent learning and account activity.</p></div><div class="actions"><button class="btn secondary" data-csv>Export CSV</button><button class="btn secondary" data-json>Export JSON</button></div></div><div class="v13-card">${rows.length?rows.slice(0,50).map(r=>`<div class="v1321-line"><span><strong>${esc(r.title||r.activity_type||'Activity')}</strong>${r.href?`<small><a href="${esc(safeLocalHref(r.href))}">Open</a></small>`:''}</span><time>${new Date(r.created_at||r.at).toLocaleString()}</time></div>`).join(''):'<p>Activity will appear as you use the platform.</p>'}</div>`;q('[data-json]',host).onclick=()=>download('account-activity.json','application/json',JSON.stringify(rows,null,2));q('[data-csv]',host).onclick=()=>{const cells=[['title','type','created_at','href'],...rows.map(r=>[r.title||'',r.activity_type||'',r.created_at||r.at||'',r.href||''])];download('account-activity.csv','text/csv',cells.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n'))}}catch(e){host.innerHTML=`<div class="fe-state error">${esc(e.message)}</div>`}}

  const renderers={overview:renderOverview,access:renderAccess,skills:renderSkills,books:renderBooks,settings:settingsPanel,help:renderHelp,support:renderSupport,billing:renderBilling,activity:renderActivity};
  let hub,panels={};
  async function activate(code,opts={history:true}){
    if(!renderers[code])code='overview';
    enforcePanelState(hub,code);
    if(opts.history!==false)history.replaceState(null,'',`dashboard.html${code==='overview'?'':`?tab=${code}`}`);
    const p=panels[code];
    if(!p)return;
    if(!p.dataset.v1322Rendered||code==='settings'||code==='support'||code==='billing'||code==='activity'){
      p.dataset.v1322Rendered='1';
      try{await renderers[code](p)}catch(err){
        console.error(`[${BUILD}] ${code} renderer failed`,err);
        p.innerHTML=`<div class="fe-state error"><strong>Unable to load this section.</strong><br>${esc(err?.message||'Unknown error')}<br><button type="button" class="btn secondary" data-retry>Retry</button></div>`;
        q('[data-retry]',p)?.addEventListener('click',()=>{delete p.dataset.v1322Rendered;activate(code).catch(console.error)});
      }
    }
  }

  async function init(){
    const main=q('main .wrap')||q('main');
    if(!main)return;
    // This release owns the dashboard DOM outright. Legacy dashboard controllers are disabled.
    legacySnapshot=captureLegacyProgress(main);
    main.innerHTML='';
    hub=document.createElement('section');
    hub.id='v1322-member-hub';
    hub.className='v13-member-shell v1322-member-shell';
    hub.dataset.v1322='1';
    // Attach the authoritative dashboard shell before any asynchronous renderer runs.
    // v0.13.2.2 cleared <main> but never appended this hub, which left the live Dashboard blank.
    main.appendChild(hub);
    document.body.dataset.build=BUILD;
    const defs=[['overview','Overview'],['access','Membership & Access'],['skills','Skill Development'],['books','My Books'],['settings','Settings'],['help','Help & Documentation'],['support','Support'],['billing','Purchases & Billing'],['activity','Activity']];
    const nav=document.createElement('nav');
    nav.className='v13-member-tabs v1321-member-tabs v1322-member-tabs';
    nav.setAttribute('aria-label','Member dashboard sections');
    nav.setAttribute('role','tablist');
    hub.appendChild(nav);
    const panelWrap=document.createElement('div');
    panelWrap.className='v1322-panel-wrap';
    hub.appendChild(panelWrap);
    defs.forEach(([code,label])=>{
      const b=document.createElement('button');
      b.type='button';
      b.dataset.v1322Tab=code;
      b.textContent=label;
      b.setAttribute('role','tab');
      b.setAttribute('aria-controls',`v1322-panel-${code}`);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();activate(code).catch(err=>{console.error(err);toast(err.message||'Unable to open this section.','bad')})});
      nav.appendChild(b);
      const p=document.createElement('section');
      p.id=`v1322-panel-${code}`;
      p.className='v13-member-panel v1322-member-panel';
      p.dataset.v1322Panel=code;
      p.hidden=true;
      p.setAttribute('role','tabpanel');
      p.setAttribute('aria-labelledby','');
      panelWrap.appendChild(p);
      panels[code]=p;
    });
    // The permanent member sidebar now covers every section of this controller.
    // Use it as the sole desktop navigation, preserving the existing panel renderers.
    const sidebar=document.querySelector('.gu-member-dashboard-shell>.gu-member-side-menu');
    const sidebarTabs=sidebar?Array.from(sidebar.querySelectorAll('a[href]')).filter(a=>{
      const url=new URL(a.getAttribute('href'),location.href);
      return new RegExp('^/dashboard(?:[.]html)?$').test(url.pathname)&&url.searchParams.has('tab');
    }):[];
    const sidebarCodes=new Set(sidebarTabs.map(a=>new URL(a.href).searchParams.get('tab')));
    sidebarCodes.add('overview');
    const unified=defs.every(([code])=>sidebarCodes.has(code));
    if(unified){
      nav.hidden=false;hub.classList.remove('gu-single-member-nav');
      const syncSidebar=code=>sidebar.querySelectorAll('a').forEach(a=>{
        const url=new URL(a.href);
        const match=new RegExp('^/dashboard(?:[.]html)?$').test(url.pathname);
        const destination=match?(url.searchParams.get('tab')||'overview'):null;
        if(destination===code)a.setAttribute('aria-current','page');
        else a.removeAttribute('aria-current');
      });
      sidebar.addEventListener('click',e=>{
        const link=e.target.closest('a[href]');
        if(!link||!sidebar.contains(link)||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
        const url=new URL(link.href);
        if(!new RegExp('^/dashboard(?:[.]html)?$').test(url.pathname))return;
        const code=url.searchParams.get('tab')||'overview';
        if(!renderers[code])return;
        if(code==='support')return; // full navigation initializes canonical private Support
        e.preventDefault();
        activate(code).then(()=>syncSidebar(code)).catch(console.error);
      });
      window.addEventListener('popstate',()=>syncSidebar(new URLSearchParams(location.search).get('tab')||'overview'));
      syncSidebar(new URLSearchParams(location.search).get('tab')||'overview');
    }
    const requested=new URLSearchParams(location.search).get('tab')||'overview';
    await activate(requested);
    window.addEventListener('popstate',()=>{const code=new URLSearchParams(location.search).get('tab')||'overview';activate(code,{history:false}).catch(console.error)});
  }
  init().catch(e=>console.error('[v0.13.2.4 dashboard controller]',e));
})();
