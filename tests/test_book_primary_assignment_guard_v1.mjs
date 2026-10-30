import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/admin-digital-books-v01430.js',import.meta.url),'utf8');
assert.doesNotThrow(()=>new Function(source),'Owner book edit code parses');
const a=source.indexOf("const prepare=el('button','Assign Current EPUB as Primary (Sales OFF)'");
const b=source.indexOf("const historyButton=el('button','View PDF/EPUB history'",a);
assert(a>=0&&b>a,'Private primary preparation control must be present');
const block=source.slice(a,b);
for(const required of [
 'GroundUpAdminPasswordConfirm.ensure()',
 "'gu_owner_digital_history_v014304'",
 "'gu_owner_digital_books_save_v01430'",
 "v.format==='epub'",
 'v.current===true',
 'v.fileExists===true',
 'candidates.length!==1',
 'p_sales:false',
 'p_downloads:false',
 'p_rights_attested:rights.checked',
 'p_expected_updated_at:product.version'
]) assert(block.includes(required),'Guard missing '+required);
assert(!block.includes('rights.checked=true'),'Never silently attest contract rights');
assert(!block.includes("await sb.storage.from"),'Never reupload or overwrite book files');
assert(source.includes('actions.append(upload,prepare,historyButton,previewTools,save,draftSave)'),'Guarded book controls must remain in the compact Book Edit action grid');
assert(source.includes('card.append(actions,previewResult,historyList,rowStatus)'),'Book Edit must display the grouped actions and their status feedback');
console.log('PASS Owner private EPUB primary assignment: guarded, versioned, no sales or grants');