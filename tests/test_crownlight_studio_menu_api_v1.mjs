import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/chart-studio-menu.js';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SECRET_KEY:'synthetic-secret'};
const original=globalThis.fetch;
let visible=['STANDARD','ADVANCED','PROFESSIONAL'],serverError=false,rows=true,version=null;
const answer=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url)=>{
 const u=new URL(url);
 assert.equal(u.pathname,'/rest/v1/site_settings');
 assert.equal(u.searchParams.get('setting_key'),'eq.feature.crownlight_chart_studio_menu_v1');
 return serverError?answer({error:'DB offline'},503):answer(rows?[{value:{visible,...(version?{version}:{})}}]:[]);
};
try{
 let response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']);
 visible=['PROFESSIONAL'];response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['PROFESSIONAL','ECHARTS']);
 visible=['PROFESSIONAL','STANDARD'];response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD','PROFESSIONAL','ECHARTS']);
 rows=false;response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']);
 rows=true;version=2;visible=['STANDARD'];response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD'],'Version 2 explicitly hides ECharts');
 version=null;visible=[];response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']);
 serverError=true;response=await onRequestGet({env});
 assert.deepEqual((await response.json()).visible,['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']);
 assert.match(response.headers.get('cache-control'),/no-store/);
 const server=await import('../functions/api/admin.js');
 assert.equal(typeof server.onRequest,'function');
 console.log('PASS Studio menu: filtered choices, stable order, legacy defaults, invalid-config failover and no-store');
}finally{globalThis.fetch=original}
