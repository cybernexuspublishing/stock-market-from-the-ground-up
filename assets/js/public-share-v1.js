/* V1 voluntary share/referral actions: NO tracking, no friend contacts,
 * cookies, localStorage, unique codes, automatic posting or marketing emails.
 * Only source-defined canonical HTTPS links may be shared.
 */
(()=>{'use strict';
const permitted=new Set(['/free-foundations-challenge.html','/candle-practice.html','/market-vs-limit-orders.html','/support-resistance-basics.html']);
async function share(button){
 const path=button.dataset.guSharePath,title=String(button.dataset.guShareTitle||'Free stock market education').slice(0,105);
 const wrapper=button.parentElement;
 const output=wrapper?.querySelector('[data-gu-share-status]');
 if(!permitted.has(path)){if(output)output.textContent='The educational share link is not available.';return;}
 const url=location.origin+path;
 if(location.protocol!=='https:'){if(output)output.textContent='Sharing is available on the secure production website.';return;}
 button.disabled=true;
 try{
  if(typeof navigator.share==='function'){
   try {await navigator.share({title,text:'Explore this free beginner stock-market lesson.',url});
     if(output)output.textContent='Share sheet opened. You choose whether to send the link.';
   }catch(e){if(output)output.textContent=e?.name==='AbortError'?'Share canceled. No link was sent.':'Sharing is unavailable; you can copy this page address instead.';}
  }else if(navigator.clipboard?.writeText){
   await navigator.clipboard.writeText(url);
   if(output)output.textContent='Public lesson link copied. Choose whether to share it.';
  }else if(output){output.textContent='Copy the address of this public page to share it.';}
 }catch{if(output)output.textContent='Copy the page address manually if your browser blocks sharing.';}
 finally{button.disabled=false;}
}
document.addEventListener('click',event=>{
 const button=event.target?.closest?.('button[data-gu-share-path]');
 if(button)void share(button);
});
})();
