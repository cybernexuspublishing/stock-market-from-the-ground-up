/* Deployment 15: zero-cost reproducible catalog integrity report. Historic
 * screenshot records are NOT live Stripe API verification. Never enable sales.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const j=path=>JSON.parse(readFileSync(path,'utf8'));
const registry=j('data/stripe-product-registry-v01437.json');
const commerce=j('data/commerce-config.json');
const store=j('data/store-products.json');
const manifest=j('release-manifest.json');
const expected=new Map([
 ['plan:FULL_MONTHLY',6999],['plan:FULL_ANNUAL',69900],
 ['plan:LIFETIME',249900],['plan:ONDEMAND_MONTHLY',1999],
 ['tool:INTERACTIVE_LEARNING',2999],['tool:JOURNAL_ANALYTICS',2999],
 ['tool:MARKET_SIMULATOR',2999],['tool:MARKET_TUTOR',2999]]);
const fail=msg=>{throw Error('D15 CATALOG CONTRACT: '+msg)};
if(!Array.isArray(registry.products)||registry.products.length!==8)fail('Eight original paid SKUs required');
const codes=registry.products.map(x=>x.sku);
if(new Set(codes).size!==8||codes.some(x=>!expected.has(x)))fail('SKU identity/uniqueness mismatch');
for(const row of registry.products)if(row.price_cents!==expected.get(row.sku)||row.currency!=='USD')fail('Approved price drift: '+row.sku);
if(commerce.version!==manifest.version)fail('Commerce version mismatch');
if(manifest.customerCheckoutApproved!==false||manifest.liveStripeFulfillmentEnabled!==false)fail('Source catalog must not activate real billing');
const status=registry.products.map(x=>({
 sku:x.sku,approvedPriceCents:expected.get(x.sku),
 historicScreenshotInterval:x.billing_interval||null,
 liveStripePriceIdInHistoricEvidencePresent:typeof x.stripe_price_id==='string'&&/^price_/.test(x.stripe_price_id),
 providerLiveReverified:false
}));
const books=store.filter(x=>x.type==='book').map(x=>({
 productCode:x.productCode,
 storefrontKdpSelectFlag:x.kdpSelect,
 directDigitalEnabled:!!x.directDigital?.enabled,
 distributionRightsIndependentlyVerified:false
}));
if(books.length!==5)fail('Preserve five canonical books');
const report={
 schema:'gu-d15-screenshot-catalog-source-audit-v1',
 sourceVersion:manifest.version,source:'historic owner-supplied screenshots and repository static metadata only',
 historicCatalogIntegrityPassed:true,
 paidCatalogRowCount:status.length,skuRows:status,
 unverifiedLiveStripePrices:status.filter(x=>!x.liveStripePriceIdInHistoricEvidencePresent).map(x=>x.sku),
 monthlyToolIntervalsRequireOwnerContractCheck:status.filter(x=>x.sku.startsWith('tool:')&&x.historicScreenshotInterval==='month').map(x=>x.sku),
 bookDistributionFlagReview:books,
 booksMarkedKdpSelect:books.filter(x=>x.storefrontKdpSelectFlag===true).map(x=>x.productCode),
 customerCheckoutApproved:false,paidLaunchAccepted:false,
 requiredReviews:['Stripe LIVE Price API and exact recurring cadence for all eight SKUs','Stripe merchant and tax/refund policy','Book-by-book current KDP Select end date and direct distribution rights','Real signed paid fulfillment evidence'],
 conclusion:'A correct screenshot registry is not a live Stripe checkout or commercial acceptance.'
};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d15-catalog-source-integrity.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS eight-SKU historical amounts/identity. LIVE prices UNVERIFIED; books flagged for rights review; paid launch LOCKED.');
