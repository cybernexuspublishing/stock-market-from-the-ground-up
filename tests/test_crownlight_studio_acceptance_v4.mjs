import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const x=require('../assets/js/crownlight-studio-acceptance-v4.js');
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tier=x.tierSummary({ok:true,eligible:true,tier:'PROFESSIONAL',
 allowed:['STANDARD','ADVANCED','PROFESSIONAL'],reason:'Verified professional entitlement',
 temporaryAccess:{kind:'SPARKS',expiresAt:'2099-01-01T00:00:00Z'}});
assert.equal(tier.tier,'PROFESSIONAL');
assert.equal(tier.temporary,true);
assert.throws(()=>x.tierSummary({ok:true,eligible:true,tier:'ADVANCED',
 allowed:['STANDARD','ADVANCED','PROFESSIONAL']}),/inconsistent/);
assert.throws(()=>x.tierSummary({ok:true,eligible:false,tier:'PROFESSIONAL',allowed:['PROFESSIONAL']}),/independently/);
assert.throws(()=>x.tierSummary({ok:true,eligible:true,tier:'UNKNOWN',allowed:['STANDARD']}),/independently/);
const workspace=x.workspaceSummary({ok:true,workspace:{selected:'PROFESSIONAL',layout:'SIDE_BY_SIDE',sync:true},
 updatedAt:'2026-10-30T05:00:00Z'});
assert.equal(workspace.layout,'SIDE_BY_SIDE');
assert.equal(workspace.sync,true);
assert.throws(()=>x.workspaceSummary({ok:true,workspace:{layout:'OVERRIDE',selected:'PROFESSIONAL'}}),/invalid/);
const passes=x.sparksSummary({ok:true,offers:[{tier:'PROFESSIONAL',costSparks:50}],
 passes:[{tier:'PROFESSIONAL',expires_at:'2099-01-01T00:00:00Z'},
 {tier:'ADVANCED',expires_at:'2020-01-01T00:00:00Z'}]});
assert.equal(passes.activePasses.length,1);
assert.equal(passes.offers,1);
const sources=x.sourcesSummary({ok:true,connections:[
 {provider_code:'TIINGO_BYO',status:'connected',last_tested_at:'2026-10-29T05:00:00Z'},
 {provider_code:'ALPACA_BYO',status:'disconnected',last_tested_at:null},
 {provider_code:'UNKNOWN',status:'connected',credential_ciphertext:'never show'}]});
assert.equal(sources.length,2);
assert.equal(JSON.stringify(sources).includes('credential_ciphertext'),false);
assert.equal(x.boundedDate('2024-05-07'),true);
for(const date of ['2024-02-30','2024-13-01','2099-01-01','2024-04-05Z','1999-12-31']){
 assert.equal(x.boundedDate(date),false,date);
}
const html=src('simulator.html'),ui=src('assets/js/crownlight-studio-acceptance-v4.js');
assert(html.includes('crownlight-studio-acceptance-v4.js'));
assert(html.includes('crownlight-studio-acceptance-v4.css'));
assert(ui.includes('/api/marketdata?action=list'));
assert(ui.includes('CrownlightSourceIntegrityV3.validateProvider'));
assert(ui.includes("const q=new URLSearchParams({action:'bars'"));
assert(ui.includes('sample.onclick=async'));
assert(ui.includes('panel.replaceChildren()'));
assert(!ui.includes("method:'POST'"+' /api/member-sparks-chart'), 'Read-only diagnostics cannot redeem Sparks');
assert(!ui.includes('/api/alpaca-paper'));
assert(!ui.includes('localStorage.'));
assert(!ui.includes('innerHTML='));
const integrity=src('assets/js/crownlight-data-source-integrity-v3.js');
assert(integrity.includes('licensedForMemberWidePublication!==false'));
assert(integrity.includes('approvedForOfficialReplay!==false'));
const auth=src('functions/api/chart-tier-access.js');
assert(auth.includes("['OWNER','ADMIN','MODERATOR']"));
const workspaceApi=src('functions/api/chart-workspace.js');
assert(workspaceApi.includes('expectedUpdatedAt'));
const sparks=src('functions/api/member-sparks-chart.js');
assert(sparks.includes('gu_sparks_chart_passes_v1'));
console.log('PASS Studio V4: tier integrity, workspace revision metadata, pass expiration, personal sources, date validation, private diagnostic UI and no payment/order side effects');
