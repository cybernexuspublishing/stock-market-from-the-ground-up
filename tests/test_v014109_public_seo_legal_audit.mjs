// v0.14.0.109 — public crawlers + private Owner legal publication readiness.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet as sitemap,PUBLIC_PAGES} from '../functions/sitemap.xml.js';
import {onRequestGet as robots} from '../functions/robots.txt.js';
import {onRequest as owner} from '../functions/api/owner-roadmap.js';
import {EXPECTED_LEGAL_CODES} from '../functions/_lib/owner-legal-audit-v014109.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',site='https://education.example.org';
const ctx={env:{PUBLIC_SITE_ORIGIN:site},request:new Request(site+'/sitemap.xml')};
let response=sitemap(ctx),xml=await response.text();
assert.equal(response.status,200);assert(xml.startsWith('<?xml version="1.0"'));
assert.equal((xml.match(/<loc>/g)||[]).length,PUBLIC_PAGES.length);
assert(xml.includes(site+'/books.html')&&xml.includes(site+'/store.html'));
for(const banned of ['/admin','/api/','/dashboard','/journal','/owner-roadmap',
 '/market-tutor','/privacy.html','/terms.html','/training-editor']){
 assert(!xml.includes(site+banned),'Must not index private or unpublished shell route: '+banned);
}
response=robots({env:ctx.env,request:new Request(site+'/robots.txt')});
const rules=await response.text();
assert.equal(response.status,200);assert(rules.includes('Sitemap: '+site+'/sitemap.xml'));
assert(rules.includes('Disallow: /api/')&&rules.includes('Disallow: /admin'));
assert.equal(sitemap({env:{PUBLIC_SITE_ORIGIN:'http://insecure.example'},request:ctx.request}).status,503);
assert.equal(robots({env:{PUBLIC_SITE_ORIGIN:'https://site.example/?junk=1'},request:ctx.request}).status,503);
const policyFiles=['terms.html','privacy.html','copyright.html','accessibility.html',
 'cookie-policy.html','refund-policy.html','subscription-terms.html',
 'community-guidelines.html','advertising-disclosure.html','educational-disclaimer.html'];
for(const file of policyFiles){
 const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 assert(html.includes('content="noindex,follow"'),'Legal client-only placeholder must not be indexed: '+file);
 assert(html.includes('data-legal-doc'),'Existing legal document loader must remain intact');
}
let role='OWNER',unavailable=false,legalReads=0;
const orig=globalThis.fetch,env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testing',SUPABASE_SECRET_KEY:'sb_secret_testing'};
const legal=EXPECTED_LEGAL_CODES.map((code,i)=>({document_code:code,status:i===2?'draft':'published',
 version:'1.0',body_markdown:'Author-reviewed body placeholder — '.repeat(i===3?2:20)}));
const send=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const v=String(url);
 if(v.endsWith('/auth/v1/user'))return send({id:uid});
 if(v.includes('/profiles?'))return send([{account_kind:'member'}]);
 if(v.includes('/admin_user_roles?'))return send([{role_code:role,expires_at:null}]);
 if(v.includes('/admin_user_flags?'))return send([{status:'active'}]);
 if(v.includes('/legal_documents?')){
  legalReads++;
  assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(opts.headers.authorization,undefined);
  return unavailable?send({message:'unavailable'},404):send(legal);
 }
 throw Error('Unexpected backend route '+v);
};
const req=()=>new Request(site+'/api/owner-roadmap?action=legal-publication-v014109',
 {headers:{authorization:'Bearer owner-user-session'}});
try{
 role='ADMIN';let r=await owner({env,request:req()});assert.equal(r.status,403);
 assert.equal(legalReads,0,'Unprivileged users cannot enumerate unpublished legal documents');
 role='OWNER';r=await owner({env,request:req()});let body=await r.json();
 assert.equal(r.status,200);assert.equal(body.legalAudit.available,true);
 assert.equal(body.legalAudit.documents.length,10);assert.equal(body.legalAudit.publishedCount,9);
 assert.equal(body.legalAudit.allPublished,false);assert.equal(body.legalAudit.legalAdequacyVerified,false);
 assert(body.legalAudit.documents.find(x=>x.code==='ACCESSIBILITY').needsManualReview);
 assert(!JSON.stringify(body).includes('Author-reviewed body placeholder'),'Public legal body text must not be in Owner status response');
 unavailable=true;r=await owner({env,request:req()});body=await r.json();
 assert.equal(body.legalAudit.available,false);
 assert.equal(body.legalAudit.publishedCount,null,'Missing table must not become zero published documents');
 const ui=readFileSync(new URL('../owner-roadmap.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../assets/js/owner-roadmap-product-readiness-v01491.js',import.meta.url),'utf8');
 assert(ui.includes('or-legal-readiness-load')&&js.includes('loadOwnerLegalReadiness()'));
 console.log('PASS v109: real public-only sitemap/robots, no client-shell legal indexing, 10-document Owner legal audit, no PII, safe fail-closed states.');
}finally{globalThis.fetch=orig}
