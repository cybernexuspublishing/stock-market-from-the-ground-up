import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('assets/js/admin-digital-books-v01430.js');
const parent=read('assets/js/admin.js');
assert.doesNotThrow(()=>new Function(source));
assert.doesNotThrow(()=>new Function(parent));
for(const mark of ['KDP_EXCLUSIVITY_OR_RIGHTS_NOT_CLEARED','DIGITAL_PROVIDER_VARIANT_AND_PRICE_REQUIRED','DIGITAL_SETTINGS_STALE','new Date(until.value).getTime()>Date.now()','Save book setup (Sales OFF)','hasPendingEditorChanges','saveEditor(code)','activeEditorControls.save()','p_expected_updated_at:product.version']){
 assert(source.includes(mark),'Required publishing guard missing '+mark);
}
assert(parent.includes('GroundUpDigitalBooks.saveEditor(bookCode)'),'Main Save must persist changed eBook rights first');
assert(parent.includes("id=\"dlg-p-dd\" type=\"checkbox\""),'Main book sell control must remain visible as status');
assert(parent.includes("checked':''} disabled> Direct digital sales status"),'Main book edit cannot bypass guarded eBook publishing');
assert(!/p_sales:true,p_downloads:true/.test(source),'No automatic LIVE sales activation');
console.log('PASS admin book save: main Save coordinates protected rights, clear KDP/provider errors, draft save with sales OFF');
