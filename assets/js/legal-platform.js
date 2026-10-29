(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function inline(s){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')}
 function render(md){
  const lines=String(md||'').replace(/\r/g,'').split('\n');
  let html='',para=[],list=[],open=false;
  const flushP=()=>{if(para.length){html+='<p>'+inline(para.join(' '))+'</p>';para=[]}};
  const flushL=()=>{if(list.length){html+='<ul>'+list.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>';list=[]}};
  const section=()=>{flushP();flushL();if(open)html+='</section>';
   html+='<section class="gu-policy-section">';open=true};
  for(const raw of lines){
   const line=raw.trim();if(!line){flushP();flushL();continue}
   const heading=line.match(/^(#{1,4})\s+(.+)$/);
   if(heading){section();const level=Math.max(2,heading[1].length-1);html+='<h'+level+'>'+inline(heading[2])+'</h'+level+'>';continue}
   const item=line.match(/^[-*]\s+(.+)$/);
   if(item){flushP();list.push(item[1]);continue}
   flushL();if(!open)section();para.push(line);
  }
  flushP();flushL();if(open)html+='</section>';
  return html;
 }
 async function init(){const code=document.body.dataset.legalDoc,h=document.getElementById('legal-doc');if(!code||!h)return;const sb=await window.getSupabaseClient(),{data,error}=await sb.from('legal_documents').select('*').eq('document_code',code).eq('status','published').maybeSingle();if(error||!data){h.innerHTML='<div class="notice">Policy document unavailable.</div>';return}document.title=`${data.title} | The Stock Market: From the Ground Up`;h.innerHTML=`<div class="eyebrow">Policy · Version ${esc(data.version)}</div><h1>${esc(data.title)}</h1><p><small>Effective ${new Date(data.effective_at).toLocaleDateString()}</small></p><article class="v13-card v132-policy-body">${render(data.body_markdown)}</article>`}
 // Related conditions are separate customer-facing pages, not hidden internal drafts.
 const origInit=init;
 init=async function(){await origInit();const host=document.getElementById('legal-doc');
  if(!host||!host.querySelector('.v132-policy-body'))return;
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Related policies and purchase terms');
  nav.className='v13-card gu-legal-related';nav.style.marginTop='1.75rem';
  nav.innerHTML='<h2>Related policies &amp; purchase terms</h2><ul>'+
   '<li><a href="/legal.html">Legal & Policies directory</a></li>'+
   '<li><a href="/terms.html">Terms of Service</a></li>'+
   '<li><a href="/refund-policy.html">Refund & Cancellation Policy</a></li>'+
   '<li><a href="/subscription-terms.html">Subscription & Billing Terms</a></li>'+
   '<li><a href="/privacy.html">Privacy Policy</a></li>'+
   '<li><a href="/cookie-policy.html">Cookie & Local Storage Notice</a></li>'+
   '<li><a href="/educational-disclaimer.html">Educational & Trading Disclaimer</a></li>'+
   '<li><a href="/editorial-guidelines.html">Editorial Guidelines</a></li>'+
   '<li><a href="/ai-use-disclosure.html">AI Use Disclosure</a></li>'+
   '<li><a href="/affiliate-disclosure.html">Affiliate & Referral Disclosure</a></li>'+
   '<li><a href="/advertising-disclosure.html">Advertising & Sponsorship Disclosure</a></li>'+
   '<li><a href="/related-entities-disclosure.html">Related Brands & Third-Party Relationships</a></li>'+
   '<li><a href="/community-guidelines.html">Community Guidelines</a></li>'+
   '<li><a href="/copyright.html">Copyright & Intellectual Property</a></li>'+
   '<li><a href="/dmca-takedown-policy.html">DMCA Takedown Policy</a></li>'+
   '<li><a href="/accessibility.html">Accessibility Statement</a></li>'+
   '<li><a href="/founding-600-terms.html">Founding 600</a></li>'+
   '<li><a href="/crownlight-sparks-terms.html">Crownlight Lumens (non-cash credits)</a></li>'+
   '<li><a href="/digital-books-terms.html">Digital Books & Downloads</a></li>'+
   '<li><a href="/bootcamp-terms.html">Boot Camp & Clinic Terms</a></li>'+
   '</ul>';host.appendChild(nav);
 };
 if(!document.querySelector('link[data-gu-legal-design]')){
  const sheet=document.createElement('link');sheet.rel='stylesheet';
  sheet.href='/assets/css/legal-policy-cards-v1.css?v=20261027';
  sheet.dataset.guLegalDesign='1';document.head.append(sheet);
 }
 document.addEventListener('DOMContentLoaded',init)
})();
