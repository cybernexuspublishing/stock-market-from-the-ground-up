// Offline, explicitly illustrative member-account fixture; no private database or credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('assets/js/lab-player.js','utf8');
const dom=new Map();
const get=id=>{
 if(!dom.has(id))dom.set(id,{id,hidden:false,textContent:'PREVIOUS MEMBER PRIVATE LESSON',
  children:['PRIVATE PREVIOUS MEMBER DATA'],replaceChildren(...items){this.children=items},
  append(...items){this.children.push(...items)}});
 return dom.get(id);
};
for(const id of ['player-workspace','player-access-note','player-reference-select','player-lab-id',
 'player-title','player-location','lab-player-content','lab-player-gate'])get(id);
const document={getElementById:get,createElement:tag=>({tag,className:'',textContent:''}),
 addEventListener(){}};
const window={addEventListener(){}};
const ctx=vm.createContext({document,window});
vm.runInContext(source,ctx,{filename:'assets/js/lab-player.js'});
vm.runInContext("PLAYER.lab={id:'PRIVATE-LESSON-OF-A'}; PLAYER.access={user:{id:'A'},note:'PRIVATE-A'};",ctx);
vm.runInContext("scrubLabPlayerOnIdentityChange('B')",ctx);
assert.equal(vm.runInContext('PLAYER.lab',ctx),null);
assert.equal(vm.runInContext('PLAYER.access',ctx),null);
assert.equal(vm.runInContext('labPlayerAccountId',ctx),'B');
assert.equal(vm.runInContext('labPlayerSessionEpoch',ctx),1);
for(const id of ['player-workspace','player-access-note','player-reference-select'])
 assert.equal(get(id).children.length,0,id);
for(const id of ['player-lab-id','player-title','player-location'])
 assert.equal(get(id).textContent,'',id);
assert.equal(get('lab-player-content').hidden,true);
assert.match(get('lab-player-gate').children[0].textContent,/account changed/i);
assert.match(source,/sb\.auth\.onAuthStateChange\(/);
assert.match(source,/const memberUnchanged=\(\)=>loadEpoch===labPlayerSessionEpoch/);
assert((source.match(/if\(!memberUnchanged\(\)\)return;/g)||[]).length>=5,
 'Late authorized responses must not rehydrate the previous account');
console.log('PASS individual Lab Player: old lesson/answers/session erased, epoch increments, late async loads guarded');
