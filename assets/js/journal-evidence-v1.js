/* Private screenshots for existing Journal records. RLS and bucket ownership
 * are enforced in Supabase, not by browser labels. No public image URL.
 */
(function(){
'use strict';
const BUCKET='gu-journal-evidence',MAX=6,MAX_BYTES=5*1024*1024;
const $=id=>document.getElementById(id);
const text=(tag,content)=>{const e=document.createElement(tag);e.textContent=content;return e};
function build(){
 const parent=$('entry-form');if(!parent||$('gu-evidence-panel'))return;
 const panel=document.createElement('section');panel.id='gu-evidence-panel';
 panel.className='journal-card journal-section gu-evidence-panel';
 panel.setAttribute('aria-labelledby','gu-evidence-title');
 panel.innerHTML=`<h2 id="gu-evidence-title">Supporting chart evidence</h2>
 <p class="journal-small">Private screenshots are supporting material, not authenticated exchange data or proof of when a decision occurred. The upload time is recorded by the server. Capture time and the before-decision claim are self-reported.</p>
 <div class="journal-grid two">
 <div><label for="gu-evidence-stage">Evidence stage</label><select id="gu-evidence-stage"><option value="plan">Pre-trade plan</option><option value="entry">Entry</option><option value="exit">Exit</option><option value="review">Later review</option></select></div>
 <div><label for="gu-evidence-source-time">Chart capture time (optional, self-reported)</label><input id="gu-evidence-source-time" type="datetime-local"></div>
 </div>
 <label for="gu-evidence-note">Chart annotation / explanation (max. 500 characters)</label>
 <textarea id="gu-evidence-note" rows="2" maxlength="500" placeholder="Example: VWAP reclaim, entry trigger, planned stop and why they mattered"></textarea>
 <label class="gu-evidence-checkbox" for="gu-evidence-before"><input id="gu-evidence-before" type="checkbox"> I report that this image was captured before the decision (not independently verified)</label>
 <label for="gu-evidence-file">Image (PNG, JPEG or WebP; up to 5 MB)</label>
 <input id="gu-evidence-file" type="file" accept="image/png,image/jpeg,image/webp">
 <div class="journal-actions"><button type="button" class="btn" id="gu-evidence-add">Save private screenshot</button><button type="button" class="btn secondary" id="gu-evidence-refresh">Refresh evidence</button></div>
 <p id="gu-evidence-status" role="status" aria-live="polite"></p>
 <div id="gu-evidence-list" class="gu-evidence-list"></div>`;
 parent.append(panel);
 return panel;
}
async function start(){
 const panel=build();if(!panel)return;
 const notice=$('gu-evidence-status'),list=$('gu-evidence-list'),add=$('gu-evidence-add');
 const error=(message)=>{notice.textContent=message||''};
 let sb,user,id,active=true,busy=false;
 try{
   id=Number(new URLSearchParams(location.search).get('id'));
   if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid Journal record ID.');
   sb=await window.getSupabaseClient();
   const {data:{user:current},error:authError}=await sb.auth.getUser();
   if(authError||!current)throw Error('Sign in to manage your private chart evidence.');
   user=current;
   const {data, error:rowError}=await sb.from('decision_journal').select('id')
     .eq('id',id).eq('user_id',user.id).maybeSingle();
   if(rowError||!data)throw Error('Journal record is unavailable to this account.');
   sb.auth.onAuthStateChange((_event,session)=>{
     if(session?.user?.id!==user.id){active=false;list.replaceChildren();add.disabled=true;error('Account session changed. Reload under your own account.')}
   });
 }catch(e){add.disabled=true;error(e.message);return;}
 function assertActive(){if(!active)throw Error('The account session changed. Reload this page.')}
 async function load(){
   assertActive();
   list.replaceChildren();
   const {data, error:dbError}=await sb.from('journal_evidence_v1').select('*')
      .eq('journal_id',id).eq('user_id',user.id).order('created_at',{ascending:true});
   if(dbError)throw dbError;
   add.disabled=(data||[]).length>=MAX;
   if(!data?.length){list.append(text('p','No screenshots have been attached to this record.'));error('');return;}
   error(`${data.length} of ${MAX} private screenshot places used.`);
   for(const item of data){
     assertActive();
     const article=document.createElement('article');article.className='gu-evidence-item';
     const header=text('strong',item.stage.toUpperCase()+' · Uploaded '+new Date(item.created_at).toLocaleString());
     article.append(header);
     const source=item.source_time?('Capture time reported: '+new Date(item.source_time).toLocaleString()):'Capture time not supplied';
     article.append(text('p',source+' · Before decision claim: '+(item.self_reported_before_decision?'Yes (self-reported)':'Not claimed')));
     if(item.description)article.append(text('p',item.description));
     const {data:signed,error:signError}=await sb.storage.from(BUCKET).createSignedUrl(item.object_key,60);
     if(!signError&&signed?.signedUrl){
       const img=document.createElement('img');img.src=signed.signedUrl;
       img.alt='Private member-uploaded '+item.stage+' chart screenshot; '+(item.description||'no written annotation');
       img.loading='lazy';img.decoding='async';article.append(img);
     }else article.append(text('p','Image preview unavailable; refresh to retry.'));
     const del=document.createElement('button');del.type='button';del.className='btn secondary';del.textContent='Delete screenshot';
     del.addEventListener('click',async()=>{
       if(!window.confirm('Permanently delete this private screenshot?'))return;
       del.disabled=true;try{
         assertActive();
         const {error:storageError}=await sb.storage.from(BUCKET).remove([item.object_key]);
         if(storageError)throw storageError;
         const {error:metaError}=await sb.from('journal_evidence_v1').delete()
           .eq('id',item.id).eq('user_id',user.id).eq('journal_id',id);
         if(metaError)throw metaError;
         await load();
       }catch(e){error('Could not remove screenshot: '+e.message);del.disabled=false;}
     });
     article.append(del);list.append(article);
   }
 }
 add.addEventListener('click',async()=>{
   if(busy)return;
   const file=$('gu-evidence-file').files?.[0],valid={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
   if(!file||!valid[file.type]||file.size===0||file.size>MAX_BYTES){error('Select a PNG, JPEG or WebP image no larger than 5 MB.');return}
   busy=true;add.disabled=true;error('Saving private screenshot…');
   let metadataId=null,key=null,uploaded=false;
   try{
     assertActive();
     const stage=$('gu-evidence-stage').value;
     const localTime=$('gu-evidence-source-time').value;
     let sourceTime=null;
     if(localTime){const t=new Date(localTime);if(!Number.isFinite(t.getTime()))throw Error('Invalid reported capture time.');sourceTime=t.toISOString()}
     key=`${user.id}/${id}/${crypto.randomUUID()}.${valid[file.type]}`;
     const {data:meta,error:metaError}=await sb.from('journal_evidence_v1').insert({
       journal_id:id,user_id:user.id,object_key:key,stage,
       source_time:sourceTime,self_reported_before_decision:$('gu-evidence-before').checked,
       description:$('gu-evidence-note').value.trim()
     }).select('id').single();
     if(metaError)throw metaError;
     metadataId=meta.id;
     const {error:uploadError}=await sb.storage.from(BUCKET).upload(key,file,{
       upsert:false,contentType:file.type,cacheControl:'60'
     });
     if(uploadError)throw uploadError;
     uploaded=true;
     $('gu-evidence-file').value='';$('gu-evidence-note').value='';$('gu-evidence-before').checked=false;
     await load();
   }catch(e){
     error('Screenshot was not saved: '+e.message);
     if(metadataId&&!uploaded){await sb.from('journal_evidence_v1').delete().eq('id',metadataId).eq('user_id',user.id)}
   }finally{busy=false; if(active)add.disabled=false;}
 });
 $('gu-evidence-refresh').addEventListener('click',()=>load().catch(e=>error('Cannot refresh evidence: '+e.message)));
 await load().catch(e=>{add.disabled=true;error('Private evidence storage is not available: '+e.message)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
