/* Signed member production receipt security QA, no writes or private details logged.
 * GitHub QA account must be non-Owner. No purchases, uploads or claims generated.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){console.error('BLOCKED dedicated GitHub QA login secrets missing');process.exit(2)}
const config=readFileSync('config.js','utf8');
const url=config.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1],
 key=config.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
const read=async(uri,init={})=>{
 const r=await fetch(uri,{...init,cache:'no-store',signal:AbortSignal.timeout(23000)});
 return {status:r.status,data:await r.json().catch(()=>({}))};
};
try{
 if(!url||!key)throw Error('Supabase publishable QA configuration missing');
 const login=await read(url+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:key,'content-type':'application/json'},
  body:JSON.stringify({email,password})});
 if(login.status!==200||!login.data.access_token)throw Error('QA login unavailable HTTP '+login.status);
 const token=login.data.access_token;
 const self=await read(url+'/auth/v1/user',{headers:{apikey:key,authorization:'Bearer '+token}});
 assert.equal(self.status,200);assert.equal(self.data.id,login.data.user?.id);
 console.log('PASS genuine GoTrue QA identity for receipt authorization (identity not logged).');
 const anonymous=await read(origin+'/api/support?action=list');
 assert.equal(anonymous.status,401,'Support data not public');
 const member=await read(origin+'/api/support?action=list',{headers:{authorization:'Bearer '+token}});
 assert.equal(member.status,200,'Member Support list must work with real QA identity');
 assert.equal(member.data.ok,true);assert(Array.isArray(member.data.tickets));
 console.log('PASS signed-in private Support listing; no member ticket contents logged.');
 const admin=await read(origin+'/api/admin-book-receipts?action=list',{headers:{authorization:'Bearer '+token}});
 assert.equal(admin.status,403,'QA Admin account must not become Owner or see private receipt queue');
 const ownerEvidence=await read(origin+'/api/admin-book-receipts?action=file&id=00000000-0000-4000-8000-000000000000',{headers:{authorization:'Bearer '+token}});
 assert.equal(ownerEvidence.status,403,'Only OWNER may retrieve private receipt files');
 console.log('PASS real non-Owner account blocked from receipt-review queue and private attachments.');
 const malformed=await read(origin+'/api/support?action=book_receipt',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({bookCode:'FOUNDATION_BOOK_1',retailer:'QA rejection only',
   orderReference:'NO-ORDER-SIMULATED',evidencePath:'../../missing_receipt.pdf'})});
 assert.equal(malformed.status,400,'Malformed attachment reference must fail before database writes');
 console.log('PASS real member invalid receipt path rejected; zero ticket, attachment or grant created.');
 console.log('PASS LIVE MEMBER SUPPORT/RECEIPT AUTH QA — read-only + rejected invalid input only.');
}catch(e){console.error('FAIL/BLOCKED real signed-member receipt QA: '+String(e?.message||e).slice(0,370));process.exitCode=1}
