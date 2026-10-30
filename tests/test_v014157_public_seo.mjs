/* D17 deterministic SEO whitelist; fake fixtures only, no external traffic. */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'gu-d17-seo-'));
const html=(body,head='')=>'<!doctype html><html><head><title>Example</title>'+head+'</head><body><main>'+body+'</main></body></html>';
try{
 // The SEO build checks the real deployed public GA4 controller before injecting it.
 mkdirSync(join(root,'assets','js'),{recursive:true});
 copyFileSync('assets/js/ga4-consent-v1.js',join(root,'assets','js','ga4-consent-v1.js'));
 writeFileSync(join(root,'index.html'),html('Public homepage'));
 writeFileSync(join(root,'about.html'),html('Author biography'));
 const otherPublic=['books','store','learn','tools','lab-samples','membership','help','philosophy'];
 for(const slug of otherPublic)writeFileSync(join(root,slug+'.html'),html('Public '+slug));
 writeFileSync(join(root,'admin.html'),html('Private Admin'));
 writeFileSync(join(root,'dashboard.html'),html('Private member dashboard'));
 writeFileSync(join(root,'privacy.html'),html('Legal review pending','<meta name="robots" content="noindex,follow">'));
 const run=(origin)=>spawnSync(process.execPath,['scripts/build-public-seo.mjs'],{
  cwd:process.cwd(),encoding:'utf8',env:{...process.env,GU_SITE_BUILD_DIR:root,GU_PUBLIC_SITE_ORIGIN:origin}});
 const origin='https://example.test';
 const result=run(origin);
 assert.equal(result.status,0,'Source SEO build failed: '+result.stderr);
 const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8');
 assert(sitemap.includes('<loc>'+origin+'/</loc>'));
 assert(sitemap.includes('<loc>'+origin+'/about.html</loc>'));
 assert.equal((sitemap.match(/<url><loc>/g)||[]).length,10,'Exactly 10 eligible public pages');
 assert(!sitemap.includes('/admin.html')&&!sitemap.includes('/dashboard.html')&&!sitemap.includes('/privacy.html'));
 assert(readFileSync(join(root,'admin.html'),'utf8').includes('noindex,nofollow'));
 assert(readFileSync(join(root,'dashboard.html'),'utf8').includes('noindex,nofollow'));
 assert(readFileSync(join(root,'index.html'),'utf8').includes('<link rel="canonical" href="'+origin+'/">'));
 const homepage=readFileSync(join(root,'index.html'),'utf8');
 const titles=new Set(),descriptions=new Set();
 for(const slug of ['index','about',...otherPublic]){
  const page=readFileSync(join(root,slug+'.html'),'utf8');
  const title=page.match(/<title>([^<]+)<\/title>/i)?.[1];
  const summary=page.match(/<meta name="description" content="([^"]+)">/i)?.[1];
  assert(title && summary,'Missing title or description: '+slug);
  assert(!titles.has(title),'Duplicate public title: '+slug);
  assert(!descriptions.has(summary),'Duplicate public summary: '+slug);
  titles.add(title);descriptions.add(summary);
  const url=origin+(slug==='index'?'/':'/'+slug+'.html');
  assert(page.includes('<link rel="canonical" href="'+url+'">'),'Canonical mismatch: '+slug);
  assert(page.includes('<meta property="og:url" content="'+url+'">'),'Social URL mismatch: '+slug);
  assert.equal((page.match(/<meta property="og:title"/g)||[]).length,1,'Duplicate social metadata: '+slug);
  assert.equal((page.match(/ga4-consent-v1\.js/g)||[]).length,1,'Duplicate analytics controller: '+slug);
 }

 assert.equal((homepage.match(/ga4-consent-v1\.js/g)||[]).length,1,'Public page has exactly one consent controller');
 assert(!homepage.includes('googletagmanager.com'),'Do not load Google directly before permission');
 for(const page of ['admin.html','dashboard.html','privacy.html']){
  assert(!readFileSync(join(root,page),'utf8').includes('ga4-consent-v1.js'),'No Analytics script on private/legal page: '+page);
 }
 assert(readFileSync(join(root,'robots.txt'),'utf8').includes('Sitemap: '+origin+'/sitemap.xml'));
 assert(readFileSync(join(root,'privacy.html'),'utf8').includes('noindex,follow'));
 assert.equal(run('http://not-secure.test').status,1,'Refuse insecure SEO origin');
 assert.equal(run('https://example.test/other/path').status,1,'Refuse canonical path prefix');
 const rerun=run(origin);
 assert.equal(rerun.status,0,'Idempotent build must succeed');
 assert.equal((readFileSync(join(root,'index.html'),'utf8').match(/ga4-consent-v1\.js/g)||[]).length,1,
  'Rebuilding must not duplicate the consent controller');
 assert.equal((readFileSync(join(root,'index.html'),'utf8').match(/rel="canonical"/g)||[]).length,1,
  'Rebuilding must not duplicate canonical elements');
 console.log('PASS public SEO: 10 unique titles/descriptions, canonicals, social tags, consent isolation, sitemap, protected noindex, rebuild');
}finally{rmSync(root,{recursive:true,force:true})}
