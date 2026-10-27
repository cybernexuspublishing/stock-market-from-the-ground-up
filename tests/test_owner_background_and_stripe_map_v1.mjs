/* Noncharging source contracts for Owner theme upload, book edit, Stripe map.
 * Real authenticated storage, browser and checkout acceptance remain separate.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const paths=['assets/js/site.js','assets/js/site-background-v1.js',
 'assets/js/admin-site-background-v1.js','functions/api/website-design.js',
 'functions/api/admin.js','assets/js/admin.js','assets/js/admin-digital-books-v01430.js',
 'functions/api/payment-catalog-v01433.js','assets/js/admin-payment-center-v01433.js'];
const x=Object.fromEntries(paths.map(p=>[p,read(p)]));
for(const p of paths.filter(p=>!p.includes('functions/api/'))){
 assert.doesNotThrow(()=>new Function(x[p]),p+' script must parse');
}
const site=x['assets/js/site.js'],theme=x['functions/api/website-design.js'];
assert.match(site,/site-background-v1\.js/);
assert.match(site,/admin-site-background-v1\.js/);
assert.match(theme,/website_background_v1/);
assert.match(theme,/SITE_BACKGROUND/);
assert.match(theme,/public_read=is\.true/);
const editor=x['assets/js/admin-site-background-v1.js'],admin=x['functions/api/admin.js'];
for(const value of ['gu_store_owner_v014297','SITE_BACKGROUND','5*1024*1024','gu-store-photos',
 '/api/admin?action=setting_save','Restore Default Background']){
 assert.ok(editor.includes(value),'Owner upload missing '+value);
}
for(const value of ["if(key==='website_background_v1')","roles.includes('OWNER')","method:'HEAD'","Owner-approved sitewide background"]){
 assert.ok(admin.includes(value),'Server background permission missing '+value);
}
assert.ok(x['assets/js/admin-digital-books-v01430.js'].includes('loading=refresh()'));
assert.ok(x['assets/js/admin-digital-books-v01430.js'].includes('gu-digital-books-ready'));
assert.ok(x['assets/js/admin.js'].includes('GroundUpDigitalBooks.mountEditor'));
assert.ok(x['functions/api/payment-catalog-v01433.js'].includes('GU58_STRIPE_LIVE_CATALOG_JSON'));
assert.ok(x['functions/api/payment-catalog-v01433.js'].includes('GU_F600_LIVE_CATALOG_JSON'));
assert.ok(!x['functions/api/payment-catalog-v01433.js'].includes('Stripe checkout ready.')); 
assert.ok(x['assets/js/admin-payment-center-v01433.js'].includes('NOT verified checkouts'));
console.log('PASS Owner background/file editor and live catalog source guards; no payment activation.');
