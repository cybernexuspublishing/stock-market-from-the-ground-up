/* D11–D13: Existing 419 canonical Lab registry -> safe member player context.
 * Only public metadata for currently entitled members is returned. Does not
 * publish book text, unapproved answer keys, chart history or future bars.
 */
import {toolAccess} from './member-tool-access.js';
import {getBookCodeAccess} from './lab-content.js';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'}});
const code=/^[A-Za-z0-9_-]{3,90}$/;
const BOOKS=Object.freeze({
 FOUNDATION_BOOK_1:{number:1,label:'Foundations Book I'},
 FOUNDATION_BOOK_2:{number:2,label:'Foundations Book II'},
 FOUNDATION_BOOK_3:{number:3,label:'Foundations Book III'},
 DAY_TRADING_BOOK_1:{number:4,label:'Day Trading'},
 READING_THE_TAPE:{number:5,label:'Reading the Tape'},
 SITE_EXCLUSIVE:{number:6,label:'Site-Exclusive Labs'}
});
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw Object.assign(Error('Lab registry unavailable.'),{status:503});
 return {base,secret};
}
async function read(env,id){
 const c=config(env);
 const headers={apikey:c.secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))
  headers.authorization='Bearer '+c.secret;
 const columns='lab_id,title,book_code,chapter_number,ticker,historical_date,timeframe,lab_type,metadata,active,registry_visible';
 const url=c.base+'/rest/v1/platform_labs?select='+columns+
  '&lab_id=eq.'+encodeURIComponent(id)+'&limit=1';
 const r=await fetch(url,{headers,cache:'no-store'});
 if(!r.ok)throw Object.assign(Error('Lab registry query unavailable.'),{status:503});
 const rows=await r.json();
 if(!Array.isArray(rows)||rows.length>1)throw Object.assign(Error('Unexpected Lab registry response.'),{status:503});
 return rows[0]||null;
}
const safe=(v,max)=>String(v??'').slice(0,max);
const sentences=(value,maxItems=6)=>Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.trim()).slice(0,maxItems).map(x=>safe(x,550)):[];
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return reply({ok:false,error:'Method not allowed.'},405);
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!code.test(id))return reply({ok:false,error:'Invalid Lab ID.'},400);
  // Authenticated production identity is required before querying member
  // context; disabled/Showcase/Test accounts are rejected in toolAccess.
  const access=await toolAccess(env,request,'ONDEMAND_TRAINING');
  if(!access.userId||!code.test(access.userId.replaceAll('-','')))return reply({ok:false,error:'Sign in required.'},401);
  const lab=await read(env,id);
  if(!lab||lab.active!==true||lab.registry_visible!==true||!BOOKS[lab.book_code])
   return reply({ok:false,error:'This Lab is not published.'},404);
  const book=BOOKS[lab.book_code];
  const owns=lab.book_code==='SITE_EXCLUSIVE'?false:
   await getBookCodeAccess(env,request,lab.book_code);
  // Full/on-demand entitlement confers advanced interactive access.
  // A book-alone owner gets only matching guided companion instruction.
  if(access.authorized!==true&&!owns)
   return reply({ok:false,error:'Matching book or active Interactive Learning access required.'},403);
  const title=safe(lab.title,180);
  // These fields already exist in the public canonical catalog. Whitelist
  // only instructional prose; never forward arbitrary metadata or keys.
  const source=lab.metadata&&typeof lab.metadata==='object'?lab.metadata:{};
  const teaching={what:safe(source.what,700),why:safe(source.why,700),when:safe(source.when,700),
   how:sentences(source.how),questions:sentences(source.questions,5)};
  const context={
   id:lab.lab_id,book:book.number,bookCode:lab.book_code,
   chapter:lab.chapter_number||0,chapterTitle:book.label,
   concept:title||id,goal:safe(source.objective,700)||'Apply the concept to visible evidence without using later market observations.',
   ticker:safe(lab.ticker,20),date:safe(lab.historical_date,40),
   timeframe:safe(lab.timeframe,35),skill:safe(lab.lab_type,90),
   start:'Use the observation boundary in your approved companion lesson.',
   end:'Future observations must remain undisclosed until the server-controlled replay advances.',
   teaching,practiceSteps:teaching.how.length>=3?teaching.how:[
    'Define the concept in your own words before examining the example.',
    'Name the source, timeframe and observations actually available at this moment.',
    'Record the evidence that supports your interpretation and an alternative explanation.',
    'State a condition that would invalidate your current interpretation.',
    'Compare your first decision with any subsequently permitted observation; do not claim a reviewed grade from reflection.'
   ],
   beforeAdvance:[],dataNote:'Canonical registry metadata only. A substantive authored private lesson or reviewed answer set may still be unavailable; no market history or grade is implied.'
  };
  return reply({ok:true,lab:context,guidedAllowed:true,
   advancedAllowed:access.authorized===true,
   sourceStatus:'canonical_registry_safe_orientation_only',
   instructionReviewed:false,assessmentReviewed:false,
   notice:'Original member orientation, not an approved 419-Lab graded assessment.'});
 }catch(e){return reply({ok:false,error:e.status===401?'Sign in required.':
  e.status===403?'Active matching access required.':
  'Lab service temporarily unavailable.'},[400,401,403,404,405].includes(e.status)?e.status:503)}
}
