/* Profile-level AI preference, stable typed instructor and uncluttered sign-in.
   Local source assertions: no production session, account or provider accessed. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(path,'utf8');
const sources={
 instructor:read('assets/js/lab-v33-instructor.js'),
 engine:read('assets/js/lab-engine-v32-universal.js'),
 player:read('assets/js/lab-player.js'),
 tutor:read('assets/js/market-tutor.js'),
 profile:read('assets/js/profile.js'),
 captcha:read('assets/js/turnstile-auth.js'),
 login:read('assets/js/signin.js')
};
for(const [key,src] of Object.entries(sources))
 assert.doesNotThrow(()=>new Script(src,{filename:key+'.js'}),'Syntax '+key);
const sign=read('signin.html'),signCss=read('assets/css/lab-signin-and-profile-v33.css');
const profilePage=read('account.html'),memberTutorPage=read('market-tutor.html');
const instructorCss=read('assets/css/lab-v33-instructor.css');
assert(sign.includes('gu-signin-card')&&sign.includes('auth-submit'));
assert(sign.includes('Sign in to My Account'));
assert(sign.includes('lab-signin-and-profile-v33.css'));
assert(signCss.includes('.gu-signin-card .auth-submit')&&signCss.includes('min-height:50px'));
assert(signCss.includes('.gu-manual-human{background:transparent;border:0'),
 'Human verification should be integrated instead of a nested box');
assert(sources.captcha.includes('if(signin)submit.after(box);else submit.before(box)'),
 'Sign-in button must be above human verification');
assert(sources.captcha.includes('lock(true)')&&sources.captcha.includes('token=t'),
 'Preserve disabled CTA and Turnstile success token gating');
assert(sources.captcha.includes('getToken()')&&sources.captcha.includes('if(enabled&&(!initialized||!checkbox?.checked||!token))'),
 'Manual verification must remain mandatory while configured');
assert(profilePage.includes('id="profile-tutor-ai-enabled" type="checkbox"'));
assert(profilePage.includes('configured external AI provider'),
 'Explain optional AI data processing in profile');
assert(sources.profile.includes('market_tutor_ai_enabled===true'),
 'Optional model inference must require affirmative member choice');
assert(sources.profile.includes('sb.auth.updateUser({data:{market_tutor_ai_enabled:requested}})'),
 'Profile opt-out must persist in the authenticated user record');
assert(sources.player.includes('tutorAiEnabled:session?.user?.user_metadata?.market_tutor_ai_enabled===true'));
assert(sources.player.includes("allowTutorAI:PLAYER.access.tutorAiEnabled===true"));
assert(sources.engine.includes('memberFirstName,allowTutorAI,requestTutor:tutorRequest'));
assert(sources.instructor.includes("allowModel:allowTutorAI===true"),'AI preference must control Lab request');
assert(!sources.instructor.includes('consentRow'),'Lab must not ask a redundant AI preference');
assert(memberTutorPage.includes('id="tutor-ai-consent" type="checkbox" disabled'),'Full Tutor provides a visible guarded member opt-in control');
assert(memberTutorPage.includes('your Profile'));
assert(sources.tutor.includes('TUTOR.user?.user_metadata?.market_tutor_ai_enabled===true'),'Full Tutor uses profile preference');
assert(sources.tutor.includes('toggle.checked=!toggle.disabled'),'Full Tutor must respect server access/quota');
assert(!sources.tutor.includes("if($('tutor-ai-consent'))$('tutor-ai-consent').checked=false"),
 'Request completion must not reset profile preference');
assert(sources.instructor.includes('(t-last)*0.038'),'Teaching types slowly at about 38 characters per second');
assert(instructorCss.includes('.gu-v33-instructor-narration')&&instructorCss.includes('overflow:visible!important'),
 'Typed lessons must not increase the page height');
assert(sources.instructor.includes("el('button','Crownlight Lumens Wallet'"),'Crownlight Lumens wallet is third adjacent teaching tab');
assert(sources.engine.includes('instructorInstance.setWalletContent(wallet)'));
assert(sources.engine.includes('shell.insertBefore(support,nav.nextSibling)'),'Actions above tabs');
assert(!sources.engine.includes("'Related official competencies: '"),
 'Internal competency/mastery notice must be removed from Start stage');
assert(!read('lab-player.html').includes('Educational instruction. Official assessments and progress require authorization.'));
assert(sources.player.includes("if(!['guided','practice'].includes(PLAYER.mode))"),
 'Predict and assessment must preserve Tutor access boundary');
assert(sources.instructor.includes("const firstName="),'Existing first-name-only greetings remain intact');
console.log('PASS sign-in layout + Turnstile gating; instructor viewport + tabs; member AI opt-in for Labs and Tutor');
