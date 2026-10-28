/* Acceptance is source/static evidence only, not a fake live member session. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {academyCatalog,academyByCode} from '../functions/_lib/bootcamp-academy-v014168.js';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const codes={truth5:5,watchlist7:7,scanners10:10,foundations30:30,charts45:45,risk60:60,practicum90:90};
assert.equal(academyCatalog.length,7);
for(const [code,days] of Object.entries(codes)){
 assert.equal(academyByCode[code].curriculum.length,days,code+' curriculum must be complete');
 assert(academyByCode[code].curriculum.every((d,i)=>d.day===i+1&&d.programCode===code),code+' day integrity');
 assert(academyByCode[code].curriculum.every(d=>d.officiallyGraded===false&&d.masteryAwarded===false),code+' unverified grading');
}
const academy=file('assets/js/bootcamp-academy-v014168.js');
assert(academy.includes('academy-beta-daily-coach'),'Beta days need direct teaching before optional Lab engine');
assert(academy.includes('Add my self-check to the private reflection'),'Beta days must offer explicit learner work');
assert(academy.includes('Report a lesson issue'),'Tester feedback path missing');
const endpoint=file('functions/api/bootcamp-academy.js'),daily=file('assets/js/bootcamp.js');
assert(endpoint.includes("form.program==='foundations30'"),'Original 30-day course requires explicit enrollment API');
assert(endpoint.includes('gu_foundations30_beta_enroll_v1'),'Original 30-day enrollment must be server-owned');
assert(daily.includes("action:'enroll'")&&daily.includes('gu-bc-enroll'),'30-day beta enrollment UI missing');
const migration=file('supabase/migrations/20261028_foundations30_beta_enrollment_v1.sql');
assert(migration.includes('security invoker'),'Enrollment SQL must not bypass RLS');
assert(migration.includes('to service_role'),'Only backend service role may enroll');
const profile=file('assets/js/member-profile-ui-v1.js'),picker=file('assets/js/member-avatar-picker-v2.js');
assert(profile.includes('GroundUpAvatarPicker.mountInline'),'Dashboard must use an inline picker');
assert(picker.includes('async function mountInline')&&picker.includes('panel.hidden=true'),'Inline Apply must save then close');
const catalog=JSON.parse(file('assets/avatars/catalog-v2.json'));
assert.equal(catalog.avatars.length,60);
assert.equal(catalog.version,5);
assert(catalog.avatars.every(x=>x.src.endsWith('.webp')),'Gallery presents exclusively high-quality WebP portraits');
const uniqueWebP=new Set;
for(const a of catalog.avatars){
 const p=a.src.slice(1);
 assert(existsSync(new URL('../'+p,import.meta.url)),p+' missing');
 const buffer=readFileSync(new URL('../'+p,import.meta.url));
 assert.equal(buffer.toString('ascii',8,12),'WEBP');
 uniqueWebP.add(buffer.toString('base64'));
}
assert.equal(uniqueWebP.size,60,'All sixty portraits must be different WebP images');
const memberRPC=file('supabase/migrations/20261028_author_avatars_public_presentation_v1.sql');
assert(memberRPC.includes('auth.uid()')&&memberRPC.includes('status='+"\'published\'"),'Author eligibility requires signed-in member and published content');
assert(memberRPC.includes('to authenticated')&&!memberRPC.includes('grant select on public.profiles'),'Do not publish the private profiles table');
const forum=file('assets/js/market-commons-platform.js');
assert(forum.includes('data-community-avatar-user'),'Forum posts must mount author avatar slots');
assert(file('assets/js/community-avatars-v1.js').includes('gu_community_author_avatars_v1'),'Avatar UI must resolve through approved member-only RPC');
console.log('PASS seven beta curricula, explicit 30-day enroll, 30 distinct portraits, inline Dashboard picker, privacy-controlled community avatars.');
