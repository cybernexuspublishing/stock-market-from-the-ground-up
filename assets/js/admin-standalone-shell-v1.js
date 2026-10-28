/* Shared standalone Admin navigation chrome. Presentation only; existing authorization
 * and controller scripts remain the authority for all data and mutations. */
(()=>{'use strict';
const pages={
 '/admin-operations.html':{title:'Boot Camp & Academy',group:'Learning Administration'},
 '/admin-founders.html':{title:'Founders Commons',group:'Community'},
 '/admin-advertising.html':{title:'Advertising Sales',group:'Website Management'},
 '/admin-book-receipts.html':{title:'Book Receipt Claims',group:'Commerce'},
 '/admin-lab-preview.html':{title:'Lab Preview',group:'Learning Administration'},
 '/admin-unified-preview.html':{title:'Admin Preview',group:'Support & Operations'}
};
const route=pages[location.pathname.toLowerCase()];if(!route)return;
const make=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;return el;};
function install(){
 if(document.getElementById('cc-standalone-bar'))return;
 const main=document.querySelector('main');if(!main)return;
 const bar=make('nav','cc-standalone-bar');bar.id='cc-standalone-bar';bar.setAttribute('aria-label','Admin Control Center navigation');
 const home=make('a','cc-standalone-home','Admin Control Center');home.href='/admin.html';
 const breadcrumb=make('span','cc-standalone-breadcrumb',route.group+' / '+route.title);
 const form=make('form','cc-standalone-search');form.role='search';form.setAttribute('aria-label','Find an Admin control');
 const input=make('input');input.type='search';input.name='find';input.placeholder='Find a control by name or old name';input.maxLength=120;input.setAttribute('aria-label','Find an Admin control');
 const submit=make('button',null,'Search');submit.type='submit';form.append(input,submit);
 form.addEventListener('submit',event=>{event.preventDefault();const q=input.value.trim();location.assign('/admin.html'+(q?'?find='+encodeURIComponent(q):''));});
 const back=make('a',null,'Return to site');back.href='/index.html';
 const env=make('span','cc-standalone-badge',location.hostname.toLowerCase()==='stock-market-from-the-ground-up-d1r.pages.dev'?'LIVE SITE':'ENVIRONMENT UNVERIFIED');
 const role=make('span','cc-standalone-badge','ROLE GATED');
 const roles=window.ADMIN?.ctx?.roles||[];
 if(roles.includes('SHOWCASE_VIEWER'))role.textContent='SHOWCASE';
 else if(roles.includes('OWNER'))role.textContent='OWNER';
 else if(roles.length)role.textContent='STAFF';
 bar.append(home,breadcrumb,form,env,role,back);
 main.prepend(bar);
 const title=main.querySelector('h1');
 if(title)title.textContent=route.title;
 else if(route.title==='Lab Preview'){const heading=make('h1','cc-standalone-page-title',route.title);main.querySelector('.wrap')?.prepend(heading);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();