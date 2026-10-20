/* v0.14.0.109: public-only, explicitly enumerated SEO sitemap.
 * Do not add private dashboard, admin, member notes, legal shell pages, or
 * under-review market case data until the corresponding release gate passes.
 */
export const PUBLIC_PAGES=Object.freeze([
 '/','/books.html','/learn.html','/tools.html','/membership.html',
 '/store.html','/about.html','/help.html','/labs.html','/forum.html','/market-commons.html'
]);
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function onRequestGet({request,env}){
 // One configured canonical public domain is preferred. Until installed,
 // use the request host only if it is HTTPS and has no URL credentials.
 const configured=String(env?.PUBLIC_SITE_ORIGIN||'').trim();
 let host;try{host=new URL(configured||request.url)}catch{return new Response('Sitemap host unavailable',{status:503})}
 if(host.protocol!=='https:'||host.username||host.password||host.search||host.hash||
 (configured && host.pathname!=='/' && host.pathname!==''))
 return new Response('Public sitemap host is not verified',{status:503});
 const origin=host.origin;
 const payload='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 PUBLIC_PAGES.map(path=>'  <url><loc>'+xml(origin+path)+'</loc></url>').join('\n')+
 '\n</urlset>';
 return new Response(payload,{headers:{'content-type':'application/xml; charset=utf-8',
  'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
}
