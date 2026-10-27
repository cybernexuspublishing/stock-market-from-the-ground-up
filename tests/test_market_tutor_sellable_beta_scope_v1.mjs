import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('store-tool-market-tutor.html','utf8');
const api=readFileSync('functions/api/market-tutor-v01492.js','utf8');
const provider=readFileSync('functions/_lib/tutor-provider-v014107.js','utf8');
const ui=readFileSync('assets/js/market-tutor.js','utf8');
for(const literal of [
 'data-product-code="MARKET_TUTOR"','What Market Tutor actually teaches',
 'Fictional lesson prompt','What this tool does not include','Private conversations',
 'Optional AI-generated explanations','zero-spend policy',
 'per-member rate limits','global resource policy',
 'market-tutor.html','labs.html','store.html#tools'
])assert(page.includes(literal),'Missing truthful buyer-facing Tutor content: '+literal);
assert(page.includes('provisional')&&page.includes('later observations'));
assert(!page.includes('checkout.html?type=tool'),'A page must not bypass authorized checkout');
assert(!/we guarantee profits|guarantees trading returns|certified profitable trader/i.test(page),
 'No affirmative profitability or certification promises');
assert(api.includes("toolAccess(env,request,'MARKET_TUTOR')"),'Current Tutor API must gate actual entitlement');
assert(api.includes('reserveAiRequest'),'Generative calls must use the transactional AI quota gate');
assert(api.includes('seeksPersonalTradeAdvice'),'Advice-request restrictions required');
assert(api.includes('body.allowModel!==true'),'AI generation must require explicit consent');
assert(api.includes('body.saveHistory===true'),'Private saved history is an explicit preference');
assert(provider.includes("AI_COST_MODE==='free_only'"),'Free provider must require verified free-only settings');
assert(provider.includes("AI_PAID_PROVIDER_OWNER_APPROVED==='true'"),'No accidental paid AI provider');
assert(ui.includes('TUTOR.identityEpoch'),'Cross-account Tutor state must be guarded');
console.log('PASS Tutor sellable beta description vs real server entitlements, verified quota, AI consent/cost and private history boundaries.');
