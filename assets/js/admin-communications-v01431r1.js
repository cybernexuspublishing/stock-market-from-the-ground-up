/* v31 R1 communications: one new Admin workspace, existing member notifications. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const q=(s,r=document)=>r.querySelector(s),E=(t,text,cls)=>{const x=document.createElement(t);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
let state=null,loading=false;
async function rpc(name,args){const sb=await window.getSupabaseClient(),r=await sb.rpc(name,args||{});if(r.error)throw Error(r.error.message||'Permission denied');if(!r.data?.ok)throw Error('Server rejected request');return r.data}
const panel=()=>q('#gu-communications-v01431r1');
function show(){const p=panel();if(!p)return;document.querySelectorAll('#admin-app .admin-panel').forEach(n=>n.classList.remove('active'));document.querySelectorAll('#admin-tabs button').forEach(n=>n.classList.remove('active'));
 p.classList.add('active');q('#gu-communications-nav')?.classList.add('active');history.replaceState(null,'','#communications');void refresh()}
async function refresh(){if(loading)return;loading=true;const p=panel(),host=q('[data-gu-comms-body]',p);host.replaceChildren(E('p','Loading authorized communication settings…'));
 try{state=await rpc('gu_staff_console_v01431r1');host.replaceChildren();
 const editor=E('article',undefined,'admin-card'),h=E('h2','Message an Individual Member');editor.append(h,E('p','Messages go to the selected username’s existing in-app notification inbox. They are not email or private chat. Billing and security notices remain system-managed.'));
 const channel=state.role==='OWNER'?'communications.owner_member_notices_enabled':'communications.admin_member_notices_enabled';
 const allowed=state.settings[channel]===true;
 if(!allowed)editor.append(E('p','Direct member notices are disabled for your role by the Owner.','gu-control-warning'));
 const form=E('form'),label=(txt,control)=>{const l=E('label',txt);l.append(control);return l};form.className='gu-comms-form';
 const select=E('select');select.name='recipient';select.required=true;select.append(new Option('Select username…',''));
 for(const x of state.members||[]){if(x.username)select.append(new Option('@'+x.username,x.username))}
 const title=E('input');title.required=true;title.maxLength=150;title.minLength=3;const body=E('textarea');body.required=true;body.maxLength=2000;body.minLength=5;body.rows=5;
 const href=E('input');href.placeholder='/dashboard.html';href.maxLength=250;
 const send=E('button','Send In-App Message','btn');send.type='submit';send.disabled=!allowed;
 const feedback=E('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 form.append(label('Recipient username',select),label('Subject',title),label('Message',body),label('Internal link (optional)',href),send,feedback);editor.append(form);host.append(editor);
 form.addEventListener('submit',async ev=>{ev.preventDefault();if(!allowed)return;send.disabled=true;feedback.textContent='Sending…';try{await rpc('gu_staff_send_notice_v01431r1',{p_username:select.value,p_title:title.value,p_body:body.value,p_href:href.value||null});feedback.textContent='Message sent and audited. Refresh to review recent messages.';body.value='';title.value=''}catch(e){feedback.textContent=e.message}finally{send.disabled=false}});
 if(window.__guRecipientUsername){select.value=window.__guRecipientUsername;window.__guRecipientUsername=null;select.focus()}
 const history=E('article',undefined,'admin-card');history.append(E('h2','Recent Member Messages'));
 if(!(state.notices||[]).length)history.append(E('p','No matching sent notices.'));
 for(const n of state.notices||[]){const a=E('div',undefined,'gu-comms-note');a.append(E('strong','To @'+(n.username||'Unavailable')+' — '+n.title),E('p',n.body),E('small','Sent by @'+(n.sentBy||'Staff')+' · '+(n.createdAt?new Date(n.createdAt).toLocaleString():'—')));history.append(a)}host.append(history);
 const controls=E('article',undefined,'admin-card');controls.append(E('h2','Permissions & Operational Toggles'),E('p','Enable/disable controls are enforced by database functions, not only by hiding interface elements. Changes require OWNER password confirmation.'));
 const mapping=[['communications.owner_member_notices_enabled','OWNER → member messages','In-app individual notices only.'],['communications.admin_member_notices_enabled','ADMIN → member messages','Default disabled until explicitly approved.'],['commerce.admin_shipping_address_access_enabled','ADMIN shipping-address access','Allows qualified ADMIN staff with recent password confirmation to view paid signed-book delivery addresses; OWNER access remains.'],['site.registration_enabled','Website registration visibility','Website signup screen only. Supabase Auth provider settings must ALSO be changed to block API registration.'],['commerce.checkout_enabled','Lemon Squeezy — memberships and eBooks','Requires existing ENABLE_PAID_CHECKOUT server flag, active product variants, successful signed webhook tests and digital rights validation.'],['commerce.signed_books_checkout_enabled','Stripe — signed physical editions','OPTIONAL, disabled by default; also requires ENABLE_SIGNED_BOOK_STRIPE server flag, configured tax/shipping, and completed physical-payment test acceptance.']];
 for(const [key,name,description] of mapping){const wrap=E('div',undefined,'gu-setting-row');const label=E('label');const ck=E('input');ck.type='checkbox';ck.checked=state.settings[key]===true;ck.disabled=state.role!=='OWNER';label.append(ck,document.createTextNode(' '+name));const note=E('small',description),btn=E('button','Save','btn secondary'),status=E('span');status.setAttribute('role','status');btn.type='button';btn.disabled=state.role!=='OWNER';btn.onclick=async()=>{btn.disabled=true;try{await rpc('gu_owner_operations_save_v01431r1',{p_key:key,p_enabled:ck.checked});status.textContent=' Saved & audited.';state.settings[key]=ck.checked}catch(e){status.textContent=' '+e.message}finally{btn.disabled=false}};wrap.append(label,note,btn,status);controls.append(wrap)}
 controls.append(E('p','Password complexity, signup confirmation, staff password confirmation, and session policy cannot be truthfully enabled just by switching a website setting; configure and verify Supabase Auth separately.','gu-control-warning'));
 if(state.role==='OWNER')host.append(controls);else host.append(E('p','OWNER controls member-messaging and shipping access for ADMIN roles.'));
 }catch(e){
   const msg=String(e?.message||'Unavailable');
   const box=E('div',undefined,'gu-control-warning');
   if(/ELIGIBLE_STAFF_ROLE_REQUIRED|AUTHORIZED_STAFF_REQUIRED/i.test(msg)){
     box.append(E('p','An active OWNER or ADMIN role and eligible member account are required; mandatory MFA is not required. Check account status and staff role.'));
   }else{box.append(E('p','Communications unavailable: '+msg))}
   host.replaceChildren(box);
 }finally{loading=false}
}
function mount(){const app=q('#admin-app'),nav=q('#admin-tabs');if(!app||!nav||app.hidden||!q('#admin-gate')?.hidden)return false;
 if(!panel()){const p=E('section',undefined,'admin-panel');p.id='gu-communications-v01431r1';p.dataset.guCommunications='1';p.append(E('div',undefined,'admin-heading'));p.firstChild.append(E('h1','Communications & Member Messages'),E('p','Individual member notices, delivery history and Owner-controlled communication policies.'));
 const actions=E('div',undefined,'gu-comms-actions');const refreshButton=E('button','Refresh Communications','btn secondary');refreshButton.type='button';refreshButton.onclick=refresh;actions.append(refreshButton);p.append(actions);const body=E('div');body.dataset.guCommsBody='1';p.append(body);app.append(p)}
 if(!q('#gu-communications-nav')){const b=E('button','Communications & Messages');b.id='gu-communications-nav';b.type='button';b.addEventListener('click',show);nav.append(b)}
 if(location.hash==='#communications'&&!panel().classList.contains('active'))setTimeout(show,150);
 return true;
}
window.GroundUpMemberComms=Object.freeze({openForUsername(username){window.__guRecipientUsername=String(username||'');show()},open:show});
let count=0;const timer=setInterval(()=>{if(mount()||++count>120)clearInterval(timer)},250);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
