import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const release=JSON.parse(txt('release-manifest.json'));
const commerce=JSON.parse(txt('data/commerce-config.json'));
assert(Number(release.version.split('.').at(-1))>=49);
assert.equal(commerce.version,release.version);
assert.equal(release.customerCheckoutApproved,false,'Never turn on customer checkout in a test release');
assert.equal(release.liveStripeFulfillmentEnabled,false,'Never grant customer access from shadow events');
assert.equal(release.stripePriceIdsVerified,0,'Owner screenshot is not independent release certification');
assert.equal(release.stripeCatalogOwnerEvidence?.productsVerified,8);
assert.equal(release.stripeCatalogOwnerEvidence?.pricesVerified,8);
assert.equal(release.stripeCatalogOwnerEvidence?.automatedReleaseCertification,false);
const webhook=txt('functions/api/gu39-stripe-webhook.js');
assert(webhook.includes('ownerTestingEnabled(env)'),'Enforce Owner database switch on signed webhook');
assert(webhook.includes("GU39_SANDBOX_SHADOW_GATE==='true'"),'Enforce Cloudflare deployment gate');
assert(webhook.includes('WRONG_TEST_ACCOUNT'),'Reject wrong Stripe Connect test account');
assert(webhook.includes('GU39_STRIPE_TEST_WEBHOOK_SECRET'),'Require dedicated test HMAC secret');
assert(webhook.includes("SHADOW_SETTINGS_UNAVAILABLE"),'Fail closed if Supabase is unreachable');
for(const forbidden of ['user_plan_grants','user_tool_passes','site_orders','site_subscriptions']) {
 assert(!webhook.includes(forbidden),'Shadow webhook cannot touch real entitlements: '+forbidden);
}
assert(txt('owner-roadmap.html').includes('content="v'+release.version+'"'));
assert(txt('admin.html').includes('content="v'+release.version+'"'));
console.log('PASS v49: catalog Owner evidence, independent release certification remains pending, launch and fulfillment OFF, signed double-gated test webhook.');
