import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/site-card-layout.js';
const uid='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://layout-fixture.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_fixture',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
const original=globalThis.fetch;
let roles=[],rows=[],writes=0,identityValid=true;
const reply=(data,status=200)=>Response.json(data,{status});
globalThis.fetch=async(url,init={})=>{
 const u=new URL(url),method=init.method||'GET';
 assert.equal(u.hostname,'layout-fixture.supabase.co','Layout API must only call configured private service');
 if(u.pathname==='/auth/v1/user')return identityValid?reply({id:uid}):reply({error:'Forbidden'},401);
 assert.equal(init.headers.apikey,'sb_secret_fixture','Server REST uses secret key only');
 if(u.pathname==='/rest/v1/profiles')return reply([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return reply([]);
 if(u.pathname==='/rest/v1/admin_user_roles')return reply(roles);
 if(u.pathname==='/rest/v1/gu_site_card_layout_v1'){
  if(method==='GET')return reply(rows);
  writes++;
  if(method==='POST'){const body=JSON.parse(init.body);
   assert.equal(body.page_key,'simulator');
   assert.equal(body.updated_by,uid);
   rows=rows.filter(r=>r.card_key!==body.card_key).concat([body]);return reply([]);
  }
  if(method==='DELETE'){rows=rows.filter(x=>x.card_key!==u.searchParams.get('card_key')?.slice(3));return reply([])}
 }
 throw Error('Unexpected database endpoint '+u.pathname);
};
const req=(method='GET',args={})=>new Request('https://site-fixture.test/api/site-card-layout?page=simulator',{
 method,headers:{...(args.authorized?{authorization:'Bearer fixture-session'}:{}),
 ...(method!=='GET'?{'content-type':'application/json',origin:args.origin||'https://site-fixture.test'}:{})},
 body:method==='GET'?undefined:JSON.stringify(args.body||{cardKey:'id:sim-card',widthPct:75,minHeightPx:380,sortIndex:2,offsetXPx:18,offsetYPx:-25})});
try{
 let r=await onRequest({request:req() ,env});
 let data=await r.json();assert.equal(data.ok,true);assert.equal(data.canEdit,false);assert.equal(writes,0);
 r=await onRequest({request:req('POST',{authorized:true}),env});assert.equal(r.status,403);assert.equal(writes,0);
 roles=[{role_code:'MODERATOR',expires_at:'2020-01-01T00:00:00Z'}];
 r=await onRequest({request:req('POST',{authorized:true}),env});assert.equal(r.status,403);assert.equal(writes,0);
 roles=[{role_code:'OWNER',expires_at:null}];
 r=await onRequest({request:req('GET',{authorized:true}),env});data=await r.json();assert.equal(data.canEdit,true);
 r=await onRequest({request:req('POST',{authorized:true,origin:'https://attacker.test'}),env});assert.equal(r.status,403);
 r=await onRequest({request:req('POST',{authorized:true,body:{cardKey:'id:sim-card',widthPct:105}}),env});assert.equal(r.status,400);
 r=await onRequest({request:req('POST',{authorized:true,body:{cardKey:'id:sim-card',widthPct:80,evilProperty:true}}),env});assert.equal(r.status,400);
 r=await onRequest({request:req('POST',{authorized:true,body:{cardKey:'id:sim-card',offsetXPx:400}}),env});assert.equal(r.status,400);
 r=await onRequest({request:req('POST',{authorized:true,body:{cardKey:'id:sim-card',offsetYPx:-281}}),env});assert.equal(r.status,400);
 r=await onRequest({request:req('POST',{authorized:true}),env});data=await r.json();assert.equal(data.saved,true);assert.equal(writes,1);
 assert.equal(rows[0].width_pct,75);assert.equal(rows[0].min_height_px,380);
 assert.equal(rows[0].offset_x_px,18);assert.equal(rows[0].offset_y_px,-25);
 r=await onRequest({request:req('GET'),env});data=await r.json();assert.equal(data.items.length,1);
 r=await onRequest({request:req('DELETE',{authorized:true,body:{cardKey:'id:sim-card'}}),env});
 assert.equal(r.status,200);assert.equal(rows.length,0);
 roles=[{role_code:'ADMIN',expires_at:null}];
 r=await onRequest({request:req('GET',{authorized:true}),env});data=await r.json();assert.equal(data.canEdit,true);
 roles=[{role_code:'MOD',expires_at:null}];
 r=await onRequest({request:req('GET',{authorized:true}),env});data=await r.json();assert.equal(data.canEdit,true);
 identityValid=false;
 r=await onRequest({request:req('POST',{authorized:true}),env});assert.notEqual(r.status,200);assert.equal(writes,2);
 const ui=readFileSync('assets/js/crownlight-site-layout-editor-v1.js','utf8');
 const css=readFileSync('assets/css/crownlight-site-layout-editor-v1.css','utf8');
 const site=readFileSync('assets/js/site.js','utf8');
 assert.match(ui,/beginResize/);assert.match(ui,/addEventListener\('pointerup'/);
 assert.match(ui,/beginMove/);assert.match(ui,/applySavedOrder/);assert.match(ui,/function toggle/);
 assert.match(ui,/state\.token=identity\.access_token/);
 assert.match(css,/gu-layout-controls/);assert.match(site,/crownlight-site-layout-editor-v1\.js/);
 console.log('PASS sitewide editor: anonymous read-only, staff role gate, expired role denial, CSRF, bounded geometry, audit-ready save/reset and pointer release');
}finally{globalThis.fetch=original}
