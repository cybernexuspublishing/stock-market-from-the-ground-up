import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const migration=read('supabase/migrations/v0.14.0.304_B01_INDIVIDUAL_TRANSFER_DRAFTS_OWNER_REVIEW_REQUIRED.sql');
const rollback=read('supabase/rollbacks/v0.14.0.304_B01_TRANSFER_DRAFTS_ROLLBACK.sql');
const rows=[...migration.matchAll(/\('((?:F1|F2)-C\d+-L\d+)'\s*,\s*'FICTIONAL TRANSFER: ([^']+)'.*?\)/g)];
assert.equal(rows.length,20,'Exactly twenty authored cases; no blanket generic transfer');
assert.equal(new Set(rows.map(x=>x[1])).size,20);
assert.equal(new Set(rows.map(x=>x[2])).size,20);
for(const row of rows)assert(row[2].length>=110,'Individual transfer scenario too short: '+row[1]);
for(const phrase of ['source_status','reviewed_by IS NULL','reviewed_at IS NULL',
 'transferDraftBatch','transferFingerprint','Exactly 20 individualized transfer cases required']){
 assert(migration.includes(phrase),'Guard missing '+phrase);
}
assert(rollback.includes("md5(content->>'transfer')"),'Rollback must refuse edited transfer');
assert(rollback.includes('Lesson was approved or edited'),'Rollback must preserve approved revisions');
const memberApi=read('functions/api/lab-content.js');
assert(memberApi.includes('transfer:lessonText(r.transfer)'),'Allowlisted authored instruction');
assert(!memberApi.includes('answer_key:')&&!memberApi.includes('rubric:'));
const player=read('assets/js/lab-player.js');
assert(player.includes('transfer:first(originalTeaching.transfer,l.transfer)'));
const moduleSource=read('assets/js/lab-v33-instruction-content.js');
const scope={};
runInNewContext(moduleSource,scope);
const lesson=scope.GroundUpLabV33InstructionContent.lesson({
 stage:7,concept:'Basic Historical Replay Setup',visualType:'none',
 teaching:{transfer:'FICTIONAL TRANSFER: A new chart omits its date; record the source and refuse any assumption about future candles.'},
 guide:{title:'Basic historical replay setup'}
});
assert(lesson.blocks[0].includes('A new chart omits its date'));
assert(lesson.blocks.join(' ').includes('ungraded transfer exercise'));
console.log('PASS all twenty original B01 transfer exercises, protected delivery and non-destructive rollback.');
