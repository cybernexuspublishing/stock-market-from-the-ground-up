/* Public production read-only smoke: page style server must return active policy.
 * Guest URL overrides cannot activate an Owner-only unpublished preview.
 * No authentication, no data writes, no payments or user records.
 */
import assert from 'node:assert/strict';
const base='https://stock-market-from-the-ground-up-d1r.pages.dev';
const modes=new Set(['classic','continuous','focus','compact','spacious']);
async function get(page,mode){
 const u=new URL('/api/page-workspace-presentation',base);
 u.searchParams.set('page',page);if(mode)u.searchParams.set('workspace',mode);
 const r=await fetch(u,{headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
 const data=await r.json().catch(()=>({}));
 assert.equal(r.status,200,'Presentation API must return 200 for '+page+'; got '+r.status+' '+JSON.stringify(data));
 assert.equal(data.ok,true,'API did not verify '+page);
 assert.equal(data.page,page,'Wrong page returned');
 assert(modes.has(data.mode),'Unknown style returned');
 assert.equal(typeof data.published,'boolean');
 return data;
}
for(const page of ['index.html','store.html','forum.html','simulator.html','learn.html']){
 const a=await get(page);
 const bypass=await get(page,'spacious');
 assert.equal(bypass.mode,a.mode,'Guest URL bypassed saved design for '+page);
 console.log('PASS production public page style',page,a.mode,'published='+a.published);
}
const admin=new URL('/api/page-workspace-presentation?page=admin.html&workspace=compact',base);
const denied=await fetch(admin,{signal:AbortSignal.timeout(16000)});
assert.equal(denied.status,400,'Admin page is not eligible for public style overrides');
console.log('PASS production API: no unauthorized previews, valid page policy, admin exclusion');
