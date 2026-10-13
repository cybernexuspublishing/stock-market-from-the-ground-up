/* Optional first-party theme values only. Existing design remains controlling by default. */
(()=>{'use strict';async function init(){try{const r=await fetch('/api/public-site-v01354',{cache:'default'}),j=await r.json();const b=j.branding;if(!j.ok||!b||!b.apply_public_theme)return;if(!/^#[0-9a-fA-F]{6}$/.test(b.accent_color||''))return;document.documentElement.style.setProperty('--brand-accent-v1354',b.accent_color);document.body?.classList.add('v1354-brand-active');}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
