import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const boot=read('bootcamp-academy.html'),skills=read('skills.html');
const catalog=read('assets/js/bootcamp-academy-v014168.js');
const record=read('assets/js/skills.js');
const css=read('assets/css/member-learning-rails-and-skills-v1.css');
const adJS=read('assets/js/ad-slots-v014229.js'),adAPI=read('functions/api/ad-slot.js');
const ownerAPI=read('functions/api/ad-sales.js'),admin=read('assets/js/admin-ad-sales-v014228.js');
const migration=read('supabase/migrations/20261028_member_learning_ad_rails_v1.sql');
assert.match(boot,/class="navlinks"/,'Academy must mount canonical signed-in profile/Sparks navigation');
assert.match(boot,/gu-learning-section-menu/,'Academy must preserve its focused member sections');
assert.match(boot,/academy-free-art/,'Free Foundations should show a real educational illustration');
for(const [page,slots] of [
 [boot,['BOOTCAMP_LEFT','BOOTCAMP_RIGHT']],
 [skills,['SKILLS_LEFT','SKILLS_RIGHT']]
]){
 for(const slot of slots){
  assert(page.includes('data-ad-slot="'+slot+'"'),slot+' missing on page');
  assert(adJS.includes(slot+':'),slot+' missing from first-party inventory');
  assert(adAPI.includes(slot+':['),slot+' missing from strict server route allowlist');
  assert(migration.includes("'"+slot+"'"),slot+' missing in database migration');
 }
 assert.equal((page.match(/data-ad-slot=/g)||[]).length,2,'Only left/right placements permitted on each page');
 assert(page.includes('assets/js/ad-slots-v014229.js'),'Page lacks ad entitlement renderer');
 assert(page.includes('member-learning-rails-and-skills-v1.css'),'Page lacks responsive rail layout');
}
assert(css.includes('position:static!important'),'Page ad rails must not stick while scrolling');
assert(css.includes('max-width:1130px'),'Page must have a bounded center content width');
assert(css.includes('.gu-skill-meter progress'),'Skill progress must have a visible track');
const illustrations={
 truth5:'sec-filings',watchlist7:'candidate-quality',scanners10:'catalyst-analysis',
 foundations30:'chart-structure',charts45:'multi-timeframe',risk60:'risk-per-share',
 practicum90:'independent-plan'
};
for(const icon of Object.values(illustrations)){
 assert(existsSync(new URL('../assets/images/skill-illustrations/'+icon+'.svg',import.meta.url)),icon+' illustration missing');
 assert(catalog.includes(icon),'Missing program illustration mapping: '+icon);
}
// Boot Camp cards use decorative covers with empty alt text; the containing
// link provides the program name and an explicit accessible destination label.
assert(catalog.includes("visual.alt=''")&&catalog.includes("visual.setAttribute('aria-hidden','true')"),
 'Decorative program cover must not duplicate the accessible program title');
assert(catalog.includes("link.setAttribute('aria-label',access?")&&
 catalog.includes("const name=node('span',p.title)")&&
 catalog.includes("link.append(media)")&&catalog.includes("link.append(name)")&&
 catalog.includes("card.append(link)"),
 'Compact Boot Camp cover must precede the named, accessible program link');
assert(record.includes('function progressMeter(')&&record.includes('<progress max="100"'),'Skills record requires semantic progress bars');
assert(record.includes('subScores')&&record.includes('known.length/4*100'),'Official coverage must reflect verified scored dimensions');
assert(record.includes('distinctLabs=new Set('),'Repeated attempts may not inflate unique Lab progress');
assert(record.includes("if(attempts.error)"),'Private record errors cannot be mistaken for zero evidence');
assert(record.includes("hasEvidence?String(v)+'%': 'Not yet recorded'"),'Missing evidence must remain Not Yet Recorded');
assert(ownerAPI.includes("if(action==='set_placement_active')")&&ownerAPI.includes("await audit(c,actor,'set_placement_active'"),'Placement controls require owner-side audit');
assert(ownerAPI.indexOf('const who=await owner(c,request)')<ownerAPI.indexOf("if(action==='set_placement_active')"),'Owner authority must precede placement changes');
assert(admin.includes("action:'set_placement_active'"),'Admin must offer placement switches');
assert(migration.includes('where ads_enabled is true'),'Ad-free plan policies must not gain ad placements');
console.log('PASS member profile navigation, 7 distinct verified illustrations, rail-only ads, Owner inventory controls, 3 evidence-based skill progress tracks.');
