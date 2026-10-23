/* Deployment 17: offline source inventory and link integrity.
 * Audits local files only. Never uses live credentials or provider traffic.
 * A passing inventory does not authorize a commercial production release.
 */
import {readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {extname, dirname, join, normalize} from 'node:path';
const files=readdirSync('.').filter(name=>/^[a-z0-9-]+\.html$/.test(name)).sort();
const redirectLines=readFileSync('_redirects','utf8').split(/\r?\n/);
const redirects=new Set(redirectLines.filter(row=>row.startsWith('/')).map(row=>row.trim().split(/\s+/)[0]));
const missing=new Set(),duplicates=new Set(),warnings=new Set(),links=new Set();
function relative(name,url){
 const value=String(url||'').trim();
 if(!value||value.startsWith('#')||value.startsWith('//')||/^[a-z]+:/i.test(value))return null;
 const clean=value.split(/[?#]/)[0];
 if(!clean||clean.includes('{{')||clean.includes('${'))return null;
 if(clean.startsWith('/api/')||clean.startsWith('/cdn-cgi/'))return null;
 return normalize(clean.startsWith('/')?clean.slice(1):join(dirname(name),clean));
}
for(const file of files){
 const html=readFileSync(file,'utf8');
 if(!/<!doctype\s+html/i.test(html))warnings.add(file+' has no HTML5 doctype');
 if(!/<title[^>]*>[^<]+<\/title>/i.test(html))warnings.add(file+' has no title');
 if(!/name=['"]viewport['"]/i.test(html))warnings.add(file+' has no viewport');
 const ids=[...html.matchAll(/\bid=['"]([^'"]+)['"]/g)].map(x=>x[1]);
 const seen=new Set();
 for(const id of ids){if(seen.has(id))duplicates.add(file+'#'+id);else seen.add(id)}
 for(const hit of html.matchAll(/\b(?:href|src)=['"]([^'"]+)['"]/g)){
  const raw=hit[1],target=relative(file,raw);
  if(target==null)continue;
  if(target.startsWith('..')){warnings.add(file+': outside-root link '+raw.slice(0,100));continue}
  if(redirects.has('/'+target))continue;
  if(existsSync(target)){links.add(target);continue}
  if(!extname(target)){
   if(existsSync(target+'.html')){links.add(target+'.html');continue}
   if(existsSync(join(target,'index.html'))){links.add(join(target,'index.html'));continue}
   warnings.add(file+': unresolved clean route '+raw.slice(0,100));continue;
  }
  missing.add(file+' -> '+target);
 }
}
const blockers=[];
if(files.length<80)blockers.push('Expected at least 80 HTML pages, got '+files.length);
if(missing.size)blockers.push('Missing local link targets: '+missing.size);
if(duplicates.size)blockers.push('Duplicate HTML IDs: '+duplicates.size);
const manifest=JSON.parse(readFileSync('release-manifest.json','utf8'));
if(manifest.customerCheckoutApproved!==false||manifest.liveStripeFulfillmentEnabled!==false)
 blockers.push('Customer paid checkout/fulfillment must stay locked until final approval');
if(existsSync('data/interactive-labs.json'))blockers.push('Private answer bundle must not be in public source');
const report={schema:'gu-d17-local-source-inventory-v1',
 checkedAt:new Date().toISOString(),scope:'OFFLINE_SOURCE_ONLY',
 htmlPages:files.length,linkedLocalAssets:links.size,
 missingTargets:[...missing].slice(0,500),duplicateIds:[...duplicates].slice(0,500),
 warnings:[...warnings].slice(0,500),warningCount:warnings.size,blockers,
 verifiedProduction:false,verifiedCloudflare:false,verifiedSupabase:false,
 paidLaunchApproved:false};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d17-offline-inventory.json',JSON.stringify(report,null,2)+'\n');
console.log('D17: '+files.length+' pages, '+blockers.length+' source blockers, '+warnings.size+' warnings. Not production acceptance.');
for(const error of blockers)console.error(error);
if(blockers.length)process.exitCode=1;
