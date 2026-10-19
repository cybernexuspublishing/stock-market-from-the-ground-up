/* Ensure the production-bundled educational copy exactly matches the Owner-
 * reviewable JSON; Cloudflare Pages may omit the standalone guide file.
 * Prevent stale/contradictory marketing copy after future edits. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=file('assets/js/store-product-detail-v01484.js');
const before='const productGuides=',after=';\nconst status=';
const start=src.indexOf(before),end=src.indexOf(after,start);
assert.ok(start>=0&&end>start,'Missing vetted embedded product description snapshot');
const snapshot=JSON.parse(src.slice(start+before.length,end));
const guide=JSON.parse(file('data/store-product-guides-v01484.json'));
assert.deepEqual(snapshot,guide,'Editorial guide JSON and production JS differ. Rebuild the bundled guide before publishing.');
for(const [name,keys] of Object.entries({plans:['FREE','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY'],books:['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'],tools:['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR']})){
  for(const code of keys)assert.ok(snapshot[name][code],name+' missing '+code);
}
assert.doesNotMatch(src,/fetch\(guidesUrl/,'Product descriptions may not depend on a currently missing production JSON URL');
console.log('PASS v85: all 14 priced/free catalog SKUs have identical embedded and editorial guide descriptions; no missing guide fetch.');
