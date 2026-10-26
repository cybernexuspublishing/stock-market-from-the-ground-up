import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/ui-state.js';
const env={SUPABASE_URL:'https://database.fixture',SUPABASE_PUBLISHABLE_KEY:'public-fixture',SUPABASE_SECRET_KEY:'server-fixture'};
const realFetch=globalThis.fetch;let writes=[],lastServiceHeaders=null;
globalThis.fetch=async(url,opts={})=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:opts.headers.authorization==='Bearer user-b'?'user-b':'user-a'});
 lastServiceHeaders=opts.headers;if(opts.method==='POST'){writes.push(JSON.parse(opts.body));return new Response(null,{status:204});}
 return Response.json([]);
};
const call=(method,body,token='user-a')=>onRequest({env,request:new Request('https://site.fixture/api/ui-state?action=preference_save',{method,headers:token?{authorization:'Bearer '+token,'content-type':'application/json'}:{'content-type':'application/json'},body:JSON.stringify(body)})});
try{
 assert.equal((await call('POST',{key:'display',value:{font:'1'}},'')).status,401);
 for(const value of [{font:'99'},{density:'zoom'},{instructorFont:'0.1'},{role:'OWNER'},[],null])assert.equal((await call('POST',{key:'display',value})).status,400);
 assert.equal(writes.length,0);
 for(const user of ['user-a','user-b']){const res=await call('POST',{key:'display',user_id:'somebody-else',value:{font:'1.5',density:'compact',instructorFont:'2',contrast:'default',motion:'reduced'}},user);assert.equal(res.status,200);assert.equal(writes.at(-1).user_id,user);}
 env.SUPABASE_SECRET_KEY='sb_secret_fixture';await call('POST',{key:'display',value:{font:'1'}});assert.equal(lastServiceHeaders.apikey,'sb_secret_fixture');assert.equal(lastServiceHeaders.authorization,undefined);
 env.SUPABASE_SECRET_KEY='eyJfixture.eyJfixture.signature';await call('POST',{key:'display',value:{font:'1'}});assert.equal(lastServiceHeaders.authorization,'Bearer '+env.SUPABASE_SECRET_KEY);
 console.log('Display API authorization, account isolation and 6 invalid-value cases passed.');
}finally{globalThis.fetch=realFetch;}
