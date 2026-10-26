import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
import {verifiedHistoricalDataset,replayAvailableToEntitlement} from '../functions/_lib/verified-historical-dataset-v014143.js';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const historicalArchive=read('supabase/migrations/v0.14.0.97_419_AUTHOR_CREATED_FICTIONAL_OHLCV_OWNER_REVIEW_REQUIRED.sql');
assert(historicalArchive.includes("original_synthetic',true"),'Preserve historical source, never rerun the fictional market migration');
const fake={dataset_code:'GUSIM_SITE_001',ticker:'SIMULATION',status:'published',dataset_type:'ohlcv',
 source_attribution:'Invented market data',license_note:'Authored fictional',metadata:{original_synthetic:true,
 real_market_security:false,licensed_for_member_display:true,evidence_verified:true,corporate_action_policy:'not applicable'}};
assert(!verifiedHistoricalDataset(fake));assert(!replayAvailableToEntitlement(fake,'MARKET_SIMULATOR'));
assert(!replayAvailableToEntitlement(fake,'ONDEMAND_TRAINING'));
let bars=0;const old=globalThis.fetch,respond=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async u=>{
 const path=String(u);
 if(path.endsWith('/auth/v1/user'))return respond({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
 if(path.includes('/profiles?'))return respond([{account_kind:'member'}]);
 if(path.includes('/admin_user_flags?'))return respond([{status:'active'}]);
 if(path.includes('/admin_user_roles?'))return respond([]);
 if(path.includes('/rpc/user_has_tool_access'))return respond(true);
 if(path.includes('/market_datasets?'))return respond([fake]);
 if(path.includes('/gu_replay_bars_v01492?')){bars++;return respond([])}
 throw Error('Unexpected request '+path);
};
async function call(action,body){
 const req=new Request('https://example.test/api/learning-replay-v01492?action='+action,
  {method:body?'POST':'GET',headers:{authorization:'Bearer member',...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const r=await onRequest({request:req,env:{SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',SUPABASE_SECRET_KEY:'sb_secret_test'}});
 return [r.status,await r.json()];
}
try{
 let [status,body]=await call('catalog');assert.equal(status,200);assert.equal(body.datasets.length,0);
 [status,body]=await call('start',{datasetCode:'GUSIM_SITE_001'});assert.equal(status,403);
 assert.equal(bars,0,'Rejected fiction must not reach market observation reads');
 assert(!JSON.stringify(body).includes('Invented market data'));
 assert(!read('verified-replay.html').includes('Published original simulations'));
 assert(!read('assets/js/site-lab-experience.js').includes('Open Original Simulated Replay'));
 console.log('PASS v143: 419 legacy fictional records are withheld from all member historical replay');
}finally{globalThis.fetch=old}
