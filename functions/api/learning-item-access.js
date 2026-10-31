/* SMFGU-ACCESS-RESOLVER-001 v1.0: read-only, fail-closed item coverage.
 * Never infer checkout entitlement from a product page or a checkout URL.
 * /api/lab-content and /api/bootcamp-academy retain final authorization.
 */
import {toolAccess} from './member-tool-access.js';
import {getBookCodeAccess} from './lab-content.js';
import {academyByCode} from '../_lib/bootcamp-academy-v014168.js';
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEAD});
const BOOKS={F1:'FOUNDATION_BOOK_1',F2:'FOUNDATION_BOOK_2',F3:'FOUNDATION_BOOK_3',DT:'DAY_TRADING_BOOK_1',TAPE:'READING_THE_TAPE'};
const SAMPLES=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
export async function onRequest({request,env}){
 if(request.method!=='GET')return send({ok:false,error:'Method not allowed'},405);
 const url=new URL(request.url),type=url.searchParams.get('type'),item=url.searchParams.get('item')||'';
 if(!['lab','bootcamp'].includes(type)||item.length>70)return send({ok:false,error:'Invalid learning item'},400);
 const lab=type==='lab'&&/^(?:F[123]|DT|TAPE)-C\d{2}-L\d{2}$|^SITE-[A-Z0-9-]{3,50}$/i.test(item);
 const camp=type==='bootcamp'&&Object.hasOwn(academyByCode,item)&&item!=='free5';
 if(!lab&&!camp)return send({ok:false,error:'Unknown learning item'},404);
 const training=camp||item.startsWith('SITE-');
 const entitlement=training?'ONDEMAND_TRAINING':'INTERACTIVE_LEARNING';
 const qualified=training?[entitlement]:[entitlement,'ONDEMAND_TRAINING',...(BOOKS[item.split('-')[0]]?[BOOKS[item.split('-')[0]]]:[])];
 const notForSale={available:false,reason:'Currently unavailable for purchase',products:[]};
 try{
  const [interactive,trainingRight]=await Promise.all([
   toolAccess(env,request,'INTERACTIVE_LEARNING'),
   toolAccess(env,request,'ONDEMAND_TRAINING')
  ]);
  if(!interactive?.userId||interactive.userId!==trainingRight?.userId||
    interactive.freeEligible!==true||trainingRight.freeEligible!==true)
   return send({ok:false,error:'Member eligibility cannot be verified'},403);
  let ownedBook=false;
  const bookCode=BOOKS[item.split('-')[0]];
  if(lab&&bookCode){
   ownedBook=await getBookCodeAccess(env,request,bookCode);
   if(typeof ownedBook!=='boolean')throw Error('Book entitlement unavailable');
  }
  const authorized=training?trainingRight.authorized===true:
   interactive.authorized===true||trainingRight.authorized===true||ownedBook===true||SAMPLES.has(item);
  return send({ok:true,type,item,requiredEntitlements:qualified,
   access:{authorized,verified:true},
   purchase:notForSale,
   notice:authorized?'Open this item; its content endpoint revalidates access.':
    'Currently unavailable for purchase. No product-to-item coverage and sale availability have been verified.',
   returnPath:type==='lab'?'lab-player.html?lab='+encodeURIComponent(item):
    'bootcamp-academy.html?program='+encodeURIComponent(item)});
 }catch(e){
  return send({ok:false,error:e?.status===401?'Sign in to verify access':'Entitlement verification unavailable; access remains restricted'},e?.status===401?401:503);
 }
}
