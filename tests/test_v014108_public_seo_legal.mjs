// v108: public SEO and published legal documents — no internet, no real DB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishedPolicyHtml,getPublishedPolicyMarkup,publicLegalPaths}
 from '../functions/_lib/public-legal-ssr-v014108.js';
import {onRequest as sitemap} from '../functions/sitemap.xml.js';
import {onRequest as robots} from '../functions/robots.txt.js';
const load=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public',
 SUPABASE_SECRET_KEY:'sb_secret_should_not_be_sent'};
const legalRow={document_code:'PRIVACY',status:'published',title:'Privacy Policy',version:'1.0',
 effective_at:'2020-01-01T00:00:00Z',
 body_markdown:'# Privacy\n**Important** details.\n\n- We respect personal data.\n- Never inject <script>alert("bad")</script>.'};
const trusted=publishedPolicyHtml(legalRow);
assert(trusted.includes('Privacy Policy'));
assert(trusted.includes('<strong>Important</strong>'));
assert(trusted.includes('&lt;script&gt;'));
assert(!trusted.includes('<script>'));
assert.equal(publishedPolicyHtml({...legalRow,status:'draft'}),null,'Never render legal drafts');
assert.equal(publishedPolicyHtml({...legalRow,effective_at:'2099-01-01T00:00:00Z'}),null,'Future policies are not effective');
assert.deepEqual(Object.keys(publicLegalPaths).length,5);
const oldFetch=globalThis.fetch,requests=[];
globalThis.fetch=async(url,opts={})=>{
 const path=String(url);requests.push({path,opts});
 if(path.includes('legal_documents?')){
  assert.equal(opts.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);
  assert(!opts.headers.authorization,'Never send service-role credentials to public legal reads');
  if(path.includes('document_code=eq.PRIVACY'))return new Response(JSON.stringify([legalRow]));
  return new Response(JSON.stringify([{
   document_code:'PRIVACY',status:'published',effective_at:'2020-01-01T00:00:00Z'
  }]));
 }
 throw Error('Unexpected public SEO call '+path);
};
try{
 let info=await getPublishedPolicyMarkup(env,new Request('https://education.example/privacy.html'));
 assert(info?.markup.includes('Privacy Policy'));
 assert(!info.markup.includes('<script>'));
 info=await getPublishedPolicyMarkup(env,new Request('https://education.example/admin.html'));
 assert.equal(info,null,'No legal route loader on private/admin path');
 let response=await sitemap({request:new Request('https://education.example/sitemap.xml'),env});
 assert.equal(response.status,200);
 let xml=await response.text();
 assert(xml.includes('<urlset '));
 assert(xml.includes('https://education.example/books.html'));
 assert(xml.includes('https://education.example/privacy.html'));
 assert(!xml.includes('/dashboard')&&!xml.includes('/training-editor')&&!xml.includes('/api/'));
 assert.equal((xml.match(/<loc>/g)||[]).length,10,'Nine public core URLs and one effective policy');
 response=await sitemap({request:new Request('https://branch.project.pages.dev/sitemap.xml'),env});
 assert.equal(response.status,404,'No search engine indexing of preview site sitemap');
 response=await robots({request:new Request('https://education.example/robots.txt')});
 let plain=await response.text();
 assert.equal(response.status,200);
 assert(plain.includes('Disallow: /api/')&&plain.includes('Disallow: /dashboard'));
 assert(plain.includes('Sitemap: https://education.example/sitemap.xml'));
 response=await robots({request:new Request('https://branch.project.pages.dev/robots.txt')});
 plain=await response.text();
 assert(plain.includes('Disallow: /'));
 assert(!plain.includes('Sitemap: '));
 const middleware=load('functions/_middleware.js'),client=load('assets/js/legal-platform.js');
 assert(middleware.includes('getPublishedPolicyMarkup(context.env,context.request)'));
 assert(middleware.includes("el.setAttribute('data-policy-server-rendered','true')"));
 assert(client.includes("h.dataset.policyServerRendered==='true'"));
 assert(!/apikey:s,authorization:'Bearer '\+s/.test(load('functions/managed-pages-sitemap.xml.js')));
 const owner=load('functions/api/owner-roadmap.js');
 assert(owner.includes("action')==='legal-publication-audit'"));
 assert(owner.indexOf('await owner(request,c,env)')<owner.indexOf("action')==='legal-publication-audit'"),'Owner authorization before reading legal statuses');
 assert(!owner.includes('policyBody:row.body_markdown'),'Do not expose policy text in Owner status API');
 console.log('PASS v108: server-side effective legal policies escaped, publishable-only RLS, private route exclusions, preview robots and canonical public XML sitemap.');
}finally{globalThis.fetch=oldFetch}
