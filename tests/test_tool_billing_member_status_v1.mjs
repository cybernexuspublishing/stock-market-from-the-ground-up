/* Real My Purchases source helper execution; no member data read or changed.
 * Verify renewal/cancellation notices and malicious catalog href defenses.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const text=readFileSync('assets/js/my-purchases.js','utf8');
const start=text.indexOf(' const when=v=>');
const end=text.indexOf(' const portalButton=(kind,row)=>');
assert(start>0&&end>start,'Expected helper definitions not found in member Purchases source');
const {safeToolHref,toolPeriod,billingNotice}=runInNewContext(
 text.slice(start,end)+'\nthis.helpers={safeToolHref,toolPeriod,billingNotice};this.helpers',
 {Date,String,Number,Array,RegExp}, {timeout:1000});
assert.equal(safeToolHref('simulator.html'),'simulator.html');
assert.equal(safeToolHref('advanced-tools.html?tab=tools#journal'),'advanced-tools.html?tab=tools#journal');
for(const bad of ['javascript:alert(1)','data:text/html,x','https://untrusted.example/',
 '//remote.example/path','../private.html','foo.html?x=<script>','foo.html\\bar']){
 assert.equal(safeToolHref(bad),null,'Unsafe catalog link allowed: '+bad);
}
const endDate='2026-11-26T01:00:00Z';
const active={status:'active',cancel_at_period_end:false,current_period_end:endDate};
const scheduled={...active,cancel_at_period_end:true};
const overdue={...active,status:'paused'};
const ended={...active,status:'canceled'};
assert.match(toolPeriod(active),/Current paid-through \/ billing period end/);
assert.match(toolPeriod(scheduled),/Scheduled cancellation \/ recorded paid-through date/);
assert.match(toolPeriod(overdue),/Unconfirmed billing period end/);
assert.match(toolPeriod(ended),/Recorded ended billing period/);
assert.match(toolPeriod({status:'active'}),/No verified paid-through date/);
assert.equal(billingNotice(active),'');
assert(text.includes('dashboard.html?tab=support'),'Unavailable billing portal has a usable private Support route');
assert.match(billingNotice(scheduled),/Cancellation is scheduled/);
assert.match(billingNotice(overdue),/role="alert"/);
assert.match(billingNotice(ended),/subscription has ended/i);
const passSection=text.slice(text.indexOf('const ps=passes.data||[];'));
assert(passSection.includes('$'+'{billingNotice(x)}'),'Tool passes must render payment-failure notices');
assert(passSection.includes('$'+'{e(toolPeriod(x))}'),'Tool passes must distinguish paid-through dates');
assert(passSection.includes('safeToolHref(x.platform_tools?.href)'),'Tool href must be sanitized');
assert(!passSection.includes('Renews/period ends'),'Do not imply a known paid renewal for canceled passes');
assert(text.includes("row.metadata?.source==='gu58_live_signed_stripe'"),
 'Do not expose a LIVE portal button for TEST-staging subscription records');
console.log('PASS member billing UI: status, scheduled cancellation, failed charge, period text, tool links and TEST/LIVE portal separation.');
