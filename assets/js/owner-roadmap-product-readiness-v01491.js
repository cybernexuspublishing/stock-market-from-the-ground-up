/* v0.14.0.91 — Owner-only product readiness dashboard. Planning ranges are estimates,
 * NOT verified delivery scores. Source-only, no subscription writes or new database.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let review=null,catalog=null,counts=null,engineering=null;
const stageNames={'content-blocked':'Historical content & rubrics incomplete','integration-pending':'End-to-end QA outstanding','data-blocked':'Historical data / provenance missing','major-build':'Core AI backend not delivered',beta:'Functional beta / validation pending',planned:'Future release'};
function openTask(id){
 if(!/^CORE-[0-9]{4}$/.test(id))return;
 if(typeof window.GroundUpOwnerRoadmap?.openTask==='function')window.GroundUpOwnerRoadmap.openTask(id);
 else location.hash='task-'+id;
}
const badge=(stage)=>stageNames[stage]||'Review pending';
function summary(){
 if(!review)return;
 const warnings=[];
 if(counts){
  for(const [label,actual,expected] of [
   ['primary checklist',counts.core,review.sourceChecks.expectedCore],
   ['archived source lines',counts.trace,review.sourceChecks.expectedTrace],
   ['total preserved requirements',counts.total,review.sourceChecks.expectedTotal]
  ])if(actual!==expected)warnings.push(label+': loaded '+actual+', expected '+expected);
 }
 const node=$('or-prod-contract');
 if(node)node.innerHTML=warnings.length
   ?'<div class="or-catalog-warning"><strong>Registry version mismatch:</strong> '+esc(warnings.join(' · '))+'. Refresh and verify the Cloudflare deployment version. Do not alter saved Owner statuses to force these counts.</div>'
   :'<div class="or-product-summary">Registry integrity: '+(counts?esc(String(counts.core)+' core tasks + '+String(counts.trace)+' source trace lines = '+String(counts.total)+' preserved records'):'waiting for existing requirement register')+'. Historical rows are separate from status categories. Owner-added tasks are counted separately in the main checklist. No Owner records were auto-approved.</div>';
}
function card(t,market){
 const db=market?.get(t.code);
 const catalogAvailable=!!catalog?.available;
 const availability=!catalogAvailable?'Live catalog unavailable — not verified':!db?'Not present in current database response':(db.status==='live'?'Catalog: LIVE flag (not end-to-end certified)':'Catalog: '+db.status);
 const normal=t.range.join('–')+'%';
 return '<article class="or-product-card or-readiness-card" data-product-stage="'+esc(t.stage)+'">'+
 '<header><span class="or-tag">'+esc(t.code)+'</span><span class="or-product-stage">'+esc(badge(t.stage))+'</span></header>'+
 '<h3>'+esc(t.name)+'</h3><p class="or-readiness-percent">'+esc(normal)+' <small>planning estimate</small></p>'+
 '<div class="or-readiness-meter" aria-label="Planning estimate '+esc(normal)+'"><span style="width:'+Number(t.range[1])+'%"></span></div>'+
 '<p><strong>Registry:</strong> '+esc(availability)+'</p>'+
 '<p><strong>Next acceptance:</strong> '+esc(t.gate)+'</p>'+
 '<div class="or-card-actions"><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(t.roadmapId)+'">Open '+esc(t.roadmapId)+'</button></div></article>';
}
function supporting(t){
 return '<article class="or-product-card or-capability"><header><span class="or-tag">'+esc(t.code)+'</span><span class="or-product-stage">Supporting system · not a separate Stripe SKU</span></header>'+
 '<h3>'+esc(t.name)+'</h3><p class="or-readiness-percent">'+esc(t.range.join('–'))+'% <small>planning estimate</small></p>'+
 '<p>'+esc(t.gate)+'</p><div class="or-card-actions"><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(t.roadmapId)+'">Open '+esc(t.roadmapId)+'</button></div></article>';
}
function renderProducts(){
 if(!review)return;
 summary();
 const tools=review.toolDefinitions||[],market=new Map((catalog?.tools||[]).map(t=>[t.tool_code,t]));
 const keyword=String($('or-readiness-search')?.value||'').trim().toLowerCase();
 const phase=String($('or-readiness-stage')?.value||'');
 const rows=tools.filter(t=>(!phase||t.stage===phase)&&(!keyword||[t.code,t.name,t.stage,t.gate].join(' ').toLowerCase().includes(keyword)));
 if($('or-readiness-summary'))$('or-readiness-summary').textContent=
  tools.length+' source-registered tool definitions: 4 principal $29.99/month SKUs and 17 specialist beta/planned modules. '+
  (catalog?.available?catalog.tools.length+' records returned by the existing Supabase catalog.':'Live Supabase product records not verified.')+
  ' Estimates do NOT mean released functionality.';
 if($('or-readiness-tools'))$('or-readiness-tools').innerHTML=rows.length?rows.map(t=>card(t,market)).join(''):'<p class="or-muted">No matching development records.</p>';
 if($('or-readiness-support'))$('or-readiness-support').innerHTML=(review.supportingSystems||[]).map(supporting).join('');
 if($('or-readiness-work')){
  $('or-readiness-work').innerHTML=(review.nextWork||[]).map(x=>
   '<article class="or-readiness-work"><span class="or-tag">'+esc(x.priority)+'</span><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.exitCriterion)+'</p></div><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(x.roadmapId)+'">'+esc(x.roadmapId)+'</button></article>').join('');
 }
}
function renderAudit(){
 if(!review)return;
 const n=$('or-audit-counters');
 if(n){
  const original=counts||{core:0,trace:0,total:0};
  const ledger=engineering?.counts||{};
  const statuses=Object.entries(ledger).map(([stage,val])=>esc(stage.replaceAll('_',' '))+': '+Number(val)).join(' · ');
  n.innerHTML='<p><strong>Authoritative loaded register:</strong> '+original.core+' primary commitments; '+original.trace+' historical source requirements; '+original.total+' total. All historical lines are references, not extra blockers.</p>'+
   '<p><strong>Engineering review snapshot:</strong> '+statuses+'. These labels are separate from Owner-saved checkboxes.</p>'+
   '<p><strong>Current source assessment:</strong> '+esc(engineering?.asOf||'not available')+' · baseline '+esc((engineering?.baseline||'unknown').slice(0,12))+
   '. Check the deployed Cloudflare manifest and current GitHub SHA separately; a recent commit does not prove production deployment.</p>';
 }
 const plans=$('or-readiness-plans');
 if(plans)plans.innerHTML=(review.memberships||[]).map(p=>
   '<tr><th scope="row">'+esc(p.name)+'</th><td>'+esc(p.scope)+'</td><td>'+
   (catalog?.available?(catalog.plans.some(x=>x.plan_code===p.code)?'Database catalog record returned; checkout requires separate verification':'Not returned in database catalog'):'Current catalog unavailable')+
   '</td></tr>').join('');
}
function render(data){
 review=data?.productReadiness||null;
 catalog=data?.productInventory||null;
 engineering=data?.engineeringReview||null;
 counts={core:(data.items||[]).filter(x=>x.scope==='core').length,
  trace:(data.items||[]).filter(x=>x.scope==='trace').length,
  total:(data.items||[]).length};
 if(!review)return;
 renderProducts();renderAudit();
}
function bind(){
 $('or-readiness-search')?.addEventListener('input',renderProducts);
 $('or-readiness-stage')?.addEventListener('change',renderProducts);
 for(const id of ['or-catalog-product-readiness','or-catalog-audit']){
  $(id)?.addEventListener('click',e=>{const button=e.target.closest('button[data-readiness-task]');if(button)openTask(button.dataset.readinessTask)});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.OwnerProductReadinessV91={render,isCatalog:s=>s==='product-readiness'||s==='verification-audit'};
})();
