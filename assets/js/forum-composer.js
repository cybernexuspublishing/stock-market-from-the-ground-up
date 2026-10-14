/* v0.14.0.12 — Safe, shared editor for legacy Forum and Market Commons.
 * All stored content remains plain text with constrained BBCode. No raw HTML or remote embeds.
 */
(()=>{'use strict';
 const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const allowedUrl=value=>{try{const u=new URL(String(value).trim());return /^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
 const maxDepth=4;
 function render(value){
  const input=String(value??'').slice(0,12000);
  const protectedBlocks=[];
  let text=enc(input).replace(/\r\n?/g,'\n');
  // Preserve code as escaped text; markup inside code blocks is never interpreted.
  text=text.replace(/\[code\]([\s\S]*?)\[\/code\]/gi,(_all,body)=>{const token=`\uE000${protectedBlocks.length}\uE001`;protectedBlocks.push(`<pre class="gu-forum-code"><code>${body}</code></pre>`);return token});
  text=text.replace(/\[url=([^\]\n]{1,1024})\]([\s\S]*?)\[\/url\]/gi,(full,href,label)=>{const target=allowedUrl(href.replace(/&amp;/g,'&'));return target?`<a href="${enc(target)}" rel="nofollow ugc noopener noreferrer" target="_blank">${label.replace(/<[^>]*>/g,'')}</a>`:full});
  const rules=[['b','strong'],['i','em'],['u','u'],['s','s'],['quote','blockquote']];
  for(let round=0;round<maxDepth;round++)for(const [tag,html] of rules){const re=new RegExp('\\['+tag+'\\]([\\s\\S]*?)\\[\\/'+tag+'\\]','gi');text=text.replace(re,(_m,content)=>`<${html}>${content}</${html}>`)}
  text=text.replace(/\[list\]([\s\S]*?)\[\/list\]/gi,(full,body)=>{const rows=body.split(/\[\*\]/).map(x=>x.trim()).filter(Boolean);return rows.length&&rows.length<=30?`<ul>${rows.map(x=>`<li>${x}</li>`).join('')}</ul>`:full});
  text=text.replace(/\n/g,'<br>');
  text=text.replace(/\uE000(\d+)\uE001/g,(_m,i)=>protectedBlocks[Number(i)]||'');
  return text;
 }
 function wrap(area,left,right,leftCursor=left.length){const begin=area.selectionStart,end=area.selectionEnd,selected=area.value.slice(begin,end);area.setRangeText(left+selected+right,begin,end,'end');area.focus();area.setSelectionRange(begin+leftCursor,begin+leftCursor+selected.length);area.dispatchEvent(new Event('input',{bubbles:true}))}
 const buttons=[['bold','Bold','[b]','[/b]'],['italic','Italic','[i]','[/i]'],['underline','Underline','[u]','[/u]'],['strike','Strike','[s]','[/s]'],['quote','Quote','[quote]','[/quote]'],['code','Code','[code]','[/code]'],['list','Bullet list','[list][*]','[/list]']];
 const icons=['📈','📉','💡','❓','⚠️','📊','✅','🧠','👏','🙂'];
 function attach(area,{previewTitle='Message preview'}={}){
  if(!area||area.dataset.guComposer==='1')return;area.dataset.guComposer='1';
  const frame=document.createElement('section');frame.className='gu-forum-editor';
  const bar=document.createElement('div');bar.className='gu-forum-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Message formatting');
  buttons.forEach(([name,label,left,right])=>{const btn=document.createElement('button');btn.type='button';btn.className='gu-format-btn';btn.title=label;btn.textContent=({bold:'B',italic:'I',underline:'U',strike:'S',quote:'❞',code:'</>',list:'☷'})[name];btn.setAttribute('aria-label',label);btn.onclick=()=>wrap(area,left,right);bar.append(btn)});
  const link=document.createElement('button');link.type='button';link.className='gu-format-btn';link.textContent='🔗';link.title='Insert web link';link.setAttribute('aria-label','Insert web link');link.onclick=()=>{const href=prompt('Enter the complete HTTPS link:');if(href===null)return;const url=allowedUrl(href);if(!url){status.textContent='Use a valid http:// or https:// link.';return}wrap(area,`[url=${url}]`,'[/url]')};bar.append(link);
  const emoji=document.createElement('select');emoji.className='gu-emojis';emoji.setAttribute('aria-label','Insert an emoji');emoji.innerHTML='<option value="">Emoji</option>'+icons.map(x=>`<option value="${x}">${x}</option>`).join('');emoji.onchange=()=>{if(emoji.value)wrap(area,emoji.value,'');emoji.value=''};bar.append(emoji);
  const count=document.createElement('span');count.className='gu-forum-counter';count.setAttribute('aria-live','off');bar.append(count);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='gu-format-btn gu-preview-toggle';toggle.textContent='Preview';toggle.setAttribute('aria-expanded','false');bar.append(toggle);
  const preview=document.createElement('div');preview.className='gu-forum-preview';preview.hidden=true;preview.setAttribute('role','region');preview.setAttribute('aria-label',previewTitle);
  const status=document.createElement('p');status.className='gu-forum-editor-status';status.setAttribute('role','status');
  const parent=area.parentNode;parent.insertBefore(frame,area);frame.append(bar,area,preview,status);
  const update=()=>{count.textContent=area.value.length+(area.maxLength>0?` / ${area.maxLength}`:'');if(!preview.hidden)preview.innerHTML=render(area.value)||'<em>Nothing to preview.</em>'};
  toggle.onclick=()=>{preview.hidden=!preview.hidden;toggle.setAttribute('aria-expanded',String(!preview.hidden));toggle.textContent=preview.hidden?'Preview':'Hide preview';update()};
  area.addEventListener('input',update);update();
 }
 function decorateAll(root=document){root.querySelectorAll('textarea[data-forum-composer]').forEach(area=>attach(area))}
 window.GroundUpForumEditor={attach,decorateAll,render,esc:enc};
 document.addEventListener('DOMContentLoaded',()=>decorateAll());
})();
