import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(file('assets/avatars/catalog-v2.json')),avatars=manifest.avatars;
assert.equal(manifest.version,4);assert.equal(avatars.length,60);
assert.equal(new Set(avatars.map(x=>x.id)).size,60);
const hashes=new Set();
for(const [i,a] of avatars.entries()){
 assert.match(a.id,/^(?:[fmn](?:[4-9]|1[0-3])|r(?:0[1-9]|[12][0-9]|30))$/);assert.equal(a.number,i+1);
 assert.equal(a.src,'/assets/avatars/av-'+a.id+'.webp');
 assert(existsSync(new URL('../'+a.src.slice(1),import.meta.url)),a.src+' missing');
 const image=readFileSync(new URL('../'+a.src.slice(1),import.meta.url));
 assert(image.length>4000);assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 hashes.add(createHash('sha256').update(image).digest('hex'));
}
assert.equal(hashes.size,60);
for(const group of ['f','m','n'])for(let i=1;i<=3;i++)
 assert(existsSync(new URL('../assets/avatars/av-'+group+i+'.svg',import.meta.url)),'Legacy member asset must remain');
const picker=file('assets/js/member-avatar-picker-v2.js'),api=file('functions/api/member-profile.js'),signup=file('functions/api/account.js'),ui=file('assets/js/member-profile-ui-v1.js');
assert(picker.includes('choices.length!==60')&&picker.includes('candidates.length!==60'));
assert(picker.includes('async function mountInline')&&picker.includes('panel.hidden=true'));
assert(picker.includes('await onApply(url)'));assert(api.includes('baseAvatar=')&&api.includes('\\.webp'));
assert(signup.includes('avatarIndex=random[0]%30'));assert(ui.includes('GroundUpAvatarPicker.mountInline'));
assert(file('dashboard.html').includes('member-avatar-picker-v2.js'));
assert(file('dashboard.html').includes('data-dashboard-avatar'));
assert(file('assets/js/dashboard-profile-avatar-v4.js').includes('gu:profile-avatar-updated'));
assert(file('assets/css/dashboard-profile-avatar-v4.css').includes('gu-dashboard-profile-picture'));
console.log('PASS 60 unique WebP avatars, Dashboard top-left portrait, profile save, and retained older choices.');
