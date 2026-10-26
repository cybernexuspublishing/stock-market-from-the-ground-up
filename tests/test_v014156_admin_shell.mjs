/* D16 Stage A: deterministic zero-cost tests of unified Admin routing and API safety. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODULES,GROUPS,authorized,resolveRoute,createAdminClient,readRows} from '../assets/js/admin-unified-core-v014156.mjs';
const ids=MODULES.map(m=>m.id);
assert.equal(new Set(ids).size,ids.length,'One authoritative module ID per operation');
assert.deepEqual(GROUPS,['Overview','People','Learning','Commerce','Community','Platform']);
assert.equal(new Set(MODULES.map(m=>m.group)).size,6);
for(const m of MODULES){
 assert(m.id&&m.label&&m.group&&m.permission,'No undocumented or permissionless modules');
 assert(GROUPS.includes(m.group),'Only six unified navigation groups');
 assert((m.kind==='link'&&m.href&&!m.action)||(m.kind!=='link'&&m.action),'Each module is a link or server-backed read');
 assert(!/v0?14|v014/.test(m.legacy||''),'Use stable public URLs');
}
const guest={permissions:[]};
const reader={permissions:['control_panel.access','dashboard.view','users.view']};
const owner={roles:['OWNER'],permissions:['control_panel.access',...MODULES.map(m=>m.permission)]};
assert(!MODULES.some(m=>authorized(m,guest)),'Guest denied');
assert(!MODULES.some(m=>authorized(m,{permissions:['dashboard.view']})),'Control Center global permission required');
assert.equal(resolveRoute('#roles',reader)?.id,'overview','Unpermitted deep link must fall back');
assert.equal(resolveRoute('#members',reader)?.id,'members');
assert.equal(resolveRoute('#__missing__',reader)?.id,'overview');
assert.equal(resolveRoute('#audit',owner)?.id,'audit');
assert.equal(resolveRoute('#overview',guest),null);
let calls=[],tokens=0;
const client=createAdminClient({
 getToken:async()=>{tokens++;return 'fresh-'+tokens},
 transport:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({ok:true,summary:{users:1}})}}
});
await client('dashboard');await client('dashboard');
assert.equal(tokens,2,'Session access token must be refreshed, not cached globally');
assert(calls.every(c=>c.url.startsWith('/api/admin?action=dashboard')),'Existing stable Admin backend used');
assert(calls.every(c=>c.options.method==='GET'&&c.options.cache==='no-store'),'Preview never mutates');
assert(calls.every(c=>c.options.headers.authorization.startsWith('Bearer fresh-')),'Use authenticated sessions');
await assert.rejects(client('setting_save'),/Unsupported/,'Reject financial and administrative writes');
assert.equal(calls.length,2,'Rejected writes never reach network');
await assert.rejects(createAdminClient({getToken:async()=>null,transport:async()=>{throw Error('Network reached')}})('dashboard'),/expired/);
await assert.rejects(createAdminClient({getToken:async()=>'token',transport:async()=>({ok:false,status:403})})('users'),/access is unavailable/);
assert.equal(readRows(MODULES.find(x=>x.id==='members'),{users:[{email:'<img src=x onerror=alert(1)>',flag:{status:'active'}}]})[0].title,
 '<img src=x onerror=alert(1)>','Strings remain literal for textContent DOM rendering');
const html=readFileSync('admin-unified-preview.html','utf8'),ui=readFileSync('assets/js/admin-unified-preview-v014156.mjs','utf8');
assert(html.includes('id="unified-title" tabindex="-1"')&&ui.includes("$('unified-title').focus()"),'Route change must move keyboard focus to heading');
assert.equal((html.match(/id="unified-nav"/g)||[]).length,1,'Single preview navigation root');
assert(!/innerHTML|MutationObserver|setInterval\(/.test(ui),'No unsanitized markup, observer loop or timer polling');
assert(/admin-unified-core-v014156/.test(ui),'Only new module registry owns the preview');
assert(!/admin-navigation\.js|admin-legacy-routing\.js|admin-platform\.js/.test(html),'Legacy navigation scripts cannot mount inside preview');
const policySource=readFileSync('assets/js/route-policy.js','utf8');
await import('data:text/javascript;base64,'+Buffer.from(policySource).toString('base64'));
assert.equal(globalThis.GroundUpRoutePolicy.classify('/admin-unified-preview.html'),'staff',
 'Cloudflare and Service Worker must treat the new Admin route as protected');
assert.equal(globalThis.GroundUpRoutePolicy.isProtected('/admin-unified-preview'),true,
 'Unversioned preview route must be protected');
console.log('PASS D16 Admin shell registry, fail-closed permissions, read-only fresh-session API, XSS-safe preview');

const marketing=MODULES.find(m=>m.id==='marketing');
assert.equal(marketing.group,'Commerce');
assert.equal(marketing.href,'/admin-advertising.html');
assert.equal(authorized(marketing,{permissions:['control_panel.access','ads.view'],roles:['ADMIN']}),false);
assert.equal(authorized(marketing,owner),true);
