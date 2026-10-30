/* GA4 public interest tracking: test consent isolation and event minimization.
 * Synthetic DOM and URLs only. No third-party network requests or real members.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('assets/js/ga4-consent-v1.js','utf8');
function scenario(preference){
  const listeners={};
  const nodes=[];
  function element(tag){
    const node={tag,hidden:false,children:[],dataset:{},attrs:{},listeners:{},
      append(...children){this.children.push(...children);},
      setAttribute(k,v){this.attrs[k]=v;},
      addEventListener(k,fn){this.listeners[k]=fn;},
      querySelector(){return null;}};
    nodes.push(node);
    return node;
  }
  const head=element('head'),body=element('body'),footer=element('footer');
  const document={
    readyState:'complete',head,body,
    getElementById(){return null;},
    createElement:element,
    createTextNode:text=>({text}),
    querySelector:sel=>sel==='footer'?footer:null,
    addEventListener(name,fn){listeners[name]=fn;}
  };
  const window={dataLayer:undefined};
  const localStorage={
    getItem:()=>preference,
    setItem(){throw new Error('No simulated preference updates needed');}
  };
  const location={origin:'https://example.test',pathname:'/',reload(){throw new Error('Unexpected navigation');}};
  runInNewContext(source,{document,window,localStorage,location,URL,Date,encodeURIComponent}, {timeout:1000});
  return {listeners,window,head,nodes};
}
function click(env,url){
  const target={closest(){return {href:url};}};
  env.listeners.click({target});
}
function namedEvents(env){
  return (env.window.dataLayer||[]).filter(x=>Array.from(x)[0]==='event').map(x=>[...Array.from(x)]);
}

const denied=scenario('denied');
assert.equal(denied.head.children.filter(x=>x.tag==='script').length,0,'Declined consent must not load Google');
click(denied,'https://example.test/create-account.html?email=private@example.test');
assert.equal(namedEvents(denied).length,0,'Declined consent must suppress events');

const missing=scenario(null);
assert.equal(missing.head.children.filter(x=>x.tag==='script').length,0,'Unknown consent must not load Google');
click(missing,'https://example.test/books.html');
assert.equal(namedEvents(missing).length,0,'Unknown consent must suppress events');

const granted=scenario('granted');
assert.equal(granted.head.children.filter(x=>x.tag==='script').length,1,'Consent should load one Google script');
click(granted,'https://example.test/create-account.html?email=private@example.test');
click(granted,'https://example.test/store?product=SECRET');
click(granted,'https://example.test/learn.html#lesson');
click(granted,'https://example.test/my-purchases.html?order_id=secret');
click(granted,'https://checkout.stripe.com/c/pay/example');
const events=namedEvents(granted);
assert.deepEqual(events.map(x=>x[1]),['smfgu_registration_start','smfgu_catalog_interest','smfgu_learning_interest']);
assert.deepEqual(events.map(x=>x[2].item_id),['account','store','learn']);
assert(events.every(x=>Object.keys(x[2]).sort().join(',')==='content_type,item_id'),'Only fixed parameters may be sent');
assert(!JSON.stringify(events).includes('private@example.test'),'No email may enter event data');
assert(!JSON.stringify(events).includes('SECRET'),'No URL parameters may enter event data');
assert(!events.some(x=>x[1]==='sign_up'||x[1]==='purchase'),'Intent must not count as a confirmed conversion');
console.log('PASS GA4 public funnel: opt-in only, no PII, same-origin allowlist, no false conversions');
