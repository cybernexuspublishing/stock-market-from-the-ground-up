/* First-party Simulator & Replay — truthful sellable TEST catalog contract.
 * Store education is not proof of membership entitlement or actual fills.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const page=read('store-tool-market-simulator.html');
const style=read('assets/css/store-simulator-beta.css');
const simulator=read('assets/js/simulator.js');
const replay=read('functions/api/learning-replay-v01492.js');
const original=read('functions/_lib/fictional-replay-policy-v1.js');
const verified=read('functions/_lib/verified-historical-dataset-v014143.js');
const labels=[
 'data-product-code="MARKET_SIMULATOR"',
 'simulator-beta-scope-heading',
 '4 MiB CSV','20,000 OHLCV candles',
 'fictional teaching candles','not independently verified',
 'Browser-imported CSVs','brokerage execution platform',
 'does not reveal which occurred first','future',
 'verified historical','published',
 'simulator.html?practice=free','verified-replay.html',
 'journal.html','Store above verifies'
];
for(const label of labels)assert(page.includes(label),'Missing member feature disclosure '+label);
for(const p of ['assets/css/store-simulator-beta.css','assets/img/store-tools/market-simulator.svg',
 'assets/js/verified-replay-v01492.js','simulator.html','verified-replay.html'])
 assert(existsSync(p),'Missing real product component '+p);
assert(page.includes('class="store-simulator-scope-grid"'));
assert(style.includes('@media(max-width:700px)'));
assert(style.includes(':focus-visible'));
assert(page.includes('store-product-detail-v01484.js'),'Use existing authenticated Store price/gates');
assert(!page.includes('checkout.html?type=tool'),'No bypass of existing commerce readiness');
assert(!page.includes('live market data included'));
assert(!page.includes('guaranteed trading profits'));
assert(simulator.includes('SIM.originalFictional===true'));
assert(simulator.includes('SIM.sourceProvider=')&&simulator.includes('csv_upload'));
assert(simulator.includes("if(stopHit&&targetHit)"),'Simultaneous stop/target must not fabricate intrabar order');
assert(simulator.includes("The next candle remains undisclosed in the interface."));
assert(replay.includes('rpc/v01492_replay_advance'),'Server owns replay advancement');
assert(replay.includes('replayAvailableToEntitlement'),'Historical replay enforces entitlements');
assert(verified.includes('licensed_for_member_display'),'Historical datasets are rights-gated');
assert(original.includes('original_synthetic===true'),'Free fictional content cannot be mistaken for market history');
assert(page.includes('thinkorswim OnDemand')&&page.includes('external platform'),'No false in-site broker simulator promise');
console.log('PASS Simulator product: genuine existing Store, free CSV, paid scopes, provenance, ambiguity, bounds and no LIVE purchase action.');
