import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ground-up-reports-'));
fs.copyFileSync(path.resolve('functions/api/commons-report.js'),path.join(tmp,'reports.mjs'));
const {onRequestPost}=await import(pathToFileURL(path.join(tmp,'reports.mjs')).href);
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable',SUPABASE_SECRET_KEY:'server_secret'};
const id='12345678-1234-1234-1234-123456789abc';
const oldFetch=globalThis.fetch;let code='',hits=[];
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{const u=String(url);hits.push({url:u,headers:opts.headers});if(u.endsWith('/auth/v1/user'))return j({id});if(u.includes('/profiles?'))return j([{account_kind:'member'}]);if(u.includes('/admin_user_flags?'))return j([{status:'active'}]);if(u.includes('/commons_topics?'))return j([{id:39}]);if(u.includes('/rpc/v014_community_report'))return code?j({message:code},409):j({ok:true});throw new Error('Unexpected external call '+u)};
function req(){return new Request('https://website.example/api/commons-report',{method:'POST',headers:{authorization:'Bearer session_token','content-type':'application/json'},body:JSON.stringify({scope:'commons',type:'topic',id:39,reason:'spam',details:'Testing reporting controls'})})}
try{
 for(const [dbCode,status,userCode] of [['REPORT_DUPLICATE',409,'DUPLICATE_REPORT'],['REPORT_QUOTA_REACHED',429,'REPORT_QUOTA_REACHED'],['REPORT_SAFETY_CEILING',429,'REPORT_SAFETY_LIMIT'],['REPORT_NOT_AUTHORIZED',403,'REPORT_NOT_AUTHORIZED'],['REPORT_INVALID',400,'INVALID_REPORT'],['UNEXPECTED_SQL',503,'REPORT_BACKEND_FAILURE']]){
  code=dbCode;hits=[];const res=await onRequestPost({request:req(),env});const body=await res.json();assert.equal(res.status,status,dbCode);assert.equal(body.code,userCode,dbCode);assert(!JSON.stringify(body).includes('SUPABASE_SECRET_KEY'));
  const membership=hits.find(x=>x.url.includes('commons_topics'));assert(membership);assert(membership.headers.authorization==='Bearer session_token','Topic visibility must use member JWT');
 }
 code='';const success=await onRequestPost({request:req(),env});assert.equal(success.status,200);assert.equal((await success.json()).ok,true);
 console.log('PASS report API: duplicate/quota/safety/invalid/auth/unknown error codes, visibility via member JWT, success');
}finally{globalThis.fetch=oldFetch;fs.rmSync(tmp,{force:true,recursive:true})}
