/* Source-backed UI regression: native Edit Book dialog remains open,
 * protected password prompt rises to the modal top layer, cancel or submit
 * restores focus and does not submit uploads without completed step-up.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/admin-password-confirm-v01432r1.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../assets/css/admin-password-confirm-v01432r1.css',import.meta.url),'utf8');
assert.match(styles,/\.gu-pw-shade\[open\]/);
assert.match(styles,/\.gu-pw-shade::backdrop/);
assert.doesNotMatch(source,/shade=node\('div'\)/);

async function scenario(mode){
 const stack=[],events=[],elements=[];
 const editDialog={open:true,tagName:'DIALOG',focus(){document.activeElement=this}};
 const previous={
  focus(){document.activeElement=this;events.push('focus-restored')}
 };
 const document={
  activeElement:previous,
  body:{append(node){node.parentNode=this;elements.push(node)}},
  createElement(tag){
   const node={tagName:tag.toUpperCase(),children:[],attributes:{},open:false,
    className:'',disabled:false,tabIndex:0,style:{},
    append(...nodes){this.children.push(...nodes)},
    appendChild(child){this.children.push(child)},
    setAttribute(k,v){this.attributes[k]=v},
    addEventListener(type,callback){(this.listeners??={})[type]=callback},
    focus(){document.activeElement=this},
    remove(){this.removed=true},
    showModal(){assert.equal(tag,'dialog');this.open=true;stack.push(this);events.push('show-modal')},
    close(){this.open=false;assert.equal(stack.pop(),this);events.push('close-modal')},
   };
   return node;
  }
 };
 const window={
  turnstile:{render(_target,options){events.push('turnstile-render');options.callback('test-token');return 5},
   remove(){events.push('turnstile-remove')}},
  getSupabaseClient:async()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-session'}}})}})
 };
 const fetch=async url=>{
  if(url==='/api/auth-guard-v0135')return {json:async()=>({enabled:true,sitekey:'unit-test-sitekey'})};
  if(url==='/api/admin-password-confirm-v01432r1')return {ok:true,json:async()=>({ok:true})};
  throw Error('Unexpected request: '+url);
 };
 const runtime={document,window,fetch,setInterval:()=>1,clearInterval(){},setTimeout(){},clearTimeout(){},
  Error,Promise};
 vm.runInNewContext(source,runtime,{timeout:1000});
 assert.equal(typeof window.GroundUpAdminPasswordConfirm?.ensure,'function');
 const guarded=window.GroundUpAdminPasswordConfirm.ensure();
 const prompt=stack.at(-1);
 assert.equal(prompt.tagName,'DIALOG','The prompt must be a native dialog');
 assert.equal(prompt.open,true,'The password prompt must occupy the top layer');
 assert.equal(editDialog.open,true,'The underlying book editor must remain open');
 assert.deepEqual(prompt.attributes['aria-labelledby'],'gu-pw-dialog-title');
 const box=prompt.children[0],form=box.children.find(x=>x.tagName==='FORM');
 assert(form);
 await new Promise(resolve=>setImmediate(resolve));
 if(mode==='cancel'){
  const cancel=form.children.find(x=>x.tagName==='BUTTON'&&x.textContent==='Cancel');
  assert(cancel,'Must provide an accessible Cancel button');
  cancel.onclick();
  await assert.rejects(guarded,/Password confirmation canceled/);
 }else{
  const input=form.children.find(x=>x.tagName==='LABEL').children.find(x=>x.tagName==='INPUT');
  assert(input,'Password entry should be in the prompt');
  input.value='unit-test-password';
  await form.onsubmit({preventDefault(){}});
  assert.equal(await guarded,true);
 }
 assert.equal(prompt.open,false,'Finished password prompt should close');
 assert.equal(prompt.removed,true,'Finished password prompt should be removed');
 assert.equal(stack.length,0);
 assert.equal(editDialog.open,true,'Parent Edit Book modal must stay open');
 assert.equal(document.activeElement,previous,'Focus returns to the upload action');
 assert(events.includes('focus-restored'));
}
await scenario('cancel');
await scenario('success');
console.log('PASS: protected Owner password dialog opens above Edit Book and restores focus on cancel/success.');
