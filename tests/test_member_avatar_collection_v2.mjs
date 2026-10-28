import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const avatars=JSON.parse(file('assets/avatars/catalog-v2.json')).avatars;
assert.equal(avatars.length,39,'9 original + 30 new avatar choices required');
assert.equal(new Set(avatars.map(x=>x.id)).size,39);
for(const a of avatars){
 assert.match(a.id,/^[fmn](?:[1-9]|1[0-3])$/);
 assert.ok(existsSync(new URL('../'+a.src.slice(1),import.meta.url)),a.id+' file missing');
 const svg=file(a.src.slice(1));
 assert.ok(svg.startsWith('<svg')&&svg.includes('viewBox="0 0 192 192"'));
 assert.ok(!/<script|<foreignObject|xlink:href|<image/i.test(svg),'Only self-contained SVG allowed');
}
const ui=file('assets/js/member-profile-ui-v1.js');
const picker=file('assets/js/member-avatar-picker-v2.js');
const api=file('functions/api/member-profile.js');
const signup=file('functions/api/account.js');
const dash=file('dashboard.html'),academy=file('bootcamp-academy.html');
assert.ok(ui.includes('data-edit-picture')&&ui.includes('GroundUpAvatarPicker.open'));
assert.ok(ui.includes('const latest=(await request()).profile'));
assert.ok(picker.includes('data-avatar-apply')&&picker.includes('aria-pressed'));
assert.ok(picker.includes('await onApply(url)')&&picker.includes("if(busy)event.preventDefault()"));
assert.match(api,/av-\[fmn\]\(\?:\[1-9\]\|1\[0-3\]\)/);
assert.match(signup,/avatarSlot=1\+random\[0\]%13/);
assert.ok(dash.includes('member-avatar-picker-v2.js'));
assert.ok(academy.includes('bootcamp-academy-compact-v2.css'));
assert.ok(file('assets/css/bootcamp-academy-compact-v2.css').includes('max-width:1220px'));
console.log('PASS 30 new member avatars, manifest, modal Apply workflow, server allowlist, signup assignment and Academy layout.');
