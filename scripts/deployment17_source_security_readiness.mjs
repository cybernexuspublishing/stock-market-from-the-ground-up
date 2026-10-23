/* D17: zero-charge operational/source integrity checks. Runs locally.
 * Never reads secrets or sends provider requests. Produces candid blockers:
 * FAIL is not a deployment acceptance, and a PASS never certifies production.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const support=read('functions/api/support.js');
const preview=read('assets/js/admin-unified-preview-v014156.mjs');
const middleware=read('functions/_middleware.js');
const worker=read('sw.js');
const headers=read('_headers');
const builder=read('scripts/build-pages.sh');
const seo=read('scripts/build-public-seo.mjs');
const m=JSON.parse(read('release-manifest.json'));
const checks=[];
function check(id,passed,explanation){checks.push({id,status:passed?'SOURCE_GUARD_PRESENT':'SOURCE_BLOCKER',explanation});}
check('support-sb-secret-jwt',!support.includes('authorization:`Bearer ${secret}`'),
 'Opaque sb_secret_ credentials cannot be sent as JWT Authorization to Supabase PostgREST.');
check('support-bounded-json',!support.includes('request.json()')&&/boundedSupportInput|boundedJson|boundedBody/.test(support),
 'Support create/reply/reopen POST bodies need an actual byte cap, not unbounded buffering.');
check('support-reopen-owned-ticket',/action==='reopen'[\s\S]*?support_tickets\?select=[^\n]*requester_user_id/.test(support),
 'Reopening a ticket must first verify the signed-in user owns that ticket.');
check('admin-inspection-no-undefined-data',!preview.includes('data.users?.[host.children.length]'),
 'The member detail panel must not access undefined data outside its listing callback.');
check('admin-stable-unified-route',middleware.includes('POLICY')&&read('assets/js/route-policy.js').includes("'admin-unified-preview'"),
 'The private unified Admin route must be protected by the shared route policy.');
check('offline-protected-no-store',worker.includes('POLICY.isProtected(p)')&&worker.includes("cache:'no-store'"),
 'Protected pages and APIs should never be stored in offline browser cache.');
check('private-lab-bundle-exclusion',builder.includes('SECURITY BUILD BLOCK')&&builder.includes('interactive-labs.json'),
 'Private answer source must not be copied into the static Pages output.');
check('public-csp',headers.includes('Content-Security-Policy:')&&headers.includes('frame-ancestors'),
 'Public pages need baseline frame and object restrictions.');
check('whitelisted-public-seo',builder.includes('node scripts/build-public-seo.mjs')&&seo.includes('GU_PUBLIC_SITE_ORIGIN')&&
 seo.includes('noindex,nofollow')&&seo.includes('sitemap.xml'),
 'Public discovery pages need generated canonical sitemap while private member/staff pages are noindex.');
check('customer-charges-still-locked',m.customerCheckoutApproved===false&&m.liveStripeFulfillmentEnabled===false,
 'Paid launch must be separately approved only after the final test lifecycle.');
const blockers=checks.filter(x=>x.status==='SOURCE_BLOCKER');
const result={schema:'gu-d17-no-provider-source-gates-v1',releaseVersion:m.version,
 scope:'SOURCE_NOT_RUNTIME',recordedAtUtc:new Date().toISOString(),
 checks,sourceBlockers:blockers.map(x=>x.id),sourcePassCount:checks.length-blockers.length,
 sourceBlockerCount:blockers.length,cloudflareVerified:false,supabaseVerified:false,
 stripePaidLifecycleVerified:false,productionAccepted:false};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d17-source-security-readiness.json',JSON.stringify(result,null,2)+'\n');
for(const c of blockers)console.error('D17 SOURCE BLOCKER: '+c.id+': '+c.explanation);
console.log('D17 source guards '+result.sourcePassCount+'/'+checks.length+'; source blockers '+blockers.length+'; production NOT accepted.');
if(blockers.length)process.exitCode=1;
