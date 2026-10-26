/* v0.14 — shared display preferences; existing display record, no new tables. */
(()=>{'use strict';if(window.SiteDisplay)return;
 const KEY='groundup:display-prefs';
 const DEFAULTS={font:'1',instructorFont:'1',density:'compact',contrast:'default',motion:'default'};
 const choices={font:['1','1.1','1.2','1.35','1.5','2'],instructorFont:['1','1.1','1.2','1.35','1.5','2'],density:['compact','default','roomy'],contrast:['default','high'],motion:['default','reduced']};
 function normalize(p={}){return Object.fromEntries(Object.entries(DEFAULTS).map(([k,v])=>[k,choices[k].includes(String(p?.[k]))?String(p[k]):v]));}
 function cached(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return {...DEFAULTS}}}
 let current=cached(),loading=null,loaded=false,loadError='';
 function apply(p=current){current=normalize(p);const r=document.documentElement;r.style.setProperty('--fe-font-scale',current.font);r.style.setProperty('--gu-instructor-relative-scale',String(Number(current.instructorFont)/Number(current.font)));r.dataset.guDensity=current.density;r.dataset.guDisplay='ready';if(document.body){document.body.dataset.feDensity=current.density;document.body.dataset.feContrast=current.contrast;document.body.dataset.feMotion=current.motion;}return {...current};}
 function remember(p){try{localStorage.setItem(KEY,JSON.stringify(p));return true}catch{return false}}
 async function session(){const sb=await window.getSupabaseClient?.();return (await sb?.auth?.getSession())?.data?.session;}
 async function api(action,body){const s=await session();if(!s)throw Error('Sign in to save display settings to your account.');const r=await fetch('/api/ui-state?action='+action,{method:body?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+s.access_token},body:body?JSON.stringify(body):undefined,cache:'no-store'});const j=await r.json();if(!r.ok||j.ok!==true)throw Error(j.error||'Display settings could not be saved.');return j;}
 async function load(){if(loading)return loading;loading=(async()=>{try{if(!await session()){loaded=true;return;}const j=await api('preferences');const p=j.preferences?.find(x=>x.pref_key==='display')?.pref_value||DEFAULTS;apply(p);remember(current);loaded=true;loadError='';}catch{loadError='Account display settings could not be loaded. Your browser settings remain in use; retry before saving.';}return {...current};})();return loading;}
 async function save(p){const value=normalize(p);await api('preference_save',{key:'display',value});apply(value);const localSaved=remember(value);return {value,localSaved};}
 function render(host){
  if(!host)return;
  host.innerHTML=`<section class="gu-display-settings" aria-labelledby="gu-display-title"><div class="eyebrow">Make the workspace yours</div><h3 id="gu-display-title">Display &amp; Accessibility</h3><p>Adjust spacing without shrinking the words. Website text and instructor explanations have independent size controls. Changes preview immediately; save to use them on other devices.</p><div class="gu-display-grid"><label>Interface size<select data-display="density"><option value="compact">Compact — less spacing (default)</option><option value="default">Standard</option><option value="roomy">Spacious — more spacing</option></select><small>Changes panel padding, gaps, and navigation spacing. Chart dimensions and Lab stage order stay intact.</small></label><label>Website text size<select data-display="font">${choices.font.map(x=>`<option value="${x}">${Math.round(Number(x)*100)}%${x==='1'?' — default':''}</option>`).join('')}</select><small>Changes headings, navigation, and website reading text.</small></label><label>Instructor text size<select data-display="instructorFont">${choices.instructorFont.map(x=>`<option value="${x}">${Math.round(Number(x)*100)}%${x==='1'?' — default':''}</option>`).join('')}</select><small>Changes Talia’s displayed explanations and answers independently of website text.</small></label><label>Contrast<select data-display="contrast"><option value="default">Standard</option><option value="high">High contrast</option></select></label><label>Motion<select data-display="motion"><option value="default">Follow device preference</option><option value="reduced">Reduce motion</option></select></label></div><div class="gu-display-preview" aria-label="Display preview"><p>Website text: build understanding before making a decision.</p><p class="gu-instructor-text-preview">Instructor text: explain the evidence, identify uncertainty, and review your reasoning.</p></div><div class="actions"><button type="button" class="btn" data-display-save>Save display settings</button><button type="button" class="btn secondary" data-display-reset>Restore defaults</button><button type="button" class="btn secondary" data-display-retry hidden>Retry loading</button></div><p class="small" data-display-status role="status" aria-live="polite"></p></section>`;
  const controls=[...host.querySelectorAll('[data-display]')],button=host.querySelector('[data-display-save]'),status=host.querySelector('[data-display-status]'),retry=host.querySelector('[data-display-retry]');
  const fill=()=>controls.forEach(x=>x.value=current[x.dataset.display]);fill();
  const read=()=>normalize(Object.fromEntries(controls.map(x=>[x.dataset.display,x.value])));
  controls.forEach(x=>x.addEventListener('change',()=>{apply(read());status.textContent='Preview updated. Select Save display settings to keep these changes.';}));
  host.querySelector('[data-display-reset]').onclick=()=>{apply(DEFAULTS);fill();status.textContent='Defaults previewed. Save to keep them.';};
  button.onclick=async()=>{button.disabled=true;const value=read();controls.forEach(x=>x.disabled=true);status.textContent='Saving display settings…';try{const result=await save(value);status.textContent=result.localSaved?'Display settings saved to your account.':'Saved to your account. This browser cannot retain a local copy.';}catch(e){status.textContent=e.message+' Preview remains on this page; changes have not been confirmed saved.';}finally{button.disabled=false;controls.forEach(x=>x.disabled=false);}};
  const finish=()=>{if(!host.isConnected)return;fill();controls.forEach(x=>x.disabled=!loaded);button.disabled=!loaded;retry.hidden=!loadError;status.textContent=loadError||'Your current display settings are ready.';};
  retry.onclick=async()=>{loading=null;loadError='';status.textContent='Loading display settings…';await load();finish();};
  controls.forEach(x=>x.disabled=true);button.disabled=true;status.textContent='Loading display settings…';load().then(finish);
 }
 window.SiteDisplay={apply,load,save,render,normalize,defaults:{...DEFAULTS},get:()=>({...current})};
 apply();
 function init(){
  const route=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
  if(!/^\/(?:labs|lab-player|lab-v32-member|lab-v32-reference|bootcamp|bootcamp-academy|site-lab)(?:\/|$)/.test(route)){
   document.body.dataset.guSurface='standard';
   if(!document.body.dataset.guWorkspace)document.body.dataset.guWorkspace=route==='/dashboard'?'member':route==='/admin'?'admin':'site';
  }
  const header=document.querySelector('.site-header');if(header){const measure=()=>{document.documentElement.style.setProperty('--gu-header-height',header.getBoundingClientRect().height+'px');document.body.dataset.guFixedHeader=String(getComputedStyle(header).position==='fixed');};measure();if(window.ResizeObserver)new ResizeObserver(measure).observe(header);}
  apply();document.querySelectorAll('[data-display-settings]').forEach(render);load();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.addEventListener('storage',e=>{if(e.key===KEY)apply(cached());});
})();
