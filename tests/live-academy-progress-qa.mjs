/* Live authenticated Boot Camp progress acceptance — owner-authorized QA member only.
 * No LIVE payments, official grades, private keys, cross-member reads, deletions or
 * overwrites of existing member notes. The ONE new QA reflection is labeled FICTIONAL.
 * Only a genuine password-grant access token issued by Supabase Auth is accepted;
 * with CAPTCHA enforced and no challenge token, this test MUST fail closed.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'';
const password=process.env.LAB_QA_PASSWORD||'';
const cfg=readFileSync('config.js','utf8');
const supabase=cfg.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1];
const publishable=cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
if(!email||!password||!supabase||!publishable){
 console.error('BLOCKED: requires the existing LAB_QA_* Secrets and browser-publishable config.');
 process.exit(2);
}
const run=async(url,init={})=>{
 const result=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(25000)});
 const body=await result.json().catch(()=>({}));
 return {status:result.status,body};
};
const authenticate=async()=>{
 const auth=await run(supabase+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:publishable,'content-type':'application/json'},
  body:JSON.stringify({email,password})
 });
 if(auth.status!==200||!auth.body.access_token||!auth.body.refresh_token){
  const code=String(auth.body.error_code||auth.body.code||'AUTH_REJECTED').slice(0,50);
  throw Error('PRODUCTION_AUTH_NOT_VERIFIED HTTP '+auth.status+' code '+code+
   '. If CAPTCHA is enabled, complete genuine Turnstile in an interactive QA browser; NEVER bypass verification.');
 }
 const verified=await run(supabase+'/auth/v1/user',{
  headers:{apikey:publishable,authorization:'Bearer '+auth.body.access_token}
 });
 assert.equal(verified.status,200,'Supabase must validate issued access token');
 assert.equal(verified.body.id,auth.body.user?.id,'Auth token must bind to credential owner');
 console.log('PASS genuine Supabase password grant and signed user identity (no secrets logged).');
 return auth.body;
};
const academy=async(accessToken,action,body,extraHeaders={})=>run(origin+
 (body?'/api/bootcamp-academy':'/api/bootcamp-academy?program='+encodeURIComponent(action)),{
 method:body?'POST':'GET',
 headers:{authorization:'Bearer '+accessToken,...(body?{'content-type':'application/json'}:{}),...extraHeaders},
 ...(body?{body:JSON.stringify(body)}:{})
});
const assertProgress=(answer)=>{assert.equal(answer.status,200);assert.equal(answer.body.ok,true);
 assert.equal(answer.body.progressAvailable,true,'no silent storage failure');
 assert(Array.isArray(answer.body.progress),'progress must be a real private array');
 assert.equal(answer.body.program.code,'truth5');assert.equal(answer.body.curriculum.length,5);
 return answer.body;
};
try{
 const signed=await authenticate();
 const first=assertProgress(await academy(signed.access_token,'truth5'));
 let enrolled=first.enrolled===true;
 // Never overwrite existing private notes or attempt to reset an existing course.
 const day=[5,4,3,2,1].find(n=>!first.progress.some(x=>x.day===n));
 if(!day)throw Error('QA account has progress on all five Truth5 days; refuse to overwrite any existing record.');
 console.log('PASS initial private progress GET, unclaimed QA day located.');
 const payload=(action,extra={})=>({version:'0.14.0.168',program:'truth5',action,day:action==='enroll'?0:day,...extra});
 if(!enrolled){
  const joined=await academy(signed.access_token,'truth5',payload('enroll'));
  assert.equal(joined.status,200,'enroll HTTP status');assert.equal(joined.body.ok,true);
  assert.equal(joined.body.enrolled,true);
  console.log('PASS authenticated QA enrollment persisted (ungraded).');
 }
 const enrollment=assertProgress(await academy(signed.access_token,'truth5'));
 assert.equal(enrollment.enrolled,true,'enrollment must survive fresh GET');
 assert.equal(enrollment.progress.some(x=>x.day===day),false,'QA day must remain unused before write');
 const start=await academy(signed.access_token,'truth5',payload('start'));
 assert.equal(start.status,200);assert.equal(start.body.progress.status,'in_progress');
 assert.equal(start.body.progress.revision,1);
 assert.equal(start.body.progress.graded,false);
 assert.equal(start.body.progress.competencyMasteryAwarded,false);
 const again=await academy(signed.access_token,'truth5',payload('start'));
 assert.equal(again.status,200);assert.equal(again.body.progress.revision,1,'start must be idempotent');
 console.log('PASS QA study day stored, repeat start is idempotent and did not grant mastery.');
 const reflection='FICTIONAL QA STUDY RECORD — automated integration test, not a real stock, grade, trade or market event. '+
  'The source is an intentionally imaginary headline; the decision is to withhold trading, verify original filing timestamps, '+
  'separate evidence from interpretation and record uncertainty before reviewing later observations.';
 assert(reflection.length>=80&&reflection.length<=2000);
 const saved=await academy(signed.access_token,'truth5',
  payload('save_reflection',{reflection,expectedRevision:1}));
 assert.equal(saved.status,200,'reflection save HTTP status');
 assert.equal(saved.body.progress.status,'reflection_saved');
 assert.equal(saved.body.progress.revision,2);
 assert.equal(saved.body.progress.reflection,reflection);
 assert.equal(saved.body.progress.graded,false);
 assert.equal(saved.body.progress.marketOutcomeClaimed,false);
 assert.equal(saved.body.progress.competencyMasteryAwarded,false);
 const reread=assertProgress(await academy(signed.access_token,'truth5'));
 const row=reread.progress.find(x=>x.day===day);
 assert(row,'QA reflection disappeared after fresh request');
 assert.equal(row.status,'reflection_saved');assert.equal(row.revision,2);
 assert.equal(row.reflection,reflection);
 console.log('PASS reflection persisted to production database and survived independent HTTP reload.');
 const stale=await academy(signed.access_token,'truth5',payload('save_reflection',{
  reflection:reflection+' STALE',expectedRevision:1
 }));
 assert.equal(stale.status,409,'stale revision must be rejected');
 assert.equal(stale.body.ok,false);
 const afterConflict=assertProgress(await academy(signed.access_token,'truth5'));
 assert.equal(afterConflict.progress.find(x=>x.day===day)?.reflection,reflection,'conflict must not mutate stored value');
 console.log('PASS stale revision HTTP 409; existing reflection preserved.');
 const rejected=await academy(signed.access_token,'truth5',payload('save_reflection',{
  reflection:reflection+' ORIGIN TEST',expectedRevision:2
 }),{origin:'https://unauthorized.example'});
 assert.equal(rejected.status,403,'foreign origin POST must be denied');
 const invalidDay=await academy(signed.access_token,'truth5',{...payload('start'),day:999});
 assert.equal(invalidDay.status,400,'out-of-range day must be rejected');
 const noToken=await run(origin+'/api/bootcamp-academy?program=truth5',{method:'GET'});
 assert([401,403].includes(noToken.status),'unauthenticated GET must not return private progress');
 console.log('PASS cross-origin, invalid day and unauthenticated access rejected.');
 // Exercise a genuine GoTrue refresh grant to verify persisted data survives credential rotation.
 const refresh=await run(supabase+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',headers:{apikey:publishable,'content-type':'application/json'},
  body:JSON.stringify({refresh_token:signed.refresh_token})
 });
 assert.equal(refresh.status,200,'refresh-token exchange must be genuinely accepted by Supabase');
 assert(typeof refresh.body.access_token==='string'&&refresh.body.access_token.length>20);
 const freshUser=await run(supabase+'/auth/v1/user',{
  headers:{apikey:publishable,authorization:'Bearer '+refresh.body.access_token}
 });
 assert.equal(freshUser.status,200);
 assert.equal(freshUser.body.id,signed.user.id,'token refresh cannot switch account');
 const resumed=assertProgress(await academy(refresh.body.access_token,'truth5'));
 assert.equal(resumed.progress.find(x=>x.day===day)?.reflection,reflection);
 assert.equal(resumed.progress.find(x=>x.day===day)?.revision,2);
 console.log('PASS authenticated token refresh and progress resume under rotated access token.');
 console.log('PASS PRODUCTION ACADEMY SAVE/RELOAD/REFRESH QA — one FICTIONAL ungraded QA note preserved, no other member progress overwritten.');
}catch(e){
 console.error('FAIL live Academy persistence QA: '+String(e?.message||e).slice(0,450));
 process.exitCode=1;
}
