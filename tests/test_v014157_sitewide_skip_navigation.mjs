/* D17 source-only accessibility: injected skip links are real, idempotent,
 * keyboard discoverable and do not modify educational body content.
 */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=mkdtempSync(join(tmpdir(),'gu-accessibility-'));
try{
 writeFileSync(join(directory,'index.html'),'<!doctype html><html><head><title>Public</title></head><body><main><h1>Lesson-free page</h1></main></body></html>');
 writeFileSync(join(directory,'admin.html'),'<!doctype html><html><head><title>Staff</title></head><body data-auth-required="true"><main id="admin-pane"><h1>Staff tools</h1></main></body></html>');
 writeFileSync(join(directory,'legacy.html'),'<!doctype html><html><head><title>Legacy</title></head><body><div>No main yet</div></body></html>');
 const run=()=>spawnSync(process.execPath,['scripts/build-site-accessibility.mjs'],{
  cwd:process.cwd(),encoding:'utf8',env:{...process.env,GU_SITE_BUILD_DIR:directory}});
 let result=run();assert.equal(result.status,0,result.stderr);
 let publicHtml=readFileSync(join(directory,'index.html'),'utf8');
 let staffHtml=readFileSync(join(directory,'admin.html'),'utf8');
 assert(publicHtml.includes('<main id="gu-main-content">'));
 assert(publicHtml.includes('href="#gu-main-content"'));
 assert(staffHtml.includes('href="#admin-pane"'));
 assert(staffHtml.includes('data-auth-required="true"'),'Staff auth marker preserved');
 assert(publicHtml.includes('sitewide-accessibility-v014157.css'));
 assert(staffHtml.includes('sitewide-accessibility-v014157.css'));
 assert(!readFileSync(join(directory,'legacy.html'),'utf8').includes('gu-skip-link'),'Do not generate broken link to missing main');
 result=run();assert.equal(result.status,0,result.stderr);
 publicHtml=readFileSync(join(directory,'index.html'),'utf8');
 staffHtml=readFileSync(join(directory,'admin.html'),'utf8');
 assert.equal((publicHtml.match(/class="gu-skip-link"/g)||[]).length,1);
 assert.equal((staffHtml.match(/class="gu-skip-link"/g)||[]).length,1);
 assert.equal((publicHtml.match(/sitewide-accessibility-v014157.css/g)||[]).length,1);
 console.log('PASS D17 keyboard skip navigation, auth-preserving sitewide injection and idempotent builds');
}finally{rmSync(directory,{recursive:true,force:true})}
