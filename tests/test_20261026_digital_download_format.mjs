import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/digital-book-download-v01430.js';
const original=globalThis.fetch;
const code='FOUNDATION_BOOK_1',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const base='https://example.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_qa',
 SUPABASE_SECRET_KEY:'sb_secret_qa'};
let denial=false,badPath=false,calls=[],signed=0;
const data=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,options={})=>{
 const path=new URL(url).pathname;calls.push({path,body:options.body});
 if(path==='/auth/v1/user')return data({id});
 if(path.endsWith('/rpc/gu_digital_book_can_download_v01430'))
  return data({allowed:!denial,path:code+'/'+id+'.pdf'});
 if(path.endsWith('/rpc/gu_digital_format_path_v014305')){
  let req=JSON.parse(options.body);
  assert.equal(req.p_code,code);assert.equal(req.p_format,'epub');
  return data({allowed:!denial,path:code+'/'+id+(badPath?'.pdf':'.epub')});
 }
 if(path.startsWith('/storage/v1/object/sign/gu-digital-ebooks/')){
  signed++;
  return data({signedURL:'/object/sign/gu-digital-ebooks/'+
    path.split('/gu-digital-ebooks/')[1]+'?token=fixture'});
 }
 throw Error('Unexpected network route '+url);
};
const call=(body,auth=true,origin='https://site.example')=>onRequestPost({
 request:new Request('https://site.example/api/digital-book-download-v01430',{
  method:'POST',headers:{...(auth?{authorization:'Bearer mock-jwt'}:{}),
   origin,'content-type':'application/json'},body:JSON.stringify(body)}),env
});
try{
 let r=await call({code},false);assert.equal(r.status,401);
 r=await call({code,format:'exe'});assert.equal(r.status,400);
 r=await call({code},true,'https://outside.example');assert.equal(r.status,403);
 assert.equal(signed,0);
 r=await call({code});assert.equal(r.status,200);
 let result=await r.json();assert(result.ok);
 assert(result.url.includes('.pdf?'));
 assert.equal(signed,1);
 r=await call({code,format:'epub'});assert.equal(r.status,200);
 result=await r.json();assert(result.url.includes('.epub?'));
 assert(calls.some(x=>x.path.endsWith('/rpc/gu_digital_format_path_v014305')));
 badPath=true;r=await call({code,format:'epub'});assert.equal(r.status,503);
 assert.equal(signed,2,'Mismatched format must never reach signing');
 badPath=false;denial=true;r=await call({code,format:'epub'});assert.equal(r.status,403);
 assert.equal(signed,2,'Denied digital entitlement must not sign');
 console.log('PASS signed digital formats: member identity, old path, PDF/EPUB, denial and unsafe-path rejection');
}finally{globalThis.fetch=original}
