/* Deployment-safe Stripe Cloudflare environment key naming contract.
 * Static test only: never reads, logs, or decodes secrets.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const cases = [
 ['functions/api/stripe-live-checkout-v01458.js',[
  ['STRIPE_LIVE_SECRET_KEY','GU58_STRIPE_LIVE_SECRET_KEY'],
  ['STRIPE_LIVE_WEBHOOK_SECRET','GU58_STRIPE_LIVE_WEBHOOK_SECRET'],
  ['STRIPE_LIVE_ACCOUNT_ID','GU58_STRIPE_LIVE_ACCOUNT_ID']]],
 ['functions/api/stripe-live-webhook-v01458.js',[
  ['STRIPE_LIVE_SECRET_KEY','GU58_STRIPE_LIVE_SECRET_KEY'],
  ['STRIPE_LIVE_WEBHOOK_SECRET','GU58_STRIPE_LIVE_WEBHOOK_SECRET']]],
 ['functions/api/founding600-webhook.js',[
  ['LIVE_WEBHOOK_SECRET','GU_F600_LIVE_WEBHOOK_SECRET'],
  ['STRIPE_LIVE_SECRET_KEY','GU58_STRIPE_LIVE_SECRET_KEY']]],
 ['functions/api/gu39-stripe-webhook.js',[
  ['STRIPE_TEST_WEBHOOK_SECRET','GU39_STRIPE_TEST_WEBHOOK_SECRET']]],
 ['functions/_lib/book-stripe-test-v1.js',[
  ['STRIPE_TEST_SECRET_KEY','GU_BOOK_STRIPE_TEST_SECRET_KEY'],
  ['STRIPE_BOOK_TEST_WEBHOOK_SECRET','GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET']]],
 ['functions/api/live-commerce-readiness.js',[
  ['STRIPE_LIVE_SECRET_KEY','GU58_STRIPE_LIVE_SECRET_KEY'],
  ['STRIPE_LIVE_ACCOUNT_ID','GU58_STRIPE_LIVE_ACCOUNT_ID']]]
];
for(const [file,pairs] of cases){
 const source=readFileSync(file,'utf8');
 for(const [newName,legacy] of pairs){
  assert(source.includes(newName+' || '),file+' must prefer new binding '+newName);
  assert(source.includes(legacy),file+' must continue accepting existing secret '+legacy);
 }
}
const book=readFileSync('functions/_lib/book-stripe-test-v1.js','utf8');
assert(book.includes('STRIPE_BOOK_TEST_WEBHOOK_SECRET'),'Book-specific webhook signature must have its own name');
const gu39=readFileSync('functions/api/gu39-stripe-webhook.js','utf8');
assert(gu39.includes('GU39_STRIPE_TEST_SECRET_KEY'),'Existing GU39 TEST API key name stays unchanged as requested');
console.log('PASS Stripe binding aliases: new names preferred, old encrypted values retained, TEST webhook endpoints remain separate.');
