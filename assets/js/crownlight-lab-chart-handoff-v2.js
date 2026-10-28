/* Contextual Lab -> Crownlight Chart Studio. Reuses existing authorized Lab player.
 * A link is shown only after the Lab player has actually opened authorized content.
 */
(()=>{'use strict';
const ID=/^(?:(?:F[123]|DT|TAPE)-C\d{2}-L\d{2}|SITE-\d{3})$/;
function init(){
 const id=new URLSearchParams(location.search).get('lab')||'';
 const content=document.getElementById('lab-player-content');
 const toolbar=document.querySelector('#player-lab-id')?.parentElement;
 if(!ID.test(id)||!content||!toolbar)return;
 const link=document.createElement('a');link.id='cl-lab-chart-handoff';link.className='link';
 link.textContent='Practice this Lab in Crownlight Chart Studio';
 link.href='/simulator.html?lab='+encodeURIComponent(id);
 link.hidden=true;link.setAttribute('aria-label','Open Crownlight Chart Studio with this verified Lab reference');
 toolbar.append(link);
 const update=()=>{link.hidden=content.hidden===true};
 const observer=new MutationObserver(update);observer.observe(content,{attributes:true,attributeFilter:['hidden']});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();