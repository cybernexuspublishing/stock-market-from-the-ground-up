/* v0.14.0.37 | No-store release comparison; does not assert Cloudflare deployment parity. */
(()=>{'use strict';
if(window.GroundUpReleaseIntegrityV014036)return;
const cfgVersion=String(window.SITE_CONFIG?.VERSION||'');
const isAdmin=/^\/admin(?:\.html)?$/i.test(location.pathname);
function render(text,problem){if(!isAdmin)return;
 const el=document.createElement('aside');el.id='gu36-release-status';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.className='gu36-release-status';
 if(problem)el.classList.add('gu36-version-warning');el.textContent=text;
 const host=document.querySelector('.admin-sidebar');if(host)host.append(el);
}
async function verify(){try{const res=await fetch('/release-manifest.json',{cache:'no-store',headers:{'cache-control':'no-cache'}});
 if(!res.ok)throw Error('Release manifest was not found');
 const data=await res.json();const manifestVersion=String(data.version||'');
 const routeVersion=String(window.GroundUpRoutePolicy?.version||'');
 const versions=[cfgVersion,manifestVersion,routeVersion].filter(Boolean);
 const mismatch=!cfgVersion||!manifestVersion||new Set(versions).size!==1;
 if(mismatch){render(`Version mismatch: configuration ${cfgVersion||'missing'}, manifest ${manifestVersion||'missing'}, routes ${routeVersion||'missing'}. Verify current Cloudflare deployment and clear obsolete caches.`,true);return}
 const sha=data.gitCommit?` · build ${String(data.gitCommit).slice(0,12)}`:' · build commit not available (manual/static upload)';
 render(`Website source version v${cfgVersion}${sha} · live deployment not independently verified`,false);
 }catch(e){render(`Website version v${cfgVersion||'unknown'} · deployment manifest unavailable; cannot verify server files`,true)}
}
window.GroundUpReleaseIntegrityV014036=Object.freeze({version:'0.14.0.37',verify});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',verify,{once:true});else verify();
})();
