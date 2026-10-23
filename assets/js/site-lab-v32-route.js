/* Stable legacy site-lab alias for the single canonical Lab player.
 * No private lab content or source answers are loaded by this redirect.
 */
(function(){
'use strict';
const params=new URLSearchParams(location.search);
const id=params.get('lab')||params.get('labId')||params.get('id')||'';
const root=document.getElementById('v133-site-lab');
if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)){
 if(root)root.textContent='Select a published Lab from the canonical registry.';
 return;
}
const mode=params.get('mode');
const approvedMode=['guided','practice','blind','assessment'].includes(mode)?'&mode='+encodeURIComponent(mode):'';
const destination='/lab-player.html?lab='+encodeURIComponent(id)+approvedMode;
if(root){
 root.replaceChildren();
 const link=document.createElement('a');link.href=destination;
 link.textContent='Continue to the unified Lab player';
 root.append(link);
}
location.replace(destination);
})();
