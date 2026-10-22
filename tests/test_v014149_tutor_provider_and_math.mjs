/* D09: source-only tests. All providers and Supabase are synthetic mocks.
 * Zero HTTP calls to any real payment, inference or private database account.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hypotheticalPositionSize} from '../functions/_lib/tutor-position-math-v014149.js';
import {callTutorModel,tutorProvider,CLOUDFLARE_TUTOR_MODEL} from '../functions/_lib/tutor-provider-v014107.js';
import {aiServiceConfig} from '../functions/_lib/first-party-ai-service-v014103.js';
import {onRequest as stableTutor} from '../functions/api/market-tutor.js';
import {onRequest as versionedTutor} from '../functions/api/market-tutor-v01492.js';
import {onRequest as stableHistory} from '../functions/api/member-tutor-history.js';
import {onRequest as versionedHistory} from '../functions/api/member-tutor-history-v014102.js';
import {onRequest as stableStatus} from '../functions/api/member-ai-service.js';
import {onRequest as versionedStatus} from '../functions/api/member-ai-service-v014103.js';
assert.equal(stableTutor,versionedTutor);
assert.equal(stableHistory,versionedHistory);
assert.equal(stableStatus,versionedStatus);
const math=hypotheticalPositionSize('Calculate position size: risk $50, entry $5.00, stop $4.75, target $6.00');
assert.equal(math.ok,true);
assert.equal(math.assumptions.shares,200);
assert.equal(math.assumptions.distanceCents,25);
assert(math.answer.includes('4.00:1'));
assert(math.answer.includes('NOT broker fills'));
assert.equal(math.graded,false);
const rounding=hypotheticalPositionSize('Calculate hypothetical position size: risk $33.33, entry $5.00, stop $4.80');
assert.equal(rounding.assumptions.shares,166);
assert(rounding.answer.includes('Unused planned price-only risk allowance: $0.13'));
assert.equal(hypotheticalPositionSize('calculate position size: risk $50, entry $5, stop $5').ok,false);
assert.equal(hypotheticalPositionSize('calculate position size: risk $0, entry $5, stop $4').ok,false);
assert.equal(hypotheticalPositionSize('calculate position size: risk $50, entry $5, stop $5.50').ok,false);
assert.equal(hypotheticalPositionSize('Should I buy TSLA tomorrow?'),null);
const quotas={AI_SERVICE_ENABLED:'true',AI_SERVICE_MEMBER_DAILY_LIMIT:'3',
 AI_SERVICE_GLOBAL_DAILY_LIMIT:'10',AI_SERVICE_GLOBAL_MONTHLY_LIMIT:'100',
 SUPABASE_URL:'https://mock.supabase.test',SUPABASE_SECRET_KEY:'sb_secret_local'};
let modelCalls=0,seenPrompt='';
const cf={...quotas,AI_TUTOR_PROVIDER:'cloudflare_workers_ai',AI_TUTOR_MODEL:CLOUDFLARE_TUTOR_MODEL,
 AI:{run:async(model,args)=>{modelCalls++;assert.equal(model,CLOUDFLARE_TUTOR_MODEL);
  assert.equal(args.stream,false);assert.equal(args.max_tokens,350);
  seenPrompt=JSON.stringify(args);
  return {response:'VWAP is an educational price-volume reference, not an entry guarantee [1].'};}}};
assert.equal(tutorProvider({...cf,AI:{}}).supported,false);
assert.equal(aiServiceConfig({...cf,AI_TUTOR_MODEL:'@cf/fake/unapproved'}).enabled,false);
assert.equal(aiServiceConfig({...cf,AI_SERVICE_ENABLED:'false'}).enabled,false);
assert.equal(aiServiceConfig({...cf,AI_SERVICE_MEMBER_DAILY_LIMIT:undefined}).enabled,false);
assert.equal(aiServiceConfig(cf).enabled,true);
let result=await callTutorModel(cf,{instructions:'Evidence and guardrails',input:'Published first-party glossary only'});
assert.equal(result.ok,true);
assert.equal(modelCalls,1);
assert(!seenPrompt.includes('sb_secret_local'));
result=await callTutorModel({...cf,AI_TUTOR_MODEL:'@cf/fake/unapproved'},
 {instructions:'no',input:'no'});assert.equal(result.ok,false);assert.equal(modelCalls,1);
result=await callTutorModel(cf,{instructions:'no',input:'no',signal:{aborted:true}});
assert.equal(result.ok,false);assert.equal(modelCalls,1);
const legacy={...quotas,AI_TUTOR_PROVIDER:'openai',AI_TUTOR_MODEL:'approved-existing-model',
 AI_TUTOR_API_KEY:'synthetic-test-key'};
assert.equal(aiServiceConfig(legacy).enabled,true,'preserve existing explicit Owner model setting');
assert.equal(aiServiceConfig({...legacy,AI_TUTOR_MODEL_ALLOWLIST:'a,b'}).enabled,false);
assert.equal(aiServiceConfig({...legacy,AI_TUTOR_MODEL_ALLOWLIST:'approved-existing-model'}).enabled,true);
assert.equal(tutorProvider({...legacy,AI_TUTOR_PROVIDER:'unknown'}).supported,false);
const client=readFileSync(new URL('../assets/js/market-tutor.js',import.meta.url),'utf8');
assert(client.includes("fetch('/api/market-tutor'"));
assert(client.includes("'/api/member-tutor-history'"));
assert(client.includes("fetch('/api/member-ai-service'"));
console.log('PASS D09: guarded Cloudflare model, strict math, stable API aliases, existing-model compatibility, no live provider or payment.');
