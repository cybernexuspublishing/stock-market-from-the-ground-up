// v0.14.0.106 — Prevent broken SQL function delimiters reaching the Owner.
// Pure source contract test. This is NOT a connected live PostgreSQL execution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sql=source('supabase/migrations/v0.14.0.105_REVIEWED_KNOWLEDGE_EVIDENCE_OWNER_REVIEW_REQUIRED.sql');
const map=JSON.parse(source('data/competency-lab-paths-v01499.json'));
const guides=JSON.parse(source('data/competency-study-guides-v01499.json'));
const names=['gu_v014105_sync_reviewed_knowledge','gu_v014105_approve_lab_knowledge_map',
 'gu_v014105_sync_member_reviewed_knowledge'];
for(const name of names){
 const pattern=new RegExp('CREATE OR REPLACE FUNCTION public\\.'+name+
   '\\([\\s\\S]*?\\) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER'+
   '(?:\\s+SET search_path=public,pg_temp)?\\s+AS \\$\\$[\\s\\S]*?\\bEND \\$\\$;','i');
 assert(pattern.test(sql),'Broken/unbalanced SQL dollar quotes for '+name);
}
const open=(sql.match(/\bAS \$\$/g)||[]).length,close=(sql.match(/\bEND \$\$;/g)||[]).length;
assert.equal(open,3,'Exactly three PL/pgSQL body openers');
assert.equal(close,3,'Exactly three PL/pgSQL body terminators');
assert(!/\bAS \$(?!\$)|\bEND \$;/.test(sql),'No bare $ PL/pgSQL delimiter may ship');
assert(sql.includes('\nBEGIN;\n'),'Single transaction must protect installation');
assert(sql.includes('\nCOMMIT;\n'),'SQL must commit only if ALL parts succeed');
const values=sql.match(/INSERT INTO public\.gu_lab_competency_knowledge_map_v014105[\s\S]*?\bVALUES\s*\n([\s\S]*?)\nON CONFLICT \(lab_id\) DO NOTHING;/);
assert(values,'Canonical 419-candidate insert statement missing');
const parsed=[...values[1].matchAll(/^\('([^']+)','([A-Z0-9_]+)','([a-z_]+)'\),?$/gm)];
assert.equal(parsed.length,419,'Exactly 419 canonical Lab suggestions');
const canonical=Object.keys(map.byLab||{}),actualCodes=new Set(guides.guides.map(x=>x.code));
assert.equal(canonical.length,419);
assert.equal(actualCodes.size,30);
const seen=new Set();
for(const [,lab,code,method] of parsed){
 assert(!seen.has(lab),'Duplicate Lab mapping '+lab);seen.add(lab);
 assert.equal(map.byLab[lab]?.relatedCompetencies?.[0],code,'Incorrect mapping for '+lab);
 assert.equal(map.byLab[lab]?.method,method,'Incorrect source label for '+lab);
 assert(actualCodes.has(code),'Not an official competency: '+code);
}
assert.equal(seen.size,new Set(canonical).size);
for(const guard of [
 "review_state text NOT NULL DEFAULT 'candidate'",
 "SECURITY INVOKER",
 "ON CONFLICT(user_id,competency_code,source_type,source_id,dimension) DO NOTHING",
 "review_state='approved'",
 "rubric_version=a.set_version",
 "'knowledge'",
 "REVOKE ALL",
 "TO service_role",
 "admin_audit_log",
 "pg_advisory_xact_lock"
])assert(sql.includes(guard),'Missing evidence/authorization invariant: '+guard);
assert(!sql.includes("'recognition',a.score"),'Conceptual quiz must not invent recognition evidence');
assert(!sql.includes("'decision',a.score"),'Conceptual quiz must not invent decision evidence');
assert(!sql.includes("'process',a.score"),'Conceptual quiz must not invent process evidence');
assert(!sql.includes('mapping_reviewed_by'),'Owner personal ID must not leak through learner metadata');
console.log('PASS v106: full 419-Lab SQL candidate map, three matched $$ function bodies, transaction/permissions and knowledge-only evidence integrity.');
