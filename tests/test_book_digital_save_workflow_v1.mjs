import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('assets/js/admin-digital-books-v01430.js');
const parent=read('assets/js/admin.js');
assert.doesNotThrow(()=>new Function(source));
assert.doesNotThrow(()=>new Function(parent));
for(const mark of ['KDP_EXCLUSIVITY_OR_RIGHTS_NOT_CLEARED','DIGITAL_PROVIDER_VARIANT_AND_PRICE_REQUIRED','DIGITAL_SETTINGS_STALE','new Date(until.value).getTime()>Date.now()','Save book setup (Sales OFF)','hasPendingEditorChanges','saveEditor(code)','activeEditorControls.save()','p_expected_updated_at:catalogVersion']){
 assert(source.includes(mark),'Required publishing guard missing '+mark);
}
assert(parent.includes('GroundUpDigitalBooks.saveEditor(bookCode)'),'Main Save must persist changed eBook rights first');
assert(parent.includes("id=\"dlg-p-dd\" type=\"checkbox\""),'Main book sell control must remain visible as status');
assert(parent.includes("checked':''} disabled> Direct digital sales status"),'Main book edit cannot bypass guarded eBook publishing');
assert(parent.includes('<input type="hidden" id="dlg-p-ddurl"'), 'Legacy direct digital checkout URL must be hidden from the Stripe-managed book editor');
assert(!parent.includes('<label>Direct digital checkout URL</label>'), 'Do not display redundant manual book checkout URL');
assert(parent.includes("direct_digital_checkout_url:document.getElementById('dlg-p-ddurl').value"), 'Preserve stored legacy URL on Admin Save');
assert(!/p_sales:true,p_downloads:true/.test(source),'No automatic LIVE sales activation');

const styles=read('assets/css/admin-book-editor-v1.css');
const html=read('admin.html');
assert(parent.includes("d.classList.toggle('admin-book-editor',options.bookEditor===true)"),'Book layout is scoped to its editor');
assert(parent.includes('if(options.stayOpen===true){status('),'Book Save must keep the editor open after success');
assert(parent.includes('else d.close()'),'Non-book dialogs must retain normal close-on-save behavior');
assert(parent.includes('stayOpen:true,bookEditor:true'),'Book editor must opt in to persistent Save');
assert(source.includes('editionFields.append('),'Rights and upload fields must be in compact layout');
assert(source.includes('actions.append(upload,prepare,historyButton,previewTools,save,draftSave)'),'All six book actions should be grouped side by side');
assert(styles.includes('.gu-digital-actions'),'Responsive book action layout must exist');
assert(styles.includes('overflow-y:auto'),'Book body must remain scrollable above Save/Cancel');
assert(styles.includes('order:2;'),'Save/Cancel must appear below the book feedback message');
assert(styles.includes('order:1;'),'Book feedback must appear directly above Save/Cancel');
assert(styles.includes('#admin-dialog.admin-book-editor #admin-dialog-msg.error'),'Book errors must be visibly differentiated');
assert(styles.includes('max-height:min(10rem,28dvh)'),'Long validation errors must be readable without clipping');
assert(parent.includes("feedback.setAttribute('role','alert')"),'Main Save errors must announce their presence');
assert(source.includes('const showBookFeedback='),'Protected eBook actions must share the visible feedback banner');
assert(source.includes('let catalogVersion=product.version'),'Editing token must be mutable rather than frozen at editor opening');
assert(source.includes('const rightsSnapshot=row=>JSON.stringify('),'Protected state must be compared before rebasing versions');
assert(source.includes("if(rightsSnapshot(latest)!==rightsBaseline)throw Error('DIGITAL_SETTINGS_CONFLICT')"),'Concurrent publishing changes must refuse a silent overwrite');
assert(source.includes('p_expected_updated_at:catalogVersion'),'Rights Save must send the latest verified catalog token');
assert(source.includes('for(let attempt=0;attempt<2;attempt++)'),'Stale retry must be strictly bounded');
assert(source.includes("!String(e?.message||'').includes('DIGITAL_SETTINGS_STALE')"),'Only stale-version errors may trigger a retry');
assert(source.includes('const syncEditorVersion=async()=>'),'Main catalog Save must refresh the editor concurrency token');
assert(source.includes('sync:syncEditorVersion'),'Active editor must expose synchronization');
assert(parent.includes('GroundUpDigitalBooks.syncEditorVersion(bookCode)'),'Parent Save must synchronize the protected book editor');
assert(!source.includes('p_expected_updated_at:product.version'),'Do not reuse an obsolete version token after editing');

assert(source.includes("showBookFeedback('Save refused: '"),'Direct rights Save must expose errors above the footer');
assert(source.includes("if(intendsSales&&!rights.checked)throw Error('Confirm distribution rights before enabling sales or downloads.');"),'Digital publishing rights checks must remain enforced');

assert(styles.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Use three columns of file actions on desktop');
assert(html.includes('assets/css/admin-book-editor-v1.css?v=20261030-feedback2'),'Book editor stylesheet must load with a fresh cache key');
assert(html.includes('admin.js?v=book-version-sync-20261030-3'),'Book dialog Save changes must bypass stale browser cache');
assert(html.includes('site.js?v=book-version-sync-20261030-3'),'Site bootloader must load new digital-book script URL');
assert(read('assets/js/site.js').includes('admin-digital-books-v01430.js?v=book-version-sync-20261030-3'),'Rights Save controls must bypass stale browser cache');
console.log('PASS admin book save: main Save coordinates protected rights, clear KDP/provider errors, draft save with sales OFF');
