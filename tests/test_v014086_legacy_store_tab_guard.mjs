/* v86 regression: old v132 Store widget must never reinsert legacy tabs
 * into the v84 category panes; do not expose planned tool prices or create
 * DOM insertBefore NotFoundError. Both TS and published JS must agree. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/js/production-completion.js');
const ts=read('src/ts/production-completion.ts');
const tabs=read('store.html');
assert.ok(tabs.includes('id="store-tab-memberships"'));
for(const [name,s] of [['production JavaScript',js],['TypeScript source',ts]]){
  const func=s.indexOf('function storeTabs()');
  const guard=s.indexOf("q('#store-tab-memberships')",func);
  const legacy=s.indexOf("tabs.id = 'v132-store-tabs'",func);
  const insert=s.indexOf("insertBefore(tabs, plans)",func);
  assert.ok(func>=0&&guard>func&&guard<legacy&&legacy<insert,name+' Store guard must precede legacy injection');
  assert.ok(s.includes("q('#store-panel-memberships')"),name+' must recognize active membership panel');
  assert.ok(s.includes("q('.store-category-tabs')"),name+' must recognize accessible category tabs');
  const parentGuard=s.indexOf('host !== plans.parentElement',func)>=0||
    s.indexOf('host!==plans.parentElement',func)>=0;
  assert.ok(parentGuard,name+' must prevent cross-parent insertBefore');
}
console.log('PASS v86: old v132 tab injection disabled when v84 Store is active; TS+JS guarded against cross-parent DOM insertion.');
