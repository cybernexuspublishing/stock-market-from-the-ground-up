/* Owner marketing operations v0.14.278: real private records, zero-charge manual-only X.
 * No browser storage, no auto-publishing, no provider authorization implied.
 */
(()=>{'use strict';
let mounted=false,store=null,section='overview',active={};
const e=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node};
const text=(host,tag,value,cls)=>{const x=e(tag,value,cls);host.append(x);return x};
const action=(title,fn,primary=false)=>{const b=e('button',title,primary?'btn':'btn secondary');b.type='button';b.addEventListener('click',fn);return b};
const elem=(type,name,title,options)=>{
 const lab=e('label',title),input=e(type==='textarea'?'textarea':type==='select'?'select':'input');
 if(type!=='textarea'&&type!=='select')input.type=type;
 input.name=name;input.dataset.field=name;
 if(type==='select')for(const [v,t] of options||[]){const opt=e('option',t);opt.value=v;input.append(opt)}
 if(type==='textarea')input.rows=3;
 lab.append(input);
 return {lab,input};
};
function fields(form,spec){
 const out={};
 for(const [type,key,label,choices] of spec){const f=elem(type,key,label,choices);out[key]=f.input;form.append(f.lab)}
 return out;
}
const msg=(target,m,fail=false)=>{target.textContent=m;target.dataset.error=fail?'true':'false'};
function parseDate(x){return x?new Date(x).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not planned'}
function localDate(x){if(!x)return'';const d=new Date(x);if(Number.isNaN(d.getTime()))return'';return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function targetUrl(u){window.open(u,'_blank','noopener,noreferrer')}
async function call(body){
 const sb=await window.getSupabaseClient?.(),session=(await sb?.auth?.getSession?.())?.data?.session;
 if(!session?.access_token)throw Error('Owner session required.');
 const r=await fetch('/api/admin-social',{method:body?'POST':'GET',cache:'no-store',
  headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok!==true)throw Error(data.error||'Social operation failed.');
 return data;
}
function panel(host,title,note){const x=e('section',undefined,'social-card');text(x,'h3',title);text(x,'p',note,'social-description');host.append(x);return x}
function formCard(host,title,note,spec,onSave){
 const box=panel(host,title,note),form=e('form',undefined,'social-form');
 const f=fields(form,spec),status=text(form,'p','','social-feedback');status.setAttribute('role','status');
 const button=e('button','Save','btn');button.type='submit';form.insertBefore(button,status);box.append(form);
 form.addEventListener('submit',async ev=>{ev.preventDefault();button.disabled=true;msg(status,'Saving…');
  try{await onSave(f);msg(status,'Saved privately. No external platform action occurred.');await refresh()}
  catch(err){msg(status,err.message,true)}finally{button.disabled=false}});
 return {box,form,f,status};
}
function items(host,rows,render,empty){
 host.replaceChildren();
 if(!rows?.length){host.append(e('p',empty||'No records yet.','social-description'));return}
 for(const record of rows)render(record);
}
function record(host,name,desc,actions){
 const article=e('article',undefined,'social-item');text(article,'strong',name);
 text(article,'p',desc,'social-description');
 const buttons=e('div',undefined,'social-actions');for(const b of actions||[])buttons.append(b);article.append(buttons);host.append(article);
}
function views(host){
 const nav=e('nav',undefined,'social-tabs');nav.setAttribute('aria-label','Social marketing areas');
 const pages=e('div',undefined,'social-panels'),targets={};
 const areas=[['overview','Overview'],['accounts','Social Accounts'],['posts','Post Studio'],['calendar','Calendar'],['campaigns','Campaigns'],['templates','Templates'],['communities','Communities'],['tasks','Engagement tasks'],['metrics','Metrics'],['audit','Audit history']];
 for(const [id,label] of areas){
  const b=action(label,()=>show(id));b.dataset.socialTab=id;b.setAttribute('aria-current','false');nav.append(b);
  const p=e('section');p.dataset.socialPanel=id;p.hidden=true;pages.append(p);targets[id]=p;
 }
 function show(id){if(!targets[id])id='overview';section=id;
  for(const p of pages.children)p.hidden=p.dataset.socialPanel!==id;
  for(const b of nav.children)b.setAttribute('aria-current',b.dataset.socialTab===id?'page':'false');
  renderSection(id,targets[id]);
 }
 host.append(nav,pages);return {show}
}
function openPost(p){
 document.querySelector('[data-social-tab="posts"]')?.click();
 if(p?.status==='manual_recorded'){alert('Published record is immutable. Duplicate its text to create another post.');return}
 const f=active.postsForm?.f;
 if(!f)return;
 active.post=p||null;
 f.body.value=p?.body||'';f.status.value=p?.status||'draft';
 f.campaign.value=p?.campaign_id||'';f.plannedAt.value=localDate(p?.planned_at);
 f.body.focus();
}
function categoryOptions(){return [['education','Education'],['founding600','Founding 600'],['bootcamp','Boot Camps'],['labs','Labs'],['books','Books'],['tools','Tools'],['brand','Brand']]}
function renderSection(id,host){
 host.replaceChildren();
 if(!store)return void text(host,'p','Loading Owner records…','social-description');
 if(id==='overview'){
  const card=panel(host,'Marketing overview','Only saved administrative records are shown. External performance is unavailable without verified sources.');
  const stats=e('div',undefined,'social-stats');
  const values=[
   ['Draft posts',(store.posts||[]).filter(x=>x.status==='draft').length],
   ['Approved posts',(store.posts||[]).filter(x=>x.status==='approved').length],
   ['Planned posts',(store.posts||[]).filter(x=>x.status==='planned').length],
   ['Manually recorded posts',(store.posts||[]).filter(x=>x.status==='manual_recorded').length],
   ['Campaigns',(store.campaigns||[]).length],
   ['Communities',(store.communities||[]).length],
   ['Open tasks',(store.tasks||[]).filter(x=>x.state==='open'||x.state==='in_progress').length],
   ['Publishing budget','$0']
  ];for(const [label,n] of values){const c=e('div',undefined,'social-stat');text(c,'strong',n);text(c,'span',label);stats.append(c)}card.append(stats);
  const links=e('div',undefined,'social-actions');
  for(const [title,target] of [['Create a post','posts'],['Plan in calendar','calendar'],['Manage communities','communities'],['Campaign work','campaigns'],['Review tasks','tasks']])links.append(action(title,()=>document.querySelector('[data-social-tab="'+target+'"]')?.click()));
  card.append(links);
  panel(host,'Account status','@SMFGUAcademy · manual-only. Automatic X publishing, community joining, and engagement automation are disabled. No chargeable operations are enabled.');
 }else if(id==='accounts'){
  const f=formCard(host,'Company social profiles','Store company handles and public profile links. Saving a handle never authenticates or connects that social account.',[
   ['select','provider','Platform',(store.providers||[]).map(x=>[x.id,x.name])],
   ['text','handle','Account handle or channel name'],
   ['url','profileUrl','Official public profile URL'],
   ['textarea','notes','Administration notes']
  ],async z=>{
   const payload={action:'save_account',provider:z.provider.value,handle:z.handle.value,profileUrl:z.profileUrl.value,notes:z.notes.value};
   if(active.account)payload.id=active.account.id;
   await call(payload);
  });
  f.box.append(action('New company profile',()=>{active.account=null;f.form.reset()}));
  const profiles=panel(host,'Saved company profiles','These are records of intended profiles, not proof of a live API integration.');
  for(const p of store.accounts||[])record(profiles,p.handle,p.provider+' · '+p.connection_status.replace(/_/g,' ')+(p.notes?' · '+p.notes:''),[
   action('Edit',()=>{active.account=p;const z=f.f;z.provider.value=p.provider;z.handle.value=p.handle;z.profileUrl.value=p.profile_url;z.notes.value=p.notes||'';z.handle.focus()}),
   action('Open external profile',()=>targetUrl(p.profile_url))
  ]);
  if(!store.accounts?.length)text(profiles,'p','No company profiles saved yet.','social-description');
  const overview=panel(host,'Platform connection directory','These are capability and connection-status records, not claims of verified account access.');
  const providers=store.providers||[];
  for(const provider of providers){
   record(overview,provider.name+(provider.account?' · '+provider.account:''),
    'Connection: '+provider.connection.replace(/_/g,' ')+
    ' · Direct API publishing: '+(provider.apiPublishing?'Authorized':'Disabled')+
    ' · Native manual publishing: '+(provider.manuallyPublishable?'Available':'Unavailable')+
    ' · Community joining via Admin: '+(provider.automatedCommunityJoin?'Authorized':'Not connected')+
    ' · '+provider.policy,[]);
  }
  panel(host,'Provider financial control','No credentials are stored in this module. Automated provider operations require official account authorization, appropriate permissions and an explicitly approved spending budget. Spending limit: $0.');
 }else if(id==='posts'){
  const campaigns=[['','No campaign'],...(store.campaigns||[]).map(x=>[x.id,x.title])];
  const f=formCard(host,'X Post Studio','Owner editorial approval is required before manual publication can be recorded.',[
   ['textarea','body','Post text'],['select','status','Editorial state',[['draft','Draft'],['approved','Owner approved'],['planned','Approved & planned'],['archived','Archived']]],
   ['select','campaign','Marketing campaign',campaigns],['datetime-local','plannedAt','Planning date (local time)']
  ],async fields=>{
   const body=fields.body.value.trim();if(!body||body.length>280)throw Error('Post must contain 1–280 characters.');
   const payload={action:'save_post',body,status:fields.status.value,campaignId:fields.campaign.value};
   if(payload.status==='planned'){if(!fields.plannedAt.value)throw Error('Choose a planning date.');payload.plannedAt=new Date(fields.plannedAt.value).toISOString()}
   if(active.post){payload.id=active.post.id;payload.version=active.post.version}
   const result=await call(payload);active.post=result.record;
  });
  active.postsForm=f;f.f.body.maxLength=280;f.f.body.rows=6;
  const controls=e('div',undefined,'social-actions');f.box.append(controls);
  controls.append(action('New draft',()=>{active.post=null;f.form.reset()}),
   action('Copy text',async()=>{try{const t=f.f.body.value.trim();if(!t)throw Error('Write a post first.');await navigator.clipboard.writeText(t);msg(f.status,'Copied. Nothing was published.')}catch(err){msg(f.status,err.message,true)}}),
   action('Open X composer',()=>{const t=f.f.body.value.trim();if(t)targetUrl('https://x.com/intent/post?text='+encodeURIComponent(t));else msg(f.status,'Write a post first.',true)}));
  const history=panel(host,'Saved posts','Manual publication receipts are Owner-reported, not X-verified.');
  const list=e('div',undefined,'social-list');history.append(list);
  items(list,store.posts,p=>record(list,p.status.replace(/_/g,' ').toUpperCase(),p.body+(p.planned_at?' · '+parseDate(p.planned_at):'')+(p.external_url?' · '+p.external_url:''),[
    ...(p.status!=='manual_recorded'?[action('Edit',()=>openPost(p))]:[]),
    action('Duplicate to draft',()=>{openPost(null);f.f.body.value=p.body;f.f.campaign.value=p.campaign_id||''}),
    ...(p.external_url?[action('Open recorded URL',()=>targetUrl(p.external_url))]:[])
   ]),'No posts saved.');
  const report=formCard(host,'Record manual publication','Only an approved or planned post may be reported as published. X does not confirm this action.',[
   ['select','post','Approved or planned post',(store.posts||[]).filter(x=>['approved','planned'].includes(x.status)).map(x=>[x.id,x.body.slice(0,70)])],
   ['url','url','Exact @SMFGUAcademy published status URL']
  ],async fields=>{
   const record=(store.posts||[]).find(x=>x.id===fields.post.value);
   if(!record)throw Error('Select an approved post.');
   await call({action:'record_manual_post',id:record.id,version:record.version,externalUrl:fields.url.value.trim()});
  });
  report.f.url.placeholder='https://x.com/SMFGUAcademy/status/123456789';
 }else if(id==='calendar'){
  const card=panel(host,'Publishing calendar','Internal planning only. This calendar does not submit scheduled posts to X.');
  const month=elem('month','calendarMonth','Month'),current=new Date();
  month.input.value=current.getFullYear()+'-'+String(current.getMonth()+1).padStart(2,'0');card.append(month.lab);
  const grid=e('div',undefined,'social-calendar');card.append(grid);
  const paint=()=>{
   grid.replaceChildren();
   const [y,m]=month.input.value.split('-').map(Number);if(!y||!m)return;
   const first=new Date(y,m-1,1),offset=first.getDay(),length=new Date(y,m,0).getDate();
   for(const w of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])text(grid,'div',w,'social-day-head');
   for(let i=0;i<offset;i++)grid.append(e('div',undefined,'social-day-empty'));
   for(let d=1;d<=length;d++){const cell=e('div',undefined,'social-day');
    text(cell,'strong',d);
    for(const p of store.posts||[]){if(!p.planned_at)continue;const when=new Date(p.planned_at);
     if(when.getFullYear()===y&&when.getMonth()===m-1&&when.getDate()===d)
      cell.append(action(p.body.slice(0,28)+' · '+when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),()=>openPost(p)));
    }grid.append(cell)}
  };month.input.addEventListener('change',paint);paint();
  const list=panel(host,'Upcoming planned posts','Chronological Owner calendar; no automatic provider execution.');
  const rows=(store.posts||[]).filter(x=>x.status==='planned').sort((a,b)=>new Date(a.planned_at)-new Date(b.planned_at));
  for(const p of rows)record(list,p.body.slice(0,64),parseDate(p.planned_at),[action('Edit',()=>openPost(p))]);
  if(!rows.length)text(list,'p','No planned posts.','social-description');
 }else if(id==='campaigns'){
  const f=formCard(host,'Campaign manager','First-party promotions remain separate from sponsor billing and paid advertisements.',[
   ['text','title','Campaign title'],['select','category','Category',categoryOptions()],
   ['textarea','objective','Campaign objective'],['url','destinationUrl','Approved landing page (HTTPS)'],
   ['select','state','Status',[['draft','Draft'],['active','Active'],['paused','Paused'],['archived','Archived']]],
   ['datetime-local','startsAt','Start date (optional)'],['datetime-local','endsAt','End date (optional)']
  ],async z=>{
   const payload={action:'save_campaign',title:z.title.value,objective:z.objective.value,category:z.category.value,destinationUrl:z.destinationUrl.value,
    state:z.state.value,startsAt:z.startsAt.value?new Date(z.startsAt.value).toISOString():null,
    endsAt:z.endsAt.value?new Date(z.endsAt.value).toISOString():null};
   if(active.campaign)payload.id=active.campaign.id;await call(payload);
  });
  f.box.append(action('New campaign',()=>{active.campaign=null;f.form.reset()}));
  const list=panel(host,'Saved campaigns','Records here are marketing plans; none initiate paid advertising.');
  for(const c of store.campaigns||[])record(list,c.title,c.category+' · '+c.state+(c.destination_url?' · '+c.destination_url:''),[
   action('Copy campaign tracking link',async()=>{
    if(!c.destination_url)return;
    try{
     const u=new URL(c.destination_url);
     u.searchParams.set('utm_source','x');u.searchParams.set('utm_medium','organic_social');
     u.searchParams.set('utm_campaign',c.category+'_'+c.id.slice(0,8));
     await navigator.clipboard.writeText(u.href);
     alert('Tagged campaign link copied. Attribution requires actual website analytics; this does not count a visit.');
    }catch{alert('Unable to copy a tagged link.')}
   }),
   action('Edit',()=>{active.campaign=c;const z=f.f;z.title.value=c.title;z.category.value=c.category;z.objective.value=c.objective||'';z.destinationUrl.value=c.destination_url||'';z.state.value=c.state;z.startsAt.value=localDate(c.starts_at);z.endsAt.value=localDate(c.ends_at);z.title.focus()}),
   ...(c.destination_url?[action('Open destination',()=>targetUrl(c.destination_url))]:[])
  ]);
 }else if(id==='templates'){
  const f=formCard(host,'Reusable post templates','Approved brand and educational copy can be reused without copying advertising campaign data.',[
   ['text','name','Template name'],['select','category','Category',categoryOptions()],['textarea','body','Template text']
  ],async z=>{const p={action:'save_template',name:z.name.value,category:z.category.value,body:z.body.value};if(active.template)p.id=active.template.id;await call(p)});
  f.f.body.maxLength=280;f.box.append(action('New template',()=>{active.template=null;f.form.reset()}));
  const list=panel(host,'Saved templates','Select Use in post to start an editable draft.');
  for(const t of store.templates||[])record(list,t.name,t.category+' · '+t.body,[
   action('Edit',()=>{active.template=t;f.f.name.value=t.name;f.f.category.value=t.category;f.f.body.value=t.body;f.f.name.focus()}),
   action('Use in post',()=>{openPost(null);active.postsForm.f.body.value=t.body})
  ]);
 }else if(id==='communities'){
  const f=formCard(host,'X Communities directory','Native X joining/request actions are manual. Membership status and rules are Owner-reported.',[
   ['text','name','Community name'],['url','url','Community URL'],
   ['select','membership','Membership state',[['unknown','Unverified'],['not_joined','Not joined'],['requested','Requested'],['joined','Joined (manually recorded)'],['declined','Declined'],['left','Left']]],
   ['select','promotion','Promotional rules',[['unverified','Unverified'],['allowed','Allowed'],['restricted','Restricted'],['prohibited','Prohibited']]],
   ['textarea','notes','Rules and notes']
  ],async z=>{const p={action:'save_community',name:z.name.value,communityUrl:z.url.value,membershipStatus:z.membership.value,
   promotionPolicy:z.promotion.value,notes:z.notes.value};if(active.community)p.id=active.community.id;await call(p)});
  f.f.url.placeholder='https://x.com/i/communities/123456789';f.f.notes.maxLength=2000;
  f.box.append(action('New community',()=>{active.community=null;f.form.reset()}));
  const list=panel(host,'Community register','Promotion is not automatically permitted merely because a community was saved.');
  for(const c of store.communities||[])record(list,c.name,c.membership_status.replace(/_/g,' ')+' · Promotions: '+c.promotion_policy+(c.notes?' · '+c.notes:''),[
   action('Edit',()=>{active.community=c;const z=f.f;z.name.value=c.name;z.url.value=c.community_url;z.membership.value=c.membership_status;z.promotion.value=c.promotion_policy;z.notes.value=c.notes||'';z.name.focus()}),
   action('Open community',()=>targetUrl(c.community_url))
  ]);
 }else if(id==='tasks'){
  const f=formCard(host,'Engagement and follow-up queue','No unsolicited automated replies or external social actions.',[
   ['text','title','Task title'],['select','kind','Task kind',[
    ['follow_up','Follow-up'],['engagement','Engagement'],['community_review','Community review'],['publication_review','Publication review'],['support','Support']]],
   ['select','state','Task status',[['open','Open'],['in_progress','In progress'],['completed','Completed'],['cancelled','Cancelled']]],
   ['datetime-local','dueAt','Due date (optional)'],['url','targetUrl','Reference link (optional)'],['textarea','details','Notes']
  ],async z=>{const p={action:'save_task',title:z.title.value,kind:z.kind.value,state:z.state.value,details:z.details.value,targetUrl:z.targetUrl.value,dueAt:z.dueAt.value?new Date(z.dueAt.value).toISOString():null};if(active.task)p.id=active.task.id;await call(p)});
  f.box.append(action('New task',()=>{active.task=null;f.form.reset()}));
  const list=panel(host,'Assigned work','All entries are Owner-managed; no automated audience engagement occurs.');
  for(const t of store.tasks||[])record(list,t.title,t.kind.replace(/_/g,' ')+' · '+t.state.replace(/_/g,' ')+(t.due_at?' · '+parseDate(t.due_at):'')+(t.details?' · '+t.details:''),[
   action('Edit',()=>{active.task=t;const z=f.f;z.title.value=t.title;z.kind.value=t.kind;z.state.value=t.state;z.dueAt.value=localDate(t.due_at);z.targetUrl.value=t.target_url||'';z.details.value=t.details||'';z.title.focus()}),
   ...(t.target_url?[action('Open reference',()=>targetUrl(t.target_url))]:[])
  ]);
 }else if(id==='metrics'){
  const posts=(store.posts||[]).filter(x=>x.status==='manual_recorded');
  const f=formCard(host,'Manual performance snapshot','Owner-entered observations only. No provider-verified metrics, revenue estimates, or inferred trends.',[
   ['select','postId','Recorded post',posts.map(x=>[x.id,x.body.slice(0,75)])],
   ...['views','likes','replies','reposts','link_clicks'].map(x=>['number',x,x.replace(/_/g,' ')])
  ],async z=>{const p={action:'record_metrics',postId:z.postId.value};
    for(const k of ['views','likes','replies','reposts','link_clicks']){if(z[k].value!=='')p[k]=Number(z[k].value)}
    await call(p);
  });
  for(const k of ['views','likes','replies','reposts','link_clicks']){f.f[k].min='0';f.f[k].step='1'}
  const list=panel(host,'Recorded snapshots','A blank measurement is unavailable; zero means explicitly observed zero.');
  for(const m of store.metrics||[])record(list,'Manual snapshot · '+parseDate(m.observed_at),
   ['Views','Likes','Replies','Reposts','Link clicks'].map((label,i)=>{const v=m[['views','likes','replies','reposts','link_clicks'][i]];return label+': '+(v===null||v===undefined?'Unavailable':v)}).join(' · '),[]);
 }else if(id==='audit'){
  const list=panel(host,'Social administrative history','Transaction-backed audit records. Only metadata is displayed; content and credentials are excluded.');
  for(const a of store.audit||[])record(list,a.action+' · '+a.resource_type,parseDate(a.created_at)+' · '+a.resource_id,[]);
  if(!store.audit?.length)text(list,'p','No activity records.','social-description');
 }
}
async function refresh(){
 try{store=await call();document.querySelector('[data-social-error]')?.remove();active.nav.show(section)}
 catch(err){const host=document.querySelector('.social-workspace');if(!host)return;
  let alert=host.querySelector('[data-social-error]');if(!alert){alert=e('p',undefined,'social-feedback');alert.dataset.socialError='true';host.prepend(alert)}
  msg(alert,err.message,true);
 }
}
function mount(host){
 if(mounted||!host)return;mounted=true;
 const root=e('div',undefined,'social-workspace');host.append(root);
 text(root,'p','@SMFGUAcademy · manual-only · API publishing disabled · spending limit $0','social-connection');
 text(root,'p','Owner-only content, campaigns and community operations. Opening X does not publish; joining a community is performed directly on X.','social-description');
 active.nav=views(root);
 refresh();
}
window.addEventListener('groundup:marketing-social-ready',event=>mount(event.detail?.container));
})();