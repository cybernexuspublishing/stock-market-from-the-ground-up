/* D09 deterministic educational arithmetic, never a brokerage order. */
import {toolAccess} from './member-tool-access.js';
import {hypotheticalPosition,hypotheticalLongPnL} from '../_lib/tutor-arithmetic-v014149.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
export async function onRequest({request,env}){
 try{
  if(request.method!=='POST')return response({ok:false,error:'POST required.'},405);
  const u=new URL(request.url),origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
  if(origin&&origin!==u.origin||site&&!['none','same-origin'].includes(site))
   return response({ok:false,error:'Cross-site calculation denied.'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))
   return response({ok:false,error:'JSON required.'},415);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>1400)return response({ok:false,error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return response({ok:false,error:'Invalid JSON.'},400)}
  if(!body||!['position','pnl'].includes(body.action))return response({ok:false,error:'Invalid calculation type.'},400);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  if(!auth.authorized)return response({ok:false,error:'Market Tutor entitlement required.'},403);
  const result=body.action==='position'?
   hypotheticalPosition({accountEquity:body.accountEquity,riskPercent:body.riskPercent,
     entry:body.entry,stop:body.stop,target:body.target??null}):
   hypotheticalLongPnL({entry:body.entry,exit:body.exit,shares:body.shares});
  return response(result,result.ok?200:400);
 }catch{return response({ok:false,error:'Calculation temporarily unavailable.'},503)}
}
