import assert from 'node:assert/strict';
import {callTutorModel,tutorProvider} from '../functions/_lib/tutor-provider-v014107.js';
import {aiServiceConfig} from '../functions/_lib/first-party-ai-service-v014103.js';
const base={AI_TUTOR_PROVIDER:'cloudflare',AI_TUTOR_MODEL:'@cf/zai-org/glm-4.7-flash',
 AI_COST_MODE:'free_only',AI_CLOUDFLARE_FREE_TIER_VERIFIED:'true',
 AI_CLOUDFLARE_MODEL_LICENSE_APPROVED:'true',
 AI_SERVICE_ENABLED:'true',AI_SERVICE_MEMBER_DAILY_LIMIT:'2',
 AI_SERVICE_GLOBAL_DAILY_LIMIT:'5',AI_SERVICE_GLOBAL_MONTHLY_LIMIT:'30',
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'testservice'};
let hits=0;const env={...base,AI:{run:async(model,options)=>{hits++;assert.equal(model,base.AI_TUTOR_MODEL);
 assert.ok(options.messages[0].content);assert.ok(options.max_completion_tokens<=350);
 return {response:'Source-grounded educational example [1] with uncertainty.'};}}};
assert.equal(tutorProvider({}).supported,false);
assert.equal(aiServiceConfig(env).enabled,true);
assert.equal(aiServiceConfig({...env,AI_CLOUDFLARE_FREE_TIER_VERIFIED:'false'}).enabled,false);
assert.equal(aiServiceConfig({...env,AI_CLOUDFLARE_MODEL_LICENSE_APPROVED:'false'}).enabled,false);
assert.equal(aiServiceConfig({...env,AI_TUTOR_MODEL:'@cf/moonshotai/kimi-k2.6'}).enabled,false);
assert.equal(aiServiceConfig({...env,AI_SERVICE_ENABLED:'false'}).enabled,false);
assert.equal((await callTutorModel(env,{instructions:'Teach using [1]',input:'What is VWAP?'})).ok,true);
assert.equal(hits,1);
assert.equal((await callTutorModel({...env,AI_COST_MODE:'paid'}, {instructions:'a',input:'b'})).ok,false);
assert.equal(hits,1);
assert.equal(tutorProvider({AI_TUTOR_PROVIDER:'openai',AI_TUTOR_MODEL:'any'}).supported,false);
const older={AI_TUTOR_PROVIDER:'openai',AI_TUTOR_MODEL:'model-x',AI_TUTOR_APPROVED_MODELS:'model-x',
 AI_PAID_PROVIDER_OWNER_APPROVED:'true'};
assert.equal(tutorProvider(older).supported,true);
console.log('PASS D09 zero-cost AI routing, approved model, license and no unintended model invocation');
