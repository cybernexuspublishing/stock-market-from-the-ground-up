import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/admin/v0.14.0.120_OWNER_ONE_RESULT_ACCEPTANCE_READ_ONLY.sql',import.meta.url),'utf8');
assert.equal((sql.match(/\('(?:0[1-9]|1[0-8]) /g)||[]).length,18);
assert(sql.includes("SELECT check_name,CASE WHEN pass THEN 'PASS' ELSE 'BLOCKED' END AS result"));
assert(!/^\s*\\set\b/m.test(sql));
assert(!/^\s*(UPDATE|INSERT|DELETE|ALTER|CREATE|DROP|SET\s+ROLE|DO\s+\$)/im.test(sql));
console.log('PASS v120 owner one-result SQL is a safe SQL Editor-compatible diagnostic');
