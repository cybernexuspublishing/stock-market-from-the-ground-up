import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/js/admin-book-batch-upload-v1.js');
const html=read('admin.html'),css=read('assets/css/admin-book-batch-upload-v1.css');
assert.doesNotThrow(()=>new Function(js));
for(const phrase of ['FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE',
 'GroundUpAdminPasswordConfirm.ensure()',
 "'gu_owner_digital_books_get_v01430'",
 "'gu_owner_digital_history_v014304'",
 "'gu_owner_digital_register_v014304'",
 "from('gu-digital-ebooks').upload",
 'upsert:false','contentType:\'application/epub+zip\'',
 'crypto.randomUUID()','.slice(0,8).arrayBuffer()',
 'Publishing and LIVE checkout must be approved separately'
])assert(js.includes(phrase),'Batch uploader must keep: '+phrase);
assert(!js.includes('gu_owner_digital_books_save_v01430'),'Intake must not directly enable or attest distribution rights');
assert(!js.includes('p_sales:true'),'Intake cannot activate paid checkout');
assert(!js.includes('supabase_secret'),'No Supabase service secrets in browser');
assert(html.includes('admin-book-batch-upload-v1.js?v=1'));
assert(html.includes('admin-book-batch-upload-v1.css?v=1'));
assert(css.includes('#admin-book-batch-upload'));
console.log('PASS Owner batch EPUB upload: four name mappings, private signed Owner RPCs, no sales or entitlement mutation.');
