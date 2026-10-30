function signupMessage(text, type=''){
  const el=document.getElementById('signup-message');
  if(!el)return;
  el.className=`inline-status ${type}`;
  el.textContent=text||'';
}
function setFieldStatus(id,text,state=''){
  const el=document.getElementById(id);
  if(!el)return;
  el.className=`field-status small ${state}`.trim();
  el.textContent=text||'';
}
function normalizeUsername(v){
  const raw=String(v||'').trim();
  if(!raw)return '';
  return raw.charAt(0).toUpperCase()+raw.slice(1);
}
function normalizeEmail(v){return String(v||'').trim().toLowerCase()}
function validUsername(v){return /^[A-Z][A-Za-z0-9_]{2,23}$/.test(v)}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}

async function usernameAvailable(username){
  const sb=await window.getSupabaseClient();
  if(!sb) throw new Error('Account service is unavailable.');
  const {data,error}=await sb.rpc('username_is_available',{candidate:username});
  if(error) throw error;
  return data===true;
}
async function emailAvailable(email){
  const sb=await window.getSupabaseClient();
  if(!sb) throw new Error('Account service is unavailable.');
  const {data,error}=await sb.rpc('email_is_available',{candidate:email});
  if(error) throw error;
  return data===true;
}
async function prepareBookKeyClaim(bookKey){
  const sb=await window.getSupabaseClient();
  if(!sb) throw new Error('Account service is unavailable.');
  const {data,error}=await sb.rpc('prepare_book_key_claim',{candidate:bookKey});
  if(error) throw error;
  return data||null;
}
function showAccountCreated(email,bookTrial){
  const formCard=document.getElementById('create-account-card');
  const panel=document.getElementById('account-created-panel');
  const emailEl=document.getElementById('account-created-email');
  const accessEl=document.getElementById('account-created-access');
  const title=document.getElementById('signup-page-title');
  const intro=document.getElementById('signup-page-intro');
  if(emailEl) emailEl.textContent=email;
  if(title) title.textContent='Account Created';
  if(intro) intro.textContent='Please check your email to verify your account before signing in.';
  if(accessEl){
    accessEl.textContent=bookTrial
      ? 'Book key accepted. Thirty days of Full Learning Access will activate when you verify your email.'
      : 'Confirm your email address to finish registration. Book-specific Free benefits require a Support ticket with your purchase receipt attached.';
  }
  if(formCard) formCard.hidden=true;
  if(panel){
    panel.hidden=false;
    panel.setAttribute('tabindex','-1');
    panel.focus();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

async function createAccount(e){
  e?.preventDefault();
  const form=document.getElementById('create-account-form');
  const submit=form?.querySelector('button[type="submit"]');
  const usernameInput=document.getElementById('signup-username');
  const emailInput=document.getElementById('signup-email');
  const username=normalizeUsername(usernameInput?.value);
  const email=normalizeEmail(emailInput?.value);
  const password=document.getElementById('signup-password')?.value||'';
  const confirm=document.getElementById('signup-password-confirm')?.value||'';
  const bookKey=document.getElementById('signup-book-key')?.value.trim()||'';
  const terms=document.getElementById('signup-terms')?.checked===true;
  const gender=document.getElementById('signup-gender')?.value||'rather_not_say';
  const firstName=document.getElementById('signup-first-name')?.value.trim()||'';
  const lastName=document.getElementById('signup-last-name')?.value.trim()||'';
  const dobInput=document.getElementById('signup-dob');
  const dobResult=window.SignupDOB?.normalize(dobInput?.value||'');
  const dateOfBirth=dobResult?.value||'';
  let sentToServer=false;

  if(usernameInput) usernameInput.value=username;
  signupMessage('');
  if(!firstName||!lastName)return signupMessage('Enter your first and last name.','error');
  if(!dobResult?.ok){
    setFieldStatus('signup-dob-status',dobResult?.message||'Enter your date of birth as DD/MM/YYYY.','unavailable');
    return signupMessage(dobResult?.message||'Enter a valid date of birth.','error');
  }
  if(dobInput)dobInput.value=dateOfBirth;
  if(dobResult.message)setFieldStatus('signup-dob-status',dobResult.message);
  if(!validUsername(username)){
    setFieldStatus('username-availability','Username must be 3–24 characters, begin with a letter, and use only letters, numbers, or underscores.','unavailable');
    return signupMessage('Please correct the username.', 'error');
  }
  if(!validEmail(email)){
    setFieldStatus('email-availability','Enter a valid email address.','unavailable');
    return signupMessage('Please enter a valid email address.', 'error');
  }
  if(!(password.length>=12&&password.length<=120&&/[A-Z]/.test(password)&&/[a-z]/.test(password)&&/[!@#$%^&*+_?]/.test(password)))return signupMessage('Password must be 12–120 characters with uppercase, lowercase and a symbol (!@#$%^&*+_?).', 'error');
  if(password!==confirm){
    setFieldStatus('password-match-status','Passwords do not match.','unavailable');
    return signupMessage('Passwords do not match.', 'error');
  }
  if(!terms) return signupMessage('You must agree to the Terms and Community Guidelines.', 'error');

  if(submit){submit.disabled=true;submit.textContent='Checking account details…'}
  try{
    const [usernameFree,emailFree]=await Promise.all([
      usernameAvailable(username),
      emailAvailable(email)
    ]);
    if(!usernameFree){
      setFieldStatus('username-availability','Username already in use. Choose another username.','unavailable');
      return signupMessage('Choose a different username.', 'error');
    }
    setFieldStatus('username-availability','Username available.','available');
    if(!emailFree){
      setFieldStatus('email-availability','Email already in use. Sign in or reset your password.','unavailable');
      return signupMessage('That email address already belongs to an account.', 'error');
    }
    setFieldStatus('email-availability','Email available. You will verify ownership by email.','available');

    let claimToken=null;
    if(bookKey){
      setFieldStatus('book-key-status','Checking Book Key…');
      claimToken=await prepareBookKeyClaim(bookKey);
      if(!claimToken){
        setFieldStatus('book-key-status','Book Key not recognized, expired, or no longer available.','unavailable');
        return signupMessage('Remove the Book Key or enter a valid Book Key to continue.', 'error');
      }
      setFieldStatus('book-key-status','Book Key accepted. Thirty days of Full Learning Access will activate after email verification. Each book uses a different key, and the same book can be redeemed only once per account.','available');
    }else{
      setFieldStatus('book-key-status','Book Key redemption is optional. For purchased-book Free access, submit your receipt in an account Support ticket after signing in.');
    }

    // The server enforces date-of-birth eligibility before Supabase creates an account.
    // Forward the existing one-time CAPTCHA token to Supabase for native verification.
    const captchaToken=window.GroundUpTurnstile?.getToken?.()||null;
    if(submit) submit.textContent='Creating account…';
    sentToServer=true;
    const response=await fetch('/api/account?action=signup',{
      method:'POST',
      headers:{'content-type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({firstName,lastName,dateOfBirth,gender,username,email,password,
        confirmPassword:confirm,termsAccepted:terms,bookClaimToken:claimToken,captchaToken})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true)throw new Error(result.error||'Unable to create account. Please try again.');
    // A successful server response is an account creation, not email verification.
    // If the visitor previously granted public Analytics permission, defer one
    // PII-free sign_up event until they next visit an eligible PUBLIC page.
    // The Google tag never loads on this registration form.
    try {
      if (localStorage.getItem('smfgu_public_analytics_consent_v1') === 'granted') {
        sessionStorage.setItem('smfgu_pending_signup_v1', String(Date.now()));
      }
    } catch { /* Disabled storage means no analytics. */ }
    form?.reset();
    showAccountCreated(email,Boolean(claimToken));
  }catch(err){
    signupMessage(err.message||'Unable to create account.', 'error');
  }finally{
    if(sentToServer)window.GroundUpTurnstile?.reset?.();
    if(submit){
      submit.textContent='Create account';
      submit.disabled=window.GroundUpTurnstile?.required===true;
    }
  }
}

let usernameAvailabilityTimer;
let emailAvailabilityTimer;
function updatePasswordMatch(){
  const password=document.getElementById('signup-password')?.value||'';
  const confirm=document.getElementById('signup-password-confirm')?.value||'';
  if(!confirm){
    setFieldStatus('password-match-status','Re-enter your password exactly.');
  }else if(password===confirm){
    setFieldStatus('password-match-status','Passwords match.','available');
  }else{
    setFieldStatus('password-match-status','Passwords do not match.','unavailable');
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  const usernameInput=document.getElementById('signup-username');
  const emailInput=document.getElementById('signup-email');
  const passwordInput=document.getElementById('signup-password');
  const confirmInput=document.getElementById('signup-password-confirm');

  usernameInput?.addEventListener('input',()=>{
    clearTimeout(usernameAvailabilityTimer);
    const username=normalizeUsername(usernameInput.value);
    usernameInput.value=username;
    if(!validUsername(username)){
      setFieldStatus('username-availability','3–24 characters. Start with a letter; the first letter is capitalized automatically.');
      return;
    }
    setFieldStatus('username-availability','Checking username…');
    usernameAvailabilityTimer=setTimeout(async()=>{
      try{
        const free=await usernameAvailable(username);
        setFieldStatus('username-availability',free?'Username available.':'Username already in use.',free?'available':'unavailable');
      }catch{
        setFieldStatus('username-availability','Unable to check username right now.');
      }
    },450);
  });

  emailInput?.addEventListener('input',()=>{
    clearTimeout(emailAvailabilityTimer);
    const email=normalizeEmail(emailInput.value);
    if(!validEmail(email)){
      setFieldStatus('email-availability',email?'Enter a valid email address.':'Enter the email address you want to use for this account.');
      return;
    }
    setFieldStatus('email-availability','Checking email…');
    emailAvailabilityTimer=setTimeout(async()=>{
      try{
        const free=await emailAvailable(email);
        setFieldStatus('email-availability',free?'Email available. You will verify ownership by email.':'Email already in use. Sign in or reset your password.',free?'available':'unavailable');
      }catch{
        setFieldStatus('email-availability','Unable to check email right now.');
      }
    },550);
  });

  passwordInput?.addEventListener('input',updatePasswordMatch);
  confirmInput?.addEventListener('input',updatePasswordMatch);
});

/* Password policy UI and capture-phase validation owned by the signup script. */
/* v0.13.5.3: explicit signup password requirements, without replacing book-key logic. */
(()=>{'use strict';if(!/^\/create-account(?:\.html)?$/i.test(location.pathname))return;
const $=s=>document.querySelector(s);
const valid=p=>p.length>=12&&p.length<=120&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/[!@#$%^&*+_?]/.test(p);
function init(){const pass=$('#signup-password'),again=$('#signup-password-confirm'),form=$('#create-account-form');if(!pass||!again||!form)return;
 pass.minLength=12;again.minLength=12;pass.maxLength=120;again.maxLength=120;
 const p=document.createElement('p');p.id='v1353-password-requirements';p.className='field-status small';p.setAttribute('aria-live','polite');p.textContent='Choose at least 12 characters, including an uppercase letter, a lowercase letter and a symbol from !@#$%^&*+_?. Numbers are allowed.';pass.insertAdjacentElement('afterend',p);
 const status=$('#password-match-status');const update=()=>{const meets=valid(pass.value),matches=again.value&&again.value===pass.value;p.textContent=meets?'Password requirements satisfied.':'Password needs at least 12 characters, uppercase, lowercase and a symbol (!@#$%^&*+_?).';p.classList.toggle('available',meets);p.classList.toggle('unavailable',!!pass.value&&!meets);if(status&&again.value)status.textContent=matches?'Passwords match.':'Passwords do not match.'};pass.addEventListener('input',update);again.addEventListener('input',update);
 // Intercept submission before legacy inline handler runs, allowing all previous
 // username availability, book-key and age checks to remain unchanged.
 form.addEventListener('submit',ev=>{if(!valid(pass.value)||pass.value!==again.value){ev.preventDefault();ev.stopImmediatePropagation();const msg=$('#signup-message');if(msg){msg.textContent=!valid(pass.value)?'Password must have 12 or more characters, uppercase, lowercase and a symbol.':'Passwords must match exactly.';msg.className='inline-status error'}update();pass.focus();}},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
