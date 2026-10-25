/* Isolated adapter test: no provider calls, credentials or database writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('assets/js/supabase-client.js','utf8').replace("import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')",'window.loadTestModule()');
let imports=0,created=0,fail=true;
const client={auth:{}};
const window={SITE_CONFIG:{SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public-fixture'},loadTestModule:async()=>{imports++;await Promise.resolve();if(fail)throw Error('Fixture import failed');return {createClient:()=>{created++;return client}}}};
runInNewContext(source,{window});
let results=await Promise.allSettled(Array.from({length:12},()=>window.getSupabaseClient()));
assert(results.every(r=>r.status==='rejected'));assert.equal(imports,1);assert.equal(created,0);
fail=false;
results=await Promise.all(Array.from({length:12},()=>window.getSupabaseClient()));
assert(results.every(c=>c===client));assert.equal(imports,2);assert.equal(created,1);
assert.equal(await window.getSupabaseClient(),client);assert.equal(imports,2);
console.log('PASS concurrent initialization, shared import failure, retry and cached client identity');
