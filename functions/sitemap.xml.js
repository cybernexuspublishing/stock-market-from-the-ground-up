/* v0.14.0.108: core public sitemap. Only existing public HTML routes.
 * DO NOT include user profiles, private forum posts, Labs with unreleased
 * answer keys, draft legal content or preview-stage environments.
 */
const core=Object.freeze([
 '/', '/books.html','/learn.html','/labs.html','/tools.html',
 '/membership.html','/store.html','/market-commons.html','/about.html'
]);
const legal=Object.freeze({
 PRIVACY:'/privacy.html',TERMS:'/terms.html',REFUNDS:'/refund-policy.html',
 COOKIES:'/cookie-policy.html',SUBSCRIPTION:'/subscription-terms.html'
});
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
async function publishedLegalRoutes(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),
  key=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)return [];
 try{
  const url=base+'/rest/v1/legal_documents?select=document_code,status,effective_at'+
   '&status=eq.published&limit=30';
  const r=await fetch(url,{method:'GET',cache:'no-store',signal:AbortSignal.timeout(1500),
   headers:{apikey:key,accept:'application/json'}});
  if(!r.ok)return [];
  const rows=await r.json();
  if(!Array.isArray(rows))return [];
  const now=Date.now();
  return [...new Set(rows.filter(x=>x.status==='published'&&legal[x.document_code]&&
    Number.isFinite(Date.parse(x.effective_at))&&Date.parse(x.effective_at)<=now)
   .map(x=>legal[x.document_code]))];
 }catch{return []}
}
export async function onRequest({request,env}){
 const base=new URL(request.url);
 if(base.hostname.endsWith('.pages.dev'))return new Response('Not available on preview deployments.',{
  status:404,headers:{'x-robots-tag':'noindex, nofollow','cache-control':'no-store'}});
 const entries=[...core,...await publishedLegalRoutes(env)];
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 entries.map(path=>'  <url><loc>'+esc(base.origin+path)+'</loc></url>').join('\n')+
 '\n</urlset>\n';
 return new Response(xml,{headers:{
  'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=300',
  'x-content-type-options':'nosniff'}});
}
