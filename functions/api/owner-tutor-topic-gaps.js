/* D09 owner-only aggregate curriculum gaps: no learner text or identifiers. */
import {ownerTutorAccess,ownerTutorDb} from '../_lib/owner-tutor-access-v014149.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'vary':'Authorization','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'GET required.'},405);
  const ctx=await ownerTutorAccess(env,request);
  const since=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
  const result=await ownerTutorDb(ctx,'gu_tutor_topic_gaps_v014149?select=topic,day_utc,requests'+
   '&day_utc=gte.'+since+'&order=day_utc.desc&limit=500');
  if(!Array.isArray(result.body)||result.body.length>500)throw Error('Invalid gap summary');
  const totals=new Map();
  for(const x of result.body){
   if(typeof x.topic!=='string'||!Number.isSafeInteger(x.requests)||x.requests<0||x.requests>1000000)
    throw Error('Unexpected gap counter');
   totals.set(x.topic,(totals.get(x.topic)||0)+x.requests);
  }
  return out({ok:true,days:30,totals:[...totals.entries()]
   .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
   .map(([topic,count])=>({topic,count})),promptBodiesStored:false,
   notice:'Only anonymized fixed-label question coverage gaps are counted. A tag is not an approved educational source.'});
 }catch(e){
  const code=[401,403,405].includes(e?.status)?e.status:503;
  return out({ok:false,error:code===503?'Private Tutor coverage counters unavailable.':e.message},code);
 }
}
