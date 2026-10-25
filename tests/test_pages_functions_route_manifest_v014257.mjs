/* Pages production routing regression: don't let Admin APIs silently fall through to static 404s. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const route=JSON.parse(readFileSync('_routes.json','utf8'));
assert.equal(route.version,1);
assert.deepEqual(route.include,['/*'],'Middleware and API routes remain invoked');
assert(Array.isArray(route.exclude)&&route.exclude.length<90);
for(const path of ['/assets/main.js','/data/labs.json','/config.js','/release-manifest.json']){
 const match=route.exclude.some(rule=>rule.endsWith('/*')?path.startsWith(rule.slice(0,-1)):path===rule);
 assert(match,'Known public static route bypasses paid Workers invocation: '+path);
}
for(const path of ['/api/admin','/api/admin-prelive-v014247','/api/checkout','/admin','/dashboard']){
 assert(!route.exclude.some(rule=>rule.endsWith('/*')?path.startsWith(rule.slice(0,-1)):path===rule),
  'Sensitive dynamic route must never be excluded: '+path);
}
const build=readFileSync('scripts/build-pages.sh','utf8');
assert(build.includes(' _routes.json "$output"/'),'Pages build must ship the explicit routes manifest');
if(existsSync('public/_routes.json')){
 const published=JSON.parse(readFileSync('public/_routes.json','utf8'));
 assert.deepEqual(published,route,'Published Pages routing must match audited source');
}
console.log('PASS static assets exempt from Workers; Admin, member and billing endpoints retained in Functions routing');
