import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('functions/api/chart-mixed-test-quote.js','utf8');
assert(source.includes('const checkoutActive=false;'));
assert(source.includes('settlementEnabled:false'));
assert(source.includes('SETTLEMENT_NOT_ENABLED'));
console.log('PASS: TEST quote does not misrepresent unavailable checkout.');
