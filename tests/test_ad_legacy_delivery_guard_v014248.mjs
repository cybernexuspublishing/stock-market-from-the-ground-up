import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('legacy advertising routes enforce global delivery switch', () => {
  const source=readFileSync('functions/api/ads.js','utf8');
  assert(source.includes('gu_ad_sales_settings_v014226?select=ad_delivery_enabled'));
  assert(source.includes("action==='serve'||action==='click'"));
  assert(source.includes('deliveryAllowed=false'));
  assert(source.includes('deliveryDisabled:true'));
  assert(source.includes("new Response('Not found',{status:404"));
});

import {onRequest} from '../functions/api/ads.js';

const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SECRET_KEY:'test-server'};
async function withMock(enabled,callback){
  const prior=globalThis.fetch,visited=[];
  globalThis.fetch=async(url)=>{
    const path=new URL(String(url)).pathname;
    visited.push(path);
    if(path.endsWith('/gu_ad_sales_settings_v014226'))
      return enabled===null?new Response('Unavailable',{status:503}):
        new Response(JSON.stringify([{ad_delivery_enabled:enabled}]),{status:200});
    if(path.endsWith('/plan_ad_policies'))return new Response('[]',{status:200});
    throw Error('Unexpected request');
  };
  try{await callback(visited)}finally{globalThis.fetch=prior}
}

test('disabled legacy serve and click routes never reach inventory or redirect',async()=>{
  await withMock(false,async(paths)=>{
    const serve=await onRequest({request:new Request('https://site.test/api/ads?action=serve'),env});
    assert.equal((await serve.json()).deliveryDisabled,true);
    const click=await onRequest({request:new Request('https://site.test/api/ads?action=click&creative=8'),env});
    assert.equal(click.status,404);
    assert.equal(click.headers.get('location'),null);
    assert.equal(paths.length,2);
  });
});

test('unavailable delivery policy blocks legacy advertising',async()=>{
  await withMock(null,async(paths)=>{
    const response=await onRequest({request:new Request('https://site.test/api/ads?action=serve'),env});
    assert.equal((await response.json()).creative,null);
    assert.equal(paths.length,1);
  });
});

test('enabled delivery policy continues into existing membership policy',async()=>{
  await withMock(true,async(paths)=>{
    const response=await onRequest({request:new Request('https://site.test/api/ads?action=serve'),env});
    assert.equal((await response.json()).creative,null);
    assert(paths.includes('/rest/v1/plan_ad_policies'));
  });
});
