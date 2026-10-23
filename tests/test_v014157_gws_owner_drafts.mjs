/* D17 GWS Owner draft mock contract; no real client publishing/provider. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/gws-projects.js';
import {readFileSync} from 'node:fs';
const id='123e4567-e89b-12d3-a456-426614174000';
const env={SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock'};
const saved=globalThis.fetch,observed=[];
let owner=true;
globalThis.fetch=async(url,options={})=>{
 const path=String(url);observed.push({path,options});
 if(path.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id}),{status:200});
 assert(path.includes('/rest/v1/'),'Unexpected network request '+path);
 assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert(!('authorization' in options.headers),'Opaque service key must not be sent as Bearer JWT');
 const body=path.includes('/admin_user_roles?')?(owner?[{role_code:'OWNER',expires_at:null}]:[]):
 path.includes('/profiles?')?[{account_kind:'member'}]:
 path.includes('/admin_user_flags?')?[{status:'active'}]:
 path.includes('/gws_client_drafts_v014?')?[]:
 path.includes('/rpc/v0143_gws_save')?{ok:true,notice:'saved'}:
 path.includes('/rpc/v0143_gws_restore')?{ok:true,notice:'restored'}:[];
 return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
};
function request(method,body,headers={}){
 return new Request('https://app.example/api/gws-projects',{method,
  headers:{authorization:'Bearer MOCK_OWNER_SESSION','content-type':'application/json',...headers},
  ...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
try{
 let result=await onRequest({request:request('GET'),env});
 assert.equal(result.status,200);
 let data=await result.json();
 assert.equal(data.publishingEnabled,false,'Private drafts must never serve a public site');
 owner=false;
 result=await onRequest({request:request('GET'),env});
 assert.equal(result.status,403,'Non-Owner cannot list client drafts');
 owner=true;
 observed.length=0;
 result=await onRequest({request:request('POST','x'.repeat(65537),{'content-length':'1'}),env});
 assert.equal(result.status,413,'Untrusted Content-Length cannot bypass actual streamed limit');
 assert(!observed.some(x=>x.options.method==='POST'&&x.path.includes('/rpc/')),'Oversized drafts cannot reach write RPC');
 result=await onRequest({request:request('POST',{action:'save',projectCode:'CLIENT_EXAMPLE',expectedRevision:0,
  label:'Client example',pageTitle:'Client site',pageSummary:'Private draft',pageBlocks:[]}),env});
 assert.equal(result.status,200);
 assert(observed.some(x=>x.path.includes('/rpc/v0143_gws_save')&&
  JSON.parse(x.options.body).p_actor===id),'Owner-only revision-save RPC reached');
 const source=readFileSync('functions/api/gws-projects.js','utf8');
 assert(!source.includes("authorization:'Bearer '+c.secret,accept"),'Legacy unconditional Authorization must stay removed');
 assert(!source.includes('await request.json()'));
 console.log('PASS D17 GWS Owner-only draft reads/saves, no public hosting, bounded body and Supabase service headers');
}finally{globalThis.fetch=saved}
