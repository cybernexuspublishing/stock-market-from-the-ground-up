async function loadProfilePage(){
  const sb=await window.getSupabaseClient();
  const gate=document.getElementById('profile-gate');
  const content=document.getElementById('profile-content');
  if(!sb)return;
  const {data:{user}}=await sb.auth.getUser();
  if(!user){gate.innerHTML='<div class="notice">Sign in to view your profile. <a href="signin.html?next=/account.html">Sign in</a></div>';return}
  const {data:profile}=await sb.from('profiles').select('username,created_at,session_timeout_minutes').eq('id',user.id).maybeSingle();
  const {data:ents}=await sb.from('entitlements').select('status,product_key,ends_at').eq('user_id',user.id).in('status',['active','trialing']).limit(1);
  document.getElementById('profile-username').textContent=profile?.username?`@${profile.username}`:'Legacy account — username required';
  document.getElementById('profile-email').textContent=user.email||'';
  document.getElementById('profile-member-since').textContent=profile?.created_at?new Date(profile.created_at).toLocaleDateString():'—';
  const active=(ents||[]).find(e=>!e.ends_at||new Date(e.ends_at).getTime()>Date.now());
  document.getElementById('profile-membership').textContent=active?(active.status==='trialing'?'Learning Member — Trial':'Learning Member'):'Free Reader';
  if(!profile?.username) document.getElementById('username-warning').hidden=false;
  const aiPreference=document.getElementById('profile-tutor-ai-enabled');
  if(aiPreference){
    aiPreference.checked=user.user_metadata?.market_tutor_ai_enabled!==false;
    aiPreference.addEventListener('change',async()=>{
      const requested=aiPreference.checked,status=document.getElementById('profile-tutor-ai-status');
      aiPreference.disabled=true;
      if(status)status.textContent='Saving your Tutor preference…';
      try{
        const {error}=await sb.auth.updateUser({data:{market_tutor_ai_enabled:requested}});
        if(error)throw error;
        if(status)status.textContent='Market Tutor preference saved.';
      }catch(err){
        aiPreference.checked=!requested;
        if(status)status.textContent=err?.message||'Could not save your preference. Please try again.';
      }finally{aiPreference.disabled=false}
    });
  }
  gate.innerHTML=''; content.hidden=false;
}
async function profileSignOut(){
  const sb=await window.getSupabaseClient(); if(sb)await sb.auth.signOut({scope:'local'}); window.SiteSession?.clearSessionClock(); location.href='signin.html';
}
document.addEventListener('DOMContentLoaded',loadProfilePage);
