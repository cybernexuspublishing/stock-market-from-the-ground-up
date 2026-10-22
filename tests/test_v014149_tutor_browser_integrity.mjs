import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync('assets/js/market-tutor.js','utf8');
const html=readFileSync('market-tutor.html','utf8');
assert.equal((js.match(/else void initTutor\(\);/g)||[]).length,1,
 'One browser entry point only, no duplicated appended script');
assert.equal((js.match(/async function calculateHypotheticalPosition\(\)/g)||[]).length,1,
 'Risk calculator handler must be complete and unique');
assert.equal((js.match(/async function exportAllTutorData\(\)/g)||[]).length,1,
 'Private data export handler must be complete and unique');
const ids=[...new Set([...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]))];
for(const id of ids)assert(html.includes('id="'+id+'"'), 'Tutor DOM control not found: '+id);
for(const id of ['tutor-calc-equity','tutor-calc-risk','tutor-calc-entry','tutor-calc-stop',
 'tutor-conversation-new','tutor-conversation-search','tutor-stop','tutor-retry',
 'tutor-export-all','tutor-calc-submit'])assert(html.includes('id="'+id+'"'),id);
assert(js.includes('TUTOR.abortController?.abort();TUTOR.identityEpoch++'),
 'Deleting private data must invalidate pending responses');
assert(!/\binnerHTML\s*=/.test(js),'Never render untrusted conversation markup');
assert(!/\blocalStorage\s*[.\[]/.test(js),'Never store private member transcripts in localStorage');
assert(!js.includes('fetch(\'/api/member-ai-service-v014103\''),
 'Member UI must use stable unversioned endpoint');
console.log('PASS D09 one unique browser entry point, safe rendering and all Tutor UI controls present ('+ids.length+' static IDs)');
