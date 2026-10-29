import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/advanced-tool-workspace-v014110.js';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const original=globalThis.fetch;
let entitled=true,postCount=0;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const text=String(url),method=opts.method||'GET';
 if(text.endsWith('/auth/v1/user'))return json({id:user});
 if(text.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(text.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(text.includes('/admin_user_roles?'))return json([{role_code:'MEMBER',expires_at:null}]);
 if(text.includes('/platform_tools?'))return json([{tool_code:'WATCHLIST_WORKBENCH',name:'Watchlist',status:'beta',active:true,free_preview:true}]);
 if(text.endsWith('/rpc/user_has_tool_access'))return json(entitled);
 if(text.includes('/tool_workspace_records')&&method==='POST'){
  postCount++;
  assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(opts.headers.authorization,undefined);
  const b=JSON.parse(opts.body);
  assert.equal(b.user_id,user);assert.equal(b.tool_code,'WATCHLIST_WORKBENCH');
  assert.equal(b.record_type,'scenario_review');
  assert.equal(b.payload.kind,'ADVANCED_TRADE_PLAN_SNAPSHOT_V1');
  return json([{id:77}]);
 }
 throw Error('Unexpected mock '+text);
};
const data={symbol:'GUSIM',pattern:'FICTIONAL breakout',direction:'LONG',decision:'WATCH',
 thesis:'Original fictional case',trigger:'Completed reclaim only',invalidation:'Below reference',
 source:'Illustrative first-party practice',sourceUrl:'',sourceAt:'2026-10-21T09:00:00-04:00',
 asOf:'2026-10-21T09:30:00-04:00',entry:'5',stop:'4.8',budget:'25',target1:'5.6',
 target2:'',stretch:'',spread:'0',slippage:'0',gap:'0'};
const body={recordType:'scenario_review',title:'GUSIM WATCH',payload:{
 kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',version:1,data}};
const make=data=>new Request('https://site.example/api/advanced-tool-workspace-v014110?tool=WATCHLIST_WORKBENCH',{
 method:'POST',headers:{authorization:'Bearer good-session','content-type':'application/json',origin:'https://site.example'},
 body:JSON.stringify(data)});
try{
 let r=await onRequest({request:make(body),env});
 assert.equal(r.status,201);assert.equal(postCount,1);
 r=await onRequest({request:make({...body,payload:{...body.payload,data:{...data,sourceAt:'2026-10-21T10:00:00-04:00'}}}),env});
 assert.equal(r.status,400,'No source revelation after the observed plan can be claimed');
 assert.equal(postCount,1);
 r=await onRequest({request:make({...body,payload:{...body.payload,data:{...data,target1:'4.0'}}}),env});
 assert.equal(r.status,400,'Invalid reward-side target');
 assert.equal(postCount,1);
 r=await onRequest({request:make({...body,payload:{...body.payload,data:{...data,entry:'4'}}}),env});
 assert.equal(r.status,400,'Stop must be on the loss side');
 assert.equal(postCount,1);
 entitled=false;
 r=await onRequest({request:make(body),env});
 assert.equal(r.status,403,'Free previews must never save paid trade-plan records');
 assert.equal(postCount,1);
 console.log('PASS private trade-plan POST grant, timing, loss-side, target validation and entitlement denial');
}finally{globalThis.fetch=original}
