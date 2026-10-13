async function updatePassword(e){
  e?.preventDefault();
  const p=document.getElementById('new-password').value;
  const c=document.getElementById('new-password-confirm').value;
  const msg=document.getElementById('password-message');
  if(p.length<8){msg.textContent='Password must be at least 8 characters.';return}
  if(p!==c){msg.textContent='Passwords do not match.';return}
  const sb=await window.getSupabaseClient();
  const {error}=await sb.auth.updateUser({password:p});
  if(error){msg.textContent=error.message;return}
  msg.textContent='Password updated. You can continue to your dashboard.';
}
