/* Compare targeted source-level JS regression outcomes against a detached,
 * immutable GitHub baseline. No production secrets, writes, or LIVE tests.
 */
import {readdirSync,existsSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
const baseline=resolve(process.argv[2]||'');
const current=resolve(process.argv[3]||process.cwd());
if(!existsSync(join(baseline,'tests'))||!existsSync(join(current,'tests')))
 throw Error('Pass existing baseline and current checkout paths.');
const pattern=/watchlist|research|scanner|journal|tutor|lab|guide|sql|commerce|tool|simulator|source|free|member|auth|chart|trade.plan|historical/i;
const forbidden=/browser|playwright|e2e|live_|production|\.fixture\./i;
const list=readdirSync(join(current,'tests')).filter(n=>/^test_[^/]+\.mjs$/.test(n)&&pattern.test(n)&&!forbidden.test(n)).sort().slice(0,220);
const B='78b3b93ccf70252127265cd7c16589e2bd7d4ae2',reports=[];
const classify=(output)=>{
 const o=String(output).toLowerCase();
 if(/playwright|browser executable|chromium|puppeteer|cannot find package.*jsdom|module_not_found/.test(o))
  return 'environment_or_dependency';
 if(/enoent|not found|cannot find module|could not resolve|no such file/.test(o))
  return 'missing_fixture_or_dependency';
 if(/assertionerror|expected|actual|error:/.test(o))return 'assertion_or_contract';
 return 'unknown_failure';
};
const run=(cwd,name)=>{
 if(!existsSync(join(cwd,'tests',name)))return {state:'absent'};
 const result=spawnSync(process.execPath,['tests/'+name],{
  cwd,timeout:12000,encoding:'utf8',maxBuffer:192000,env:{
   ...process.env,CI:'true',NODE_ENV:'test',WATCHLIST_DIAGNOSTIC:'1'}
 });
 const out=String(result.stdout||'')+'\n'+String(result.stderr||'');
 const state=result.error?.code==='ETIMEDOUT'?'timeout':result.status===0?'pass':'fail';
 return {state,reason:state==='pass'?'':classify(out),
  exitCode:result.status,diagnostic:state==='pass'?'':out.slice(-650).replace(/[\x1b\x0e]/g,'')};
};
for(let i=0;i<list.length;i++){
 const name=list[i],before=run(baseline,name),after=run(current,name);
 const difference=after.state==='pass'?(before.state==='pass'?'both_pass':'fixed_or_new_pass'):
    before.state==='pass'?'new_failure':before.state===after.state?'preexisting_failure':'changed_failure';
 reports.push({test:name,before,after,difference});
 if((i+1)%20===0)console.log('DIAGNOSED '+(i+1)+' / '+list.length);
}
const counts=x=>reports.filter(r=>r.difference===x).length;
const summary={
 scope:'Offline Watchlist-related Node .mjs tests, excluding live/browser/production filenames',
 baselineCommit:B,total:reports.length,bothPassed:counts('both_pass'),
 preexistingFailures:counts('preexisting_failure'),newFailures:counts('new_failure'),
 changedFailures:counts('changed_failure'),fixedOrNewPasses:counts('fixed_or_new_pass'),
 baselineMissing:reports.filter(r=>r.before.state==='absent').length
};
const dest=resolve(process.env.WATCHLIST_DIAG_OUTPUT||join(current,'watchlist-diagnostics'));
mkdirSync(dest,{recursive:true});
writeFileSync(join(dest,'watchlist-regression-comparison.json'),JSON.stringify({summary,reports},null,2));
const lines=['## Watchlist-related JavaScript regression comparison',
 'Baseline SHA: '+B,'Scope: '+summary.scope,
 '| Outcome | Number |','|---|---:|',
 ...Object.entries(summary).filter(([k])=>['bothPassed','preexistingFailures','newFailures','changedFailures','fixedOrNewPasses','baselineMissing'].includes(k))
  .map(([k,v])=>'| '+k+' | '+v+' |'),'',
 '### Failures (source and CI environment distinguished)'];
for(const row of reports.filter(r=>!['both_pass','fixed_or_new_pass'].includes(r.difference))){
 lines.push('- '+row.test+' — '+row.difference+' / before: '+row.before.state+
  (row.before.reason?' ('+row.before.reason+')':'')+' / after: '+row.after.state+
  (row.after.reason?' ('+row.after.reason+')':''));
}
lines.push('','The comparison is not the previously reported 215-script Windows sweep; it is a reproducible GitHub Ubuntu/Node baseline. An authenticated browser/market-feed test remains a separate gate.');
writeFileSync(join(dest,'watchlist-regression-comparison.md'),lines.join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
console.log(JSON.stringify(summary));
console.log('FAILURES '+JSON.stringify(reports.filter(x=>x.difference==='new_failure'||x.difference==='changed_failure').map(x=>({test:x.test,difference:x.difference,after:x.after}))).slice(0,8000));
if(summary.newFailures||summary.changedFailures)process.exitCode=1;
