/* V1 member identity: presentation does not create membership or staff access.
 * Browser only supplies its own bearer token; all writes use service-side identity.
 */
import {memberIdentity} from './member-tool-access.js';
const HEAD={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:HEAD});
const err=(s,status=400)=>Object.assign(new Error(s),{status});
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
const types=['female','male','rather_not_say'];
const titles={learner:'Market Learner',researcher:'Research Student',journaler:'Journal Practitioner',founder:'Founding Member',book_owner:'Verified Book Owner',premium_member:'Premium Learning Member',academy_member:'Academy Member',custom:'Custom Display Title'};
const baseAvatar=/^https:\/\/stock-market-from-the-ground-up-d1r\.pages\.dev\/assets\/avatars\/av-(?:[fmn](?:[1-9]|1[0-3])\.svg|[fmn](?:[4-9]|1[0-3])\.webp|r(?:0[1-9]|[12][0-9]|30)\.webp)$/;
const uploadKey=(uid,path)=>new RegExp('^'+uid+'/[0-9a-f]{32}\\.webp$').test(path);
const clean=x=>String(x??'').trim();
const h=key=>({apikey:key,accept:'application/json','content-type':'application/json',...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key})});
async function rest(cfg,path,{method='GET',body,prefer}={}){
 const r=await fetch(cfg.base+'/rest/v1/'+path,{method,headers:{...h(cfg.secret),...(prefer?{prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const t=await r.text();let j;try{j=t?JSON.parse(t):null}catch{j=null}
 if(!r.ok)throw err('Member profile service unavailable.',r.status>=500?503:r.status);return j;
}
async function verifyAvatar(cfg,userId,value){
 const src=clean(value);if(!src)return '';
 if(baseAvatar.test(src))return src;
 let u;try{u=new URL(src)}catch{throw err('Invalid avatar location.')}
 const expected=new URL(cfg.base);
 const prefix='/storage/v1/object/public/gu-member-avatars/';
 if(u.protocol!=='https:'||u.origin!==expected.origin||!u.pathname.startsWith(prefix)||u.search||u.hash||
    !uploadKey(userId,decodeURIComponent(u.pathname.slice(prefix.length))))
   throw err('Choose a supplied avatar or a photo uploaded to your own account.');
 return src;
}
async function isFounder(cfg,userId){
 const x=await rest(cfg,'gu_founder_members_v014173?select=founder_number&user_id=eq.'+encodeURIComponent(userId)+'&revoked_at=is.null&limit=1');
 return Array.isArray(x)&&Number.isInteger(x[0]?.founder_number);
}
async function verifiedTitles(cfg,userId,founder){
 const now=new Date().toISOString(),base='user_id=eq.'+userId;
 const [books,grants,subscriptions]=await Promise.all([
  rest(cfg,'user_library?select=id&'+base+'&or=(expires_at.is.null,expires_at.gt.'+encodeURIComponent(now)+')&limit=1'),
  rest(cfg,'user_plan_grants?select=plan_code,starts_at,ends_at,status&'+base+'&status=eq.active&limit=30'),
  rest(cfg,'site_subscriptions?select=plan_code,status,current_period_end&'+base+'&status=in.(active,trialing)&limit=30')
 ]);
 const active=(grants||[]).filter(g=>(!g.starts_at||Date.parse(g.starts_at)<=Date.now())&&(!g.ends_at||Date.parse(g.ends_at)>Date.now()))
  .map(g=>String(g.plan_code||''));
 const provider=(subscriptions||[]).filter(g=>!g.current_period_end||Date.parse(g.current_period_end)>Date.now()).map(g=>String(g.plan_code||''));
 const all=[...active,...provider];const available=new Set(['learner','researcher','journaler']);
 if(founder)available.add('founder');
 if((books||[]).length)available.add('book_owner');
 if(all.some(x=>x!=='FREE'))available.add('premium_member');
 if(all.some(x=>/ONDEMAND|ACADEMY|BOOTCAMP|BOOT_CAMP/i.test(x)))available.add('academy_member');
 return available;
}
async function read(cfg,userId){
 const [rows,values,founder]=await Promise.all([
  rest(cfg,'profiles?select=id,username,first_name,last_name,email,bio,avatar_url,gender_choice,created_at,account_kind,deleted_at&id=eq.'+userId+'&limit=1'),
  rest(cfg,'gu_member_profile_titles_v1?select=selected_title,custom_title,updated_at&user_id=eq.'+userId+'&limit=1'),
  isFounder(cfg,userId)
 ]);
 const p=rows?.[0];
 if(!p||p.deleted_at)throw err('Profile not found.',404);
 const v=values?.[0]||{},allowed=await verifiedTitles(cfg,userId,founder);
 if(v.custom_title)allowed.add('custom');
 const visible=allowed.has(v.selected_title)?v.selected_title:'learner';
 return {profile:{id:p.id,username:p.username,firstName:p.first_name,lastName:p.last_name,email:p.email,
  bio:p.bio||'',avatarUrl:p.avatar_url||'',gender:p.gender_choice||'rather_not_say',
  createdAt:p.created_at,accountKind:p.account_kind,selectedTitle:visible,
  customTitle:v.custom_title||'',titleLabel:visible==='custom'?(v.custom_title||titles.learner):titles[visible]||titles.learner},
  choices:Object.entries(titles).filter(([k])=>allowed.has(k)).map(([code,label])=>({code,label}))};
}
export async function onRequest({env,request}){
 if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed'},405);
 try{
  const {userId,config}=await memberIdentity(env,request),cfg={base:config.base,secret:config.secret};
  const u=new URL(request.url),asked=clean(u.searchParams.get('userId'));
  let target=userId;
  if(asked&&asked!==userId){
   if(!UUID.test(asked))throw err('Invalid member identifier.');
   const [roles,own]=await Promise.all([
    rest(cfg,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+userId),
    rest(cfg,'profiles?select=account_kind,deleted_at&id=eq.'+userId+'&limit=1')
   ]);
   if(own?.[0]?.account_kind!=='member'||own?.[0]?.deleted_at||
    !(roles||[]).some(x=>['OWNER','ADMIN'].includes(x.role_code)&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
     throw err('Staff access required.',403);
   const targetRoles=await rest(cfg,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+asked);
   if(!(roles||[]).some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))&&
      (targetRoles||[]).some(x=>['OWNER','ADMIN','MODERATOR'].includes(x.role_code)&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
     throw err('Owner authorization is required for staff profiles.',403);
   target=asked;
  }
  if(request.method==='GET')return reply({ok:true,...await read(cfg,target)});
  if(target!==userId)throw err('Members may only edit their own presentation.',403);
  const p=(await rest(cfg,'profiles?select=account_kind,deleted_at&id=eq.'+userId+'&limit=1'))?.[0];
  if(p?.account_kind!=='member'||p.deleted_at)throw err('Member profile unavailable.',403);
  const flags=await rest(cfg,'admin_user_flags?select=status&user_id=eq.'+userId+'&limit=1');
  if(['suspended','restricted'].includes(String(flags?.[0]?.status||'').toLowerCase()))
   throw err('Profile edits are temporarily restricted.',403);
  const body=await request.json().catch(()=>({})),action=clean(body.action);
  if(action==='save'){
   const gender=clean(body.gender),bio=clean(body.bio);
   if(!types.includes(gender)||bio.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(bio))throw err('Invalid profile choices or biography.');
   const avatarUrl=await verifyAvatar(cfg,userId,body.avatarUrl);
   await rest(cfg,'profiles?id=eq.'+userId,{method:'PATCH',
    body:{gender_choice:gender,bio:bio||null,avatar_url:avatarUrl||null,updated_at:new Date().toISOString()},prefer:'return=minimal'});
  }else if(action==='select_title'){
   const choice=clean(body.title);
   if(!Object.hasOwn(titles,choice))throw err('Invalid display title.');
   const confirmed=await read(cfg,userId);
   if(!confirmed.choices.some(x=>x.code===choice))throw err('This entitlement title has not been verified.',403);
   if(choice==='custom'){
    const row=await rest(cfg,'gu_member_profile_titles_v1?select=custom_title&user_id=eq.'+userId+'&limit=1');
    if(!row?.[0]?.custom_title)throw err('No purchased custom title found.');
   }
   await rest(cfg,'gu_member_profile_titles_v1?on_conflict=user_id',
    {method:'POST',body:{user_id:userId,selected_title:choice,updated_at:new Date().toISOString()},
     prefer:'resolution=merge-duplicates,return=minimal'});
  }else if(action==='buy_custom_title'){
   const title=clean(body.title),requestId=clean(body.requestId);
   if(title.length>26||!UUID.test(requestId))throw err('Enter a valid title and request identifier.');
   const out=await rest(cfg,'rpc/gu_member_custom_title_purchase_v1',{method:'POST',
    body:{p_user_id:userId,p_title:title,p_request_id:requestId}});
   if(!out?.ok)throw err(out?.error||'Custom title could not be purchased.');
   return reply({ok:true,charged:out.alreadyUsed?0:5,alreadyUsed:out.alreadyUsed,...await read(cfg,userId)});
  }else throw err('Unknown profile action.',404);
  return reply({ok:true,...await read(cfg,userId)});
 }catch(e){return reply({ok:false,error:e.message||'Profile unavailable.'},[400,401,403,404,409].includes(e.status)?e.status:503)}
}
