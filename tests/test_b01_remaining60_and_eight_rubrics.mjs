// Individual editorial evidence contracts. No original/private answer key or
// rubric bodies may enter public source or browser artifacts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const txt=p=>readFileSync(p,'utf8');
const csv=p=>txt(p).trim().split(/\r?\n/);
const remaining=csv('docs/qa/2026-10-27_B01_REMAINING60_QUESTION_EDITORIAL_REGISTER.csv');
const full=csv('docs/qa/2026-10-27_B01_EIGHT_FULL_RUBRIC_CONTENT_REGISTER.csv');
assert.equal(remaining.length,61,'60 unique individually reviewed B01 choices');
assert.equal(full.length,9,'eight complete six-question B01 rubric records');
const twelve=['F1-C08-L03','F1-C09-L01','F1-C10-L01','F1-C10-L02','F1-C12-L01',
 'F1-C13-L01','F1-C13-L02','F2-C01-L01','F2-C02-L01','F2-C02-L02',
 'F2-C02-L03','F2-C03-L01'];
const eight=['F1-C02-L01','F1-C02-L02','F1-C04-L01','F1-C06-L01',
 'F1-C07-L01','F1-C07-L02','F1-C08-L01','F1-C08-L02'];
const questions=['EVIDENCE','FOCUS','BOUNDARY','B01_APPLICATION','B01_LIMITATION'];
for(const id of twelve){
 const cases=remaining.slice(1).filter(r=>r.startsWith('"'+id+'",'));
 assert.equal(cases.length,5,'five independent multiple choice cases '+id);
 for(const question of questions)assert.equal(cases.filter(r=>r.includes('"'+question+'"')).length,1,'missing '+id+' '+question);
}
for(const id of eight){
 const hits=full.slice(1).filter(r=>r.startsWith('"'+id+'",'));
 assert.equal(hits.length,1,id+' one complete rubric review');
 assert(hits[0].includes('"6"')&&hits[0].includes('"5"'),'six distinct questions: five choice, one numeric');
 assert(hits[0].includes('EXACT_ONLY_NO_PARTIAL'));
 assert(hits[0].includes('DRAFT_NOT_REVIEWED'));
 assert(hits[0].includes('BLOCKED_UNREVIEWED'));
}
const choice=remaining.slice(1);
assert.equal(choice.filter(r=>r.includes('CRITICAL_PROCESS_NO_TRADE')).length,1,
 'only the actual no-trade process error is flagged in remaining 60');
assert(choice.every(x=>x.includes('UNLISTED')&&x.includes('DRAFT_NOT_REVIEWED')&&x.includes('NO_PARTIAL')));
assert(choice.every(x=>x.includes('NOT_MEMBER_VERIFIED')));
assert(choice.every(x=>!x.includes('MASTERED')&&!x.includes('BETA_ACCEPTED')));
assert(full.slice(1).every(x=>x.includes('PASS_IN_PRIVATE_SUPABASE')&&x.includes('NOT_MEMBER_VERIFIED')));
const audit=txt('supabase/reviews/20261027_b01_remaining60_choices_read_only.sql');
const rubricAudit=txt('supabase/reviews/20261027_b01_eight_full_rubric_read_only.sql');
for(const sql of [audit,rubricAudit]){
 assert(sql.includes('BEGIN READ ONLY;')&&sql.includes('ROLLBACK;'));
 assert(!/SELECT\s+.*(?:answer_key|private_key)\s*,/i.test(sql),'No key columns returned');
 assert(!/UPDATE\s+public\.lab_training_sets|DELETE\s+FROM/i.test(sql),'Read-only reviewer');
}
const editor=txt('functions/api/training-editor.js');
assert(editor.includes('Private assessment feedback repeats an exact keyed choice'));
const production=txt('supabase/rollbacks/20261027_b01_editorial_private_backup_ROLLBACK.sql');
assert(production.includes('applied_md5')&&production.includes('lab_training_attempts_v014'));
console.log('PASS B01 editorial contracts: remaining 60 + eight six-question sets, private backups, no automatic mastery/entitlements, restricted reviewed status.');
