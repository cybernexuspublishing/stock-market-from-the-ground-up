const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};const out=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});const clean=v=>String(v??'').trim();
function cfg(env){const url=clean(env.SUPABASE_URL).replace(/\/$/,''),pub=clean(env.SUPABASE_PUBLISHABLE_KEY),secret=clean(env.SUPABASE_SECRET_KEY);if(!url||!pub||!secret)throw Object.assign(new Error('Support service is not configured.'),{status:503});return{url,pub,secret}}
async function jf(url,opt={}){const r=await fetch(url,opt),t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch{d={raw:t}}if(!r.ok)throw Object.assign(new Error(d.message||d.error||t||`HTTP ${r.status}`),{status:r.status});return d}
async function caller(env,req){const h=req.headers.get('authorization')||'',tok=h.startsWith('Bearer ')?h.slice(7):'';if(!tok)throw Object.assign(new Error('Authentication required.'),{status:401});const{url,pub}=cfg(env);const user=await jf(`${url}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${tok}`}});if(!user?.id)throw Object.assign(new Error('Invalid member session.'),{status:401});
 // A GoTrue token may belong to a synthetic Showcase/test identity. This
 // private production Support queue is reserved for real member accounts.
 // Suspended real members retain Support access for account recovery/appeals.
 const rows=await rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(user.id)+'&limit=1');
 if(!Array.isArray(rows)||rows.length!==1||rows[0]?.account_kind!=='member')
  throw Object.assign(new Error('Real member account required for Support.'),{status:403});
 return user}
