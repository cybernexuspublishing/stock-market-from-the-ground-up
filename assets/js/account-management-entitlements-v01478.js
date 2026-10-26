/* v0.14.0.78 — One per-account source-aware management surface. No independent entitlement writes. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=s=>{if(!s)return 'No expiry';let d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString():'Unverified'};
 const active=x=>['active','trialing'].includes(x.status)&&(!x.starts_at||Date.parse(x.starts_at)<=Date.now())&&(!x.ends_at||Date.parse(x.ends_at)>Date.now());
 const expiry=x=>!x.expires_at||Date.parse(x.expires_at)>Date.now();
 const item=(label,key,headers,fn,inventory)=>{
   const rows=inventory[key];if(!Array.isArray(rows))return '<section class="v1353-info"><h4>'+esc(label)+'</h4><p>Records unavailable. No claim is made that this category is empty.</p></section>';
   return '<section class="v1353-info"><h4>'+esc(label)+' ('+rows.length+(rows.length>=100?'+':'')+')</h4>'+
   (rows.length?'<div class="v1355-scroll"><table class="v1355-table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(fn).join('')+'</tbody></table></div>':'<p>No records in the current snapshot.</p>')+'</section>';
 };
 const revoke=(kind,r,caption)=>'<button class="btn secondary" type="button" data-gu78-revoke="'+esc(kind)+'" data-gu78-id="'+esc(r.id)+'">'+esc(caption)+'</button>';
 function mount({box,modal,account,info,api,refresh,notify}){
  const inventory=info.inventory||{},effective=info.effectiveAccess;
  const summary='<p class="v1353-info">Effective membership from database: <strong>'+esc(effective?.planCode||'UNVERIFIED')+'</strong>. '+esc(info.effectiveError||'Source-issued access is authoritative. Changing the display plan cannot erase billing or purchase records.')+'</p>';
  const grants=item('Membership grants','grants',['Plan','Status','Source','Expires','Action'],r=>
   '<tr><td>'+esc(r.plan_code)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.source)+'</td><td>'+date(r.ends_at)+'</td><td>'+
   (active(r)&&/^admin(?:_|$)/i.test(r.source||'')?revoke('manual_plan',r,'Revoke manual grant'):
    r.source==='stripe_zero_monthly_qa_v72'&&active(r)?'LIVE $0 test: select FREE above for authorized reset':'Issued by provider/other source — separate lifecycle')+'</td></tr>',inventory);
  const subs=item('Subscriptions and billing status','subscriptions',['Plan','Status','Provider','End','Management'],r=>
   '<tr><td>'+esc(r.plan_code)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider||'Unknown')+'</td><td>'+date(r.current_period_end)+'</td><td>'+(String(r.provider||'').toLowerCase().includes('stripe')?'<a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noopener noreferrer">Manage billing in Stripe</a> — ':'')+'Provider controls cancellation/refunds; database-only downgrades blocked.</td></tr>',inventory);
  const books=item('Book companion and library rights','books',['Product','Type','Issued by','Expiration','Action'],r=>
   '<tr><td>'+esc(r.product_code)+'</td><td>'+esc(r.access_type)+'</td><td>'+esc(r.source_channel)+'</td><td>'+date(r.expires_at)+'</td><td>'+
   (r.source_channel==='admin'&&expiry(r)?revoke('manual_book',r,'Revoke manual book'):
    'Book Key / purchase-linked — protect issuing record')+'</td></tr>',inventory);
  const tools=item('À-la-Carte tool rights','tools',['Tool','Status','Provider','Expiration','Action'],r=>
   '<tr><td>'+esc(r.tool_code)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider||'Manual / unknown')+'</td><td>'+date(r.ends_at)+'</td><td>'+
   (active(r)&&!r.provider&&!r.provider_subscription_id&&
     (r.metadata?.admin_manual===true||['admin','owner_manual'].includes(r.metadata?.source))?
    revoke('manual_tool',r,'Revoke manual tool'):'Provider/unknown origin — protected')+'</td></tr>',inventory);
  const legacy=item('Legacy learning entitlements (may independently keep access active)','legacyLearning',
   ['Product','Status','Source','Expires','Management'],r=>
   '<tr><td>'+esc(r.product_key)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.source)+'</td><td>'+
   date(r.ends_at)+'</td><td>'+(active(r)&&r.source==='admin'&&!r.external_customer_id&&!r.external_subscription_id?
     revoke('manual_learning',r,'Revoke legacy manual access'):'Provider or expired legacy record — preserved')+'</td></tr>',inventory);
  const bookKeys=item('Book Key redemption history','bookKeys',['Book','Start','End','Management'],r=>
   '<tr><td>'+esc(r.book_code||'—')+'</td><td>'+date(r.starts_at)+'</td><td>'+date(r.ends_at)+'</td><td>Issuer-linked; original redemption retained</td></tr>',inventory);
  const orders=item('Order and payment audit history','orders',['Order','Status','Provider','Amount','Management'],r=>
   '<tr><td>'+esc(r.id)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider)+'</td><td>'+
   esc((Number(r.total_cents||0)/100).toFixed(2))+' USD</td><td>Retained financial ledger</td></tr>',inventory);
  const cat=info.grantCatalog||{},booksOpts=(cat.books||[]).map(x=>'<option value="'+esc(x.product_code)+'">'+esc(x.short_title||x.product_code)+'</option>').join(''),
    toolsOpts=(cat.tools||[]).map(x=>'<option value="'+esc(x.tool_code)+'">'+esc(x.name||x.tool_code)+'</option>').join('');
  const canGrant=account.type==='member'&&Array.isArray(cat.books)&&Array.isArray(cat.tools);
  const wrap=document.createElement('section');wrap.className='v1353-account-inventory';wrap.id='v1478-account-inventory';
  wrap.innerHTML='<h3>Manage All Account Entitlements &amp; Source Records</h3>'+summary+grants+subs+legacy+books+tools+bookKeys+orders+
  '<form id="v1478-resource-grant" class="v1352-grid"><h4 class="full">Grant manual Book or Tool access</h4>'+
  '<label>Entitlement<select name="kind"><option value="manual_book">Book Companion</option><option value="manual_tool">Tool Pass</option><option value="manual_learning">Legacy Learning Access</option></select></label>'+
  '<label data-gu78-book>Book<select name="bookCode">'+booksOpts+'</select></label>'+
  '<label data-gu78-tool hidden>Tool<select name="toolCode">'+toolsOpts+'</select></label>'+
  '<p data-gu78-legacy hidden>Grant legacy full_learning_access only; this can establish BOOK_TRIAL separately from platform memberships.</p>'+
  '<label>Expiration (optional)<input type="datetime-local" name="expiresAt"></label>'+
  '<label class="full">Audit reason (required)<input name="reason" minlength="10" maxlength="500" required></label>'+
  '<div class="full"><button class="btn secondary" type="submit" '+(canGrant?'':'disabled')+'>Grant Selected Manual Access</button></div></form>'+
  '<p class="small">All actions are authenticated, audited, target-specific and source-bound. Stripe billing, purchased books, Book Keys, and financial records have separate issuer-controlled lifecycles. This panel will not falsely claim those were canceled.</p>';
  const deleteSection=box.querySelector('.v1353-danger:last-of-type');
  if(deleteSection)deleteSection.before(wrap);else box.append(wrap);
  // Owner-only Crownlight Sparks balance controls are part of the existing
  // member editor, alongside book, membership and tool access management.
  // They never alter Stripe orders or the source of a paid entitlement.
  if(account.type==='member'){
   const sparks=document.createElement('section');
   sparks.className='v1353-info gu-lantern-sparks-admin';
   sparks.setAttribute('aria-label','Crownlight Sparks member balance controls');
   sparks.innerHTML='<h4>Crownlight Sparks · Member Balance</h4>'+
    '<p class="small">Owner adjustments are recorded separately from paid purchases and membership credits. Every change requires a reason. Included credits retain their original expiration dates.</p>'+
    '<p class="gu-sparks-admin-balance" role="status" aria-live="polite">Checking verified member balance…</p>'+
    '<form class="v1352-grid gu-sparks-admin-form">'+
    '<label>Change<select name="operation"><option value="add">Add Sparks</option><option value="remove">Remove Sparks</option><option value="set">Set available total</option></select></label>'+
    '<label>Amount<input name="value" type="number" min="0" max="100000" step="1" required placeholder="Whole number"></label>'+
    '<label class="full">Reason for this change (required)<textarea name="reason" minlength="10" maxlength="500" rows="2" required placeholder="Explain why this account balance is being corrected."></textarea></label>'+
    '<div class="full"><button type="submit" class="btn secondary" disabled>Confirm Balance Adjustment</button> '+
    '<button type="button" class="btn secondary" data-sparks-refresh>Refresh Balance</button></div>'+
    '</form><div class="gu-sparks-admin-history" aria-label="Recent Crownlight Sparks adjustments"></div>';
   wrap.append(sparks);
   const balanceLabel=sparks.querySelector('.gu-sparks-admin-balance');
   const form=sparks.querySelector('form');
   const adjustButton=form.querySelector('button[type="submit"]');
   const history=sparks.querySelector('.gu-sparks-admin-history');
   let verified=false,busy=false,pendingFingerprint='',pendingRequestId='';
   async function sparksApi(operation,data){
    const sb=await window.getSupabaseClient?.();
    const session=(await sb?.auth?.getSession?.())?.data?.session;
    if(!session?.access_token)throw Error('Your Owner session is unavailable. Sign in again.');
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
    try{
     const response=await fetch('/api/admin-lantern-sparks'+
      (operation==='balance'?'?userId='+encodeURIComponent(account.id):''),{
      method:operation==='balance'?'GET':'POST',cache:'no-store',signal:controller.signal,
      headers:{authorization:'Bearer '+session.access_token,
       ...(operation==='balance'?{}:{'content-type':'application/json'})},
      body:operation==='balance'?undefined:JSON.stringify({userId:account.id,...data})
     });
     const result=await response.json().catch(()=>null);
     if(!response.ok||result?.ok!==true)
      throw Error(String(result?.error||'Crownlight Sparks service is unavailable.').slice(0,200));
     return result;
    }finally{clearTimeout(timeout)}
   }
   async function reloadSparks(){
    if(busy)return;
    verified=false;adjustButton.disabled=true;
    balanceLabel.textContent='Checking verified Crownlight Sparks…';
    try{
     const data=await sparksApi('balance');
     if(!Number.isInteger(data.balance?.available))throw Error('Balance not verified.');
     const b=data.balance;
     balanceLabel.textContent='Available: '+b.available+
      ' · Included: '+b.included+' · Purchased: '+b.purchased+
      ' · Owner-adjusted: '+(b.manual||0)+
      (b.nextExpiry?' · Next included expiry: '+new Date(b.nextExpiry).toLocaleDateString():'');
     history.replaceChildren();
     const h=document.createElement('h5');h.textContent='Recent balance adjustments';history.append(h);
     for(const entry of data.activity||[]){
      const line=document.createElement('p');line.className='small';
      line.textContent=new Date(entry.created_at).toLocaleString()+
       ' · '+entry.operation+' '+entry.requested_value+' · '+entry.delta+
       ' Sparks · '+entry.previous_available+' → '+entry.resulting_available+
       ' · '+entry.reason;
      history.append(line);
     }
     verified=true;adjustButton.disabled=false;
    }catch(error){
     balanceLabel.textContent=String(error?.message||'Balance unavailable. No adjustment can be made.');
    }
   }
   sparks.querySelector('[data-sparks-refresh]').addEventListener('click',()=>void reloadSparks());
   form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!verified||busy)return;
    const operation=form.elements.operation.value,value=Number(form.elements.value.value);
    const reason=form.elements.reason.value.trim();
    if(!Number.isInteger(value)||value<0||value>100000||
      (operation!=='set'&&value<1)||reason.length<10||reason.length>500){
     balanceLabel.textContent='Enter a valid whole number and a reason of 10–500 characters.';return;
    }
    const action=operation==='set'?'set this member’s total available Sparks to '+value:
     operation+' '+value+' Sparks';
    if(!window.confirm('Confirm: '+action+' for '+account.username+
      '? This change is audited but does not issue a refund or modify Stripe transactions.'+
      (operation==='remove'||operation==='set'?
        ' Confirm purchased-credit corrections are authorized and any refund obligations are addressed.':'')))return;
    // Network retries for the same adjustment reuse the ORIGINAL UUID.
    // This prevents an uncertain response from causing a double grant.
    const fingerprint=JSON.stringify([account.id,operation,value,reason]);
    if(fingerprint!==pendingFingerprint){
     pendingFingerprint=fingerprint;pendingRequestId=crypto.randomUUID();
    }
    const requestId=pendingRequestId;
    busy=true;verified=false;adjustButton.disabled=true;
    balanceLabel.textContent='Confirming the audited change…';
    try{
     const result=await sparksApi('adjust',{operation,value,reason,requestId});
     const label=result.alreadyApplied?'Previously confirmed adjustment':'Balance adjustment confirmed';
     notify(label+' · '+String(result.balance?.available??'—')+' Sparks available','ok');
     form.reset();pendingFingerprint='';pendingRequestId='';
    }catch(error){
     window.alert(String(error?.message||'Adjustment could not be verified.')+
      '\\nRefresh the balance and audit history before retrying.');
    }finally{
     busy=false;void reloadSparks();
    }
   });
   void reloadSparks();
  }
  async function finish(message){modal.close();await refresh();notify(message,'ok')}
  for(const button of wrap.querySelectorAll('[data-gu78-revoke]')){
   button.addEventListener('click',async()=>{
    const kind=button.dataset.gu78Revoke,recordId=Number(button.dataset.gu78Id);
    const reason=window.prompt('Reason for revoking this exact '+kind+' record (10–500 characters):');
    if(reason===null)return;
    if(reason.trim().length<10||reason.length>500){window.alert('Enter a valid audit reason of 10–500 characters.');return}
    if(!window.confirm('Revoke ONLY this '+kind+' record #'+recordId+' for '+account.username+'? Provider payments and purchases will be preserved.'))return;
    button.disabled=true;
    try{const d=await api('revoke_resource',{userId:account.id,kind,recordId,reason:reason.trim()});
     await finish(d.notice||'Selected manual entitlement revoked. Verify account effective access.')}
    catch(e){window.alert(e.message);button.disabled=false}
   });
  }
  // F600 beta teaching access reuses the single existing Owner/Admin manual
  // tool-pass RPC. It never fabricates a paid subscription, founder number,
  // book ownership, purchase discount, Sparks, or a reviewed grading record.
  const toolRecords=inventory.tools;
  const ownerCanPilot=info.permissions?.owner===true && account.type==='member' &&
   canGrant && Array.isArray(toolRecords) &&
   (cat.tools||[]).some(t=>t.tool_code==='ONDEMAND_TRAINING');
  if(ownerCanPilot){
   const existing=toolRecords.some(t=>t.tool_code==='ONDEMAND_TRAINING'&&active(t));
   const pilot=document.createElement('section');
   pilot.className='v1353-info';
   pilot.setAttribute('aria-label','Beta Testing Access');
   pilot.innerHTML='<h4>Guided Learning · Beta Testing Access</h4>'+
    '<p class="small">Authorize this existing member to test the educational Labs and Boot Camp workspaces for 30 days without any payment. This auditable QA pass is not a Founding membership, does not reserve a founding number, does not buy a textbook, and cannot award graded mastery. The existing entitlement service enforces the expiration.</p>'+
    '<p class="small">Other functions, including Journal and Market Tutor, remain separately entitled. Use the existing Tool Pass control below to test them.</p>'+
    '<button type="button" class="btn secondary" data-f600-qa-start'+(existing?' disabled':'')+
      '>Authorize 30-Day Guided Beta Access</button>'+
    '<p data-f600-qa-status role="status" aria-live="polite">'+
       (existing?'A valid ONDEMAND_TRAINING pass is already present. Review its issuer and expiration above.':
       'This is temporary learning access, not a Founding Membership.')+'</p>';
   wrap.insertBefore(pilot,wrap.querySelector('#v1478-resource-grant'));
   const start=pilot.querySelector('[data-f600-qa-start]');
   const status=pilot.querySelector('[data-f600-qa-status]');
   start.addEventListener('click',async()=>{
    const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
    if(!window.confirm('Grant 30 days of noncommercial ONDEMAND_TRAINING beta access to '+
      account.username+'? This action is Owner-audited, does NOT create a paid Founding Member or award official grading.'))return;
    const reason='F600_GUIDED_QA_V1: Owner-authorized 30-day noncommercial Lab and Boot Camp testing; no paid founding entitlements, book purchases, Sparks or grades.';
    start.disabled=true;
    status.textContent='Submitting this exact-member QA grant for database verification…';
    try{
     const result=await api('grant_resource',{userId:account.id,kind:'manual_tool',
      code:'ONDEMAND_TRAINING',expiresAt,reason});
     if(result?.granted!==true||result?.kind!=='manual_tool'||result?.code!=='ONDEMAND_TRAINING')
      throw Error('The existing entitlement service did not confirm the beta tool pass.');
     await finish('30-day beta tool pass recorded. Verify the effective member access and expiration in the account inventory.');
    }catch(err){
     status.textContent=String(err?.message||'Beta authorization was not verified. Reload the account before retrying.');
     // The request may have succeeded before a network failure. Never permit
     // an immediate repeat until the refreshed database records are checked.
     start.disabled=true;
    }
   });
  }
  const form=wrap.querySelector('#v1478-resource-grant');
  form.elements.kind.addEventListener('change',()=>{
   form.querySelector('[data-gu78-book]').hidden=form.elements.kind.value!=='manual_book';
   form.querySelector('[data-gu78-tool]').hidden=form.elements.kind.value!=='manual_tool';
   form.querySelector('[data-gu78-legacy]').hidden=form.elements.kind.value!=='manual_learning';
  });
  form.addEventListener('submit',async event=>{
   event.preventDefault();const btn=form.querySelector('button[type=submit]');
   const kind=form.elements.kind.value,code=kind==='manual_learning'?'FULL_LEARNING_ACCESS':
     kind==='manual_book'?form.elements.bookCode.value:form.elements.toolCode.value;
   const expiresAt=form.elements.expiresAt.value?new Date(form.elements.expiresAt.value).toISOString():null;
   const reason=form.elements.reason.value.trim();
   if(!window.confirm('Grant '+code+' to '+account.username+' as a manual entitlement? This will be audited.'))return;
   btn.disabled=true;
   try{const r=await api('grant_resource',{userId:account.id,kind,code,expiresAt,reason});
    await finish(r.notice||'Manual entitlement granted. Verify account effective access.')}
   catch(e){window.alert(e.message);btn.disabled=false}
  });
 }
 window.GroundUpAccountItems=Object.freeze({mount});
})();
