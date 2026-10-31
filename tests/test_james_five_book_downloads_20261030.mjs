import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const expected=['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'];
assert(process.env.LAB_QA_EMAIL&&process.env.LAB_QA_PASSWORD,'QA login secrets missing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const p=await browser.newPage({serviceWorkers:'block'});
 const guard=await (await p.request.get(site+'/api/auth-guard-v0135')).json();
 assert(guard.enabled===false,'CAPTCHA on: no bypass');
 await p.goto(site+'/signin.html?next=%2Fmy-books.html',{waitUntil:'domcontentloaded',timeout:30000});
 await p.locator('#login-identifier').fill(process.env.LAB_QA_EMAIL);
 await p.locator('#login-password').fill(process.env.LAB_QA_PASSWORD);
 await p.locator('.auth-card button[type=submit]').click();
 await p.waitForURL(u=>new URL(u).pathname==='/my-books.html',{timeout:30000});
 const auth=await p.evaluate(async()=>{const s=await window.getSupabaseClient();const {data}=await s.auth.getSession();
 const r=await s.rpc('gu_my_digital_books_v01430');return {id:data?.session?.user?.id,token:data?.session?.access_token,books:r.data?.books||[],err:r.error?.code}});
 assert.equal(auth.id,'f42f9301-18e6-43a3-8531-32d371fd22c1');
 assert(!auth.err,'My Books RPC denied');
 for(const code of expected){
  const record=auth.books.find(x=>x.code===code);
  assert(record?.downloadEnabled===true,'Missing QA-only Lifetime book entitlement '+code);
  const r=await p.request.post(site+'/api/digital-book-download-v01430',{headers:{
   authorization:'Bearer '+auth.token,'content-type':'application/json'
  },data:JSON.stringify({code,format:'epub'}),timeout:30000});
  const body=await r.json().catch(()=>({}));
  assert(r.ok()&&body.ok===true&&/^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(body.url||''),'Signed EPUB download denied '+code);
  const actual=await p.request.get(body.url,{timeout:50000});
  assert(actual.ok(),'Signed Storage asset HTTP error '+code);
  const bytes=await actual.body();
  assert(bytes.length>10000&&bytes[0]===80&&bytes[1]===75,'Downloaded EPUB is not ZIP/EPUB binary '+code);
  console.log('PASS James_Test authorized My Books signed EPUB download '+code+' '+bytes.length+' bytes');
 }
}finally{await browser.close()}
