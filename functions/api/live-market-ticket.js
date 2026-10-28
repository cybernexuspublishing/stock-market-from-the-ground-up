import {toolAccess} from './member-tool-access.js';
import {mintLiveTicket} from '../_lib/crownlight-live-auth-v1.js';
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer'}});
export async function onRequest({request,env}){
 if(request.method!=='POST')return respond({error:'Method not allowed'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return respond({error:'Origin denied'},403);
 try{const access=await toolAccess(env,request,'MARKET_SIMULATOR');if(!access.authorized)return respond({error:'Market Simulator permission required'},403);
 const body=await request.json();const symbol=String(body.symbol||'').toUpperCase();
 if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))return respond({error:'Invalid symbol'},400);
 const ticket=await mintLiveTicket(env,{userId:access.userId,symbol});return respond({ok:true,ticket,symbol,expiresIn:20,feed:'iex'});
 }catch{return respond({error:'Live authorization unavailable'},403)}
}
