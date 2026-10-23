/* Deployment 18: consolidate EXISTING curriculum ledger and release manifest.
 * This is a source-only evidence artifact, never a production pass token.
 * A positive status requires independently supplied Cloudflare, Supabase,
 * Stripe, editorial, accessibility and operational evidence.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const read=path=>readFileSync(join(root,path),'utf8');
const parse=path=>JSON.parse(read(path));
function requireTruth(ok,message){if(!ok)throw Error('D18 SOURCE CONTRACT: '+message);}
const manifest=parse('release-manifest.json');
const labs=parse('data/competency-lab-paths-v01499.json');
const guides=parse('data/competency-study-guides-v01499.json');
const evidence=parse('artifacts/curriculum-acceptance-v014150.json');
const commerce=parse('data/commerce-config.json');
const decisions=parse('docs/curriculum-acceptance-decisions-v014150.json');
const d17=parse('artifacts/d17-source-security-readiness.json');
requireTruth(d17.schema==='gu-d17-no-provider-source-gates-v1'&&d17.sourceBlockerCount===0,
 'Deployment 17 high-risk source boundary checks must pass before writing acceptance evidence');
const official=['FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY',
 'INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'];
requireTruth(/^0\.14\.0\.\d+$/.test(manifest.version),'manifest version must be valid');
requireTruth(labs.totalCanonicalLabs===419&&Object.keys(labs.byLab||{}).length===419,'exactly 419 canonical Labs');
requireTruth(evidence.labCount===419&&evidence.labs?.length===419,'existing 419-row ledger must be generated');
requireTruth(evidence.bootcampDays===30&&evidence.bootcamp?.length===30,'30-day existing ledger must be generated');
requireTruth(guides.guides?.length===30&&new Set(guides.guides.map(x=>x.code)).size===30,'exactly 30 official competencies');
requireTruth(commerce.version===manifest.version,'public release and commerce version drift');
requireTruth(manifest.stripeProductsEntered===8,'eight canonical paid SKU mapping must remain intact');
requireTruth(manifest.customerCheckoutApproved===false&&manifest.liveStripeFulfillmentEnabled===false,
 'Do not promote payment without real signed lifecycle acceptance');
const keys=['instruction','assessment','rubric','dataEvidence','visuals','accessibility','endToEnd','editorial','production'];
for(const row of evidence.labs){requireTruth(typeof row.id==='string'&&keys.every(k=>row.criterionStatus?.[k]),'missing Lab acceptance criterion');}
requireTruth(Object.keys(decisions.labDecisions||{}).length<=419,'invalid Lab acceptance records');
const acceptedLabs=evidence.labs.filter(x=>x.accepted).length;
const acceptedDays=evidence.bootcamp.filter(x=>x.accepted).length;
requireTruth(acceptedLabs===evidence.acceptedLabs&&acceptedDays===evidence.acceptedDays,'ledger summary must reconcile');
const requiredFiles=[
 'admin.html','admin-unified-preview.html',
 'functions/api/support.js','scripts/deployment17_source_security_readiness.mjs',
 'assets/js/admin-unified-core-v014156.mjs','assets/js/admin-unified-preview-v014156.mjs',
 'functions/api/stripe-live-checkout.js','functions/api/stripe-live-webhook.js',
 'docs/v0.14.0.155_DEPLOYMENT_15_INDEPENDENT_ACCEPTANCE_AUDIT_20261022.md',
 'docs/DEPLOYMENT_HANDOFF_LATEST.md','scripts/curriculum-acceptance-evidence.mjs',
 'docs/v0.14.0.154_DEPLOYMENT_14_OF_18_30_DAY_BOOTCAMP.md'];
const fileEvidence=requiredFiles.map(path=>({path,exists:existsSync(join(root,path)),
 sha256:existsSync(join(root,path))?createHash('sha256').update(read(path)).digest('hex'):null}));
requireTruth(fileEvidence.every(x=>x.exists),'missing critical integration file');
const sourceChecks=[
 {id:'source',status:'PARTIAL_SOURCE_PRESENT',basis:'Critical source files found; no comprehensive sitewide source verification claimed'},
 {id:'ci',status:'EXACT_HEAD_ACTIONS_REQUIRED',basis:'Workflow execution requires independently observed GitHub Actions result'},
 {id:'database',status:'OWNER_READ_ONLY_POSTFLIGHT_REQUIRED',basis:'Existing eight-row SKU CSV proves structure only, not live member RLS'},
 {id:'cloudflare',status:'EXACT_DEPLOYED_SHA_REQUIRED',basis:'No independently verified Cloudflare deployed commit'},
 {id:'functional',status:'LIVE_MEMBER_AB_REQUIRED',basis:'Auth, members, tools, Labs, forms, moderators, TEST and Showcase live checks pending'},
 {id:'security',status:'LIVE_RLS_SECURITY_REVIEW_REQUIRED',basis:'Role and tenant boundaries require independently controlled live tests'},
 {id:'editorial',status:'INDIVIDUAL_APPROVAL_REQUIRED',basis:acceptedLabs+'/419 Labs and '+acceptedDays+'/30 Bootcamp ledger reviews recorded; real evidence review pending'},
 {id:'commercial',status:'AUTHORIZED_LIVE_LIFECYCLE_REQUIRED',basis:'Eight SKUs, zero verified positive-dollar purchase matches in Owner read-only result; payment release locked'},
 {id:'operational',status:'DELIVERY_RECOVERY_REQUIRED',basis:'Email, scheduler, backup restore, incident response and legal signoff need evidence'},
 {id:'production',status:'NOT_ACCEPTED',basis:'No coordinated 10-category launch acceptance recorded'}
];
const output={
 schema:'gu-d18-acceptance-gate-v1',
 project:'The Stock Market: From the Ground Up',
 deployment:'18 of 18',auditScope:'SOURCE_ONLY_NOT_LIVE_EVIDENCE',
 manifestVersion:manifest.version,gitSha:process.env.GITHUB_SHA||null,
 recordedAtUtc:new Date().toISOString(),
 catalog:{canonicalLabs:419,officialCompetencies:30,bootcampDays:30,paidSkuCodes:official},
 acceptance:{
  individuallyReviewedLabs:acceptedLabs,acceptedBootcampDays:acceptedDays,
  verifiedProductionLabs:0,verifiedProductionBootcampDays:0,
  independentlyVerifiedCompetencies:0,
  curriculumLedgerProductionCertified:!!evidence.independentProductionAcceptanceVerified,
  missingLabIds:evidence.labs.filter(x=>!x.accepted).map(x=>x.id),
  missingBootcampDayNumbers:evidence.bootcamp.filter(x=>!x.accepted).map(x=>x.day),
  statuses:sourceChecks
 },
 fileEvidence,
 sourceSecurity:{deployment17Checks:d17.checks?.length||0,sourceBlockers:d17.sourceBlockers||[],productionTested:false},
 launchApproved:false,
 releaseReason:'Source inventory and recorded review fields do not establish real paid production or editorial acceptance.'
};
mkdirSync(join(root,'artifacts'),{recursive:true});
writeFileSync(join(root,'artifacts/d18-integrated-acceptance-source.json'),JSON.stringify(output,null,2)+'\n');
const md=[
 '# Deployment 18 — Source Evidence, NOT Production Acceptance','',
 'Release manifest: '+manifest.version+' | GitHub SHA: '+(output.gitSha||'not supplied'),'',
 'Labs with complete source-ledger review records: **'+acceptedLabs+'/419** (independent validation pending).',
 'Bootcamp days with complete source-ledger review records: **'+acceptedDays+'/30** (independent validation pending).',
 'Official competency definitions: **30**, production verification outstanding.','',
 '| Acceptance gate | Evidence state |','| --- | --- |',
 ...sourceChecks.map(x=>'| '+x.id+' | '+x.status+' |'),'',
 '**Paid memberships: not approved.** Source-stage verification never changes existing Stripe flags.',
 '',
 'Individual missing Lab identifiers and Bootcamp days are recorded in the JSON artifact.'
];
writeFileSync(join(root,'artifacts/d18-integrated-acceptance-source.md'),md.join('\n')+'\n');
console.log('PASS D18 source inventory. NOT PRODUCTION ACCEPTED. Recorded Lab reviews '+acceptedLabs+'/419; Bootcamp '+acceptedDays+'/30.');
