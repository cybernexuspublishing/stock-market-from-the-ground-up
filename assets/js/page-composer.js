/* First-party managed-page block editor. Stable filename; no untrusted HTML execution.
 * Stores constrained JSON in the EXISTING site_pages_v1354.body_text contract.
 * Older pages remain plain text and can be converted explicitly by the Owner.
 */
(()=>{'use strict';
const PREFIX='GU_BLOCKS_V1:';
const ALLOWED=new Set(['heading','paragraph','list','callout','link']);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isSafePath=p=>/^\/[a-z0-9][a-z0-9/._?#=&%+-]*$/i.test(p)&&!p.startsWith('//')&&!/\\/.test(p);
function parse(raw){const v=String(raw||'');if(!v.startsWith(PREFIX))return null;
 let data;try{data=JSON.parse(v.slice(PREFIX.length))}catch{return null}
 if(!data||data.version!==1||!Array.isArray(data.blocks)||data.blocks.length>35)return null;
 const blocks=data.blocks.map(x=>{
  if(!x||!ALLOWED.has(x.type)||typeof x.text!=='string'||x.text.length>2600)return null;
  if(x.type==='link'&&(!isSafePath(x.href)||x.href.length>300))return null;
  return {type:x.type,text:x.text,...(x.type==='link'?{href:x.href}:{})};
 });return blocks.includes(null)?null:blocks;
}
function render(blocks){return blocks.map(x=>{
 const t=esc(x.text).replace(/\n/g,'<br>');
 if(x.type==='heading')return `<h2>${t}</h2>`;
 if(x.type==='callout')return `<aside class="gu-managed-callout">${t}</aside>`;
 if(x.type==='list')return `<ul>${x.text.split(/\n/).map(item=>`<li>${esc(item.replace(/^\s*[-*]\s*/,''))}</li>`).join('')}</ul>`;
 if(x.type==='link')return `<p><a href="${esc(x.href)}">${t}</a></p>`;
 return `<p>${t}</p>`;
}).join('')}
function mount(form,preview){const field=form.elements.body_text;if(!field)return;
 const holder=document.createElement('section');holder.className='gu-page-composer wide';holder.innerHTML=`<div class="gu-composer-head"><div><strong>Visual Page Composer</strong><p>Build headings, paragraphs, callouts, lists and safe internal links. Published pages render semantic HTML with escaped text.</p></div><button type="button" data-composer-toggle class="btn secondary" aria-expanded="false">Enable block editor</button></div><div data-composer-content hidden><div class="gu-blocks" data-blocks aria-label="Page content blocks"></div><div class="gu-block-actions" role="group" aria-label="Add content block">${['heading','paragraph','list','callout','link'].map(type=>`<button type="button" class="btn secondary" data-add="${type}">+ ${type[0].toUpperCase()+type.slice(1)}</button>`).join('')}</div><p class="gu-composer-state" role="status" aria-live="polite"></p></div>`;
 field.closest('label')?.after(holder);
 const toggle=holder.querySelector('[data-composer-toggle]'),content=holder.querySelector('[data-composer-content]'),rows=holder.querySelector('[data-blocks]'),note=holder.querySelector('.gu-composer-state');
 let enabled=false,blocks=parse(field.value)||[{type:'paragraph',text:field.value||''}],manualBackup=field.value;
 function sync(){if(!enabled)return;const all=rows.querySelectorAll('[data-row]');blocks=[...all].map(row=>({type:row.dataset.row,text:row.querySelector('textarea').value,...(row.dataset.row==='link'?{href:row.querySelector('input').value.trim()}:{})}));const raw=PREFIX+JSON.stringify({version:1,blocks});if(raw.length>18000){field.setCustomValidity('The page exceeds 18,000 characters. Shorten its blocks.');note.textContent='Content is too long to save.';}else if(blocks.some(x=>x.type==='link'&&!isSafePath(x.href))){field.setCustomValidity('Use internal links beginning with /, such as /learn.html.');note.textContent='A link destination is invalid.';}else{field.setCustomValidity('');note.textContent=`${blocks.length} blocks · ${raw.length} / 18,000 characters`;field.value=raw;}updatePreview()}
 function draw(){rows.replaceChildren();blocks.forEach((block,i)=>{
  const row=document.createElement('div');row.className='gu-block';row.dataset.row=block.type;
  row.innerHTML=`<div class="gu-block-heading"><strong>${esc(block.type)}</strong><div><button type="button" data-move="-1" aria-label="Move block up">↑</button><button type="button" data-move="1" aria-label="Move block down">↓</button><button type="button" data-delete aria-label="Remove block">×</button></div></div><label>${block.type==='link'?'Link text':'Content'}<textarea rows="${block.type==='paragraph'?5:3}" maxlength="2600" aria-label="${esc(block.type)} text"></textarea></label>${block.type==='link'?'<label>Internal destination <input aria-label="Internal destination" type="text" placeholder="/learn.html" maxlength="300"></label>':''}`;
  row.querySelector('textarea').value=block.text||'';if(block.type==='link')row.querySelector('input').value=block.href||'/learn.html';rows.append(row);
  row.querySelector('[data-delete]').onclick=()=>{blocks.splice(i,1);draw()};row.querySelectorAll('[data-move]').forEach(btn=>btn.onclick=()=>{const next=i+Number(btn.dataset.move);if(next<0||next>=blocks.length)return;[blocks[i],blocks[next]]=[blocks[next],blocks[i]];draw()});
  row.querySelectorAll('textarea,input').forEach(e=>e.addEventListener('input',sync));
 });sync()}
 function updatePreview(){if(!preview)return;const body=preview.querySelector('.site-page-live-body');if(!body)return;if(enabled){body.innerHTML=render(blocks)}else{body.textContent=field.value||'Page content preview appears here.'}}
 function activate(){if(!enabled){if(field.value&&!field.value.startsWith(PREFIX)){if(!window.confirm('Convert this existing plain-text page into editable blocks? The original content will become one paragraph block. The conversion is saved only when you click Save Changes.'))return;manualBackup=field.value;blocks=[{type:'paragraph',text:field.value}]}else{blocks=parse(field.value)||[{type:'paragraph',text:''}]};enabled=true;field.closest('label').hidden=true;content.hidden=false;toggle.textContent='Use plain text';toggle.setAttribute('aria-expanded','true');draw();}
 else{if(!window.confirm('Switch to raw content? The block representation stays as text unless you edit it manually.'))return;enabled=false;field.closest('label').hidden=false;content.hidden=true;toggle.textContent='Enable block editor';toggle.setAttribute('aria-expanded','false');field.setCustomValidity('');updatePreview()}}
 toggle.onclick=activate;
 holder.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{if(blocks.length>=35){note.textContent='Maximum 35 blocks.';return}blocks.push({type:b.dataset.add,text:'',...(b.dataset.add==='link'?{href:'/learn.html'}:{})});draw();rows.lastElementChild?.querySelector('textarea')?.focus()});
 const prior=form.onsubmit;form.addEventListener('submit',e=>{if(enabled)sync();if(!field.checkValidity()){e.preventDefault();e.stopImmediatePropagation();field.reportValidity();}},{capture:true});
 if(field.value.startsWith(PREFIX)){enabled=true;field.closest('label').hidden=true;content.hidden=false;toggle.textContent='Use plain text';toggle.setAttribute('aria-expanded','true');draw()}
 form.addEventListener('input',e=>{if(!enabled&&e.target===field)updatePreview()});updatePreview();
}
window.GroundUpPageComposer={mount,parse,render,prefix:PREFIX};
})();
