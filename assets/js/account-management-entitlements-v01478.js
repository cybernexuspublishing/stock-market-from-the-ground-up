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
   '<tr><td>'+esc(r.plan_code)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider||'Unknown')+'</td><td>'+date(r.current_period_end)+'</td><td>Cancel with billing provider. Database-only changes are blocked.</td></tr>',inventory);
  const books=item('Book companion and library rights','books',['Product','Type','Issued by','Expiration','Action'],r=>
   '<tr><td>'+esc(r.product_code)+'</td><td>'+esc(r.access_type)+'</td><td>'+esc(r.source_channel)+'</td><td>'+date(r.expires_at)+'</td><td>'+
   (r.source_channel==='admin'&&expiry(r)?revoke('manual_book',r,'Revoke manual book'):
    'Book Key / purchase-linked — protect issuing record')+'</td></tr>',inventory);
  const tools=item('À-la-Carte tool rights','tools',['Tool','Status','Provider','Expiration','Action'],r=>
   '<tr><td>'+esc(r.tool_code)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider||'Manual / unknown')+'</td><td>'+date(r.ends_at)+'</td><td>'+
   (active(r)&&!r.provider&&!r.provider_subscription_id&&
     (r.metadata?.admin_manual===true||['admin','owner_manual'].includes(r.metadata?.source))?
    revoke('manual_tool',r,'Revoke manual tool'):'Provider/unknown origin — protected')+'</td></tr>',inventory);
  const bookKeys=item('Book Key redemption history','bookKeys',['Book','Start','End','Management'],r=>
   '<tr><td>'+esc(r.book_code||'—')+'</td><td>'+date(r.starts_at)+'</td><td>'+date(r.ends_at)+'</td><td>Issuer-linked; original redemption retained</td></tr>',inventory);
  const orders=item('Order and payment audit history','orders',['Order','Status','Provider','Amount','Management'],r=>
   '<tr><td>'+esc(r.id)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.provider)+'</td><td>'+
   esc((Number(r.total_cents||0)/100).toFixed(2))+' USD</td><td>Retained financial ledger</td></tr>',inventory);
  const cat=info.grantCatalog||{},booksOpts=(cat.books||[]).map(x=>'<option value="'+esc(x.product_code)+'">'+esc(x.short_title||x.product_code)+'</option>').join(''),
    toolsOpts=(cat.tools||[]).map(x=>'<option value="'+esc(x.tool_code)+'">'+esc(x.name||x.tool_code)+'</option>').join('');
  const canGrant=account.type==='member'&&Array.isArray(cat.books)&&Array.isArray(cat.tools);
  const wrap=document.createElement('section');wrap.className='v1353-account-inventory';wrap.id='v1478-account-inventory';
  wrap.innerHTML='<h3>Manage All Account Entitlements &amp; Source Records</h3>'+summary+grants+subs+books+tools+bookKeys+orders+
  '<form id="v1478-resource-grant" class="v1352-grid"><h4 class="full">Grant manual Book or Tool access</h4>'+
  '<label>Entitlement<select name="kind"><option value="manual_book">Book Companion</option><option value="manual_tool">Tool Pass</option></select></label>'+
  '<label data-gu78-book>Book<select name="bookCode">'+booksOpts+'</select></label>'+
  '<label data-gu78-tool hidden>Tool<select name="toolCode">'+toolsOpts+'</select></label>'+
  '<label>Expiration (optional)<input type="datetime-local" name="expiresAt"></label>'+
  '<label class="full">Audit reason (required)<input name="reason" minlength="10" maxlength="500" required></label>'+
  '<div class="full"><button class="btn secondary" type="submit" '+(canGrant?'':'disabled')+'>Grant Selected Manual Access</button></div></form>'+
  '<p class="small">All actions are authenticated, audited, target-specific and source-bound. Stripe billing, purchased books, Book Keys, and financial records have separate issuer-controlled lifecycles. This panel will not falsely claim those were canceled.</p>';
  const deleteSection=box.querySelector('.v1353-danger:last-of-type');
  if(deleteSection)deleteSection.before(wrap);else box.append(wrap);
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
  const form=wrap.querySelector('#v1478-resource-grant');
  form.elements.kind.addEventListener('change',()=>{
   form.querySelector('[data-gu78-book]').hidden=form.elements.kind.value!=='manual_book';
   form.querySelector('[data-gu78-tool]').hidden=form.elements.kind.value!=='manual_tool';
  });
  form.addEventListener('submit',async event=>{
   event.preventDefault();const btn=form.querySelector('button[type=submit]');
   const kind=form.elements.kind.value,code=kind==='manual_book'?form.elements.bookCode.value:form.elements.toolCode.value;
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
