/* Free Owner social operations: all mutations use /api/admin-social; no X API calls.
 * The X composer handoff is NOT publication. Only manual URL reporting is available.
 */
(()=>{'use strict';
let mounted=false;
const el=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=String(label);if(cls)e.className=cls;return e};
const field=(name,text,type='text')=>{const l=el('label',text);const i=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.name=name;l.append(i);return {label:l,input:i}};
const picker=(name,text,values)=>{const l=el('label',text),s=el('select');s.name=name;for(const [v,t] of values){const o=el('option',t);o.value=v;s.append(o)}l.append(s);return {label:l,input:s}};
const status=(host,message,error=false)=>{host.textContent=message;host.dataset.error=error?'true':'false'};
function validateX(text){const t=text.trim();if(!t||Array.from(t).length>280||t.length>280)throw Error('Enter 1–280 characters for a standard X post.');return t}
async function session(){const sb=await window.getSupabaseClient?.();const s=(await sb?.auth?.getSession?.())?.data?.session?.access_token;if(!s)throw Error('Owner sign-in is required.');return s}
async function call(body){
 const token=await session();
 const response=await fetch('/api/admin-social',{method:body?'POST':'GET',cache:'no-store',
  headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw Error(data.error||'Social management operation failed.');
 return data;
}
function box(title,description){const x=el('section',undefined,'social-card');x.append(el('h3',title),el('p',description,'social-description'));return x}
function action(label,fn){const b=el('button',label,'btn secondary');b.type='button';b.addEventListener('click',fn);return b}
function selectValue(s,v){s.value=v;}
function mount(host){
 if(mounted||!host)return;mounted=true;
 const root=el('div',undefined,'social-workspace');root.append(el('p','X · @SMFGUAcademy · manual-only connection','social-connection'));
 root.append(el('p','This free workspace stores drafts and community records privately. Opening X does not publish a post. No X API or paid service is connected.','social-description'));
 const postCard=box('X Post Studio','Compose, approve and plan posts. Dates are internal planning dates, not automatic X scheduling.');
 const form=el('form',undefined,'social-form'),postField=field('body','Post text','textarea');
 postField.input.maxLength=280;postField.input.required=true;postField.input.rows=5;
 const counter=el('small','0 / 280');postField.input.addEventListener('input',()=>counter.textContent=Array.from(postField.input.value).length+' / 280');
 const postState=picker('state','Internal post status',[['draft','Draft'],['approved','Approved'],['planned','Planned'],['archived','Archived']]);
 const plannedAt=field('plannedAt','Planned local date and time','datetime-local');
 const save=el('button','Save post','btn');save.type='submit';
 const postFeedback=el('p','', 'social-feedback');postFeedback.setAttribute('role','status');
 form.append(postField.label,counter,postState.label,plannedAt.label,save,postFeedback);
 const tools=el('div',undefined,'social-actions');
 tools.append(action('Copy text',async()=>{try{await navigator.clipboard.writeText(validateX(postField.input.value));status(postFeedback,'Text copied. No post was published.');}catch(e){status(postFeedback,e.message||'Clipboard unavailable.',true)}}));
 tools.append(action('Open X composer',()=>{try{const text=validateX(postField.input.value);window.open('https://x.com/intent/post?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');status(postFeedback,'X composer opened. Return here after publishing; no publication was recorded.');}catch(e){status(postFeedback,e.message,true)}}));
 tools.append(action('New draft',()=>{activePost=null;form.reset();counter.textContent='0 / 280';status(postFeedback,'New unsaved draft.');}));
 postCard.append(form,tools);root.append(postCard);
 const history=box('Saved posts','Records are private. A manual publication report is not verified by X.');
 const postList=el('div',undefined,'social-list');
 const report=el('form',undefined,'social-form');
 const reportPost=picker('post','Saved post',[]),reportUrl=field('externalUrl','Published @SMFGUAcademy post URL','url');
 reportUrl.input.placeholder='https://x.com/SMFGUAcademy/status/123456789';
 const reportBtn=el('button','Record manual publication','btn secondary');reportBtn.type='submit';
 const reportFeedback=el('p','', 'social-feedback');reportFeedback.setAttribute('role','status');
 report.append(reportPost.label,reportUrl.label,reportBtn,reportFeedback);history.append(postList,report);root.append(history);
 const community=box('X Communities Directory','Store membership progress and promotional restrictions. Join/request actions occur directly on X.');
 const communityForm=el('form',undefined,'social-form');
 const cName=field('name','Community name'),cUrl=field('url','Community URL','url');
 cUrl.input.placeholder='https://x.com/i/communities/123456789';
 const cMembership=picker('membership','Membership state',[['unknown','Not verified'],['not_joined','Not joined'],['requested','Requested'],['joined','Joined (manually recorded)'],['declined','Declined'],['left','Left']]);
 const cPromotion=picker('promotion','Promotion policy',[['unverified','Unverified'],['allowed','Allowed'],['restricted','Restricted'],['prohibited','Prohibited']]);
 const cNotes=field('notes','Community rules and notes','textarea');cNotes.input.maxLength=2000;cNotes.input.rows=3;
 const communityBtn=el('button','Save community record','btn');communityBtn.type='submit';
 const communityFeedback=el('p','', 'social-feedback');communityFeedback.setAttribute('role','status');
 communityForm.append(cName.label,cUrl.label,cMembership.label,cPromotion.label,cNotes.label,communityBtn,communityFeedback);
 const communityList=el('div',undefined,'social-list');community.append(communityForm,communityList);root.append(community);host.append(root);
 let activePost=null,activeCommunity=null;
 function row(host,title,detail,buttons=[]){const r=el('article',undefined,'social-item'),head=el('strong',title);
  r.append(head,el('p',detail,'social-description'));const actions=el('div',undefined,'social-actions');for(const b of buttons)actions.append(b);r.append(actions);host.append(r);}
 async function reload(){
  try{
   const result=await call();
   postList.replaceChildren();communityList.replaceChildren();reportPost.input.replaceChildren();
   for(const p of result.posts||[]){
    const opt=el('option',(p.body||'').slice(0,58)+' · '+p.status);opt.value=p.id;reportPost.input.append(opt);
    row(postList,p.status.replace(/_/g,' ').toUpperCase(),p.body+(p.planned_at?' · planned '+new Date(p.planned_at).toLocaleString():''),[
     action('Edit',()=>{activePost=p.id;postField.input.value=p.body;selectValue(postState.input,p.status==='manual_recorded'?'draft':p.status);plannedAt.input.value=p.planned_at?new Date(new Date(p.planned_at).getTime()-new Date(p.planned_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';counter.textContent=Array.from(p.body).length+' / 280';postField.input.focus();}),
     ...(p.external_url?[action('Open recorded URL',()=>window.open(p.external_url,'_blank','noopener,noreferrer'))]:[])
    ]);
   }
   if(!(result.posts||[]).length)postList.append(el('p','No saved posts yet.','social-description'));
   for(const c of result.communities||[]){
    row(communityList,c.name,(c.membership_status||'unknown').replace(/_/g,' ')+' · Promotion: '+c.promotion_policy+ (c.notes?' · '+c.notes:''),[
     action('Edit',()=>{activeCommunity=c.id;cName.input.value=c.name;cUrl.input.value=c.community_url;selectValue(cMembership.input,c.membership_status);selectValue(cPromotion.input,c.promotion_policy);cNotes.input.value=c.notes||'';cName.input.focus();}),
     action('Open community',()=>window.open(c.community_url,'_blank','noopener,noreferrer'))
    ]);
   }
   if(!(result.communities||[]).length)communityList.append(el('p','No community records yet.','social-description'));
  }catch(e){postList.replaceChildren(el('p','Unable to load saved posts: '+e.message,'social-error'));communityList.replaceChildren(el('p','Community records are unavailable.','social-error'));}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();save.disabled=true;status(postFeedback,'Saving…');
  try{const body=validateX(postField.input.value),st=postState.input.value;
   const payload={action:'save_post',body,status:st};
   if(activePost)payload.id=activePost;
   if(st==='planned'){if(!plannedAt.input.value)throw Error('Select a planned date and time.');payload.plannedAt=new Date(plannedAt.input.value).toISOString()}
   const r=await call(payload);activePost=r.record.id;status(postFeedback,'Saved privately. Nothing was published.');await reload();
  }catch(err){status(postFeedback,err.message,true)}finally{save.disabled=false}
 });
 report.addEventListener('submit',async e=>{e.preventDefault();reportBtn.disabled=true;
  try{if(!reportPost.input.value)throw Error('Save a post first.');await call({action:'record_manual_post',id:reportPost.input.value,externalUrl:reportUrl.input.value.trim()});status(reportFeedback,'Manual publication URL recorded. Not independently verified by X.');await reload();}
  catch(err){status(reportFeedback,err.message,true)}finally{reportBtn.disabled=false}
 });
 communityForm.addEventListener('submit',async e=>{e.preventDefault();communityBtn.disabled=true;
  try{const payload={action:'save_community',name:cName.input.value,communityUrl:cUrl.input.value,membershipStatus:cMembership.input.value,promotionPolicy:cPromotion.input.value,notes:cNotes.input.value};
   if(activeCommunity)payload.id=activeCommunity;const r=await call(payload);activeCommunity=r.record.id;status(communityFeedback,'Community record saved. No membership action was taken.');await reload();}
  catch(err){status(communityFeedback,err.message,true)}finally{communityBtn.disabled=false}
 });
 reload();
}
window.addEventListener('groundup:marketing-social-ready',e=>mount(e.detail?.container));
})();