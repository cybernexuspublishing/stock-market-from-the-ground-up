/* D17 source-inventory regression: pure temporary fixtures, zero network. */
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const checker=resolve('scripts/deployment17_source_asset_audit.mjs');
const root=mkdtempSync(join(tmpdir(),'groundup-d17-'));
try{
 const html=(body='')=>'<!doctype html><html><head><title>Test Page</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+body+'</body></html>';
 for(let i=0;i<80;i++)writeFileSync(join(root,i===0?'index.html':'fixture-'+i+'.html'),html('<a href="index.html">Home</a>'));
 writeFileSync(join(root,'_redirects'),'# local test route\n');
 writeFileSync(join(root,'release-manifest.json'),JSON.stringify({customerCheckoutApproved:false,liveStripeFulfillmentEnabled:false}));
 const run=()=>spawnSync(process.execPath,[checker],{cwd:root,encoding:'utf8',timeout:15000});
 let result=run();
 assert.equal(result.status,0,'Complete fixture must pass:\n'+result.stderr);
 let audit=JSON.parse(readFileSync(join(root,'artifacts/d17-offline-inventory.json'),'utf8'));
 assert.equal(audit.htmlPages,80);
 assert.equal(audit.blockers.length,0);
 assert.equal(audit.verifiedProduction,false);
 assert.equal(audit.paidLaunchApproved,false);
 writeFileSync(join(root,'fixture-1.html'),html('<a href="missing-source.css">Missing asset</a>'));
 result=run();
 assert.notEqual(result.status,0,'Missing linked static asset must fail');
 audit=JSON.parse(readFileSync(join(root,'artifacts/d17-offline-inventory.json'),'utf8'));
 assert(audit.missingTargets.some(x=>x.includes('missing-source.css')));
 writeFileSync(join(root,'fixture-1.html'),html('<div id="same"></div><div id="same"></div>'));
 result=run();assert.notEqual(result.status,0,'Duplicate DOM IDs must fail');
 audit=JSON.parse(readFileSync(join(root,'artifacts/d17-offline-inventory.json'),'utf8'));
 assert(audit.duplicateIds.includes('fixture-1.html#same'));
 writeFileSync(join(root,'fixture-1.html'),html());
 writeFileSync(join(root,'release-manifest.json'),JSON.stringify({customerCheckoutApproved:true,liveStripeFulfillmentEnabled:false}));
 result=run();assert.notEqual(result.status,0,'Paid launch unlocked must fail D17');
 console.log('PASS D17 offline inventory: valid 80-page fixture; missing asset, duplicate id, unauthorized paid approval fail closed');
}finally{rmSync(root,{recursive:true,force:true})}
