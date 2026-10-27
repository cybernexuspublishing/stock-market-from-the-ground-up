import assert from 'node:assert/strict';
import {onRequestPost,onRequestGet} from '../functions/api/digital-book-owner-preview-v1.js';

const code='FOUNDATION_BOOK_1',uuid='11111111-1111-4111-8111-111111111111';
const path=code+'/'+uuid+'.epub';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const mock=(body,token=true,origin='https://stock.example')=>new Request('https://stock.example/api/digital-book-owner-preview-v1',{
 method:'POST',headers:{...(token?{authorization:'Bearer owner-jwt'}:{}),
 ...(origin?{origin}:{}),'content-type':'application/json'},
 body:JSON.stringify(body)
});
const resp=(object,status=200)=>Response.json(object,{status});
let calls=[],stage='success',auditCount=0,signedCount=0;
const original=globalThis.fetch;
try{
 globalThis.fetch=async(url,options={})=>{
  const p=new URL(url).pathname;calls.push(p);
  if(p==='/auth/v1/user')return resp({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  if(p==='/rest/v1/rpc/gu_owner_digital_history_v014304'){
   assert.equal(options.headers.authorization,'Bearer owner-jwt');
   if(stage==='no_owner')return resp({message:'OWNER_REQUIRED'},403);
   if(stage==='no_stepup')return resp({message:'PASSWORD_RECONFIRM_REQUIRED'},403);
   if(stage==='missing')return resp({ok:true,versions:[]});
   if(stage==='wrongpath')return resp({ok:true,versions:[{current:true,format:'epub',version:2,fileExists:true,bytes:4393701,path:'OTHER/'+uuid+'.epub'}]});
   return resp({ok:true,versions:[{current:true,format:'epub',version:2,fileExists:true,bytes:4393701,path},
    {current:false,format:'epub',version:1,fileExists:true,bytes:4393701,path:code+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.epub'}]});
  }
  if(p.startsWith('/storage/v1/object/sign/gu-digital-ebooks/')){
   signedCount++;
   assert.equal(p,'/storage/v1/object/sign/gu-digital-ebooks/'+path);
   assert.equal(JSON.parse(options.body).expiresIn,60);
   if(stage==='bad_sign')return resp({signedURL:'https://attacker.example/book'});
   return resp({signedURL:'/object/sign/gu-digital-ebooks/'+path+'?token=short-lived-private-token'});
  }
  if(p==='/rest/v1/admin_audit_log'){
   auditCount++;
   const body=JSON.parse(options.body);
   assert.equal(body.action,'commerce.digital.owner_preview.signed');
   assert.equal(body.target_id,code);
   assert.equal(body.details.version,2);
   assert.equal(body.details.customerAccessChanged,false);
   if(stage==='audit_down')return resp({message:'unavailable'},503);
   return resp([{id:123}]);
  }
  throw Error('Unexpected network call: '+p);
 };
 assert.equal((await onRequestGet()).status,405);
 assert.equal((await onRequestPost({request:mock({code,format:'epub'},false),env})).status,401);
 assert.equal((await onRequestPost({request:mock({code,format:'epub'},true,null),env})).status,403);
 assert.equal((await onRequestPost({request:mock({code,format:'epub'},true,'https://other.example'),env})).status,403);
 assert.equal((await onRequestPost({request:mock({code:'../../bad',format:'epub'}),env})).status,400);
 assert.equal((await onRequestPost({request:mock({code,format:'exe'}),env})).status,400);
 assert.equal(calls.length,0,'Rejected requests never touch identity or storage');
 for(const deny of ['no_owner','no_stepup','missing','wrongpath']){
  stage=deny;const r=await onRequestPost({request:mock({code,format:'epub'}),env});
  assert.notEqual(r.status,200,'Test '+deny+' must fail closed');
  assert.equal(signedCount,0,'No file should be signed for '+deny);
 }
 stage='bad_sign';assert.equal((await onRequestPost({request:mock({code,format:'epub'}),env})).status,503);
 stage='audit_down';assert.equal((await onRequestPost({request:mock({code,format:'epub'}),env})).status,503);
 stage='success';const r=await onRequestPost({request:mock({code,format:'epub'}),env});
 assert.equal(r.status,200);
 const d=await r.json();assert.equal(d.ok,true);assert.equal(d.version,2);
 assert.equal(d.expiresInSeconds,60);assert.equal(d.customerAccessChanged,false);
 assert.match(d.url,/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/sign\/gu-digital-ebooks\/FOUNDATION_BOOK_1\//);
 assert(auditCount>=2,'Owner preview must write an audit entry');
 const headers=r.headers;
 assert.match(headers.get('cache-control'),/no-store/);
 assert.equal(headers.get('referrer-policy'),'no-referrer');
 console.log('PASS Owner preview: private v2, 60-second link, step-up, audit, path restrictions, no customer access.');
}finally{globalThis.fetch=original}
