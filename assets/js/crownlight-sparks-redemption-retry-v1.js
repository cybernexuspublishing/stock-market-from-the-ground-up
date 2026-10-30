/* Crownlight Chart Studio: non-secret, member-scoped Sparks retry receipt.
 * Reuse the SAME payment-idempotency UUID after a network failure, timeout or
 * page reload. Only discard after server-confirmed entitlement reconciliation.
 * Contains no wallet balances, provider keys, auth tokens, or customer secrets.
 */
(function(root){'use strict';
const SKU=/^CHART_(?:ADVANCED|PROFESSIONAL)_(?:DAY|WEEK|MONTH)$/;
const USER=/^[a-f0-9]{8}-[a-f0-9-]{27,35}$/i;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const DAY=86400000;
const memory=new Map();
function token(user,sku){
 if(!USER.test(String(user||''))||!SKU.test(String(sku||'')))throw Error('Invalid chart purchase identity.');
 return 'crownlight.chart.sparks.retry.v1:'+user.toLowerCase()+':'+sku;
}
function storage(){
 try{const store=root.sessionStorage,probe='__chart_retry_probe__';store.setItem(probe,'1');store.removeItem(probe);return store}
 catch{return {getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}}
}
function acquire(user,sku){
 const key=token(user,sku),store=storage(),now=Date.now();
 let entry;
 try{entry=JSON.parse(store.getItem(key)||'null')}catch{entry=null}
 if(UUID.test(entry?.id||'')&&Number.isFinite(entry?.at)&&entry.at<=now&&now-entry.at<DAY)
  return entry.id;
 const id=root.crypto?.randomUUID?.();
 if(!UUID.test(id||''))throw Error('Secure redemption request ID is unavailable.');
 store.setItem(key,JSON.stringify({id,at:now}));
 return id;
}
function confirm(user,sku,id){
 const key=token(user,sku),store=storage();
 let entry;try{entry=JSON.parse(store.getItem(key)||'null')}catch{entry=null}
 if(entry?.id===id){store.removeItem(key);return true}
 return false;
}
root.CrownlightSparksRetryV1=Object.freeze({acquire,confirm});
if(typeof module!=='undefined'&&module.exports)module.exports=root.CrownlightSparksRetryV1;
})(typeof window==='undefined'?globalThis:window);
