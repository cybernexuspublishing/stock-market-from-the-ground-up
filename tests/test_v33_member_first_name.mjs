/* Regression: first-name-only one-to-one instruction.
 * Uses mock identity responses; no real user data or credentials.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const player=readFileSync('assets/js/lab-player.js','utf8');
const engine=readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
const instructor=readFileSync('assets/js/lab-v33-instructor.js','utf8');
const account=readFileSync('functions/api/account.js','utf8');
const start=player.indexOf('function memberFirstNameField(');
const end=player.indexOf('async function initPlayer()',start);
assert(start>=0&&end>start,'First-name resolver must be defined in the member Lab player');
const extracted=player.slice(start,end);
let calls=[];
let status=200,data={ok:true,profile:{firstName:'Erin',username:'@DifferentHandle'}};
const ctx=createContext({
 AbortController,setTimeout,clearTimeout,
 fetch:async(url,options)=>{
  calls.push({url,method:options.method,auth:options.headers.authorization,cache:options.cache});
  return {ok:status===200,status,json:async()=>data};
 }
});
new Script(extracted).runInContext(ctx);
const sanitize=s=>ctx.memberFirstNameField(s);
const resolve=u=>ctx.loadMemberFirstName(u);
assert.equal(sanitize('María-José'),'María-José');
assert.equal(sanitize('  Émile  '),'Émile');
assert.equal(sanitize('@Adissel'),'','Username handles are not names');
assert.equal(sanitize('member@example.org'),'','Email must never become a greeting');
assert.equal(sanitize('<img src=x>'),'','User HTML must never render');
const session={access_token:'test-token-never-real',user:{id:'synthetic-user',user_metadata:{first_name:'Noah',username:'FakeHandle'}}};
assert.equal(await resolve(session),'Erin','Profile first_name is preferred over auth metadata');
assert.equal(calls.length,1);
assert.equal(calls[0].url,'/api/account?action=identity');
assert.equal(calls[0].auth,'Bearer test-token-never-real');
assert.equal(calls[0].cache,'no-store');
data={ok:true,profile:{firstName:'',username:'FakeHandle'}};
assert.equal(await resolve(session),'Noah','Only explicitly stored first_name may be used as fallback');
status=401;
assert.equal(await resolve(session),'Noah','An identity denial must not leak/display usernames');
const count=calls.length;
assert.equal(await resolve(null),'','Logged-out visitor must not have member identity or account fetch');
assert.equal(calls.length,count);
assert(account.includes("profile:{username:profile.username||'',email:usr.email||profile.email||'',firstName:profile.first_name||''"),
 'Existing identity endpoint must return the profile first name from the authenticated user');
assert(player.includes("memberFirstName:PLAYER.access.memberFirstName||''"),'Player must forward the authorized first name');
assert(engine.includes('memberFirstName,allowTutorAI,requestTutor:tutorRequest'),'Engine must propagate first name');
assert(instructor.includes('Talia Mercer — Your Learning Instructor'));
assert(!instructor.includes('Avery — Your Learning Instructor'));
assert(instructor.includes("firstName?', '+firstName:''"),'Instructor should address learner by first name only');
assert(!extracted.includes('display_name')&&!extracted.includes('username'),'Never infer first name from username/display_name');
console.log('PASS Talia Mercer first-name-only greeting, authenticated profile resolution, metadata fallback, no handle/email, and anonymous behavior');
