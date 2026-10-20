/* v0.14.0.108: explicit public canonical robots response.
 * Robots exclusion is NOT access control; API/RLS continue enforcing privacy.
 */
export async function onRequest({request}){
 const url=new URL(request.url),preview=url.hostname.endsWith('.pages.dev');
 const header=['User-agent: *'];
 const disallow=preview?['/']:[
  '/api/','/admin','/owner-','/dashboard','/account',
  '/journal','/ondemand-training','/verified-replay',
  '/site-lab','/training-editor','/signin','/create-account',
  '/member-','/supabase/','/functions/','/docs/'
 ];
 for(const item of disallow)header.push('Disallow: '+item);
 if(!preview)header.push('Sitemap: '+url.origin+'/sitemap.xml');
 return new Response(header.join('\n')+'\n',{headers:{
  'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=300',
  'x-content-type-options':'nosniff'}});
}
