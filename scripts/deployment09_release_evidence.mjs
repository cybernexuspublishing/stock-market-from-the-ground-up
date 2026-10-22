/* D09 source-only release gate. Never promotes production acceptance.
 * Checks project invariants and presence of new Tutor security contracts.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const paths=[
 'functions/_lib/tutor-retrieval-v014149.js',
 'functions/_lib/tutor-arithmetic-v014149.js',
 'functions/_lib/tutor-provider-v014107.js',
 'functions/_lib/first-party-ai-service-v014103.js',
 'functions/api/market-tutor.js',
 'functions/api/member-tutor-history.js',
 'functions/api/member-tutor-conversations.js',
 'functions/api/member-tutor-data-export.js',
 'functions/api/tutor-calculator.js',
 'assets/js/market-tutor.js',
 'market-tutor.html',
 'supabase/migrations/v0.14.0.149_TUTOR_CONVERSATIONS_OWNER_REVIEW_REQUIRED.sql',
 'tests/test_v014149_tutor_retrieval.mjs',
 'tests/test_v014149_tutor_arithmetic.mjs',
 'tests/test_v014149_tutor_provider.mjs',
 'tests/test_v014149_tutor_conversations.mjs',
 'tests/test_v014149_tutor_calculator.mjs',
 'tests/test_v014149_tutor_data_export.mjs',
 'functions/_lib/owner-tutor-access-v014149.js',
 'functions/_lib/tutor-gaps-v014149.js',
 'functions/_lib/tutor-lab-context-v014149.js',
 'functions/api/owner-tutor-case.js',
 'functions/api/owner-tutor-topic-gaps.js',
 'functions/api/member-tutor-data-delete.js',
 'tests/test_v014149_tutor_data_delete.mjs',
 'tests/test_v014149_tutor_browser_integrity.mjs',
 'functions/api/member-ai-service.js',
 'supabase/admin/v0.14.0.149b_EDITORIAL_GAPS_INSTALLED_READ_ONLY.sql',
 'supabase/migrations/v0.14.0.149b_TUTOR_EDITORIAL_AND_GAPS_OWNER_REVIEW_REQUIRED.sql',
 'tests/test_v014149_tutor_editorial_and_gaps.mjs',
 'tests/test_v014149_tutor_lab_context.mjs',
 'docs/DEPLOYMENT_HANDOFF_LATEST.md'
];
function assert(condition,description){if(!condition)throw Error('D09 SOURCE CHECK: '+description)}
for(const path of paths)assert(existsSync(path),'missing '+path);
const lab=JSON.parse(read('data/competency-lab-paths-v01499.json'));
const skills=JSON.parse(read('data/competency-study-guides-v01499.json'));
assert(lab.totalCanonicalLabs===419,'canonical Lab count changed');
assert(skills.guides?.length===30,'competency count changed');
const provider=read('functions/_lib/tutor-provider-v014107.js');
const quota=read('functions/_lib/first-party-ai-service-v014103.js');
const tutor=read('functions/api/market-tutor-v01492.js');
const client=read('assets/js/market-tutor.js');
const sql=read('supabase/migrations/v0.14.0.149_TUTOR_CONVERSATIONS_OWNER_REVIEW_REQUIRED.sql');
assert(provider.includes("AI_CLOUDFLARE_FREE_TIER_VERIFIED")&&provider.includes("MODEL_LICENSE_APPROVED"),
 'Workers AI free/account/model-license gate missing');
assert(provider.includes("AI_PAID_PROVIDER_OWNER_APPROVED")&&provider.includes("AI_TUTOR_APPROVED_MODELS"),
 'Explicit OpenAI model approval gate missing');
assert(quota.includes('gu_v014103_reserve_ai_request'),'transactional spend gate missing');
assert(tutor.includes('ownedConversation')&&tutor.includes('attachTutorExchange'),
 'authenticated conversation boundary missing');
assert((client.split('else void initTutor();').slice(1)||[]).length===1,
 'No duplicated Tutor page boot function allowed');
assert(client.includes('identityEpoch++')&&client.includes('abortController?.abort()'),
 'stale member identity controls missing');
assert(client.includes('/api/market-tutor')&&client.includes('/api/member-tutor-history'),
 'stable public Tutor routes not in use');
const supplemental=read('supabase/migrations/v0.14.0.149b_TUTOR_EDITORIAL_AND_GAPS_OWNER_REVIEW_REQUIRED.sql');
assert((supplemental.split('AS '+String.fromCharCode(36,36)).length-1)===3,
 'Each of the three v149b SQL function bodies must start with double-dollar quoting');
assert((supplemental.split('END '+String.fromCharCode(36,36)+';').length-1)===3,
 'Each v149b SQL function must terminate with double-dollar quoting');

assert(supplemental.includes('ENABLE ROW LEVEL SECURITY')&&
 supplemental.includes('gu_tutor_editorial_audit_v014149')&&
 supplemental.includes('gu_v014149_record_tutor_gap')&&
 supplemental.includes('gu_v014149_delete_tutor_member_data'),
 'Owner audit and no-PII topic gap SQL missing');
assert(sql.includes('ENABLE ROW LEVEL SECURITY')&&sql.includes('REVOKE ALL')&&
 sql.includes('pg_advisory_xact_lock'),'private conversation schema safeguards missing');
const report={
 project:'The Stock Market: From the Ground Up',
 deployment:'09 of 18',targetVersion:'v0.14.0.149',sourceCommit:process.env.GITHUB_SHA||null,
 evidenceScope:'GITHUB_SOURCE_ONLY',newSourceFilesVerified:paths.length,
 sourceInvariantsPassed:true,labRegistrations:419,officialCompetencyDefinitions:30,
 bootcampAccepted:null,labAccepted:null,competenciesProductionAccepted:null,
 externalAcceptance:[
  {gate:'github_exact_commit_ci',status:'SEPARATE_CHECK_REQUIRED'},
  {gate:'supabase_v102_v103_v107_installed_contracts',status:'NOT_VERIFIED'},
  {gate:'supabase_v149_migration_installation',status:'NOT_APPLIED'},
  {gate:'cloudflare_free_ai_binding_and_account_plan',status:'NOT_VERIFIED'},
  {gate:'cloudflare_pages_deployment',status:'NOT_PERFORMED'},
  {gate:'cross_account_and_mobile_browser_qa',status:'NOT_VERIFIED'},
  {gate:'educational_human_review',status:'NOT_VERIFIED'},
  {gate:'owner_source_approval_and_privacy_policy',status:'NOT_VERIFIED'}
 ],
 productionAccepted:false,ownerActionPerformed:false,paidInferenceActivated:false,
 note:'Structural checks do not establish functionality, editorial signoff, or live acceptance.'
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d09-tutor-source-evidence.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS D09 SOURCE CONTRACT: 419 Lab registrations, 30 official competencies, '+paths.length+' required Tutor source files.');
console.log('Production acceptance remains NOT VERIFIED.');
