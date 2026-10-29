(()=>{'use strict';
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
let cases=[],shown=24,eligible=false;
function interval(x){return /(?:^|[^0-9])(1|3|5|15)\s*[- ]?\s*m(?:in(?:utes?)?)?\b/i.exec(String(x||''))?.[1]||'1'}
function caseCard(x){
 const href='/verified-replay.html?scope=historical&ticker='+encodeURIComponent(x.ticker)+'&date='+encodeURIComponent(x.date)+'&timeframe='+interval(x.timeframe);
 const custom=String(x.href||'');
 const lab=/^\/(?!\/)[a-z0-9/_?.=&%-]+$/i.test(custom)?custom:'/site-lab.html?lab='+encodeURIComponent(x.id);
 return '<article class="v135-card"><div class="eyebrow">'+e(x.ticker)+' · '+e(x.date)+'</div><h3>'+e(x.title)+'</h3>'+
 '<p class="small">'+e(x.timeframe||'Start with 1-minute; verify Lab instructions')+'</p>'+
 '<a class="btn" href="'+e(href)+'">Open Website Classroom</a> <a class="btn secondary" href="'+e(lab)+'">Independent thinkorswim Instructions</a>'+
 '<p class="small">Real historical charts require a separately published, rights-approved source.</p></article>';
}
function draw(){
 if(!eligible)return;
 const q=String($('#v135-case-search')?.value||'').trim().toLowerCase();
 const found=cases.filter(x=>(x.title+' '+x.ticker+' '+x.date+' '+x.id).toLowerCase().includes(q));
 const view=found.slice(0,shown);
 $('#v135-labs').innerHTML=view.length?view.map(caseCard).join(''):'<p class="v135-card">No case matches this search.</p>';
 $('#v135-case-count').textContent='Showing '+view.length+' of '+found.length+' matching cases.';
 $('#v135-case-more').hidden=view.length>=found.length;
}
async function init(){
 try{
  const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();
  if(!session)throw Error('Sign in to view training access.');
  const res=await fetch('/api/ondemand-training',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  const r=await res.json();if(!r.ok)throw Error(r.error||'Training unavailable.');
  eligible=r.access==='active';
  $('#v135-training-status').textContent=eligible?'Training access confirmed.':'Training preview — cases require an eligible membership.';
  $('#v135-modules').innerHTML=(r.modules||[]).map(x=>'<article class="v135-card"><div class="eyebrow">'+e(x.book)+'</div><h3>'+e(x.title)+'</h3>'+
   (eligible?'<p>'+e(x.focus||'')+'</p><p class="small"><strong>Exercise:</strong> '+e(x.process||'')+'</p>':
   '<p class="small">Preview · eligible access required.</p>')+'</article>').join('');
  cases=eligible?(r.labs||[]).filter(x=>x?.ticker&&x?.date&&x?.id):[];
  $('#v135-case-controls').hidden=!eligible;
  if(eligible){draw();}else $('#v135-labs').innerHTML='<p class="v135-card">Historical exercises require eligible access. <a href="/membership.html">View membership options.</a></p>';
  $('#v135-training-content').hidden=false;
 }catch(err){$('#v135-training-status').textContent=err.message||'Training service unavailable.';}
}
document.addEventListener('input',ev=>{if(ev.target?.id==='v135-case-search'){shown=24;draw()}});
document.addEventListener('click',ev=>{if(ev.target?.id==='v135-case-more'){shown+=24;draw()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();