async function rest(env,path,{method='GET',body,prefer}={}){const{url,secret}=cfg(env),headers={apikey:secret,accept:'application/json',...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)?{authorization:'Bearer '+secret}:{})};if(body!==undefined)headers['content-type']='application/json';if(prefer)headers.prefer=prefer;return jf(`${url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)})}
function ticketId(value){
 const raw=String(value??'');
 if(!/^[1-9][0-9]{0,14}$/.test(raw)||!Number.isSafeInteger(Number(raw)))return null;
 return Number(raw);
}
async function boundedSupportInput(request){
 const MAX_BYTES=16384;
 const header=request.headers.get('content-length');
 if(header!==null&&(!/^[0-9]+$/.test(header)||Number(header)>MAX_BYTES))
  throw Object.assign(new Error('Request exceeds 16 KB.'),{status:413});
 if(!request.body||typeof request.body.getReader!=='function')
  throw Object.assign(new Error('JSON request required.'),{status:400});
 const reader=request.body.getReader(),chunks=[];let length=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))
    throw Object.assign(new Error('Invalid request body.'),{status:400});
   length+=value.byteLength;
   if(length>MAX_BYTES)throw Object.assign(new Error('Request exceeds 16 KB.'),{status:413});
   chunks.push(value);
  }
 }catch(error){try{await reader.cancel()}catch{}throw error}
 finally{try{reader.releaseLock()}catch{}}
 const bytes=new Uint8Array(length);let offset=0;
 for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength}
 try{
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Expected JSON object.');
  return parsed;
 }catch{
  throw Object.assign(new Error('A valid JSON object is required.'),{status:400});
 }
}
const categories=new Set(['account','signin','membership','billing','payment','refund','book_access','book_key','store_purchase','market_data','api_token','historical_labs','simulator','journal','market_tutor','market_commons','technical','accessibility','bug','other']);
export async function onRequest({request,env}){const u=new URL(request.url),action=clean(u.searchParams.get('action'));try{const usr=await caller(env,request);if(action==='list'&&request.method==='GET'){const rows=await rest(env,`support_tickets?select=id,ticket_number,category,subject,status,priority,created_at,updated_at,resolved_at,closed_at&requester_user_id=eq.${encodeURIComponent(usr.id)}&order=updated_at.desc&limit=100`);return out({ok:true,tickets:rows||[]})}if(action==='create'&&request.method==='POST'){const b=await boundedSupportInput(request),category=clean(b.category).toLowerCase(),subject=clean(b.subject).slice(0,180),description=clean(b.description).slice(0,10000);if(!categories.has(category))return out({error:'Choose a valid support category.'},400);if(subject.length<3||description.length<10)return out({error:'Enter a subject and a detailed description.'},400);const row=await rest(env,'support_tickets',{method:'POST',prefer:'return=representation',body:{requester_user_id:usr.id,category,subject,description,status:'new',priority:'normal',last_member_reply_at:new Date().toISOString(),updated_at:new Date().toISOString()}});const t=row?.[0];if(!t?.id)throw Object.assign(new Error('Ticket insert could not be verified.'),{status:503});
 let initialMessageRecorded=false;
 try{
  await rest(env,'support_ticket_messages',{method:'POST',prefer:'return=minimal',
   body:{ticket_id:t.id,author_user_id:usr.id,author_kind:'member',body:description,is_internal:false}});
  initialMessageRecorded=true;
 }catch{/* The accepted ticket itself retains the full description.
   Do NOT report total failure and induce a duplicate submission. */}
 return out({ok:true,ticket:t,initialMessageRecorded,
  ...(initialMessageRecorded?{}:{notice:'Ticket saved; initial conversation copy unavailable. Its original description remains attached.'})})}if(action==='detail'&&request.method==='GET'){const id=ticketId(u.searchParams.get('id'));if(!id)return out({error:'Ticket id required.'},400);const t=(await rest(env,`support_tickets?select=id,ticket_number,category,subject,description,status,priority,created_at,updated_at,resolved_at,closed_at&id=eq.${id}&requester_user_id=eq.${encodeURIComponent(usr.id)}&limit=1`))?.[0];if(!t)return out({error:'Ticket not found.'},404);const messages=await rest(env,`support_ticket_messages?select=id,author_user_id,author_kind,body,attachments,created_at&ticket_id=eq.${id}&is_internal=eq.false&order=created_at.asc`);return out({ok:true,ticket:t,messages:messages||[]})}if(action==='reply'&&request.method==='POST'){const b=await boundedSupportInput(request),id=ticketId(b.id),body=clean(b.body).slice(0,10000);if(!id||body.length<1)return out({error:'Ticket and reply are required.'},400);const t=(await rest(env,`support_tickets?select=id,status&id=eq.${id}&requester_user_id=eq.${encodeURIComponent(usr.id)}&limit=1`))?.[0];if(!t)return out({error:'Ticket not found.'},404);if(['closed','resolved'].includes(t.status))return out({error:'This ticket is closed or resolved. Reopen it before replying.'},409);await rest(env,'support_ticket_messages',{method:'POST',prefer:'return=minimal',body:{ticket_id:id,author_user_id:usr.id,author_kind:'member',body,is_internal:false}});await rest(env,`support_tickets?id=eq.${id}&requester_user_id=eq.${encodeURIComponent(usr.id)}`,{method:'PATCH',prefer:'return=minimal',body:{status:'waiting_staff',last_member_reply_at:new Date().toISOString(),updated_at:new Date().toISOString()}});return out({ok:true})}if(action==='reopen'&&request.method==='POST'){const b=await boundedSupportInput(request),id=ticketId(b.id);
 if(!id)return out({error:'Valid ticket ID required.'},400);
 const ticket=(await rest(env,`support_tickets?select=id,status&id=eq.${id}&requester_user_id=eq.${encodeURIComponent(usr.id)}&limit=1`))?.[0];
 if(!ticket)return out({error:'Ticket not found.'},404);
 if(!['closed','resolved'].includes(ticket.status))return out({error:'Only closed or resolved tickets can be reopened.'},409);
 const changed=await rest(env,`support_tickets?id=eq.${id}&requester_user_id=eq.${encodeURIComponent(usr.id)}&status=in.(closed,resolved)`,{method:'PATCH',prefer:'return=representation',body:{status:'open',closed_at:null,resolved_at:null,updated_at:new Date().toISOString()}});if(!Array.isArray(changed)||changed.length!==1)return out({error:'Ticket state changed. Refresh and retry.'},409);return out({ok:true})}return out({error:'Unknown support action.'},404)}catch(e){const status=[400,401,403,404,409,413].includes(e.status)?e.status:503;
const publicMessage=({400:'Invalid request.',401:'Sign in required.',403:'Request not allowed.',404:'Record unavailable.',409:'Ticket state conflict.',413:'Request exceeds the maximum size.'})[status]||'Support service unavailable.';
return out({ok:false,error:publicMessage},status)}}
