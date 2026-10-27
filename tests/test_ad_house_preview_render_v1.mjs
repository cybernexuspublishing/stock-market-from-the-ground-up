import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync('assets/js/ad-slots-v014229.js','utf8');
class Element {
 constructor(tag){this.tagName=tag;this.className='';this.children=[];this.attrs={};this.textContent='';this.href='';}
 setAttribute(k,v){this.attrs[k]=v;}
 getAttribute(k){return this.attrs[k]??null}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 addEventListener(){}
}
const flatten=(el)=>[el,...el.children.flatMap(flatten)];
async function simulate({owner=false,adFree=false,slot='HOME_INLINE',page='/index.html'}={}){
 const mount=new Element('div');mount.setAttribute('data-ad-slot',slot);
 const actions=[];
 const session={getItem:k=>k.startsWith('gu_ad_session_')?'11111111-1111-4111-8111-111111111111':null,setItem(){}};
 const context={document:{readyState:'complete',querySelectorAll:q=>q==='[data-ad-slot]'?[mount]:[],
  createElement:t=>new Element(t)},location:{pathname:page},sessionStorage:session,
  localStorage:{getItem:k=>owner||adFree?JSON.stringify({access_token:owner?'ownerjwt':'lifetimejwt'}):null},
  crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  URLSearchParams,URL,window:{},console,fetch:async(u,o)=>{
   const req=String(u);actions.push({url:req,method:o?.method||'GET'});
   return {ok:true,json:async()=>req.includes('ownerPreview=1')?
    {ad:null,placeholderAvailable:owner,ownerPreview:owner}:
    {ad:null,placeholderAvailable:!owner&&!adFree}};
  }};
 vm.runInNewContext(code,context,{filename:'ad-slots-v014229.js'});
 for(let i=0;i<9;i++)await new Promise(resolve=>setImmediate(resolve));
 return {mount,actions,elements:mount.children.flatMap(flatten)};
}
let r=await simulate();
assert.equal(r.mount.children.length,1,'Signed-out public should see a site promotion');
assert.match(r.mount.children[0].className,/gu-house-promo/);
assert(r.elements.some(x=>x.textContent==='SITE PROMOTION'));
assert(r.elements.some(x=>x.href==='/books.html'),'Public card links to verified first-party books');
assert(r.actions.every(x=>x.method==='GET'),'House promotions never generate paid metrics');
r=await simulate({owner:true,slot:'STORE_LEFT',page:'/store.html'});
assert.equal(r.mount.children.length,1,'Owner should see placement preview');
assert.match(r.mount.children[0].className,/gu-owner-ad-preview/);
assert(r.elements.some(x=>x.textContent==='OWNER PREVIEW · NOT A PAID AD'));
assert(r.elements.some(x=>x.href==='/store.html'));
assert(r.actions.some(x=>x.url.includes('ownerPreview=1')));
r=await simulate({adFree:true});
assert.equal(r.mount.children.length,0,'Lifetime / ad-free member remains free of house promotions');
assert(r.actions.every(x=>x.method==='GET'));
console.log('PASS: signed-out public promotion, authenticated Owner preview, ad-free suppression, first-party links, no fake impression events.');
