import {BOOK_CODE,reply,config,originOK,user,db,fail,clientError} from '../_lib/book-stripe-test-v1.js';
export async function onRequestPost({request,env}){
 try{
  if(!originOK(request))throw fail('Origin mismatch.',403);
  const c=config(env),u=await user(c,request);
  const payload=await request.text();
  if(payload.length>300)throw fail('Request too large.',413);
  let p;try{p=JSON.parse(payload)}catch{throw fail('Invalid JSON.',400)}
  if(p?.code!==BOOK_CODE||p?.format!=='epub'||Object.keys(p).length!==2)throw fail('Invalid TEST ebook.',400);
  const access=await db(c,'gu_book_test_file_v1',{p_code:BOOK_CODE},u.jwt);
  if(access?.allowed!==true)return reply({ok:false,error:'No verified TEST purchase for this account.'},403);
  const path=String(access.path||'');
  if(!new RegExp('^'+BOOK_CODE+'/[a-f0-9-]{36}[.]epub$').test(path))
   throw fail('TEST EPUB file validation failed.');
  const token=c.service,head={apikey:token,'content-type':'application/json'};
  if(token.startsWith('eyJ'))head.authorization='Bearer '+token;
  const response=await fetch(c.base+'/storage/v1/object/sign/gu-digital-ebooks/'+path.split('/').map(encodeURIComponent).join('/'),
   {method:'POST',cache:'no-store',headers:head,body:JSON.stringify({expiresIn:60})});
  const data=await response.json().catch(()=>({}));
  const signed=data.signedURL||data.signedUrl;
  if(!response.ok||typeof signed!=='string'||!signed.startsWith('/object/sign/gu-digital-ebooks/'))
   throw fail('TEST download signing failed.');
  const url=new URL('/storage/v1'+signed,c.base);
  if(url.origin!==new URL(c.base).origin||!url.pathname.startsWith('/storage/v1/object/sign/gu-digital-ebooks/'+BOOK_CODE+'/'))
   throw fail('Invalid TEST download destination.');
  url.searchParams.set('download',BOOK_CODE+'-stripe-test.epub');
  return reply({ok:true,testOnly:true,url:url.href,expiresInSeconds:60});
 }catch(e){return clientError(e)}
}
export function onRequestGet(){return reply({ok:false,error:'POST required.'},405)}
