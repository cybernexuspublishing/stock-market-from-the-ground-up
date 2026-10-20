/* v0.14.0.103 | Member-visible first-party AI service availability.
 * Actual status is derived from both entitlement and server budget installation.
 * Never disclose provider credentials, model private config, other-user usage,
 * raw journal data or private graded answers.
 */
import {toolAccess} from './member-tool-access.js';
import {aiServiceMemberStatus} from '../_lib/first-party-ai-service-v014103.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return response({ok:false,error:'GET required.'},405);
  const auth=await toolAccess(env,request,'MARKET_TUTOR');
  if(!auth.authorized)return response({ok:true,authorized:false,enabled:false,
   reason:'An active Full Platform membership or Market Tutor tool entitlement is required.',
   purchaseUrl:'/store-tool-market-tutor.html'},200);
  const state=await aiServiceMemberStatus(env,auth.userId);
  return response({ok:true,authorized:true,tool:'MARKET_TUTOR',
   ...state,sourceGroundedAvailable:true,providerRequestsRequireConsent:true,
   graded:false,masteryAwarded:false});
 }catch(e){return response({ok:false,error:e?.status===401?'Sign in to check your Market Tutor access.':'AI service status unavailable.'},
 [401,403].includes(e?.status)?e.status:503)}
}
