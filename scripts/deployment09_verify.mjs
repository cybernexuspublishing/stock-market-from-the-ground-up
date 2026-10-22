/* D09 first-party Tutor source-only verification controller.
 * Reuses existing Node regression files; no new framework or provider calls.
 * Keeps tests that fail visible and writes machine-readable evidence.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const targets=[
 'tests/test_v014092_market_tutor_contract.mjs',
 'tests/test_v014093_tutor_practice.mjs',
 'tests/test_v014100_free_competency_tutor.mjs',
 'tests/test_v014102_member_tutor_history.mjs',
 'tests/test_v014102_tutor_ai_consent.mjs',
 'tests/test_v014103_first_party_ai_service.mjs',
 'tests/test_v014107_tutor_quality.mjs',
 'tests/test_v014147_tutor_boundary.mjs',
 'tests/test_v014147_tutor_history_idempotency.mjs',
 'tests/test_v014147_owner_tutor_feedback.mjs',
 'tests/test_v014149_tutor_provider_and_math.mjs',
 'tests/test_v014149_tutor_conversations.mjs',
 'tests/test_v014149_tutor_unanswered.mjs',
 'tests/test_v014149_tutor_portability.mjs'
];
const checks=[
 ...targets.map(p=>({id:p,args:[p]})),
 ...['functions/_lib/tutor-provider-v014107.js',
      'functions/_lib/first-party-ai-service-v014103.js',
      'functions/_lib/tutor-position-math-v014149.js',
      'functions/api/market-tutor-v01492.js',
      'functions/api/member-tutor-conversations.js',
      'functions/_lib/tutor-gap-tracking-v014149.js',
      'functions/api/owner-tutor-feedback.js',
      'functions/api/member-tutor-export.js',
      'assets/js/lab-player.js',
      'assets/js/admin-tutor-feedback-v014147.js',
      'functions/_lib/tutor-request-boundary-v014147.js',
      'functions/_lib/tutor-history-save-v014107.js',
      'assets/js/market-tutor.js'].map(p=>({id:'syntax:'+p,args:['--check',p]}))
];
let failure=0;
const results=checks.map(({id,args})=>{
 const run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:120000,
  maxBuffer:2*1024*1024,env:{...process.env,AI_SERVICE_ENABLED:'false'}});
 const passed=run.status===0&&!run.error;
 if(!passed)failure++;
 console.log((passed?'PASS ':'FAIL ')+id);
 if(!passed)process.stderr.write((run.stderr||run.stdout||String(run.error)).slice(0,3000)+'\n');
 return {id,passed,exitCode:run.status,error:run.error?.message||null,
  evidenceType:'mocked_source_only_no_production_access'};
});
const report={
 schema:'groundup-d09-source-check-v1',project:'The Stock Market: From the Ground Up',
 deployment:'09-of-18',releaseCandidate:'0.14.0.149',
 createdAt:new Date().toISOString(),commit:process.env.GITHUB_SHA||null,
 passed:checks.length-failure,failed:failure,checks:results,
 productionAccepted:false,liveAiActivated:false,sqlApplied:false,
 liveBillingVerified:false,historicalDataRightsVerified:false,
 labsAccepted:null,bootcampAccepted:null,competenciesAccepted:null
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d09-tutor-source-evidence.json',JSON.stringify(report,null,2)+'\n');
if(failure)process.exitCode=1;
