/* Unified, no-charge source test orchestrator for Deployments 09–18.
 * Uses existing Node tests and evidence scripts; creates no provider traffic,
 * customer entitlements, SQL execution or financial charges.
 * Never interprets source CI PASS as production acceptance.
 */
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const tests={
 d09:[
  'tests/test_v014149_tutor_retrieval.mjs',
  'tests/test_v014149_tutor_arithmetic.mjs',
  'tests/test_v014149_tutor_provider.mjs',
  'tests/test_v014149_tutor_conversations.mjs',
  'tests/test_v014149_tutor_lab_context.mjs',
  'tests/test_v014159_tutor_verified_followups.mjs',
  'tests/test_v014147_tutor_boundary.mjs'],
 d10:['tests/test_v014150_market_data_integrity.mjs','tests/test_v014146_market_analysis.mjs','tests/test_v014150_market_bar_import.mjs'],
 d11:['tests/test_v014151_foundations_content_gate.mjs','tests/test_v014151_lab_visual_layout.mjs'],
 d12:['tests/test_v014152_other325_evidence.mjs'],
 d13:['tests/test_v014153_paged_member_grade_history.mjs','tests/test_v014153_training_stale_mode.mjs'],
 d14:['tests/test_v014154_bootcamp_formative.mjs','tests/test_v014154_bootcamp_day05_visual.mjs'],
 d15:['tests/test_v014155_release_metadata.mjs','tests/test_v014155_live_checkout_body_limits.mjs','tests/test_v014155_webhook_body_limits.mjs','tests/test_v014155_portal_and_entitlement_boundaries.mjs'],
 d16:['tests/test_v014156_admin_shell.mjs','tests/test_v014156_admin_service_key_compatibility.mjs','tests/test_v014156_admin_stage_b_members_audit.mjs'],
 d17:['tests/v0144_route_contracts.mjs','tests/test_v014157_support_security.mjs','tests/test_v014157_support_reopen_ui.mjs','tests/test_v014157_gws_owner_drafts.mjs','tests/test_v014157_legacy_forum_atomic.mjs','tests/test_v014157_public_seo.mjs','tests/test_v014157_sitewide_skip_navigation.mjs','scripts/deployment17_source_security_readiness.mjs'],
 d18:['scripts/deployment18_acceptance_matrix.mjs']
};
const prereqs={d18:['scripts/deployment17_source_security_readiness.mjs','scripts/deployment17_requirements_reconciliation.mjs','scripts/curriculum-acceptance-evidence.mjs']};
const opts=process.argv.slice(2),at=opts.indexOf('--scope');
const scope=at<0?'d09':opts[at+1];
const acceptable=new Set([...Object.keys(tests),'all']);
if(!acceptable.has(scope)){console.error('Choose --scope d09 ... d18, or --scope all');process.exit(2)}
const scopes=scope==='all'?Object.keys(tests):[scope];
const entries=[],first=Date.now();
for(const name of scopes)for(const path of [...(prereqs[name]||[]),...tests[name]]){
 const start=Date.now(),where=join(root,path);
 if(!existsSync(where)){
  entries.push({scope:name,path,status:'MISSING_SOURCE_TEST',durationMs:Date.now()-start});
  continue;
 }
 const result=spawnSync(process.execPath,[where],{cwd:root,encoding:'utf8',timeout:90000,
  maxBuffer:1024*1024,env:{...process.env,GU_SOURCE_ONLY_VERIFICATION:'true'}});
 entries.push({scope:name,path,status:result.status===0?'PASS':'FAIL',
  durationMs:Date.now()-start,exitCode:result.status,
  timeoutOrExecutionError:result.error?'execution_unavailable_or_timeout':null});
}
const failed=entries.filter(x=>x.status!=='PASS');
const report={
 schema:'groundup-development-program-source-verification-v1',
 scope,gitSha:process.env.GITHUB_SHA||null,createdAtUtc:new Date().toISOString(),
 mode:'LOCAL_SOURCE_ONLY_NO_EXTERNAL_ACCEPTANCE',totalTests:entries.length,
 passed:entries.length-failed.length,failed:failed.length,durationMs:Date.now()-first,
 gates:{
  sourceTests:failed.length?'FAIL':'PASS',
  exactHeadGithubActions:'INDEPENDENT_WORKFLOW_RUN_REQUIRED',
  supabaseLive:'NOT_TESTED_BY_THIS_RUNNER',
  cloudflareLive:'NOT_TESTED_BY_THIS_RUNNER',
  paidStripe:'NOT_TESTED_NO_TRANSACTIONS',
  liveMemberAB:'NOT_TESTED_BY_THIS_RUNNER',
  accessibilityManual:'NOT_TESTED_BY_THIS_RUNNER',
  editorial419:'INDEPENDENT_RECORD_REVIEW_REQUIRED',
  editorialBootcamp30:'INDEPENDENT_RECORD_REVIEW_REQUIRED',
  production:'NOT_ACCEPTED'
 },results:entries
};
const destination=join(root,'artifacts/dev-program-source-verification-'+scope+'.json');
mkdirSync(join(root,'artifacts'),{recursive:true});
writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log('SOURCE VERIFICATION '+scope+': '+report.passed+'/'+report.totalTests+
 ' PASS; '+report.failed+' FAIL. PRODUCTION NOT CERTIFIED.');
for(const entry of failed)console.error(entry.scope,entry.path,entry.status,entry.timeoutOrExecutionError||'inspect GitHub Actions step logs');
if(failed.length)process.exitCode=1;
