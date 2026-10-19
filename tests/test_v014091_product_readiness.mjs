// Owner v0.14.0.91 nonproduction source contract test. No DB/provider writes.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ownerProductReadinessV01491 as review} from '../functions/_lib/owner-product-readiness-v01491.js';
import {roadmapCatalog} from '../functions/_lib/owner-roadmap-catalog.js';
import {roadmapSupplementalItems} from '../functions/_lib/owner-roadmap-20261018-additions.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const toolSql=read('supabase/migrations/v0.11_advanced_platform_architecture.sql');
const start=toolSql.indexOf('insert into public.platform_tools(');
const stop=toolSql.indexOf('on conflict(tool_code)',start);
assert(start>=0&&stop>start,'Canonical registered tools missing');
const tools=[...toolSql.slice(start,stop).matchAll(/\('([A-Z_]+)','/g)].map(m=>m[1]);
assert.equal(tools.length,21,'Source tool registry is exactly 21 definitions');
assert.deepEqual(new Set(review.toolDefinitions.map(x=>x.code)),new Set(tools),'Readiness catalog must not drop a registered product');
assert.equal(review.toolDefinitions.length,21);
assert.equal(review.supportingSystems.length,13);
assert.equal(review.memberships.length,8);
assert.equal(review.nextWork.length,8);
assert.equal(new Set(review.toolDefinitions.map(x=>x.code)).size,21);
const priorityTools=new Set(['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR']);
assert.equal(review.toolDefinitions.filter(x=>priorityTools.has(x.code)).length,4);
const ids=new Set([...roadmapCatalog,...roadmapSupplementalItems].map(x=>x.id));
for(const row of [...review.toolDefinitions,...review.supportingSystems,...review.nextWork]){
 assert(ids.has(row.roadmapId),'Readiness action links must use existing Owner task: '+row.roadmapId);
 if(row.range)assert(row.range[0]>=0&&row.range[1]<=100&&row.range[0]<row.range[1],'invalid estimate '+row.code);
}
assert.deepEqual([roadmapCatalog.length,roadmapSupplementalItems.length],[2096,94],'no hidden deletions/renumbering');
assert.equal(roadmapCatalog.filter(x=>x.scope==='trace').length,1815);
assert.equal(review.sourceChecks.expectedCore,375);
assert.equal(review.sourceChecks.expectedTrace,1815);
assert.equal(review.sourceChecks.expectedTotal,2190);
const html=read('owner-roadmap.html'),renderer=read('assets/js/owner-roadmap.js'),
 client=read('assets/js/owner-roadmap-product-readiness-v01491.js'),
 backend=read('functions/api/owner-roadmap.js'),css=read('assets/css/owner-roadmap.css');
for(const key of ['product-readiness','verification-audit']){
 assert(html.includes('data-scope="'+key+'"'),'missing tab '+key);
 assert(renderer.includes(key),'tab not wired '+key);
}
for(const id of ['or-catalog-product-readiness','or-catalog-audit','or-readiness-tools','or-readiness-support','or-audit-counters']){
 assert(html.includes('id="'+id+'"'),'missing panel '+id);
}
assert(html.indexOf('owner-roadmap-product-readiness-v01491.js')<html.indexOf('/assets/js/owner-roadmap.js'));
assert(renderer.includes('window.OwnerProductReadinessV91?.render(data)'));
assert(renderer.includes('function metrics()')&&renderer.includes("scope==='trace'"));
assert(renderer.includes('window.GroundUpOwnerRoadmap={openTask}'));
assert(client.includes('planning estimate'));
assert(client.includes('live catalog unavailable')||client.includes('Live catalog unavailable'));
assert(client.includes('registry')||client.includes('Registry'));
assert(css.includes('.or-metric-explainer')&&css.includes('.or-readiness-work'));
assert(backend.includes("const user=await owner(request,c,env)"));
assert(backend.includes('productReadiness:ownerProductReadinessV01491'));
assert(backend.includes("return v91Evidence[item.id]||result;"));
assert(!html.includes('SUPABASE_SECRET_KEY')&&!client.includes('sb_secret_'));
const sql=read('supabase/admin/v0.14.0.91_OWNER_PRODUCT_READINESS_READ_ONLY.sql');
const commands=sql.replace(/--[^\n]*/g,'').trim().toUpperCase();
assert(commands.startsWith('BEGIN READ ONLY;'));
assert(commands.endsWith('ROLLBACK;'));
assert(!/\b(INSERT\s+INTO|UPDATE\s+PUBLIC\.|DELETE\s+FROM|CREATE\s+|ALTER\s+TABLE|DROP\s+|GRANT\s+|REVOKE\s+|TRUNCATE\s+TABLE|COMMIT\s*;)/.test(commands),'read-only SQL must contain no writes');
assert(sql.includes('08_DESTRUCTIVE_GRANTS')&&sql.includes('07_TUTOR_CONTENT'));
assert(existsSync(new URL('../supabase/admin/v0.14.0.91_OWNER_PRODUCT_READINESS_READ_ONLY.sql',import.meta.url)));
const manifest=JSON.parse(read('release-manifest.json'));
assert.equal(manifest.version,'0.14.0.91');
assert.equal(manifest.ownerRoadmap.catalogEntries,2190);
assert.equal(manifest.ownerRoadmap.primaryTasks,375);
assert.equal(manifest.ownerRoadmap.sourceTraceRows,1815);
assert.equal(manifest.customerCheckoutApproved,false);
assert.equal(manifest.liveStripeFulfillmentEnabled,false);
assert.equal(JSON.parse(read('data/commerce-config.json')).version,manifest.version);
assert(read('config.js').includes("VERSION: '"+manifest.version+"'"));
assert(read('assets/js/route-policy.js').includes("version:'"+manifest.version+"'"));
assert(read('sw.js').includes('groundup-v014091-public'));
console.log('PASS v91: all 21 tools, 13 related systems, 8 membership scopes, two protected tabs, safe existing-task linking, immutable 2,190 records, zero-write Supabase audit and release-version alignment.');
