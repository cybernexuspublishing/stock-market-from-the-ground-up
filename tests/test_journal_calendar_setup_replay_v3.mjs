/* Journal trading-calendar, setup, risk-control and simulator default regressions.
 * Source and deterministic date checks; no real member credentials/payment.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const get=p=>readFileSync(p,'utf8');
const env={window:{},Date,Intl,Math,Number,String,Object,Set,Map};
runInNewContext(get('assets/js/journal-market-calendar-v3.js'),env);
const calendar=env.window.JournalMarketCalendar;
assert(calendar);
for(const [date,name] of [
 ['2026-10-24','Weekend'],['2026-10-25','Weekend'],
 ['2026-01-01','New Year'],['2026-01-19','Martin Luther'],
 ['2026-04-03','Good Friday'],['2026-06-19','Juneteenth'],
 ['2026-07-03','Independence'],['2026-11-26','Thanksgiving'],
 ['2026-12-25','Christmas'],
 ['2027-03-26','Good Friday'],['2027-06-18','Juneteenth'],
 ['2027-07-05','Independence'],['2027-12-24','Christmas'],
 ['2028-04-14','Good Friday'],['2028-06-19','Juneteenth'],
 ['2028-07-04','Independence'],['2028-11-23','Thanksgiving']
]){
 assert(calendar.closed(date)?.includes(name),date+' should be a NYSE closed date');
}
for(const date of ['2026-10-27','2026-11-27','2026-12-24',
 '2027-11-26','2028-07-03','2027-12-31','2028-01-03']){
 assert.equal(calendar.closed(date),null,date+' must be selectable (normal or early close)');
}
assert.equal(calendar.closed('2026-02-30'),'Invalid calendar date');
assert.equal(calendar.closed('2026-01-03'),'Weekend — NYSE closed');
assert.equal(calendar.closed('2029-04-18'),null,'Generic calendar weekday, future rules should not block');
const visual=get('assets/js/journal-visual-v3.js');
assert(visual.includes('JournalMarketCalendar?.closed(date)'),'Calendar must consult NYSE status');
assert(visual.includes('btn.disabled=true'),'Closed date buttons must be truly disabled');
assert(visual.includes("btn.setAttribute('aria-disabled','true')"),'Closed dates should be announced');
assert(visual.includes('marketClosure'), 'Market closed tooltip should distinguish holiday/weekend');
const page=get('journal.html'),detail=get('journal-entry.html');
assert(page.includes('journal-market-calendar-v3.js'),'Load calendar policy before dashboard');
assert(page.indexOf('journal-market-calendar-v3.js')<page.indexOf('journal-visual-v3.js'));
for(const html of [page,detail])assert(html.includes('select id="')&&html.includes('-setup"'));
assert(page.includes('id="new-setup" required'),'Create form setup selection is required');
assert(detail.includes('select id="j-setup"'),'Detail needs real select, not datalist');
const entry=get('assets/js/journal-entry.js'),list=get('assets/js/journal.js');
assert(entry.includes("if(key==='setup'&&el.value==='__CUSTOM__'"),'Custom detail setup saved');
assert(entry.includes('(previously recorded)'), 'Existing custom setups must not be silently erased');
assert(entry.includes("setup.addEventListener('change',updateSetupCustom)"),'Custom detail input visibility');
assert(list.includes("setupSelect.addEventListener('change',syncSetup)"),'Custom create input visibility');
assert(list.includes("document.getElementById('new-setup-custom').value.trim()"),'Custom create setup must persist');
const guided=get('assets/js/journal-guided-v2.js');
assert(guided.includes("apply.disabled=!!current.disabled"),'Only immutable locked plan disables sizing action');
assert(guided.includes('gu-v2-apply-feedback'),'Sizing action must explain missing inputs');
assert(guided.includes("current.dispatchEvent(new Event('input'"),'Eligible action must update planned quantity');
const sim=get('simulator.html'),simMode=get('assets/js/simulator-mode-v014112.js'),
  replay=get('assets/js/verified-replay-v01492.js'),policy=get('functions/_lib/fictional-replay-policy-v1.js');
assert(sim.includes('Server-Controlled Fictional Replay (default)'), 'Default must not show unavailable historical datasets');
assert(sim.includes('verified-replay.html?scope=historical'),'Licensed historical training remains separate');
assert(replay.includes("const embedded=!!document.getElementById('sim-server-mode')"));
assert(replay.includes("embedded&&replayParams.get('scope')!=='historical'"), 'Embedded mode must use fictional catalog');
assert(replay.includes("if(!embedded)document.title="),'Embedded mode must preserve Simulator title');
assert(replay.includes('selectedCode=fictional?'),'First eligible fictional scenario must preselect');
assert(simMode.includes("selectMode('server',{focus:true})"),'Default mode should navigate visibly');
assert(policy.includes('historical_evidence_verified')&&policy.includes('licensed_for_member_display'),
 'No rights or historical-source qualification may be bypassed');
assert(!replay.includes("const fictional=true"), 'Standalone historical replay must remain separate');
const replayAPI=get('functions/api/learning-replay-v01492.js');
assert(replayAPI.includes("rows.filter(permitted).slice(0,700)"),
 'The 419 permitted original fictional scenarios must be browsable and Lab deep links must remain selectable');
assert(!replayAPI.includes("scope==='fictional'?20:700"),'The former 20-scenario catalog limit loses linked practice codes');

console.log('PASS Journal: NYSE closure calendar, setup selectors/custom persistence, explainable risk sizing, server fictional replay default.');
