import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const books=['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'];
assert(process.env.LAB_QA_EMAIL&&process.env.LAB_QA_PASSWORD,'QA credentials not provided');
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const p=await b.newPage({serviceWorkers:'block'});
 const check=await (await p.request.get(origin+'/api/auth-guard-v0135')).json();
 assert(check.enabled===false,'CAPTCHA enabled; no bypass');
 await p.goto(origin+'/signin.html?next=%2Fmy-books.html',{waitUntil:'domcontentloaded',timeout:30000});
 await p.locator('#login-identifier').fill(process.env.LAB_QA_EMAIL);
 await p.locator('#login-password').fill(process.env.LAB_QA_PASSWORD);
 await p.locator('.auth-card button[type="submit"]').click();
 await p.waitForURL(u=>/^\/my-books(?:\.html)?$/.test(new URL(u).pathname),{timeout:30000});
 const info=await p.evaluate(async()=>{
  const c=await window.getSupabaseClient(),{data}=await c.auth.getSession();
  const books=await c.rpc('gu_my_digital_books_v01430');
  return {id:data?.session?.user?.id,token:data?.session?.access_token,
    items:books.data?.books||[],error:books.error?.code};
 });
 assert.equal(info.id,'f42f9301-18e6-43a3-8531-32d371fd22c1','Not expected QA identity');
 assert(!info.error,'Failed My Books RPC');
 for(const code of books){
  const eligible=info.items.find(x=>x.code===code);
  assert(eligible?.downloadEnabled===true,'QA Lifetime book not listed as downloadable: '+code);
  const res=await p.request.post(origin+'/api/digital-book-download-v01430',{
   headers:{authorization:'Bearer '+info.token,'content-type':'application/json'},
   data:JSON.stringify({code,format:'epub'}),timeout:35000
  });
  const d=await res.json().catch(()=>({}));
  assert(res.ok()&&d.ok===true&&/^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(d.url||''),
    'Signed download URL failed '+code+' HTTP '+res.status());
  const file=await p.request.get(d.url,{timeout:50000});
  assert(file.ok(),'EPUB file HTTP failure '+code);
  const bytes=await file.body();
  assert(bytes.length>10240&&bytes[0]===0x50&&bytes[1]===0x4b,'EPUB file invalid: '+code);
  console.log('PASS QA-only entitled My Books EPUB delivery '+code+', bytes='+bytes.length);
 }
}finally{await b.close()}
