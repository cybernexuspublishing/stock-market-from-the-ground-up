/* v0.13.4.2 — inactivity measured before recording page-load activity. */
const SESSION_KEYS={
  started:'groundup_session_started_at',
  activity:'groundup_last_activity_at',
  timeout:'groundup_session_timeout_minutes'
};
const clampTimeout=v=>[15,30,60,240,480,1440].includes(Number(v))?Number(v):30;
let cachedTimeoutMinutes=clampTimeout(localStorage.getItem(SESSION_KEYS.timeout)||30);
let timeoutCheckInFlight=null;
function nowMs(){return Date.now()}
function markActivity(force=false){
  const now=nowMs(),previous=Number(localStorage.getItem(SESSION_KEYS.activity)||0);
  if(force||now-previous>30000)localStorage.setItem(SESSION_KEYS.activity,String(now));
}
function clearSessionClock(){localStorage.removeItem(SESSION_KEYS.started);localStorage.removeItem(SESSION_KEYS.activity)}
function startSessionClock(){
  if(!localStorage.getItem(SESSION_KEYS.started))localStorage.setItem(SESSION_KEYS.started,String(nowMs()));
  markActivity(true);
}
function setTimeoutMinutes(minutes){
  cachedTimeoutMinutes=clampTimeout(minutes);
  localStorage.setItem(SESSION_KEYS.timeout,String(cachedTimeoutMinutes));
}
async function loadTimeoutPreference(sb,user){
  if(!user)return cachedTimeoutMinutes;
  try{
    const {data}=await sb.from('profiles').select('session_timeout_minutes').eq('id',user.id).maybeSingle();
    if(data?.session_timeout_minutes)setTimeoutMinutes(data.session_timeout_minutes);
  }catch{}
  return cachedTimeoutMinutes;
}
async function checkSessionTimeout(){
  if(timeoutCheckInFlight)return timeoutCheckInFlight;
  timeoutCheckInFlight=(async()=>{
    const sb=await window.getSupabaseClient?.();
    if(!sb)return false;
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user){clearSessionClock();return false}
    const started=Number(localStorage.getItem(SESSION_KEYS.started)||0);
    const previous=Number(localStorage.getItem(SESSION_KEYS.activity)||started);
    // Respect saved timeout on initial load, before recording new activity.
    if(previous&&nowMs()-previous>=cachedTimeoutMinutes*60000){
      await sb.auth.signOut({scope:'local'});
      clearSessionClock();
      window.dispatchEvent(new CustomEvent('site:session-expired'));
      if(document.body?.dataset.authRequired==='true'){
        const next=encodeURIComponent(location.pathname+location.search+location.hash);
        location.replace('/signin.html?expired=1&next='+next);
      }
      return false;
    }
    if(!started)localStorage.setItem(SESSION_KEYS.started,String(nowMs()));
    if(!previous)localStorage.setItem(SESSION_KEYS.activity,String(nowMs()));
    return true;
  })().finally(()=>{timeoutCheckInFlight=null});
  return timeoutCheckInFlight;
}
async function initializeSessionManager(){
  const sb=await window.getSupabaseClient?.();
  if(!sb)return;
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session){
      // A new login begins a fresh clock; background token refresh does not reset inactivity.
      if(!localStorage.getItem(SESSION_KEYS.started))startSessionClock();
    }
    if(event==='SIGNED_OUT')clearSessionClock();
  });
  const valid=await checkSessionTimeout();
  if(!valid)return;
  const {data:{user}}=await sb.auth.getUser();
  if(user){
    await loadTimeoutPreference(sb,user);
    if(!await checkSessionTimeout())return;
  }
  ['pointerdown','keydown','touchstart','scroll'].forEach(evt=>addEventListener(evt,()=>markActivity(false),{passive:true}));
  document.addEventListener('visibilitychange',async()=>{
    if(!document.hidden&&await checkSessionTimeout())markActivity(false);
  });
  setInterval(checkSessionTimeout,30000);
}
window.SiteSession={startSessionClock,clearSessionClock,checkSessionTimeout,setTimeoutMinutes};
document.addEventListener('DOMContentLoaded',initializeSessionManager);
