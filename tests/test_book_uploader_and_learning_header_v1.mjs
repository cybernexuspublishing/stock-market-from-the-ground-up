import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const uploader=read('assets/js/admin-digital-books-v01430.js');
assert(!uploader.includes("document.querySelector('[data-gu-digital-v01430]')"),
  'A CSS link carrying the data attribute must not short-circuit the uploader');
assert(uploader.includes("document.querySelector('section.gu-digital-books[data-gu-digital-v01430]')"));

const element=tag=>({
 tagName:tag,dataset:{},className:'',disabled:false,children:[],
 append(...nodes){this.children.push(...nodes)},
 setAttribute(){},addEventListener(){},
});
const panel=element('section'),cssLink=element('link');
cssLink.dataset.guDigitalV01430='1';
const dom={
 readyState:'complete',
 createElement:element,
 querySelector(selector){
  if(selector==='[data-gu-digital-v01430]')return cssLink;
  if(selector==='section.gu-digital-books[data-gu-digital-v01430]')return null;
  if(selector==='.admin-panel[data-admin-panel="commerce"]')return panel;
  return null;
 },
 getElementById(){return null},
};
const runtime={window:{dispatchEvent(){}},document:dom,
 location:{pathname:'/admin.html'},Event:class {constructor(type){this.type=type}},
 setInterval(){return 1},clearInterval(){},
};
vm.runInNewContext(uploader,runtime,{timeout:1000});
assert.equal(typeof runtime.window.GroundUpDigitalBooks?.mountEditor,'function',
 'Uploader must initialize even though its stylesheet was loaded first');
assert.equal(panel.children.length,1);
assert.equal(panel.children[0].dataset.guDigitalV01430,'1');

const css=read('assets/css/focused-learning-header-v1.css');
const site=read('assets/js/site.js');
for(const token of ['.gu-focused-learning-header .gu-learning-top-nav',
 '#gu-workspace-toggle','flex-wrap:nowrap','min-width:0','overflow-x:auto',
 '@media(max-width:900px)']){
 assert(css.includes(token),'Focused nav CSS missing '+token);
}
assert(site.includes("querySelector('.site-header.gu-focused-learning-header')"));
assert(site.includes('/assets/css/focused-learning-header-v1.css'));
assert(read('bootcamp-academy.html').includes('class="site-header gu-focused-learning-header"'));
console.log('PASS: stylesheet cannot block protected book uploader; focused-learning nav has responsive overflow guard.');
