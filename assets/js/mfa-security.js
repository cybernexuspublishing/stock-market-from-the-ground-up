(()=>{'use strict';
const by=id=>document.getElementById(id),msg=s=>{by('mfa-status').textContent=s},show=(id,on)=>{by(id).hidden=!on};
let sb,enrolledId='';
function fail(e){msg(e?.message||'Unable to verify multi-factor authentication.')}
async function refresh(){
 const {data:session,error:e}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();if(e)throw e;
 const {data:factors,error:fe}=await sb.auth.mfa.listFactors();if(fe)throw fe;
 const list=[...(factors.totp||[]).filter(f=>f.status==='verified')];
 show('mfa-complete',session.currentLevel==='aal2');
 const next=new URLSearchParams(location.search).get('next');if(next&&next.startsWith('/')&&!next.startsWith('//')&&!/[\\\u0000-\u001f\u007f]/.test(next)){const go=by('mfa-complete')?.querySelector('a.btn');if(go)go.href=next}
 show('mfa-setup',!list.length);show('mfa-challenge',list.length>0&&session.currentLevel!=='aal2');
 if(session.currentLevel==='aal2'){msg('Second-factor verification complete for this session.');return}
 if(list.length){const options=by('mfa-factor');options.replaceChildren(...list.map((f,i)=>{const opt=document.createElement('option');opt.value=f.id;opt.textContent=f.friendly_name||`Authenticator ${i+1}`;return opt}));msg('Enter the current authenticator code to finish sign-in at the higher assurance level.');return}
 msg('No verified authenticator is enrolled. Enroll one to enable staff verification.');
}
async function enroll(){try{const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Ground-Up Authenticator'});if(error)throw error;
 enrolledId=data.id;const qr=data.totp?.qr_code||'';
 if(!qr.startsWith('data:image/svg+xml')&&!qr.startsWith('data:image/png'))throw new Error('Unsupported enrollment QR response.');
 by('mfa-qr').src=qr;by('mfa-secret').textContent=data.totp?.secret||'';show('mfa-enrollment',true);msg('Scan the QR code, then enter your authenticator code to activate the factor.');
 }catch(e){fail(e)}}
async function verifyCode(id,code){if(!id||!/^[0-9]{6}$/.test(code))throw new Error('Enter a valid six-digit code.');const {data,error}=await sb.auth.mfa.challengeAndVerify({factorId:id,code});if(error)throw error;return data}
async function initialize(){try{sb=await window.getSupabaseClient();const {data:{user},error}=await sb.auth.getUser();if(error||!user){location.replace('/signin.html?next=%2Fmfa-security.html');return}
 by('mfa-enroll').onclick=enroll;by('mfa-secret-toggle').onclick=()=>{by('mfa-secret').hidden=!by('mfa-secret').hidden;by('mfa-secret-toggle').textContent=by('mfa-secret').hidden?'Show manual setup secret':'Hide manual setup secret'};
 by('mfa-enroll-verify').onclick=async()=>{try{await verifyCode(enrolledId,by('mfa-enroll-code').value.trim());show('mfa-enrollment',false);await refresh()}catch(e){fail(e)}};
 by('mfa-verify').onclick=async()=>{try{await verifyCode(by('mfa-factor').value,by('mfa-challenge-code').value.trim());await refresh()}catch(e){fail(e)}};
 await refresh();}catch(e){fail(e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
