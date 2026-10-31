/* Independent Google AdSense loader. All page and approval switches are
 * server controlled, default OFF, and never override ad-free member access.
 * Owner must configure approved Google ad units before advertisements render.
 */
(async()=>{
 const paths={'/':'/index.html','/index.html':'/index.html','/knowledge-database':'/knowledge-database.html',
 '/knowledge-database.html':'/knowledge-database.html','/store':'/store.html',
 '/store.html':'/store.html','/advertise':'/advertise.html','/advertise.html':'/advertise.html'};
 const page=paths[location.pathname];if(!page)return;
 try{
  // All signed-in sessions are excluded by default, including Owner/Admin.
  // A stored session might not yet be available while the auth library loads.
  if(location.pathname.startsWith('/admin'))return;
  if(await (async()=>{try{
   if(!window.getSupabaseClient)return true;
   const client=await window.getSupabaseClient();
   return Boolean((await client.auth.getSession()).data?.session);
  }catch{return true}})())return;
  // Only the explicit server-approved public setting can authorize loading.
  const response=await fetch('/api/adsense-controls?page='+encodeURIComponent(page),{cache:'no-store'});
  if(!response.ok)return;
  const config=await response.json();
  if(config.enabled!==true||config.pageEnabled!==true||
     config.publisherId!=='ca-pub-6531971840615114')return;
  if(document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'))return;
  const script=document.createElement('script');script.async=true;
  script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6531971840615114';
  script.crossOrigin='anonymous';document.head.append(script);
 }catch{/* Fail closed. Never disrupt learning. */}
})();
