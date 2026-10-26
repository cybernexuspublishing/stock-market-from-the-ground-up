/* Owner commerce financial dashboard: verified live receipts, item/category
 * filters, best sellers, and audited manually recorded expenses.
 * NEVER counts TEST/shadow/unverified orders as sales or assumes all fees known.
 */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const el=(name,text)=>{const x=document.createElement(name);if(text!==undefined)x.textContent=text;return x};
const money=n=>(n/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
let sb=null,report=null,expenses=[];
const $=id=>document.getElementById(id);
const status=s=>{const x=$('gu-finance-status');if(x)x.textContent=s};
async function authorized(){
 const client=await window.getSupabaseClient?.();if(!client)throw Error('Owner sign-in required.');
 const {data:isOwner,error}=await client.rpc('gu_store_owner_v014297');
 if(error||isOwner!==true)throw Error('Owner finance access required.');
 const {data}=await client.auth.getSession();
 if(!data?.session?.access_token)throw Error('Authenticated Owner session required.');
 sb=client;return data.session.access_token;
}
function stat(title,amount,subtitle){
 const card=el('article');card.className='admin-card';
 const h=el('h3',title),v=el('strong',amount),text=el('p',subtitle);v.style.fontSize='1.6rem';card.append(h,v,text);return card;
}
function cell(row,text){
 const td=el('td',String(text??'—'));row.append(td);return td;
}
function table(headers,rows){
 const root=el('div');root.className='admin-table-wrap';
 const t=el('table'),thead=el('thead'),tr=el('tr');
 for(const h of headers)tr.append(el('th',h));thead.append(tr);t.append(thead);
 const body=el('tbody');
 for(const cells of rows){const r=el('tr');for(const c of cells)cell(r,c);body.append(r)}
 t.append(body);root.append(t);return root;
}
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d));
function render(){
 if(!report)return;
 const cards=$('gu-finance-metrics'),list=$('gu-finance-orders'),best=$('gu-finance-bestsellers'),ex=$('gu-finance-expenses');
 cards.replaceChildren();list.replaceChildren();best.replaceChildren();ex.replaceChildren();
 const selectedCategory=$('gu-finance-category').value,selectedProduct=$('gu-finance-product').value;
 const groups=new Map((report.categories||[]).map(p=>[p.code,p]));
 const lineRows=report.items||[];
 const filtered=lineRows.filter(x=>{
  const info=groups.get(x.product_code)||{};
  return (!selectedCategory||info.category===selectedCategory)&&(!selectedProduct||x.product_code===selectedProduct);
 });
 const allPaid=(report.paidOrders||[]).reduce((t,o)=>t+Math.max(0,Number(o.subtotal_cents||0)),0);
 const costs=expenses.filter(x=>x.state==='posted').reduce((t,x)=>t+Number(x.amount_cents||0),0);
 const qualifiedSubtotal=filtered.reduce((t,x)=>t+Number(x.total_cents||0),0);
 const filteredOrders=new Set(filtered.map(x=>x.order_id));
 cards.append(stat('Verified live order subtotal',money(allPaid),'All products, excluding recorded tax and refunded payments.'),
  stat('Recorded operating expenses',money(costs),'Owner-posted expenses in the selected date range.'),
  stat('Preliminary balance',money(allPaid-costs),'NOT accounting profit: provider fees, cost of goods, and other liabilities may be incomplete.'),
  stat('Filtered product line amount',money(qualifiedSubtotal),'Selected product/category only; depends on recorded paid order line items.'));
 const productGroups=new Map();
 for(const x of filtered){const prior=productGroups.get(x.product_code)||{qty:0,amount:0};
  prior.qty+=Number(x.quantity||0);prior.amount+=Number(x.total_cents||0);
  productGroups.set(x.product_code,prior);}
 const ranking=[...productGroups.entries()].sort((a,b)=>b[1].qty-a[1].qty).slice(0,15);
 best.append(table(['Product','Units sold','Recorded line amount'],
  ranking.map(([code,v])=>[groups.get(code)?.title||code,v.qty,money(v.amount)])));
 const orders=report.paidOrders.filter(o=>!selectedCategory&&!selectedProduct||filteredOrders.has(o.id));
 list.append(table(['Paid at','Provider','Order ID','Customer ID','USD subtotal','Status'],
 orders.map(o=>[o.paid_at?.slice(0,19)||'—',o.provider,o.id,o.user_id||'Guest',
   money(Number(o.subtotal_cents||0)),o.status])));
 const expenseRows=expenses.map(x=>{
  const r=el('tr');for(const v of [x.expense_date,x.category,x.description,x.vendor,money(Number(x.amount_cents)),x.state])cell(r,v);
  const action=el('td');
  if(x.state==='posted'){const btn=el('button','Void');btn.className='btn secondary';btn.type='button';
   btn.onclick=async()=>{const reason=prompt('Enter a reason (at least 8 characters) for voiding this expense. The original record is preserved.');
    if(!reason||reason.trim().length<8)return;
    try{await authorized();const z=await sb.from('gu_store_expenses_v014302')
      .update({state:'void',void_reason:reason.trim()}).eq('id',x.id).eq('state','posted').select('id');
     if(z.error||!z.data?.length)throw z.error||Error('Expense not changed; reload.');
     await load();}catch(e){status(e.message);}};
   action.append(btn);}
  r.append(action);return r;
 });
 const t=el('table'),head=el('thead'),row=el('tr');
 for(const h of ['Date','Category','Description','Vendor','Amount','State','Action'])row.append(el('th',h));
 head.append(row);const body=el('tbody');for(const item of expenseRows)body.append(item);t.append(head,body);
 const outer=el('div');outer.className='admin-table-wrap';outer.append(t);ex.append(outer);
 const incomplete=(report.truncated?' More than 250 orders match; narrow the date range for an exhaustive report.':'')+
   (report.unverifiedOrRefundedRows?' '+report.unverifiedOrRefundedRows+' recorded rows were excluded because real paid provider status was unverified, refunded or invalid.':'');
 status('Report loaded. '+orders.length+' verified paid orders in current filters; '+expenses.length+' expense records.'+incomplete);
}
async function load(){
 const token=await authorized(),from=$('gu-finance-from').value,to=$('gu-finance-to').value;
 if(!validDate(from)||!validDate(to)||from>to)throw Error('Choose a valid start and end date.');
 const url='/api/admin?action=store_reports&from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to);
 const [response,ex]=await Promise.all([
  fetch(url,{headers:{authorization:'Bearer '+token},cache:'no-store'}),
  sb.from('gu_store_expenses_v014302').select('id,expense_date,category,description,vendor,amount_cents,state,void_reason')
   .gte('expense_date',from).lte('expense_date',to).order('expense_date',{ascending:false}).limit(1000)
 ]);
 if(!response.ok||ex.error)throw Error('Verified financial report cannot be loaded.');
 report=await response.json();if(!report.ok)throw Error(report.error||'Verified order data unavailable');
 expenses=ex.data||[];
 const categories=[...new Set((report.categories||[]).map(x=>x.category))].filter(Boolean).sort();
 const productCodes=[...new Set((report.categories||[]).map(x=>x.code))].filter(Boolean).sort();
 const update=(id,values)=>{const select=$(id),prior=select.value;
  select.replaceChildren(el('option','All '+(id.endsWith('category')?'categories':'items')));
  for(const v of values){const option=el('option',v);option.value=v;select.append(option);}
  select.value=values.includes(prior)?prior:'';
 };
 update('gu-finance-category',categories);update('gu-finance-product',productCodes);render();
}
function mount(){
 const commerce=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!commerce||$('gu-owner-finance'))return;
 const section=el('section');section.id='gu-owner-finance';section.className='admin-card';
 section.innerHTML='<h2>Owner Sales, Expenses &amp; Order Verification</h2>'+
 '<p class="small">Report only confirmed live USD paid orders. TEST/shadow orders, unknown payment status, taxes and recorded refunds do not count as verified revenue. Expense entries are Owner-audited. The preliminary balance is not certified net profit.</p>'+
 '<form id="gu-finance-filter" class="admin-toolbar"><label>From<input type="date" id="gu-finance-from" required></label>'+
 '<label>Through<input type="date" id="gu-finance-to" required></label>'+
 '<label>Category<select id="gu-finance-category"><option value="">All categories</option></select></label>'+
 '<label>Item<select id="gu-finance-product"><option value="">All items</option></select></label>'+
 '<button type="submit" class="btn secondary">Update reports</button></form>'+
 '<p role="status" aria-live="polite" id="gu-finance-status">Checking Owner finance access…</p>'+
 '<div id="gu-finance-metrics" class="admin-grid"></div><h3>Best sellers</h3><div id="gu-finance-bestsellers"></div>'+
 '<h3>Verified orders</h3><div id="gu-finance-orders"></div>'+
 '<h3>Operating expense ledger</h3><form id="gu-finance-expense-add" class="admin-toolbar">'+
 '<label>Expense date<input type="date" name="date" required></label>'+
 '<label>Category<input type="text" name="category" minlength="2" maxlength="90" required></label>'+
 '<label>Vendor<input type="text" name="vendor" maxlength="180"></label>'+
 '<label>Amount (USD)<input type="number" name="amount" min=".01" step=".01" required></label>'+
 '<label>Description<input type="text" name="description" minlength="3" maxlength="300" required></label>'+
 '<button type="submit" class="btn">Record Expense</button></form>'+
 '<div id="gu-finance-expenses"></div>';
 commerce.append(section);
 const today=new Date().toISOString().slice(0,10);
 $('gu-finance-to').value=today;
 $('gu-finance-from').value=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
 $('gu-finance-filter').addEventListener('submit',e=>{e.preventDefault();load().catch(x=>status(x.message));});
 for(const id of ['gu-finance-product','gu-finance-category'])
  $(id).addEventListener('change',()=>{if(report)render()});
 $('gu-finance-expense-add').addEventListener('submit',async e=>{
  e.preventDefault();const f=e.currentTarget,d=new FormData(f),amount=Number(d.get('amount'));
  if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100)))return status('Enter a valid positive USD amount.');
  try{await authorized();const user=(await sb.auth.getUser()).data.user;
   if(!user?.id)throw Error('Owner session is invalid.');
   const row={expense_date:String(d.get('date')),category:String(d.get('category')).trim(),
    vendor:String(d.get('vendor')).trim(),description:String(d.get('description')).trim(),
    amount_cents:Math.round(amount*100),currency:'USD',state:'posted',created_by:user.id};
   const r=await sb.from('gu_store_expenses_v014302').insert(row).select('id');
   if(r.error||!r.data?.length)throw r.error||Error('Expense was not saved.');
   f.reset();$('gu-finance-expense-add').elements.date.value=today;
   await load();
  }catch(ex){status(ex.message||'Expense not saved.');}
 });
 $('gu-finance-expense-add').elements.date.value=today;
 load().catch(ex=>status(ex.message));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();