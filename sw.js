/* v0.14.0.97: public-only cache; private pages and API requests bypass CacheStorage. */
importScripts('/assets/js/route-policy.js');
const POLICY=self.GroundUpRoutePolicy;
const CACHE='groundup-v014097-public';
const PUBLIC_CORE=['/','/offline.html','/signin.html','/create-account.html','/store.html','/membership.html','/help.html','/assets/js/route-policy.js','/assets/js/auth-boundary.js','/assets/js/service-worker.js'];
const cacheableAsset=/\.(?:css|js|json|webmanifest|png|jpe?g|webp|svg|woff2?)$/i;
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.allSettled(PUBLIC_CORE.map(p=>c.add(new Request(p,{cache:'reload'}))));await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith('groundup-')&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url),p=url.pathname;
 if(req.method!=='GET'||url.origin!==self.location.origin||p.startsWith('/api/')||p.startsWith('/functions/'))return;
 if(POLICY.isProtected(p)){e.respondWith(fetch(req,{cache:'no-store'}).catch(async()=>req.mode==='navigate'?(await caches.match('/offline.html'))||new Response('Offline',{status:503,headers:{'content-type':'text/plain'}}):new Response('Offline',{status:503})));return}
 if(req.mode==='navigate'){e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok&&PUBLIC_CORE.includes(p)){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r}).catch(async()=> (PUBLIC_CORE.includes(p)?await caches.match(req):null)||(await caches.match('/offline.html'))||new Response('Offline',{status:503})));return}
 if(cacheableAsset.test(p))e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r}).catch(()=>caches.match(req).then(r=>r||new Response('Offline',{status:503}))))
});
