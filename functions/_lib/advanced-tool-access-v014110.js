/* v0.14.0.110 — Single server entitlement contract for 16 beta tools.
 * No reliance on my_platform_access, URL-supplied owner IDs or free_preview
 * from browser input. Actual user is derived from Supabase Auth bearer token.
 * Legacy password/session data, stock feeds, client data and tool secrets
 * are never included in access responses.
 */
import {readProductAccessConfig,publicProductAccess} from './product-access-config-v1.js';
export const ADVANCED_CODES=Object.freeze([
 'DISCOVERY_LAB','SCANNER_BUILDER','WATCHLIST_WORKBENCH','CATALYST_RESEARCH',
 'FLOAT_SUPPLY_LAB','MARKET_STRUCTURE_LAB','MULTI_TIMEFRAME_LAB',
 'RISK_POSITION_LAB','EXECUTION_LAB','LIQUIDITY_SPREAD_LAB',
 'HALT_SSR_LAB','PATTERN_FAILURE_LIBRARY','ORDER_FLOW_TAPE_LAB',
 'MARKET_CONTEXT_LAB','TRADE_REVIEW_REPLAY','STRATEGY_VALIDATION'
]);
const allowed=new Set(ADVANCED_CODES);
const makeError=(status,message)=>Object.assign(new Error(message),{status});
export const serviceHeaders=(key,json=false)=>{
 const h={apikey:key,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  h.authorization='Bearer '+key;
 if(json)h['content-type']='application/json';
 return h;
};
export function safeAdvancedConfig(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const publicKey=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!publicKey||!secret)
  throw makeError(503,'Advanced tool authorization is not configured.');
 return {base,publicKey,secret};
}
export async function privateJson(c,path,method='GET',body,prefer){
 let response;
 try{response=await fetch(c.base+'/rest/v1/'+path,{method,cache:'no-store',
  headers:{...serviceHeaders(c.secret,body!==undefined),...(prefer?{prefer}:{})},
  body:body===undefined?undefined:JSON.stringify(body)})}
 catch{throw makeError(503,'Private tool storage unavailable.')}
 if(!response.ok)throw makeError(503,'Private tool storage unavailable.');
 const value=await response.text();
 try{return value?JSON.parse(value):null}catch{throw makeError(503,'Private tool storage unreadable.')}
}
export async function advancedToolContext(env,request,code){
 if(!allowed.has(code))throw makeError(404,'Tool not available in the beta workbench.');
 const c=safeAdvancedConfig(env);
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw makeError(401,'Sign in to access this tool.');
 let user;
 try{
  const r=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.publicKey,authorization:'Bearer '+token},cache:'no-store'});
  if(!r.ok)throw makeError(r.status===401?401:503,'Could not verify member identity.');
  user=await r.json();
 }catch(e){throw makeError(e.status===401?401:503,'Could not verify member identity.')}
 if(!/^[0-9a-f-]{36}$/i.test(user?.id||''))throw makeError(401,'Invalid member identity.');
 const id=encodeURIComponent(user.id),tool=encodeURIComponent(code);
 const [profiles,flags,roles,tools]=await Promise.all([
  privateJson(c,'profiles?select=account_kind,deleted_at&id=eq.'+id+'&limit=1'),
  privateJson(c,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=1'),
  privateJson(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id),
  privateJson(c,'platform_tools?select=tool_code,name,description,category,status,active,free_preview,individual_price_cents&tool_code=eq.'+tool+'&limit=1')
 ]);
 const kind=profiles?.[0]?.account_kind;
 if(kind!=='member'||profiles[0].deleted_at!=null)throw makeError(403,'Only active eligible member accounts can use beta tools.');
 if(['restricted','suspended'].includes(String(flags?.[0]?.status||'').toLowerCase()))
  throw makeError(403,'This account is restricted.');
 // A test/showcase role must never inherit Owner's powerful entitlement.
 if(roles?.some(r=>['SHOWCASE_VIEWER','TEST'].includes(r.role_code)&&
  (!r.expires_at||Date.parse(r.expires_at)>Date.now())))
  throw makeError(403,'Demonstration accounts cannot save premium tool work.');
 const t=tools?.[0];
 if(!t||t.active!==true||!['live','beta'].includes(t.status))
  throw makeError(403,'This tool is not active for members.');
 const entitled=await privateJson(c,'rpc/user_has_tool_access','POST',
  {target_user:user.id,target_tool:code});
 const config=await readProductAccessConfig(c,code);
 const viaPass=entitled===true;
 // Configured Free controls ungraded preview only; paid grants still come from user_has_tool_access.
 const viaPreview=config?.policy_mode==='configured'?config.free_access===true:t.free_preview===true;
 return {c,userId:user.id,tool:code,allowed:viaPass||viaPreview,
  accessLevel:viaPass?'entitled':viaPreview?'free_preview':'not_included',
  product:{tool_code:t.tool_code,name:t.name,description:t.description,
   category:t.category,status:t.status,free_preview:t.free_preview,
   individual_price_cents:t.individual_price_cents,access_configuration:publicProductAccess(config)}};
}
