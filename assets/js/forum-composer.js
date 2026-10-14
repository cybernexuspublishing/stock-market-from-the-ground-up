/* v0.14.0.17 — Shared accessible rich-text composer for Market Commons, legacy Forum,
   Owner announcements and Owner-created member notices.
   Existing database fields still hold BBCode TEXT. HTML editing is a safe import/export mode:
   scripts, handlers, iframes and arbitrary CSS are NEVER stored or rendered as HTML.
 */
(()=>{'use strict';
 if(window.GroundUpForumEditor?.version==='v0.14.0.17')return;
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const URL_OK=value=>{try{const x=new URL(String(value??'').trim());return ['http:','https:'].includes(x.protocol)&&x.href.length<=2048?x.href:null}catch{return null}};
 const IMG_OK=value=>{const u=URL_OK(value);return u&&u.startsWith('https:')?u:null};
 const COLORS=/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;
 const FONTS={'arial':'Arial','georgia':'Georgia','verdana':'Verdana','tahoma':'Tahoma','courier new':'Courier New','times new roman':'Times New Roman','sans-serif':'sans-serif'};
 const HTML_TAGS={b:'strong',i:'em',u:'u',s:'s',strike:'s',quote:'blockquote',left:'div',center:'div',right:'div',justify:'div',indent:'div',highlight:'mark'};
 const COLOR_NAMES={red:'#ff6666',blue:'#7ebcf4',green:'#7dda96',yellow:'#ffe27d',orange:'#f0ab64',white:'#ffffff',black:'#000000',purple:'#d5a6ff',gray:'#aaaaaa'};
 const safeColor=x=>COLORS.test(String(x||''))?x:COLOR_NAMES[String(x||'').toLowerCase()]||null;
 const safeId=x=>/^[a-z][\w-]{0,50}$/i.test(String(x||''))?String(x):null;
 const validNumId=x=>/^[1-9][0-9]{0,16}$/.test(String(x||''))?String(x):null;
 const MAX_RENDER=20000;
 function render(raw,{asSource=false}={}){
  const source=String(raw??'').slice(0,MAX_RENDER).replace(/\r\n?/g,'\n');
  const token=/\[(\/?)((?:b|i|u|s|strike|quote|code|php|html|noparse|url|email|thread|post|img|imgleft|imgright|gallery|attach|ticker|timeframe|risk|evidence|source|color|size|font|left|center|right|justify|indent|highlight|list|\*|spoiler|mention|lang|anchor|anchorlink|hr|table|tr|td|th))(?:=([^\]\n]{1,2048}))?\]/gi;
  let output='',position=0,match;
  const stack=[];const value=x=>esc(x).replace(/\n/g,'<br>');
  const externalImage=src=>{const url=IMG_OK(src);return !url?null:asSource?`<img src="${esc(url)}" loading="lazy" referrerpolicy="no-referrer" alt="Community image">`:`<button type="button" class="gu-external-image" data-external-image="${esc(url)}">Load external image (may contact another website)</button>`};
  const blocks=new Set(['code','html','php','noparse','img','imgleft','imgright','email','thread','post','attach','mention','gallery','anchor','ticker','timeframe']);
  const codeBlock=(lang,body)=>`<pre class="gu-forum-code" data-code-language="${lang}"><code>${esc(body)}</code></pre>`;
  function inlineBlock(tag,body,param){
   if(['code','php','html','noparse'].includes(tag))return tag==='noparse'?value(body):codeBlock(tag,body);
   if(['img','imgleft','imgright'].includes(tag)){
    const img=externalImage(body.trim());return img?`<span class="gu-external-image-wrap gu-${tag}">${img}</span>`:value(body);
   }
   if(tag==='gallery'){
    const urls=[...body.matchAll(/\[img\]([\s\S]*?)\[\/img\]/gi)].slice(0,12).map(m=>externalImage(m[1].trim())).filter(Boolean);
    return urls.length?`<div class="gu-forum-gallery" role="group" aria-label="Image gallery">${urls.join('')}</div>`:value(body);
   }
   if(tag==='url'){const url=URL_OK(body.trim());return url?`<a href="${esc(url)}" rel="ugc nofollow noopener noreferrer" target="_blank">${esc(body.trim())}</a>`:value(body)}
   if(tag==='email'){const address=body.trim();return /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(address)&&address.length<=254?`<a href="mailto:${esc(address)}" rel="nofollow">${esc(address)}</a>`:value(body)}
   if(tag==='thread'||tag==='post'){
    const id=validNumId(body.trim());return id?`<a href="${tag==='thread'?'/market-commons.html?topic=':'/forum-topic.html?id='}${id}" rel="nofollow ugc">${tag==='thread'?'Discussion':'Post'} #${id}</a>`:value(body);
   }
   if(tag==='ticker'){const symbol=body.trim().toUpperCase();return /^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)?`<span class="gu-market-tag" title="Member-provided ticker, not verified market data">$${esc(symbol)}</span>`:value(body)}
   if(tag==='timeframe'){const label=body.trim().toUpperCase();return /^(1M|3M|5M|10M|15M|30M|1H|4H|1D|1W|1MO)$/.test(label)?`<span class="gu-market-tag" title="Timeframe label, not verified chart data">${label}</span>`:value(body)}
   if(tag==='attach')return '<span class="gu-attachment-unavailable">Attachment unavailable until an authorized upload is verified.</span>';
   if(tag==='anchor'){const id=safeId(body.trim());return id?`<span id="gu-anchor-${esc(id)}"></span>`:value(body)}
   if(tag==='mention'){const name=body.trim();return /^[\w.-]{2,40}$/.test(name)?`<span class="gu-member-mention">@${esc(name)}</span>`:value(body)}
   return value(body);
  }
  function open(tag,param){
   if(stack.length>=16)return false;
   let openHTML='',closeHTML='';
   const basic=HTML_TAGS[tag];
   if(basic){
    if(['left','center','right','justify'].includes(tag)){openHTML=`<div class="gu-align-${tag}">`;closeHTML='</div>'}
    else if(tag==='indent'){openHTML='<div class="gu-indent">';closeHTML='</div>'}
    else if(tag==='quote'){openHTML='<blockquote>';if(param&&param.length<=80)openHTML+=`<cite>${esc(param)}</cite>`;closeHTML='</blockquote>'}
    else{openHTML=`<${basic}>`;closeHTML=`</${basic}>`}
   }else if(tag==='list'){const selected=String(param||''),style=['1','a','A','i','I'].includes(selected)?selected:null;openHTML=style?`<ol type="${style}">`:'<ul>';closeHTML=style?'</ol>':'</ul>'}
   else if(tag==='risk'){openHTML='<aside class="gu-trade-risk-note"><strong>Risk considerations (member statement)</strong><div>';closeHTML='</div></aside>'}
   else if(tag==='evidence'){openHTML='<blockquote class="gu-market-evidence"><strong>Member-provided evidence</strong><div>';closeHTML='</div></blockquote>'}
   else if(tag==='source'){const url=URL_OK(param);if(!url)return false;openHTML=`<a href="${esc(url)}" target="_blank" rel="ugc nofollow noopener noreferrer" title="User-supplied citation, not independently verified">`;closeHTML='</a>'}
   else if(tag==='url'){const url=URL_OK(param);if(!url)return false;openHTML=`<a href="${esc(url)}" target="_blank" rel="ugc nofollow noopener noreferrer">`;closeHTML='</a>'}
   else if(tag==='color'){const color=safeColor(param);if(!color)return false;openHTML=`<span style="color:${esc(color)}">`;closeHTML='</span>'}
   else if(tag==='size'){const n=Number(param),actual=Number.isInteger(n)&&n>=1&&n<=7?[11,13,15,17,20,24,28][n-1]:n;if(!Number.isInteger(actual)||actual<10||actual>28)return false;openHTML=`<span style="font-size:${actual}px">`;closeHTML='</span>'}
   else if(tag==='font'){const family=FONTS[String(param||'').toLowerCase()];if(!family)return false;openHTML=`<span style="font-family:${esc(family)}">`;closeHTML='</span>'}
   else if(tag==='spoiler'){openHTML=`<details class="gu-forum-spoiler"><summary>${esc((param||'Show hidden content').slice(0,100))}</summary>`;closeHTML='</details>'}
   else if(tag==='lang'){if(!/^[a-z]{2,3}(?:-[a-z]{2})?$/i.test(param||''))return false;openHTML=`<span lang="${esc(param)}">`;closeHTML='</span>'}
   else if(tag==='anchor'){const name=safeId(param);if(!name)return false;openHTML=`<span id="gu-anchor-${esc(name)}">`;closeHTML='</span>'}
   else if(tag==='anchorlink'){const name=safeId(param);if(!name)return false;openHTML=`<a href="#gu-anchor-${esc(name)}">`;closeHTML='</a>'}
   else if(tag==='table'){openHTML='<div class="gu-forum-table-wrap"><table><tbody>';closeHTML='</tbody></table></div>'}
   else if(tag==='tr'){if(!stack.some(x=>x.tag==='table'))return false;openHTML='<tr>';closeHTML='</tr>'}
   else if(['td','th'].includes(tag)){if(!stack.some(x=>x.tag==='tr'))return false;openHTML=`<${tag}>`;closeHTML=`</${tag}>`}
   else return false;
   stack.push({tag,closeHTML,hasItem:false});output+=openHTML;return true;
  }
  function close(tag){const last=stack.at(-1);if(!last||last.tag!==tag)return false;if(tag==='list'&&last.hasItem)output+='</li>';output+=last.closeHTML;stack.pop();return true}
  while((match=token.exec(source))){
   output+=value(source.slice(position,match.index));position=token.lastIndex;
   const literal=match[0],slash=match[1],tag=match[2].toLowerCase(),param=match[3];
   if(!slash&&tag==='*'){const list=[...stack].reverse().find(x=>x.tag==='list');if(list&&stack.at(-1)?.tag==='list'){if(list.hasItem)output+='</li>';output+='<li>';list.hasItem=true}else output+=value(literal);continue}
   if(!slash&&tag==='hr'){output+='<hr>';const next='[/hr]';if(source.slice(position,position+next.length).toLowerCase()===next){position+=next.length;token.lastIndex=position}continue}
   if(!slash&&(blocks.has(tag)||(tag==='url'&&!param))){
    const closing=`[/${tag}]`,index=source.toLowerCase().indexOf(closing,position);
    if(index<0){output+=value(literal);continue}
    const body=source.slice(position,index);output+=inlineBlock(tag,body,param);position=index+closing.length;token.lastIndex=position;continue;
   }
   if(slash){if(!close(tag))output+=value(literal)}else if(!open(tag,param))output+=value(literal);
  }
  output+=value(source.slice(position));while(stack.length){const last=stack.pop();if(last.tag==='list'&&last.hasItem)output+='</li>';output+=last.closeHTML}
  return output;
 }
 function htmlToBBCode(html){
  const doc=new DOMParser().parseFromString(String(html??'').slice(0,24000),'text/html');
  const discarded=new Set(['script','style','iframe','object','embed','svg','math','template','form','input','textarea','select','video','audio','link','meta','base']);
  const convert=node=>{
   if(node.nodeType===3)return node.nodeValue||'';
   if(node.nodeType!==1)return '';
   const name=node.localName.toLowerCase();if(discarded.has(name))return '';
   const children=()=>Array.from(node.childNodes).map(convert).join('');
   let inner;switch(name){
    case 'br':return '\n';
    case 'hr':return '[hr][/hr]\n';
    case 'mark':return '[highlight]'+children()+'[/highlight]';
    case 'details':{const summary=node.querySelector(':scope > summary');const title=(summary?.textContent||'').slice(0,100).replace(/[\]\n]/g,'');const inner=Array.from(node.childNodes).filter(x=>x!==summary).map(convert).join('');return '[spoiler'+(title?'='+title:'')+']'+inner+'[/spoiler]\n'}
    case 'table':return '[table]'+children()+'[/table]\n';
    case 'tbody':case 'thead':return children();
    case 'tr':return '[tr]'+children()+'[/tr]';
    case 'th':return '[th]'+children()+'[/th]';
    case 'td':return '[td]'+children()+'[/td]';
    case 'img':{const src=IMG_OK(node.getAttribute('src'));return src?'[img]'+src+'[/img]':''}
    case 'a':{const href=URL_OK(node.getAttribute('href'));inner=children();if(href&&node.getAttribute('title')==='User-supplied citation, not independently verified')return `[source=${href}]${inner}[/source]`;const hash=node.getAttribute('href')||'';if(/^#gu-anchor-[\w-]{1,51}$/.test(hash))return '[anchorlink='+hash.slice(11)+']'+inner+'[/anchorlink]';return href?`[url=${href}]${inner}[/url]`:inner}
    case 'b':case 'strong':return '[b]'+children()+'[/b]';
    case 'i':case 'em':return '[i]'+children()+'[/i]';
    case 'u':return '[u]'+children()+'[/u]';
    case 's':case 'del':case 'strike':return '[s]'+children()+'[/s]';
    case 'aside':{if(node.classList?.contains('gu-trade-risk-note'))return '[risk]'+(node.querySelector('div')?.textContent||'')+'[/risk]\n';return children()}
    case 'blockquote':{if(node.classList?.contains('gu-market-evidence'))return '[evidence]'+(node.querySelector('div')?.textContent||'')+'[/evidence]\n';const author=node.querySelector(':scope > cite'),name=(author?.textContent||'').slice(0,80).replace(/[\]\n]/g,'');const content=Array.from(node.childNodes).filter(x=>x!==author).map(convert).join('');return '[quote'+(name?'='+name:'')+']'+content+'[/quote]\n'}
    case 'code':case 'pre':{const lang=node.getAttribute('data-code-language');const tag=['html','php'].includes(lang)?lang:'code';return '['+tag+']'+(node.textContent||'').replace(new RegExp('\\[/'+tag+'\\]','gi'),'[/ '+tag+' ]')+'[/'+tag+']\n'}
    case 'ul':case 'ol':{let bullets='';for(const child of Array.from(node.children)){if(child.localName.toLowerCase()==='li')bullets+='[*]'+Array.from(child.childNodes).map(convert).join('')+'\n'}return '[list'+(name==='ol'?'='+(node.getAttribute('type')||'1'):'')+']'+bullets+'[/list]\n'}
    case 'li':return '[*]'+children()+'\n';
    case 'h1':case 'h2':case 'h3':return '\n[b]'+children()+'[/b]\n';
    case 'div':case 'p':{
      inner=children();const cls=node.className||'';if(typeof cls==='string'&&cls.includes('gu-forum-gallery'))return '[gallery]'+inner+'[/gallery]\n';
      const align=String(node.getAttribute('align')||node.style.textAlign||(/^gu-align-(left|center|right|justify)$/.test(cls)?cls.slice(9):'')).toLowerCase();if(['center','left','right','justify'].includes(align))return '['+align+']'+inner+'[/'+align+']\n';if(cls==='gu-indent')return '[indent]'+inner+'[/indent]\n';return inner+'\n';
    }
    case 'font':case 'span':{
      inner=children();if(node.classList?.contains('gu-market-tag')){const title=node.getAttribute('title')||'';const val=node.textContent||'';if(title.includes('ticker'))return '[ticker]'+val.replace(/^\$/,'')+'[/ticker]';if(title.includes('Timeframe'))return '[timeframe]'+val+'[/timeframe]'}if(node.classList?.contains('gu-member-mention'))return '[mention]'+inner.replace(/^@/,'')+'[/mention]';
      if(node.classList?.contains('gu-external-image-wrap'))return children();
      if(node.id?.startsWith('gu-anchor-'))return '[anchor='+node.id.slice(10)+']'+inner+'[/anchor]';const color=(node.getAttribute('color')||node.style.color||'').trim(),sz=Number((node.getAttribute('size')||node.style.fontSize||'').replace('px','')),font=(node.getAttribute('face')||node.style.fontFamily||'').trim().replace(/["']/g,'');
      const normalizedColor=/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/i.exec(color);
      const safeColor=COLORS.test(color)?color:normalizedColor&&normalizedColor.slice(1).every(v=>Number(v)<=255)?'#'+normalizedColor.slice(1).map(v=>Number(v).toString(16).padStart(2,'0')).join(''):null;
      if(safeColor)inner=`[color=${safeColor}]${inner}[/color]`;
      if(Number.isInteger(sz)&&sz>=10&&sz<=28)inner=`[size=${sz}]${inner}[/size]`;
      if(FONTS[font.toLowerCase()])inner=`[font=${FONTS[font.toLowerCase()]}]${inner}[/font]`;
      return inner;
    }
    default:return children();
   }
  };
  return Array.from(doc.body.childNodes).map(convert).join('').replace(/\n{3,}/g,'\n\n').trim();
 }
 function wrap(area,open,close='',cursor=open.length){const first=area.selectionStart,last=area.selectionEnd,chosen=area.value.slice(first,last);area.setRangeText(open+chosen+close,first,last,'end');area.focus();area.setSelectionRange(first+cursor,first+cursor+chosen.length);area.dispatchEvent(new Event('input',{bubbles:true}))}
 const toolbarButtons=[
  ['B','Bold','[b]','[/b]'],['I','Italic','[i]','[/i]'],['U','Underline','[u]','[/u]'],['S','Strike','[strike]','[/strike]'],
  ['“','Quote','[quote]','[/quote]'],['</>','Code','[code]','[/code]'],['<html>','Show HTML code','[html]','[/html]'],
  ['• List','Bulleted list','[list][*]','[/list]'],['1. List','Numbered list','[list=1][*]','[/list]'],
  ['Spoiler','Expandable spoiler','[spoiler]','[/spoiler]'],['Mark','Highlight','[highlight]','[/highlight]'],
  ['◀','Left','[left]','[/left]'],['☷','Center','[center]','[/center]'],['▶','Right','[right]','[/right]'],
  ['≡','Justify','[justify]','[/justify]'],['↳','Indent','[indent]','[/indent]'],['―','Divider','[hr]','[/hr]'],
  ['Risk','Trading risk note','[risk]','[/risk]'],['Evidence','Evidence note','[evidence]','[/evidence]']
 ];
 const icons=['🙂','😃','😎','😂','👍','👏','✅','📈','📉','⚠️','💡','📊','❓','🧠','🚀','🎯'];
 const targetSelector='textarea[data-forum-composer],textarea[data-rich-content],.v01411-ann-editor textarea[name="body"],.v01415-notice-manager form[data-create] textarea[name="body"],.v01415-inline-edit textarea,.gu-forum-edit-dialog textarea,.v1354-moderation-inspector textarea[data-mod-body]';
 const draftKeys=new WeakMap();
 function draftKey(area){const form=area.closest('form'),route=location.pathname,owner=(document.body?.dataset?.authUserId||'not-specified'),id=area.id||area.name||'body';return `gu:v01417:draft:${owner}:${route}:${form?.id||'form'}:${id}`}
 function attach(area,{previewTitle='Formatted message preview'}={}){
  if(!area||area.dataset.guComposer==='1')return;
  area.dataset.guComposer='1';
  const frame=document.createElement('section');frame.className='gu-forum-editor';
  const bar=document.createElement('div');bar.className='gu-forum-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Text formatting');
  const status=document.createElement('p');status.className='gu-forum-editor-status';status.setAttribute('role','status');
  let lastVisualRange=null;let visual;
  function insertVisual(open,close){const selected=window.getSelection(),range=(selected?.rangeCount&&visual.contains(selected.getRangeAt(0).commonAncestorContainer)?selected.getRangeAt(0):lastVisualRange)?.cloneRange();if(!range){status.textContent='Click inside the visual editor before applying formatting.';return}const chosen=range.toString(),html=render(open+chosen+close,{asSource:true});const template=document.createElement('template');template.innerHTML=html;const fragment=template.content,last=fragment.lastChild;range.deleteContents();range.insertNode(fragment);if(last){range.setStartAfter(last);range.collapse(true);selected.removeAllRanges();selected.addRange(range);lastVisualRange=range.cloneRange()}visual.focus();visual.dispatchEvent(new Event('input',{bubbles:true}))}
  function format(open,close=''){if(mode.value==='visual')insertVisual(open,close);else wrap(area,open,close)}
  const label=document.createElement('label');label.textContent='Editor';const mode=document.createElement('select');mode.setAttribute('aria-label','Editor mode');for(const [value,title] of [['standard','Standard BBCode'],['visual','Visual editor'],['basic','Basic text']]){const opt=document.createElement('option');opt.value=value;opt.textContent=title;mode.append(opt)}label.append(mode);bar.append(label);
  const buttons=[];
  for(const [symbol,title,opening,closing] of toolbarButtons){const btn=document.createElement('button');btn.type='button';btn.className='gu-format-btn';btn.title=title;btn.setAttribute('aria-label',title);btn.textContent=symbol;btn.addEventListener('click',()=>format(opening,closing));bar.append(btn);buttons.push(btn)}
  const addSelect=(name,items,make)=>{const label=document.createElement('label');label.textContent=name;const sel=document.createElement('select');sel.setAttribute('aria-label',name);for(const [val,txt] of items){const opt=document.createElement('option');opt.value=val;opt.textContent=txt;sel.append(opt)}sel.addEventListener('change',()=>{if(sel.value){const pair=make(sel.value);format(pair[0],pair[1])}sel.value=''});label.append(sel);bar.append(label);return sel};
  addSelect('Font',[['','Font'],...Object.values(FONTS).map(x=>[x,x])],value=>[`[font=${value}]`,'[/font]']);
  addSelect('Size',[['','Size'],...['12','14','16','18','20','24','28'].map(x=>[x,x+'px'])],value=>[`[size=${value}]`,'[/size]']);
  const color=document.createElement('label');color.textContent='Text color';const picker=document.createElement('input');picker.type='color';picker.value='#f1d279';picker.setAttribute('aria-label','Text color');picker.addEventListener('change',()=>format(`[color=${picker.value}]`,'[/color]'));color.append(picker);bar.append(color);
  function textButton(label,onClick){const b=document.createElement('button');b.type='button';b.className='gu-format-btn';b.textContent=label;b.onclick=onClick;bar.append(b);buttons.push(b);return b}
  textButton('Link',()=>{const raw=prompt('Enter a complete http:// or https:// link');if(raw===null)return;const u=URL_OK(raw);if(!u){status.textContent='A valid web link is required.';return}format(`[url=${u}]`,'[/url]')});
  textButton('Image URL',()=>{const raw=prompt('Paste a public HTTPS image URL');if(raw===null)return;const u=IMG_OK(raw);if(!u){status.textContent='Images require an HTTPS URL.';return}format(`[img]${u}[/img]`)});
  textButton('Ticker',()=>{const raw=prompt('Ticker symbol (example: AAPL)');if(raw===null)return;const symbol=raw.trim().toUpperCase();if(!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol)){status.textContent='Invalid ticker format.';return}format(`[ticker]${symbol}[/ticker]`,'')});
  textButton('Timeframe',()=>{const raw=prompt('Timeframe (1m, 3m, 5m, 15m, 1h, 1d, 1w)');if(raw===null)return;const val=raw.trim().toUpperCase();if(!/^(1M|3M|5M|10M|15M|30M|1H|4H|1D|1W|1MO)$/.test(val)){status.textContent='Unsupported timeframe.';return}format(`[timeframe]${val}[/timeframe]`,'')});
  textButton('Citation',()=>{const raw=prompt('Paste a full HTTPS source URL');if(raw===null)return;const url=URL_OK(raw);if(!url||!url.startsWith('https:')){status.textContent='Citation requires a secure HTTPS link.';return}format(`[source=${url}]`,'[/source]')});
  textButton('Mention',()=>{const name=prompt('Enter a forum username (no @ symbol)');if(name===null)return;if(!/^[\w.-]{2,40}$/.test(name)){status.textContent='Use a valid 2–40 character username.';return}format(`[mention]${name}[/mention]`,'')});
  textButton('Table',()=>format('[table][tr][th]Column 1[/th][th]Column 2[/th][/tr][tr][td]','[/td][td]Value[/td][/tr][/table]'));
  textButton('Named spoiler',()=>{const title=prompt('Spoiler title (maximum 100 characters)','Additional information');if(title===null)return;format(`[spoiler=${title.replace(/[\]\n]/g,'').slice(0,100)}]`,'[/spoiler]')});
  addSelect('Emoji',[['','Emoji'],...icons.map(x=>[x,x])],value=>[value,'']);
  const count=document.createElement('span');count.className='gu-forum-counter';bar.append(count);
  const sourceButton=textButton('HTML source',()=>{});sourceButton.setAttribute('aria-expanded','false');
  const previewButton=textButton('Preview',()=>{});previewButton.setAttribute('aria-expanded','false');
  const draftButton=textButton('Save private draft',()=>{});
  const autoLabel=document.createElement('label');autoLabel.className='gu-autosave-option';const autoToggle=document.createElement('input');autoToggle.type='checkbox';autoToggle.setAttribute('aria-label','Autosave draft locally');autoLabel.append(autoToggle,'Autosave');bar.append(autoLabel);
  const restoreButton=textButton('Restore draft',()=>{});
  const clearDraftButton=textButton('Discard draft',()=>{});
  const source=document.createElement('div');source.className='gu-source-panel';source.hidden=true;
  const explanation=document.createElement('p');explanation.textContent='HTML is imported into safe BBCode. Script tags, event handlers, iframes, embeds, and arbitrary CSS are discarded.';
  const htmlArea=document.createElement('textarea');htmlArea.rows=8;htmlArea.setAttribute('aria-label','HTML source editor');htmlArea.setAttribute('spellcheck','false');
  const sourceActions=document.createElement('div');sourceActions.className='actions';const apply=document.createElement('button');apply.type='button';apply.className='gu-format-btn';apply.textContent='Apply safe HTML';const cancel=document.createElement('button');cancel.type='button';cancel.className='gu-format-btn';cancel.textContent='Cancel HTML editing';sourceActions.append(apply,cancel);source.append(explanation,htmlArea,sourceActions);
  const preview=document.createElement('div');preview.className='gu-forum-preview gu-rich-rendered';preview.hidden=true;preview.setAttribute('role','region');preview.setAttribute('aria-label',previewTitle);
  visual=document.createElement('div');visual.className='gu-wysiwyg gu-rich-rendered';visual.setAttribute('role','textbox');visual.setAttribute('aria-multiline','true');visual.setAttribute('aria-label','Visual formatted message editor');visual.contentEditable='true';visual.spellcheck=true;visual.hidden=true;
  const help=document.createElement('p');help.className='gu-rich-help';help.textContent='Standard: write BBCode. Visual: edit formatted content; switch back to save safe BBCode. HTML Source imports a safe subset only. Drafts stay on this device in this browser, not your account.';
  const parent=area.parentNode;parent.insertBefore(frame,area);frame.append(bar,area,visual,source,preview,status,help);
  function refresh(){count.textContent=area.value.length+(area.maxLength>0?` / ${area.maxLength}`:'');if(!preview.hidden)preview.innerHTML=render(area.value)||'<em>Nothing to preview.</em>'}
  function validLength(val){if(area.maxLength>0&&val.length>area.maxLength){status.textContent='This message exceeds the '+area.maxLength+' character limit.';return false}return true}
  function commitHTML(){const converted=htmlToBBCode(htmlArea.value);if(!validLength(converted))return false;area.value=converted;area.dispatchEvent(new Event('input',{bubbles:true}));source.hidden=true;sourceButton.setAttribute('aria-expanded','false');sourceButton.textContent='HTML source';area.hidden=mode.value!=='standard';status.textContent='HTML converted to safe BBCode.';refresh();return true}
  function commitVisual(){const converted=htmlToBBCode(visual.innerHTML);if(!validLength(converted))return false;area.value=converted;area.dispatchEvent(new Event('input',{bubbles:true}));visual.hidden=true;refresh();return true}
  function insertSafeHTML(value){const safe=render(htmlToBBCode(value),{asSource:true});const selection=window.getSelection();if(!selection||selection.rangeCount===0)return;const range=selection.getRangeAt(0);range.deleteContents();const template=document.createElement('template');template.innerHTML=safe;const fragment=template.content;const last=fragment.lastChild;range.insertNode(fragment);if(last){range.setStartAfter(last);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}}
  visual.addEventListener('keyup',()=>{const selected=window.getSelection();if(selected?.rangeCount&&visual.contains(selected.getRangeAt(0).commonAncestorContainer))lastVisualRange=selected.getRangeAt(0).cloneRange()});
  visual.addEventListener('mouseup',()=>{const selected=window.getSelection();if(selected?.rangeCount&&visual.contains(selected.getRangeAt(0).commonAncestorContainer))lastVisualRange=selected.getRangeAt(0).cloneRange()});
  bar.addEventListener('mousedown',e=>{if(mode.value==='visual'&&e.target.closest('button'))e.preventDefault()});
  visual.addEventListener('paste',e=>{e.preventDefault();const txt=e.clipboardData?.getData('text/html')||esc(e.clipboardData?.getData('text/plain')||'');insertSafeHTML(txt)});
  visual.addEventListener('drop',e=>{e.preventDefault();status.textContent='File drops are disabled until secure uploads and scanning are available.'});
  visual.addEventListener('input',()=>{count.textContent=visual.textContent.length+' characters (visual draft)';if(autoToggle.checked){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{const draft=htmlToBBCode(visual.innerHTML);if(validLength(draft)){try{sessionStorage.setItem(key,JSON.stringify({text:draft,at:new Date().toISOString()}))}catch{}}},2000)}});
  function changeMode(){if(!source.hidden&&!commitHTML()){mode.value='standard';return}if(mode.value==='visual'){area.hidden=true;visual.hidden=false;visual.innerHTML=render(area.value,{asSource:true});visual.focus();status.textContent='Visual mode: your changes are converted to BBCode before submission.'}
   else {if(!visual.hidden&&!commitVisual()){mode.value='visual';return}visual.hidden=true;area.hidden=false;area.readOnly=false;area.focus();status.textContent=mode.value==='basic'?'Basic mode: type plain text or BBCode.':'Standard BBCode mode.'}
   for(const b of buttons)b.hidden=mode.value==='basic'&&b!==sourceButton&&b!==previewButton&&b!==draftButton&&b!==restoreButton&&b!==clearDraftButton;
  }
  mode.addEventListener('change',changeMode);
  sourceButton.onclick=()=>{if(!visual.hidden&&!commitVisual())return;if(source.hidden){htmlArea.value=render(area.value,{asSource:true});source.hidden=false;area.hidden=true;sourceButton.textContent='Close HTML';sourceButton.setAttribute('aria-expanded','true');htmlArea.focus()}else commitHTML()};
  apply.onclick=commitHTML;cancel.onclick=()=>{source.hidden=true;area.hidden=mode.value==='visual';sourceButton.textContent='HTML source';sourceButton.setAttribute('aria-expanded','false');status.textContent='Unsaved HTML discarded.'};
  previewButton.onclick=()=>{if(!source.hidden&&!commitHTML())return;if(!visual.hidden&&!commitVisual())return;preview.hidden=!preview.hidden;previewButton.textContent=preview.hidden?'Preview':'Hide preview';previewButton.setAttribute('aria-expanded',String(!preview.hidden));refresh()};
  const key=draftKey(area);draftKeys.set(area,key);let autosaveTimer=null;function saveDraft(silent=false){try{sessionStorage.setItem(key,JSON.stringify({text:area.value,at:new Date().toISOString()}));if(!silent)status.textContent='Private draft saved for this browser session only.';return true}catch{status.textContent='Draft storage is unavailable.';return false}}
  autoToggle.addEventListener('change',()=>{if(autoToggle.checked){status.textContent='Autosave enabled for this browser session. Drafts are stored on this device only.';saveDraft(true)}else status.textContent='Autosave disabled.'});
  function autoSave(){if(!autoToggle.checked)return;clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{if(!source.hidden||!visual.hidden)return;saveDraft(true)},1500)}
  draftButton.onclick=()=>{if(!source.hidden&&!commitHTML())return;if(!visual.hidden&&!commitVisual())return;saveDraft()};
  restoreButton.onclick=()=>{try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(!saved?.text){status.textContent='No saved draft for this field.';return}if(!validLength(saved.text))return;if(area.value.trim()&&!confirm('Replace the current message with your saved draft?'))return;area.value=saved.text;area.dispatchEvent(new Event('input',{bubbles:true}));if(!visual.hidden)visual.innerHTML=render(area.value,{asSource:true});status.textContent='Private draft restored.'}catch{status.textContent='Draft could not be restored.'}};
  clearDraftButton.onclick=()=>{try{sessionStorage.removeItem(key);status.textContent='Saved draft discarded.'}catch{status.textContent='Draft storage is unavailable.'}};
  area.addEventListener('input',()=>{refresh();autoSave()});
  const form=area.closest('form');form?.addEventListener('submit',e=>{if(!source.hidden&&!commitHTML()||!visual.hidden&&!commitVisual()){e.preventDefault();e.stopImmediatePropagation()}},{capture:true});
  refresh();
 }
 function decorateAll(root=document){if(root.nodeType===1&&root.matches?.(targetSelector))attach(root);root.querySelectorAll?.(targetSelector).forEach(el=>attach(el))}
 const paintSelectors=['.v01411-public-announcement p','.gu-alert-announcement p','.fe-notification p','.v01411-ann-item p:not(.small)','.v01415-notice-item > p:nth-of-type(2)'];
 const livePreviewSelector='.v01414-ann-preview [data-preview-body]';
 function decorateReadOnly(root=document){
  if(root.nodeType===1&&root.matches?.(livePreviewSelector))paintLivePreview(root);
  root.querySelectorAll?.(livePreviewSelector).forEach(paintLivePreview);
  for(const css of paintSelectors){if(root.nodeType===1&&root.matches?.(css))paint(root);root.querySelectorAll?.(css).forEach(paint)}
 }
 function paintLivePreview(el){const content=el.textContent||'';if(content===el.dataset.guRichRenderedText)return;el.innerHTML=render(content);el.dataset.guRichRenderedText=el.textContent;el.classList.add('gu-rich-rendered')}
 function paint(el){if(el.dataset.guRichPainted==='1')return;const raw=el.textContent||'';el.dataset.guRichPainted='1';el.classList.add('gu-rich-rendered');el.innerHTML=render(raw)}
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-external-image]');if(!b)return;const url=IMG_OK(b.dataset.externalImage);if(!url)return;const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.alt='Community-submitted image';img.src=url;b.replaceWith(img)});
 function scan(root=document){decorateAll(root);decorateReadOnly(root)}
 const pending=new Set();let scheduled=false;
 function enqueue(root){if(root?.nodeType===1)pending.add(root);if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;const jobs=[...pending];pending.clear();jobs.forEach(scan)},0)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(document),{once:true});else scan(document);
 new MutationObserver(mutations=>{for(const m of mutations){if(!m.addedNodes?.length)continue;for(const node of m.addedNodes){if(node.nodeType===1)enqueue(node);else if(node.nodeType===3&&m.target?.nodeType===1)enqueue(m.target)}}}).observe(document.documentElement,{childList:true,subtree:true});
 window.GroundUpForumEditor={version:'v0.14.0.17',attach,decorateAll,render,esc,htmlToBBCode,decorateReadOnly};
})();
