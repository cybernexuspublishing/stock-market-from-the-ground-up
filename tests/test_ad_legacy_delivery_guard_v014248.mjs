import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('legacy advertising routes enforce global delivery switch', () => {
  const source=readFileSync('functions/api/ads.js','utf8');
  assert(source.includes('gu_ad_sales_settings_v014226?select=ad_delivery_enabled'));
  assert(source.includes("action==='serve'||action==='click'"));
  assert(source.includes('deliveryAllowed=false'));
  assert(source.includes('deliveryDisabled:true'));
  assert(source.includes("new Response('Not found',{status:404"));
});
