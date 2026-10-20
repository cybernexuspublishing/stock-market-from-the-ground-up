/* v0.14.0.109: robots crawler hints are NOT access controls. */
export function onRequestGet({request,env}){
 const configured=String(env?.PUBLIC_SITE_ORIGIN||'').trim();
 let origin;try{origin=new URL(configured||request.url)}catch{return new Response('Unavailable',{status:503})}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||
 (configured&&origin.pathname!=='/'))return new Response('Unavailable',{status:503});
 const rules=['User-agent: *','Allow: /','Disallow: /api/','Disallow: /admin',
 'Disallow: /owner-','Disallow: /dashboard','Disallow: /account',
 'Disallow: /journal','Disallow: /simulator','Disallow: /site-lab',
 'Disallow: /market-tutor','Disallow: /training-editor','Disallow: /skills',
 'Disallow: /privacy.html','Disallow: /terms.html',
 'Sitemap: '+origin.origin+'/sitemap.xml',''];
 return new Response(rules.join('\n'),{headers:{
  'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600',
  'x-content-type-options':'nosniff'}});
}
