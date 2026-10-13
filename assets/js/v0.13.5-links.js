/* v0.13.5 additive navigation; does not replace the existing menu, Dashboard, or Book Access tab. */
(()=>{'use strict';
const ADD=[['/my-books.html','My Books'],['/ondemand-training.html','Replay Training'],['/assessments.html','Skill Assessments'],['/mfa-security.html','Security / MFA'],['/book-preview.html','Books & Previews']];
function inject(){for(const nav of document.querySelectorAll('.site-header .navlinks')){
  for(const [href,label] of ADD){if(nav.querySelector(`[href="${href}"],[href="${href.slice(1)}"]`))continue;
    const a=document.createElement('a');a.href=href;a.textContent=label;a.dataset.v135Link='1';nav.append(a)} }
 const quick=document.querySelector('.dashboard-quick-links,.v132-quick-actions,[data-dashboard-quick-actions]');
 if(quick&&!quick.querySelector('[data-v135-quick]')){const a=document.createElement('a');a.className='btn secondary';a.href='/ondemand-training.html';a.textContent='Historical Replay Training';a.dataset.v135Quick='1';quick.append(a)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,180));else setTimeout(inject,180);
window.addEventListener('pageshow',inject);
setTimeout(inject,1000);
})();
