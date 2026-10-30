/* Owner-only manual distribution: no network, attribution, scheduling or posting. */
(()=>{'use strict';
 const status=document.getElementById('gu-v2-social-status');
 if(!status)return;
 document.addEventListener('click',async event=>{
  const button=event.target?.closest?.('button[data-gu-copy-post]');
  if(!button)return;
  const text=button.closest('article')?.querySelector('.gu-v2-copy-body')?.textContent||'';
  if(!text)return;
  try{await navigator.clipboard.writeText(text);
   status.textContent='Copied. You decide if and where to publish after editorial and community-rule review.';
  }catch{status.textContent='Clipboard blocked. Select and copy the item text manually.';}
 });
})();