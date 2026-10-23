/* D16–D18 consolidated source-only readiness snapshot.
 * Never converts a registered Lab, a review placeholder or a GitHub source
 * commit into production acceptance. No network, customer data or payments.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const registry=read('data/competency-lab-paths-v01499.json');
const skills=read('data/competency-study-guides-v01499.json');
const formative=read('data/bootcamp-formative-v014154.json');
const decisions=read('docs/curriculum-acceptance-decisions-v014150.json');
const manifest=read('release-manifest.json');
const expected={FOUNDATION_BOOK_1:15,FOUNDATION_BOOK_2:46,FOUNDATION_BOOK_3:33,
 DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100};
const labs=Object.entries(registry.byLab||{});
const counted=Object.fromEntries(Object.keys(expected).map(k=>[k,labs.filter(([,v])=>v.bookCode===k).length]));
const assert=(ok,msg)=>{if(!ok)throw Error('SITEWIDE PREFLIGHT: '+msg)};
assert(labs.length===419&&registry.totalCanonicalLabs===419,'exact 419 canonical IDs');
for(const [k,v] of Object.entries(expected))assert(counted[k]===v,'collection '+k);
assert(skills.guides?.length===30&&new Set(skills.guides.map(g=>g.code)).size===30,'exact 30 competencies');
assert(formative.days?.length===30&&new Set(formative.days.map(d=>d.day)).size===30,'exact 30 Bootcamp days');
assert(formative.graded===false,'Self-checks may not masquerade as graded assessments');
const fields=['instruction','assessment','rubric','dataEvidence','visuals','accessibility','endToEnd','editorial','production'];
const dayFields=['instruction','exercises','assessments','labIntegration','competencyMapping','tutorIntegration','accessibility','endToEnd','editorial','production'];
const accepted=(obj,required)=>required.every(k=>{
 const record=obj?.[k];
 return record?.status==='accepted'&&typeof record?.reviewer==='string'&&
  record.reviewer.trim().length>=3&&typeof record?.evidenceRef==='string'&&
  record.evidenceRef.trim().length>=8&&typeof record?.reviewedAt==='string'&&
  !Number.isNaN(Date.parse(record.reviewedAt));
});
const acceptedLabs=labs.filter(([id])=>accepted(decisions.labDecisions?.[id],fields)).map(([id])=>id);
const days=formative.days.map(x=>x.day);
const acceptedDays=days.filter(day=>accepted(decisions.bootcampDecisions?.[String(day)],dayFields));
const status={
 schema:'groundup-sitewide-source-readiness-v1',
 sourceVersion:manifest.version,
 evidenceType:'SOURCE_ONLY__NO_PRODUCTION_ATTESTATION',
 createdAt:new Date().toISOString(),
 canonicalLabs:419,labGroups:counted,
 acceptedLabCount:acceptedLabs.length,
 unacceptedLabIds:labs.map(([id])=>id).filter(id=>!acceptedLabs.includes(id)),
 officialCompetenciesDefined:30,
 competencyAssessmentAcceptance:'NOT_INDEPENDENTLY_VERIFIED',
 bootcampDaysRegistered:30,bootcampSelfChecksGraded:false,
 acceptedBootcampDays:acceptedDays.length,
 unacceptedBootcampDayNumbers:days.filter(d=>!acceptedDays.includes(d)),
 commercial:{catalogProductCodesExpected:8,
  productionSignedPaidSKUsVerified:'REQUIRES_SUPABASE_AND_STRIPE_READ_ONLY_AND_PAYMENT_EVIDENCE',
  sourceManifestCheckoutApproved:manifest.customerCheckoutApproved===true,
  sourceManifestFulfillmentEnabled:manifest.liveStripeFulfillmentEnabled===true},
 admin:{stageAExplicitCoreRegistry:'SOURCE_CANDIDATE_NOT_MOUNTED',
  migrationAcceptance:'NOT_VERIFIED'},
 external:{cloudflareProductionSha:'NOT_OBSERVED',
  installedSupabaseSchema:'NOT_OBSERVED_FROM_SOURCE',
  realStripeLifecycle:'NOT_OBSERVED_FROM_SOURCE',
  privacyLegalEditorialApproval:'NOT_ATTESTED',
  licensedHistoricalMarketData:'NOT_ATTESTED'},
 productionAccepted:false,
 warning:'No source test, fixture, catalog record or locally recorded editorial decision alone establishes deployed functionality, customer billing or production approval.'
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/sitewide-readiness-v014158.json',JSON.stringify(status,null,2)+'\n');
console.log('Source readiness: '+acceptedLabs.length+'/419 Labs, '+acceptedDays.length+'/30 Bootcamp days with all criteria recorded; 30 official competency definitions. Production acceptance NOT VERIFIED.');
