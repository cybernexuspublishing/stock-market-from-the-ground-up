/* D08 v0.14.0.148 — deterministic SOURCE-ONLY release evidence.
 * No credentials, production network, provider calls, database mutations,
 * fabricated QA data or automatic Owner progress writes.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {ownerReleasePlanV014141} from '../functions/_lib/owner-release-plan-v014141.js';
const read=p=>readFileSync(join(process.cwd(),p),'utf8');
const paths=[
 ['ownerReleasePlan','functions/_lib/owner-release-plan-v014141.js'],
 ['versionedReport','docs/v0.14.0.148_DEPLOYMENT_08_OF_08_SITEWIDE_RELEASE_AND_ACCEPTANCE.md'],
 ['staticBuilder','scripts/build-pages.sh'],
 ['checkout','functions/api/checkout.js'],
 ['ownerPlan','functions/api/plan-controls.js'],
 ['paymentMiddleware','functions/_middleware.js'],
 ['tutor','functions/api/market-tutor-v01492.js'],
 ['history','functions/api/member-tutor-history-v014102.js'],
 ['marketReplay','functions/api/learning-replay-v01492.js'],
 ['research','assets/js/market-analysis-engine-v014146.js'],
 ['legalAudit','functions/_lib/owner-legal-audit-v014109.js'],
 ['recovery','.github/workflows/website-source-backup.yml'],
 ['ownerRoadmap','functions/api/owner-roadmap.js'],
 ['reviewedSql','supabase/admin/v0.14.0.148_DEPLOYMENT_FINAL_PREFLIGHT_READ_ONLY.sql']
];
const evidence=paths.map(([code,path])=>({
 code,path,present:existsSync(path),
 sha256:existsSync(path)?createHash('sha256').update(read(path)).digest('hex'):null
}));
const lab=JSON.parse(read('data/competency-lab-paths-v01499.json'));
const skills=JSON.parse(read('data/competency-study-guides-v01499.json'));
const packages=ownerReleasePlanV014141.packages;
const must=(condition,why)=>{if(!condition)throw Error('D08 RELEASE CONTRACT FAILURE: '+why)};
must(evidence.every(x=>x.present),'expected tracked source files missing');
must(packages.length===8&&packages.map(x=>x.number).join(',')==='01,02,03,04,05,06,07,08','eight delivery sequence changed');
must(packages.slice(0,7).every(x=>x.sourceDelivery==='merged'),'D01–D07 source merges missing from controlling source plan');
must(['not_started','source_implemented','merged'].includes(packages[7].sourceDelivery),'D08 lifecycle state invalid');
must(packages.every(x=>x.productionAcceptance!=='verified'&&x.productionAcceptance!=='accepted'),
 'Source-only CI may not certify the live platform');
must(lab.totalCanonicalLabs===419,'canonical Lab count changed');
must(Array.isArray(skills.guides)&&skills.guides.length===30,'official competency count changed');
must(new Set(skills.guides.map(x=>x.code)).size===30,'duplicate competency code');
must(read('scripts/build-pages.sh').includes('if [[ -e data/interactive-labs.json ]]'),
 'Public build no longer blocks private authored Lab source');
const middleware=read('functions/_middleware.js');
must(middleware.includes("'/api/stripe-live-checkout'")&&middleware.includes('paymentModeBoundary'),
 'Public stable checkout requires mode barrier');
const checkout=read('functions/api/checkout.js'),controls=read('functions/api/plan-controls.js');
must(checkout.includes('if(/^eyJ')&&controls.includes('apikey:c.secret'),
 'Legacy services must handle modern opaque Supabase keys');
must(!checkout.includes('headers={apikey:secret,authorization:'),
 'Legacy checkout cannot use service secret as unverified Bearer');
must(!controls.includes("apikey:c.secret,authorization:'Bearer '+c.secret"),
 'Legacy plan controls cannot use opaque key as unverified Bearer');
must(read('assets/js/route-policy.js').includes('STAFF_SET')&&read('sw.js').includes("p.startsWith('/api/')"),
 'Private-route classification or API cache bypass missing');
must(read('functions/api/market-tutor-v01492.js').includes('parseTutorRequest(request)'),
 'Tutor pre-quota request boundary missing');
const sha=process.env.GITHUB_SHA||'';
const acceptance=[
 ['github_ci','EXTERNAL_CHECK_REQUIRED','CI on exact merge SHA is independent of this source evaluation.'],
 ['cloudflare_pages','EXTERNAL_CHECK_REQUIRED','Cloudflare deploy must succeed at exact merged SHA.'],
 ['supabase_member_acl','NOT_VERIFIED','Production Member A/B, Owner, Moderator, TEST, Showcase and restricted-role probes required.'],
 ['stripe_live_payment','NOT_VERIFIED','No authorized positive-dollar provider payment, signed webhook or entitlement verified here.'],
 ['historical_market_rights','NOT_VERIFIED','Historical data licensing/redistribution and authenticated quote/tape evidence still required.'],
 ['editorial_419','NOT_VERIFIED','419 registered Labs are not 419 individually verified historical exercises.'],
 ['tutor_provider','NOT_VERIFIED','Provider funding/consent, commercial model call, quotas and pedagogical review pending.'],
 ['privacy_counsel','NOT_VERIFIED','Legal/policy, refunds, taxation, privacy and accessibility review pending.'],
 ['restore_drill','NOT_VERIFIED','Repository source ZIP is NOT a Supabase, Cloudflare or Stripe disaster recovery backup.'],
 ['production_browser','NOT_VERIFIED','Actual signed-in multi-role, mobile and keyboard/screen reader testing remains.']
];
const result={
 schema:'groundup-d08-source-evidence-v1',release:'0.14.0.148',
 project:'The Stock Market: From the Ground Up',
 generatedUtc:new Date().toISOString(),
 sourceCommit:/^[0-9a-f]{40}$/i.test(sha)?sha:null,
 evidenceClass:'GITHUB_SOURCE_ONLY_NO_PRODUCTION_ACCESS',
 sourceChecksPassed:true,sourceComponents:evidence,
 canonicalLabRegistrations:lab.totalCanonicalLabs,
 officialCompetencies:skills.guides.length,
 deliveries:packages.map(x=>({number:x.number,sourceDelivery:x.sourceDelivery,
  productionAcceptance:x.productionAcceptance,roadmapId:x.roadmapId})),
 acceptanceGates:acceptance.map(([id,status,reason])=>({id,status,reason})),
 productionCertification:false,customerChargesPerformed:false,
 ownerSavedRoadmapChanged:false,sqlApplied:false
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d08-sitewide-source-evidence.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS D08 SOURCE ONLY: eight delivery slots, 419 canonical Lab registrations, 30 official competencies.');
console.log('Unverified production gates: '+acceptance.length+'. See artifacts/d08-sitewide-source-evidence.json');
