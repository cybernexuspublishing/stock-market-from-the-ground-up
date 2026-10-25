/* v0.14.0.228 Advertising inquiry: public, verified, no checkout. */
(()=>{'use strict';
const e=id=>document.getElementById(id),form=e('gu-ad-inquiry-form'),status=e('gu-ad-inquiry-status'),
load=e('gu-ad-inquiry-loading');
if(!form||!status||!load)return;
let widget=null,key=null,token='';
async function init(){
 try{
  const res=await fetch('/api/ad-sales',{cache:'no-store'});
  if(!res.ok)throw Error('Advertising service unavailable');
  const data=await res.json();
  if(!data.acceptingInquiries){load.textContent='Sponsorship inquiries are currently handled by email.';return}
  const select=e('gu-ad-package-select');select.replaceChildren();
  for(const p of data.packages||[]){
   const option=document.createElement('option');option.value=p.code;option.textContent=p.name+' — Request a quote';select.append(option);
  }
  if(!select.options.length){load.textContent='No sponsorship categories are accepting inquiries at present.';return}
  key=String(data.turnstileSiteKey||'');
  if(!key){load.textContent='For now, please contact us by email. The secure inquiry form is not configured.';return}
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
  script.onload=()=>{if(!window.turnstile){load.textContent='Human verification could not load; please use email.';return}
   widget=window.turnstile.render('#gu-ad-turnstile',{sitekey:key,
    callback:value=>{token=value;},'expired-callback':()=>{token='';},
    'error-callback':()=>{token='';}});
   form.hidden=false;load.hidden=true;
  };
  script.onerror=()=>{load.textContent='The secure inquiry form is temporarily unavailable; please email us.'};
  document.head.append(script);
 }catch{load.textContent='Advertising inquiries are currently available by email.'}
}
form.addEventListener('submit',async event=>{
 event.preventDefault();const btn=e('gu-ad-inquiry-submit'),data=new FormData(form);
 if(!token){status.textContent='Complete human verification first.';return}
 btn.disabled=true;status.textContent='Sending inquiry for manual review…';
 const payload=Object.fromEntries(['company','contact','email','website','packageCode','message','honeypot'].map(k=>[k,String(data.get(k)||'')]));
 payload.action='request_quote';payload.turnstileToken=token;
 try{
  const res=await fetch('/api/ad-sales',{method:'POST',credentials:'same-origin',
   headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const x=await res.json();
  if(!res.ok||x.ok!==true)throw Error(x.error||'Your inquiry was not confirmed.');
  status.textContent='Inquiry received. Reference: '+x.reference+'. We will review it manually. No charge was made.';
  form.reset();token='';if(widget!==null)window.turnstile?.reset(widget);
 }catch(err){status.textContent=err.message||'Submission unavailable. Please use the email contact.';token='';window.turnstile?.reset(widget)}
 finally{btn.disabled=false}
});
init();
})();