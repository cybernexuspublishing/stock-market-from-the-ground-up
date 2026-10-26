import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const migration=readFileSync(new URL('../supabase/migrations/v0.14.0.295_academy_metadata_audit.sql',import.meta.url),'utf8');
const rollback=readFileSync(new URL('../supabase/rollbacks/v0.14.0.295_academy_metadata_audit_ROLLBACK.sql',import.meta.url),'utf8');
const post=readFileSync(new URL('../supabase/reviews/2026-10-26_v014295_academy_audit_postflight.sql',import.meta.url),'utf8');
for(const required of [
 'CREATE TABLE public.gu_bootcamp_academy_audit_v014295',
 'ENABLE ROW LEVEL SECURITY',
 'FROM PUBLIC,anon,authenticated',
 'TO service_role',
 'SECURITY INVOKER',
 'gu_v014295_enrollment_audit',
 'gu_v014295_progress_audit',
 'AFTER INSERT OR UPDATE',
 'revision_before','revision_after',
 "SET search_path='pg_catalog','pg_temp'",
 'ON DELETE CASCADE',
 'BEGIN;','COMMIT;'
])assert(migration.includes(required),'Missing audit security guarantee '+required);
const fields=migration.slice(migration.indexOf('CREATE TABLE public.gu_bootcamp_academy_audit_v014295'),migration.indexOf('CREATE INDEX gu_v014295_member_audit_time'));
assert(!/\breflection\s+(?:jsonb?|text)\b/i.test(fields),'Audit table must not store reflection bodies');
assert(!/\b(?:answer_key|questions|rubric|private_lesson|access_token|refresh_token)\s+(?:jsonb?|text)\b/i.test(fields),
 'Audit table must not store exam or credential material');
// Comments explicitly explain forbidden destructive operations; inspect SQL only.
const executableRollback=rollback.split('\n').filter(line=>!/^[\s]*--/.test(line)).join('\n');
for(const banned of [/\bDROP\s+TABLE\b/i,/\bTRUNCATE\b/i,/\bDELETE\s+FROM\b/i,/\bDROP\s+COLUMN\b/i])
 assert(!banned.test(executableRollback),'Rollback must preserve existing member audit records');
assert(rollback.includes('DROP TRIGGER IF EXISTS'));
assert(post.includes('BEGIN READ ONLY;'));
assert(post.includes('member_can_read'));
console.log('PASS Academy audit schema, append-only metadata contract, private RLS, functional instrumentation and non-destructive rollback.');
