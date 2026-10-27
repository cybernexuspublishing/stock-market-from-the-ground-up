/* Owner-only review of existing book receipt Support tickets. No direct Stripe/KDP claims. */
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:HEAD});
const fail=(code,status)=>Object.assign(Error(code),{status});
const uuid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||''));
function config(e){
 const base=String(e?.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(e?.SUPABASE_PUBLISHABLE_KEY||''),secret=String(e?.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!pub||!secret)throw fail('CONFIG',503);
 return {base,pub,secret};
}
const service=c=>({apikey:c.secret,accept:'application/json',...(c.secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.secret})});
async function json(url,options={}){
 const r=await fetch(url,{...options,cache:'no-store'}),v=await r.json().catch(()=>null);
 if(!r.ok)throw fail('UPSTREAM',r.status===404?404:503);return v;
}
async function rest(c,resource,method='GET',body){
 return json(c.base+'/rest/v1/'+resource,{method,headers:{...service(c),...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
}
async function owner(c,req){
 const token=/^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization')||'')?.[1];
 if(!token)throw fail('NO_AUTH',401);
 const user=await json(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token}});
 if(!uuid(user?.id)||!user.email_confirmed_at)throw fail('NO_AUTH',401);
 const id=encodeURIComponent(user.id);
 const [profile,roles,flags]=await Promise.all([
  rest(c,'profiles?select=account_kind,deleted_at&id=eq.'+id+'&limit=1'),
  rest(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id+'&limit=30'),
  rest(c,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=1')
 ]);
 if(profile?.[0]?.account_kind!=='member'||profile?.[0]?.deleted_at||
  ['restricted','suspended'].includes(String(flags?.[0]?.status||'').toLowerCase())||
  !roles?.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now())))
 throw fail('NO_OWNER',403);
 return user.id;
}
export async function onRequest({request,env}){
 try{
  const c=config(env),id=await owner(c,request),u=new URL(request.url),action=u.searchParams.get('action');
  if(action==='list'&&request.method==='GET'){
   const rows=await rest(c,'gu_book_receipt_claims_20261027?select=id,ticket_id,registered_email,book_code,provider,external_order_reference,status,received_at,activation_due_at,staff_note&order=received_at.desc&limit=100');
   return reply({ok:true,claims:rows||[]});
  }
  if(action==='file'&&request.method==='GET'){
   const claim=u.searchParams.get('id');
   if(!uuid(claim))throw fail('INVALID',400);
   const row=(await rest(c,'gu_book_receipt_claims_20261027?select=attachment_storage_reference&id=eq.'+encodeURIComponent(claim)+'&limit=1'))?.[0];
   const path=row?.attachment_storage_reference;
   if(typeof path!=='string'||!checkReceiptPath(path))throw fail('NOT_FOUND',404);
   const url=c.base+'/storage/v1/object/gu-book-receipts/'+path.split('/').map(encodeURIComponent).join('/');
   const file=await fetch(url,{headers:service(c),cache:'no-store'});
   if(!file.ok)throw fail('NOT_FOUND',404);
   const data=await file.arrayBuffer();if(data.byteLength>6291456)throw fail('TOO_LARGE',413);
   const ext=path.split('.').pop();
   return new Response(data,{headers:{'content-type':'application/octet-stream',
    'content-disposition':'attachment; filename="book-receipt-'+claim+'.'+ext+'"',
    'content-security-policy':'sandbox','x-content-type-options':'nosniff','cache-control':'private, no-store'}});
  }
  if(action==='decide'&&request.method==='POST'){
   if(request.headers.get('origin')!==u.origin)throw fail('CROSS_ORIGIN',403);
   if(Number(request.headers.get('content-length')||0)>3500)throw fail('TOO_LARGE',413);
   const body=await request.json(),claim=String(body.claimId||''),decision=String(body.decision||''),
    note=String(body.note||'').trim();
   if(!uuid(claim)||!['approve','reject','awaiting_information'].includes(decision)||
     note.length<12||note.length>1500)throw fail('INVALID',400);
   if(decision==='approve'&&body.confirmPhrase!=='APPROVE VERIFIED BOOK PURCHASE')throw fail('CONFIRM',403);
   const result=await rest(c,'rpc/gu_owner_decide_book_receipt_v1','POST',
    {p_claim:claim,p_owner:id,p_action:decision,p_note:note});
   if(result?.ok!==true)throw fail('UNVERIFIED',503);return reply(result);
  }
  return reply({ok:false,error:'Method not allowed.'},405);
 }catch(e){const st=[400,401,403,404,405,413].includes(e.status)?e.status:503;
 return reply({ok:false,error:({400:'Invalid review request.',401:'Sign in as Owner.',403:'Owner authorization required.',404:'Receipt not available.',405:'Method not allowed.',413:'Attachment exceeds size limit.'})[st]||'Receipt review was not confirmed.'},st)}
}
function checkReceiptPath(path){return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$/.test(path)}
