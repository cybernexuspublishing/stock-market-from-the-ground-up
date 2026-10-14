/* Only active service-worker registration for v0.13.5; old registration files remain archival. */
(()=>{'use strict';
  if(!('serviceWorker' in navigator)||location.protocol!=='https:')return;
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
      await reg.update();
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        const key='v014010-controller-reload';
        if(sessionStorage.getItem(key)==='1')return;
        sessionStorage.setItem(key,'1');location.reload();
      },{once:true});
      setTimeout(()=>sessionStorage.removeItem('v014010-controller-reload'),12000);
    }catch(error){console.warn('[v0.13.5] Service worker registration failed',error)}
  });
})();
