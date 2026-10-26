/* Owner grading UI/backend contract: no sensitive answer keys or production writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('assets/js/training-editor.js');
const api=read('functions/api/training-editor.js');
const sql=read('supabase/migrations/20261026_grading_partial_credit_critical_errors.sql');
for(const field of ['partialTolerance','partialCreditPct','criticalOnWrong'])
 assert(ui.includes('data-q="'+field+'"'),'Missing Owner editor control '+field);
assert(ui.includes("e.type==='checkbox'?e.checked:e.value"));
assert(ui.includes("q.criticalOnWrong===true?'checked':''"),'Existing critical flags restored to UI');
assert(ui.includes("q.partialTolerance??''")&&ui.includes("q.partialCreditPct??''"));
assert(ui.includes('partial.partialTolerance=Number(o.partialTolerance)'));
assert(ui.includes('partial.partialCreditPct=Number(o.partialCreditPct)'));
assert(ui.includes('criticalOnWrong:o.criticalOnWrong===true'));
assert(ui.includes("partialFields.forEach(x=>x.hidden=kind.value!=='number')"));
assert(ui.includes('new Set(opts.map(x=>x.toLowerCase()))'));
assert(api.includes('q.criticalOnWrong')&&api.includes('q.partialTolerance')&&api.includes('q.partialCreditPct'));
assert(sql.includes('partialCreditPct')&&sql.includes('criticalOnWrong'));
console.log('PASS Owner rubric editor: grading metadata round-trip and source contract');
