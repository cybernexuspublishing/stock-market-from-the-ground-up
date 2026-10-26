/* Production-shaped Admin dashboard API contract with mocked transport.
 * No live users, financial transactions, or privileged mutations. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/admin.js';
import {dashboardCharts} from '../assets/js/admin-dashboard-widgets-core.mjs';

const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const USER='00000000-0000-4000-8000-000000000001';
let mode='owner',paths=[],failSupport=false;
const date='2026-10-26T18:00:00.000Z';
const response=(rows,status=200,headers={})=>new Response(JSON.stringify(rows),{status,headers:{'content-type':'application/json',...headers}});
globalThis.fetch=async (input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url);
 const path=url.pathname,select=url.searchParams.get('select')||'';
 paths.push({path,select,method:options.method||'GET'});
 if(path==='/auth/v1/user')return response({id:USER,email:'test@example.invalid'});
 if(path.endsWith('/admin_user_roles'))return response([{role_code:'OWNER',expires_at:null}]);
 if(path.endsWith('/admin_user_flags'))return response([]);
 if(path.endsWith('/admin_role_permissions')){
  const codes=mode==='restricted'?['control_panel.access']:mode==='viewer'?['control_panel.access','dashboard.view','forum.view']:['control_panel.access','dashboard.view','content.view','forum.view','users.view','audit.view'];
  return response(codes.map(permission_code=>({permission_code})));
 }
 if(path.endsWith('/profiles')&&select.includes('account_kind'))return response([{account_kind:'member',deleted_at:null}]);
 if(options.headers?.prefer==='count=exact')return response([] ,200,{'content-range':'0-0/2'});
 if(path.endsWith('/lab_instruction_v014'))return response([{lab_id:'F2-C07-L01',updated_at:date}]);
 if(path.endsWith('/lab_training_sets_v014'))return response([{lab_id:'F2-C07-L01',version:2,updated_at:date}]);
 if(path.endsWith('/forum_reports'))return response([{id:74,status:'open',created_at:date}]);
 if(path.endsWith('/support_tickets')){
  if(failSupport)return response({error:'read unavailable'},503);
  return response([{id:3,ticket_number:'TCK-3',status:'open',priority:'high',created_at:date}]);
 }
 if(path.endsWith('/admin_audit_log'))return response([{id:8,actor_user_id:USER,action:'content.review',target_type:'lab',target_id:'F2-C07-L01',created_at:date,details:{secret:'should never be requested'}}]);
 throw Error('Unmocked Admin resource: '+path+'?'+url.searchParams.toString());
};
const request=token=>new Request('https://admin.example.invalid/api/admin?action=dashboard',{headers:token?{authorization:'Bearer '+token}:{}});
const run=async()=>onRequest({env,request:request('authorized-fixture')});
let result=await onRequest({env,request:request(null)});
assert.equal(result.status,401,'Anonymous dashboard access must fail');
mode='restricted';result=await run();assert.equal(result.status,403,'Staff without dashboard permission must fail');
mode='owner';paths=[];result=await run();assert.equal(result.status,200);
let payload=await result.json();
assert.equal(payload.ok,true);assert.equal(payload.summary.pendingLabReviews,2);
assert.equal(payload.queue.length,4,'Four scoped operational sources');
assert(payload.queue.every(x=>x.available===true));
const support=payload.queue.find(x=>x.category==='Support');
assert.equal(support.items[0].label,'Support ticket TCK-3');
assert.equal(support.items[0].createdAt,date);
assert.equal(payload.recentActivity[0].action,'content.review');
assert(!JSON.stringify(payload).includes('should never be requested'),'Audit details should never be exposed in dashboard');
assert.equal(result.headers.get('cache-control'),'no-store');
assert.equal(dashboardCharts(payload.summary)[1].rows[2].target,'products','Chart opens actual Products panel');
mode='viewer';paths=[];result=await run();payload=await result.json();
assert.equal(result.status,200);
assert.deepEqual(payload.queue.map(x=>x.category),['Community']);
assert.equal(payload.recentActivity,null);
assert(!paths.some(x=>x.path.endsWith('/lab_instruction_v014')&&x.select.includes('lab_id')),'Viewer must not fetch privileged Lab details');
assert(!paths.some(x=>x.path.endsWith('/support_tickets')&&x.select.includes('ticket_number')),'Viewer must not fetch ticket details');
mode='owner';failSupport=true;result=await run();payload=await result.json();
assert.equal(result.status,200,'One queue failure must not break entire dashboard');
assert.equal(payload.queue.find(x=>x.category==='Support').available,false,'Failed queue source must be marked unavailable');
console.log('PASS Admin dashboard: bearer/RBAC, bounded authorized records, audit isolation, no-store, unavailable-source state, working chart route.');
