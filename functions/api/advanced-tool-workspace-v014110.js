/* First-party beta workspace API v0.14.0.110.
 * Server performs current entitlement for READ/WRITE/DELETE and scopes every
 * row to the authenticated Supabase user, never to a browser-provided user_id.
 * No raw provider credentials, unpublished assessment rubrics, market-feed keys,
 * automatic trading orders or trading recommendation engine.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const types=new Set(['filter_set','watchlist','catalyst','scenario_review']);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const safeId=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
export async function onRequest({request,env}){
 try{
  if(!['GET','POST','DELETE'].includes(request.method))return out({ok:false,error:'Method not allowed.'},405);
  const url=new URL(request.url),code=url.searchParams.get('tool')||'';
  if(request.method!=='GET'){
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)throw fail('Cross-origin workspace changes denied.',403);
  }
  const auth=await advancedToolContext(env,request,code);
  if(!auth.allowed)return out({ok:false,error:'Your current plan does not include this tool.'},403);
  const base='tool_workspace_records',identity='user_id=eq.'+encodeURIComponent(auth.userId)+
   '&tool_code=eq.'+encodeURIComponent(code);
  if(request.method==='GET'){
   const type=url.searchParams.get('type')||'';
   if(type&&!types.has(type))throw fail('Unknown workspace record type.');
   const query=base+'?select=id,tool_code,record_type,title,payload,created_at,updated_at&'+identity+
    (type?'&record_type=eq.'+encodeURIComponent(type):'')+'&order=updated_at.desc,id.desc&limit=100';
   const rows=await privateJson(auth.c,query);
   if(!Array.isArray(rows)||rows.length>100)throw fail('Private workspace results are unavailable.',503);
   return out({ok:true,records:rows,limit:100,tool:code});
  }
  if(request.method==='DELETE'){
   const id=url.searchParams.get('id')||'';
   if(!safeId(id))throw fail('Valid record ID required.');
   await privateJson(auth.c,base+'?id=eq.'+id+'&'+identity,'DELETE',undefined,'return=minimal');
   return out({ok:true,deleted:true,tool:code});
  }
  const indicated=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(indicated)||indicated>16000)throw fail('Workspace payload too large.',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>16000)throw fail('Workspace payload too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw fail('Invalid workspace JSON.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid workspace data.');
  const type=String(body.recordType||''),title=String(body.title||'').trim();
  if(!types.has(type)||title.length<1||title.length>180||!body.payload||
   typeof body.payload!=='object'||Array.isArray(body.payload)||
   JSON.stringify(body.payload).length>12000)throw fail('Invalid workspace record.');
  const rows=await privateJson(auth.c,base,'POST',{
   user_id:auth.userId,tool_code:code,record_type:type,title,payload:body.payload
  },'return=representation');
  if(!Array.isArray(rows)||rows.length!==1||!safeId(rows[0].id))throw fail('Workspace save could not be verified.',503);
  return out({ok:true,id:rows[0].id,tool:code},201);
 }catch(e){
  return out({ok:false,error:[400,401,403,404,413].includes(e?.status)?e.message:
   'Private workspace temporarily unavailable.'},[400,401,403,404,405,413].includes(e?.status)?e.status:503);
 }
}
