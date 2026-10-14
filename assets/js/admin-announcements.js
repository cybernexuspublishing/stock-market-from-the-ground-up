/* v0.14.0.11 Owner-only Site Announcements administration.
 * Uses the existing protected admin-v013 contract and site_announcements table.
 * This module does not modify sidebar/navigation or interfere with other panels. */
(()=>{'use strict';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toLocal=iso=>{if(!iso)return '';const dt=new Date(iso);if(Number.isNaN(dt.getTime()))return '';const local=new Date(dt.getTime()-dt.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)};
const friendly=iso=>iso?new Date(iso).toLocaleString():'No limit';
const validId=n=>Number.isSafeInteger(Number(n))&&Number(n)>0;
const payload=(form,id)=>{
 const v=new FormData(form),start=String(v.get('startsAt')||''),end=String(v.get('endsAt')||''),expirationMode=String(v.get('expirationMode')||'none');
 if(expirationMode==='date'&&!end)throw Error('Enter an expiration date or choose No expiration.');
 if(expirationMode==='date'&&start&&new Date(end)<=new Date(start))throw Error('End must be after start.');
 return {id, title:String(v.get('title')||'').trim(),body:String(v.get('body')||'').trim(),announcementType:v.get('announcementType'),audience:v.get('audience'),startsAt:start?new Date(start).toISOString():null,endsAt:expirationMode==='date'?new Date(end).toISOString():null,expirationMode,durationAmount:expirationMode==='duration'?Number(v.get('durationAmount')):null,durationUnit:v.get('durationUnit'),dismissible:v.get('dismissible')==='on',active:v.get('active')==='on'};
};
const state=record=>{
 if(!record.active)return 'Disabled';const now=Date.now();
 if(record.starts_at&&Date.parse(record.starts_at)>now)return 'Scheduled';
 if(record.ends_at&&Date.parse(record.ends_at)<=now)return 'Expired';
 return 'Displaying';
};
async function render(host,{api,adminApi}){
 if(!host)return;
 const result=await api('/api/admin-v013?action=announcements');
 const entries=Array.isArray(result.announcements)?result.announcements:[];
 host.innerHTML=`<div class="v01411-announcements"><div class="v01411-ann-head"><div><h2>Site Announcements</h2><p>Create, schedule, edit, disable or permanently delete an announcement. Time limits are evaluated by the server.</p></div><button type="button" class="btn" data-create>New Announcement</button></div><div data-editor></div><div data-list class="v01411-ann-list"></div><p data-status role="status" aria-live="polite"></p></div>`;
 const status=host.querySelector('[data-status]'),list=host.querySelector('[data-list]'),area=host.querySelector('[data-editor]');
 const toast=message=>{status.textContent=message};
 const showForm=(row)=>{
  const editing=!!row;
  area.innerHTML=`<form class="v01411-ann-editor"><h3>${editing?'Edit Announcement':'Create Announcement'}</h3><div class="v01411-ann-grid"><label>Title<input name="title" maxlength="180" required value="${escapeHtml(row?.title||'')}"></label><label>Type<select name="announcementType">${['info','maintenance','release','urgent'].map(t=>`<option value="${t}" ${row?.announcement_type===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}</select></label><label>Audience<select name="audience"><option value="all" ${!row||row.audience==='all'?'selected':''}>All visitors</option><option value="members" ${row?.audience==='members'?'selected':''}>Signed-in members</option></select></label><label>Starts at (local time)<input type="datetime-local" name="startsAt" value="${escapeHtml(toLocal(row?.starts_at))}"></label><label>Expiration rule<select name="expirationMode"><option value="none" ${!row?.ends_at?'selected':''}>No expiration</option><option value="date" ${row?.ends_at?'selected':''}>Specific date and time</option><option value="duration">After a duration</option></select></label><label data-expiration-date>Expires at (local time)<input type="datetime-local" name="endsAt" value="${escapeHtml(toLocal(row?.ends_at))}"></label><div class="v01414-duration" data-expiration-duration hidden><label>Duration<input name="durationAmount" type="number" min="1" max="525600" step="1" value="30"></label><label>Unit<select name="durationUnit"><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select></label></div><label class="v01411-ann-check"><input name="active" type="checkbox" ${!row||row.active?'checked':''}> Enabled</label><label class="v01411-ann-check"><input name="dismissible" type="checkbox" ${!row||row.dismissible?'checked':''}> Visitors can dismiss</label><label class="v01411-ann-full">Announcement message<textarea name="body" rows="5" maxlength="8000" required>${escapeHtml(row?.body||'')}</textarea></label></div><div class="v01414-ann-preview" role="status" aria-live="polite"><strong>Announcement preview</strong><div data-preview-title></div><p data-preview-body></p><small data-preview-expiry></small></div><div class="actions"><button type="submit" class="btn">${editing?'Save Changes':'Create Announcement'}</button><button type="button" class="btn secondary" data-cancel>Cancel</button></div></form>`;
  const form=area.querySelector('form');form.querySelector('[data-cancel]').onclick=()=>area.replaceChildren();
  const sync=()=>{
   const mode=form.elements.expirationMode.value;
   form.querySelector('[data-expiration-date]').hidden=mode!=='date';
   form.querySelector('[data-expiration-duration]').hidden=mode!=='duration';
   form.elements.endsAt.required=mode==='date';
   form.elements.durationAmount.required=mode==='duration';
   form.querySelector('[data-preview-title]').textContent=form.elements.title.value||'Untitled announcement';
   form.querySelector('[data-preview-body]').textContent=form.elements.body.value||'Your announcement text will appear here.';
   const start=form.elements.startsAt.value,expiry=form.elements.endsAt.value;
   const amt=Number(form.elements.durationAmount.value),unit=form.elements.durationUnit.value;
   const millis={minutes:60000,hours:3600000,days:86400000}[unit];
   const ending=mode==='none'?'No expiration':mode==='date'?(expiry?new Date(expiry).toLocaleString():'Enter an end date'):(Number.isSafeInteger(amt)&&amt>0&&amt*millis<=365*86400000?new Date((start?new Date(start).getTime():Date.now())+amt*millis).toLocaleString():'Enter a valid duration (maximum 365 days)');
   form.querySelector('[data-preview-expiry]').textContent='Display ends: '+ending;
  };
  form.addEventListener('input',sync);form.addEventListener('change',sync);sync();
  form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;
   try{await adminApi('announcement_save',payload(form,editing?row.id:null));await render(host,{api,adminApi});host.querySelector('[data-status]').textContent='Announcement saved. Scheduled notices display only during their active window.'}catch(e){toast(e.message);submit.disabled=false}
  };
  form.querySelector('input[name=title]').focus();
 };
 host.querySelector('[data-create]').onclick=()=>showForm(null);
 if(!entries.length){list.innerHTML='<p>No announcements exist. Create your first announcement above.</p>';return}
 entries.forEach(row=>{
  const item=document.createElement('article');item.className='v01411-ann-item';
  const headline=document.createElement('div');const h=document.createElement('h3');h.textContent=row.title;const badge=document.createElement('span');badge.className='v01411-ann-badge';badge.textContent=state(row);headline.className='v01411-ann-headline';headline.append(h,badge);
  const body=document.createElement('p');body.textContent=row.body;
  const dates=document.createElement('p');dates.className='small';dates.textContent=`${row.audience==='members'?'Members':'Everyone'} · Starts: ${friendly(row.starts_at)} · Ends: ${friendly(row.ends_at)}`;
  const actions=document.createElement('div');actions.className='actions';
  const makeButton=(text,cls,callback)=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',callback);actions.append(b)};
  makeButton('Edit','btn secondary',()=>showForm(row));
  makeButton(row.active?'Disable':'Enable','btn secondary',async()=>{try{await adminApi('announcement_save',{id:row.id,title:row.title,body:row.body,announcementType:row.announcement_type,audience:row.audience,startsAt:row.starts_at,endsAt:row.ends_at,dismissible:row.dismissible,active:!row.active});await render(host,{api,adminApi})}catch(e){toast(e.message)}});
  if(validId(row.id))makeButton('Delete Permanently','btn secondary',async()=>{if(!confirm(`Permanently delete “${row.title}”? This cannot be undone.`))return;try{await adminApi('announcement_delete',{id:row.id,confirmation:'DELETE ANNOUNCEMENT'});await render(host,{api,adminApi})}catch(e){toast(e.message)}});
  item.append(headline,body,dates,actions);list.append(item);
 });
}
window.SiteAnnouncementEditor={render};
})();
