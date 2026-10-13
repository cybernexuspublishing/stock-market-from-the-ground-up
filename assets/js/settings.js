function settingsMessage(text,type=''){
  const e=document.getElementById('settings-message');
  if(!e)return;
  e.className=`inline-status ${type}`;
  e.textContent=text||'';
}
function bookKeyMessage(text,type=''){
  const e=document.getElementById('book-key-message');
  if(!e)return;
  e.className=`inline-status ${type}`;
  e.textContent=text||'';
}
function formatDate(value){
  if(!value)return '';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString();
}
async function loadRedeemedBookKeys(sb){
  const target=document.getElementById('redeemed-book-keys');
  if(!target)return;
  const {data,error}=await sb.rpc('my_book_key_redemptions');
  if(error){
    target.textContent='Unable to load redeemed Book Keys right now.';
    return;
  }
  if(!data?.length){
    target.innerHTML='<strong>Redeemed Book Keys:</strong> None yet.';
    return;
  }
  const items=data.map(r=>{
    const end=r.access_ends_at?` — access through ${formatDate(r.access_ends_at)}`:'';
    return `<li><strong>${escapeHtml(r.book_label||r.book_code||'Book')}</strong>${end}</li>`;
  }).join('');
  target.innerHTML=`<strong>Redeemed Book Keys:</strong><ul class="compact-list">${items}</ul>`;
}
function escapeHtml(value){
  return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
async function loadSettings(){
  const sb=await window.getSupabaseClient();
  const gate=document.getElementById('settings-gate');
  const form=document.getElementById('settings-form');
  const {data:{user}}=await sb.auth.getUser();
  if(!user){
    gate.innerHTML='<div class="notice">Sign in to change settings. <a href="signin.html?next=/settings.html">Sign in</a></div>';
    return;
  }
  const {data:p,error}=await sb.from('profiles').select('username,session_timeout_minutes').eq('id',user.id).single();
  if(error){gate.textContent=error.message;return}
  const username=document.getElementById('settings-username');
  username.value=p.username||'Account migration required';
  username.readOnly=true;
  if(!p.username){
    document.getElementById('username-help').textContent='This legacy test account predates required usernames. Contact the site administrator to assign an account username.';
  }
  const timeoutSelect=document.getElementById('session-timeout');
  if(timeoutSelect)timeoutSelect.value=String(p.session_timeout_minutes||30);
  gate.innerHTML='';
  form.hidden=false;
  await loadRedeemedBookKeys(sb);
}
async function saveSettings(e){
  e?.preventDefault();
  settingsMessage('Saving…');
  const sb=await window.getSupabaseClient();
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return;
  const timeout=Number(document.getElementById('session-timeout')?.value||30);
  const {error}=await sb.from('profiles').update({session_timeout_minutes:timeout}).eq('id',user.id);
  if(error)return settingsMessage(error.message,'error');
  window.SiteSession?.setTimeoutMinutes(timeout);
  settingsMessage('Settings saved.','success');
}
async function submitBookKey(){
  const input=document.getElementById('settings-book-key');
  const button=document.getElementById('submit-book-key');
  const candidate=String(input?.value||'').trim();
  if(!candidate)return bookKeyMessage('Enter a Book Key before selecting Submit Key.','error');
  const sb=await window.getSupabaseClient();
  if(!sb)return bookKeyMessage('Account service is unavailable.','error');
  if(button){button.disabled=true;button.textContent='Checking Key…'}
  bookKeyMessage('Checking Book Key…');
  try{
    const {data,error}=await sb.rpc('redeem_book_key',{candidate});
    if(error)throw error;
    const result=data||{};
    if(result.status==='accepted'){
      input.value='';
      const end=result.access_ends_at?` Full Learning Access is available through ${formatDate(result.access_ends_at)}.`:'';
      bookKeyMessage(`${result.book_label||'Book'} key accepted. 30 days of Full Learning Access were added.${end}`,'success');
      await loadRedeemedBookKeys(sb);
      return;
    }
    if(result.status==='already_redeemed'){
      return bookKeyMessage('A Book Key for this book has already been used on this account. The same book cannot be redeemed again.','error');
    }
    if(result.status==='active_paid_membership'){
      return bookKeyMessage('This account currently has an active paid membership. Save the Book Key and redeem it after that membership ends.','error');
    }
    bookKeyMessage('Book Key not recognized, expired, inactive, or no longer available.','error');
  }catch(err){
    bookKeyMessage(err.message||'Unable to submit the Book Key.','error');
  }finally{
    if(button){button.disabled=false;button.textContent='Submit Key'}
  }
}
document.addEventListener('DOMContentLoaded',loadSettings);
