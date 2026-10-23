/* D16 Stage A no-production-side-effect registry/HTML source audit. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADMIN_GROUPS,ADMIN_MODULES,validateAdminRegistry,
 resolveAdminModule,visibleAdminModules} from '../assets/js/admin-module-registry-v014156.mjs';
const html=readFileSync('admin.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/g)].map(x=>x[1].split('?')[0]);
const core=[...html.matchAll(/data-panel=["']([^"']+)["']/g)].map(x=>x[1]);
assert.equal(ADMIN_GROUPS.length,6,'Original D16 target is six named navigation groups');
assert(validateAdminRegistry(),'Registry must have unique stable IDs and server permission labels');
assert.equal(new Set(scripts).size,scripts.length,'No duplicated literal Admin script imports');
assert.equal(scripts.filter(s=>s==='assets/js/admin-navigation.js').length,1,
 'Existing sidebar owner must remain single until safe migration');
assert.equal(new Set(core).size,core.length,'No duplicate built-in panels');
assert.deepEqual([...new Set(core)].sort(),ADMIN_MODULES.map(m=>m.id).sort(),
 'Every existing core panel has a stable explicit module definition');
assert.equal(resolveAdminModule('not-existing'),null);
assert.equal(resolveAdminModule('dashboard')?.requiredPermission,'dashboard.view');
assert.equal(visibleAdminModules([]).length,0,'An unauthenticated context must not show any Admin core module');
assert.equal(visibleAdminModules(['users.view']).length,1);
assert.equal(visibleAdminModules(['users.view'])[0].id,'users');
assert(!scripts.some(s=>s.includes('admin-module-registry-v014156')),
 'Stage A library is not loaded on production pages without full migration acceptance');
console.log('PASS D16 Stage A: '+ADMIN_MODULES.length+' explicit legacy-core modules, '+ADMIN_GROUPS.length+
 ' navigation groups, '+scripts.length+' unique imported scripts, inert preview');
