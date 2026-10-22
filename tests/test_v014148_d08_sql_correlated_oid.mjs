/* D08 v0.14.0.148.1 read-only PostgreSQL preflight regression.
 * Static assertion only: a real Supabase execution still must be checked by Owner.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/admin/v0.14.0.148_DEPLOYMENT_FINAL_PREFLIGHT_READ_ONLY.sql',import.meta.url),'utf8');
assert(/SELECT\s+c\.relrowsecurity\s+FROM\s+pg_class\s+c\s+WHERE\s+c\.oid\s*=\s*table_state\.oid/i.test(sql),
 'Scalar RLS lookup MUST correlate to the outer table_state relation');
assert(!/WHERE\s+c\.oid\s*=\s*oid\b/i.test(sql),
 'Unqualified oid inside pg_class scalar subquery resolves to inner c.oid, returning multiple rows (SQLSTATE 21000)');
assert(sql.includes("D08_FINAL_READ_ONLY_PREFLIGHT")&&sql.includes("missing_mandatory_relations"));
assert(!/\b(CREATE|ALTER|DROP|TRUNCATE|DELETE|UPDATE|INSERT|GRANT|REVOKE)\s+(?:TABLE|FUNCTION|ON|INTO|FROM|public\.)/i.test(
 sql.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n')),
 'Read-only preflight must contain no DDL or DML');
console.log('PASS D08 SQL correction: unambiguous correlated pg_class OID and source-only read-only boundary.');
