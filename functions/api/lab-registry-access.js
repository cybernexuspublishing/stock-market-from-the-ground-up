/* Member-specific Lab Registry availability. Presentation signal only:
 * /api/lab-player-context and /api/lab-content remain the authoritative gates.
 * Does not disclose private Lab instructions, credentials, or protected grades.
 */
import {toolAccess} from './member-tool-access.js';
import {getBookCodeAccess} from './lab-content.js';
const BOOKS=Object.freeze(['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE']);
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'
}});
export async function onRequest({request,env}){
 if(request.method!=='GET')return response({ok:false,error:'Method not allowed'},405);
 try{
  const checks=await Promise.all([
   toolAccess(env,request,'INTERACTIVE_LEARNING'),
   toolAccess(env,request,'ONDEMAND_TRAINING')
  ]);
  if(!checks[0]?.userId||checks[0].userId!==checks[1]?.userId)
   return response({ok:false,error:'Member identity could not be confirmed'},503);
  if(checks.some(c=>c.freeEligible!==true))
   return response({ok:false,error:'This member is not eligible to access Labs'},403);
  // A broken book-rights lookup cannot accidentally unlock a Lab.
  const books=await Promise.all(BOOKS.map(async code=>{
   const entitled=await getBookCodeAccess(env,request,code);
   if(typeof entitled!=='boolean')throw Error('Book access unverified');
   return entitled;
  }));
  return response({ok:true,freeEligible:true,
   interactive:checks[0].authorized===true,
   training:checks[1].authorized===true,
   bookCodes:BOOKS.filter((_,i)=>books[i]),
   freeSampleIds:['F1-C02-L01','F2-C01-L01','F3-C01-L01'],
   policy:'Member-specific preview only; the Lab server independently authorizes every launch.'});
 }catch(e){
  return response({ok:false,error:e?.status===401?'Sign in to view Lab access':'Lab entitlements could not be verified'},
   e?.status===401?401:503);
 }
}
