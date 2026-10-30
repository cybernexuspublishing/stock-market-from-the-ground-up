/* Owner-only four-EPUB batch intake. Reuses existing private Storage and
 * guarded gu_owner_digital_register_v014304 version ledger; never activates sales. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const RULES=Object.freeze([
 {code:'FOUNDATION_BOOK_2',name:'Foundations Book II',match:/^02_Foundations_Book_II_v1\.15_EDITORIAL\.epub$/i},
 {code:'FOUNDATION_BOOK_3',name:'Foundations Book III WITH RCT',match:/^03_Foundations_Book_III_WITH_RCT_v1\.15_EDITORIAL\.epub$/i},
 {code:'DAY_TRADING_BOOK_1',name:'Day Trading',match:/^04_Day_Trading_EDITORIAL\.epub$/i},
 {code:'READING_THE_TAPE',name:'Reading the Tape',match:/^05_Reading_the_Tape_EDITORIAL\.epub$/i}
]);
const node=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n};
function selectFiles(files){
 const items=[];const found=new Set(),errors=[];
 for(const file of files){
  const rule=RULES.find(r=>r.match.test(file.name));
  if(!rule){errors.push('Unrecognized file: '+file.name);continue}
  if(found.has(rule.code)){errors.push('Duplicate title: '+rule.name);continue}
  found.add(rule.code);
  if(file.size<1||file.size>50*1024*1024){errors.push('Out of range (max 50 MB): '+file.name);continue}
  items.push({rule,file});
 }
 if(items.length!==RULES.length)errors.push('Select the four specified editorial EPUBs together.');
 return {items,errors};
}
async function guardedRpc(sb,name,args){
 const {data,error}=await sb.rpc(name,args);
 if(error)throw Error(error.message||'Owner publishing request denied');
 return data;
}
async function validateFile(file){
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
 if(bytes.length<4||bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)
  throw Error('Not an EPUB ZIP file: '+file.name);
}
function mount(){
 const target=document.getElementById('admin-catalog-list');
 if(!target||document.getElementById('admin-book-batch-upload'))return Boolean(target);
 const shell=node('section');shell.id='admin-book-batch-upload';
 shell.className='admin-card';
 shell.setAttribute('aria-label','Owner private book batch upload');
 const title=node('h3','Batch upload the four revised EPUBs');
 const intro=node('p','Choose the four provided EPUB files together. Each is uploaded privately and recorded under its matching book. Uploading does not enable sales, issue downloads, or verify publication rights.');
 const input=node('input');input.type='file';input.multiple=true;input.accept='.epub,application/epub+zip';
 input.setAttribute('aria-label','Select all four editorial EPUB files');
 const action=node('button','Upload all four privately');action.type='button';action.className='btn secondary';action.disabled=true;
 const status=node('p','Select four EPUBs to prepare the batch.');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const results=node('div');results.className='gu-book-batch-results';
 const preview=node('div');preview.className='gu-book-batch-preview';
 shell.append(title,intro,input,preview,action,status,results);
 const heading=target.closest('.product-inventory-section');
 if(heading&&heading.parentNode)heading.parentNode.insertBefore(shell,heading);
 else target.parentNode?.insertBefore(shell,target);
 let selected=null,processing=false;
 input.addEventListener('change',()=>{
  selected=selectFiles(input.files||[]);
  action.disabled=selected.errors.length>0||processing;
  preview.replaceChildren();
  for(const item of selected.items){
   const p=node('p',item.rule.name+' — '+item.file.name+' ('+(item.file.size/1048576).toFixed(2)+' MB)');
   preview.append(p);
  }
  status.textContent=selected.errors.length?selected.errors.join(' '):
   'Four files recognized. Select Upload all four privately when ready.';
 });
 action.addEventListener('click',async()=>{
  if(processing||!selected||selected.errors.length)return;
  processing=true;action.disabled=true;input.disabled=true;results.replaceChildren();
  const completed=[],failed=[];
  try{
   if(!window.GroundUpAdminPasswordConfirm?.ensure)throw Error('Owner password verification is unavailable.');
   await window.GroundUpAdminPasswordConfirm.ensure();
   const sb=await window.getSupabaseClient();
   const {data:auth,error:authError}=await sb.auth.getSession();
   if(authError||!auth?.session?.access_token)throw Error('Owner authentication required.');
   // The existing Owner-only protected inventory RPC is the authorization
   // preflight; never create a duplicate API or bypass private upload policies.
   const inventory=await guardedRpc(sb,'gu_owner_digital_books_get_v01430',{});
   const allowed=new Set((inventory?.products||[]).map(p=>p.code));
   if(!selected.items.every(item=>allowed.has(item.rule.code)))
    throw Error('Some book codes are not authorized by the protected Owner publishing registry.');
   for(const item of selected.items){
    const code=item.rule.code;
    try{
     await validateFile(item.file);
     const prior=await guardedRpc(sb,'gu_owner_digital_history_v014304',{p_code:code});
     if((prior?.versions||[]).some(v=>v.fileExists&&v.fileSize===item.file.size&&v.originalName===item.file.name))
      throw Error('This exact edition may already be uploaded; inspect its history before adding another version.');
     const path=code+'/'+crypto.randomUUID()+'.epub';
     status.textContent='Uploading '+item.rule.name+' to private storage…';
     const {error}=await sb.storage.from('gu-digital-ebooks').upload(path,item.file,{
      upsert:false,cacheControl:'0',contentType:'application/epub+zip'});
     if(error)throw error;
     await guardedRpc(sb,'gu_owner_digital_register_v014304',{
      p_code:code,p_path:path,p_expected_version:null
     });
     completed.push(item.rule.name);
     results.append(node('p','Registered privately: '+item.rule.name+' — version recorded (sales OFF).'));
    }catch(e){
     failed.push(item.rule.name+': '+String(e.message||e));
     results.append(node('p','Needs attention: '+item.rule.name+' — '+String(e.message||e)));
    }
   }
   status.textContent='Batch result: '+completed.length+' of '+selected.items.length+
    ' editions privately registered. '+(failed.length?'Review the failures below.':'No upload failures.')+
    ' Publishing and LIVE checkout must be approved separately.';
  }catch(e){status.textContent='Upload not completed: '+String(e.message||e)}
  finally{processing=false;input.disabled=false;action.disabled=false}
 });
 return true;
}
let n=0;const timer=setInterval(()=>{if(mount()||++n>=60)clearInterval(timer)},500);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})();
