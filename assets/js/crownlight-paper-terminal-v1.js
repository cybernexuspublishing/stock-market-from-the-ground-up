/* Crownlight Paper Terminal: member-directed Alpaca paper orders only.
 * User must verify preview and confirm each submit; no hidden execution.
 */
(function(root){
 'use strict';
 let opts={},mounted=false,sending=false;
 const $=id=>document.getElementById(id);
 const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x};
 const usd=v=>Number.isFinite(Number(v))?'$'+Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 async function call(action,post){
  const session=await opts.getSession?.();
  if(!session?.access_token)throw Error('Sign in again to access your paper account.');
  const res=await fetch('/api/alpaca-paper'+(action?'?action='+encodeURIComponent(action):''),{
   method:post?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,
    ...(post?{'content-type':'application/json'}:{})},body:post?JSON.stringify(post):undefined,cache:'no-store'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error(String(data.error||'Paper Trading unavailable.'));
  return data;
 }
 function rowPair(label,value){
  const wrap=el('div','cl-paper-stat');wrap.append(el('span','',label),el('strong','',value));return wrap;
 }
 function table(items,columns){
  const t=el('table','cl-paper-table'),head=el('thead'),r=el('tr');
  for(const [key,label]of columns)r.append(el('th','',label));head.append(r);t.append(head);
  const body=el('tbody');
  for(const item of items){const tr=el('tr');for(const [key]of columns)tr.append(el('td','',item[key]??'—'));body.append(tr)}
  t.append(body);return t;
 }
 async function refresh(){
  const host=$('cl-paper-terminal');if(!host)return;
  if(!mounted)initialize(opts);if(!host.querySelector('.cl-paper-shell'))return;
  const status=$('cl-paper-status');status.textContent='Checking your selected Alpaca Paper Trading account…';
  try{
   const data=await call();
   $('cl-paper-overview').replaceChildren(
    rowPair('Paper equity',usd(data.account.equity)),
    rowPair('Paper buying power',usd(data.account.buyingPower)),
    rowPair('Paper cash',usd(data.account.cash)),
    rowPair('Account status',data.account.status||'Unknown')
   );
   $('cl-paper-positions').replaceChildren(table(data.positions.map(x=>({
    symbol:x.symbol,qty:x.qty,entry:usd(x.avgEntryPrice),current:usd(x.currentPrice),pl:usd(x.unrealizedPl)
   })),[['symbol','Symbol'],['qty','Shares'],['entry','Average entry'],['current','Current'],['pl','Unrealized P&L']]));
   $('cl-paper-orders').replaceChildren(table(data.orders.map(x=>({
    symbol:x.symbol,side:x.side,qty:x.qty,type:x.type,status:x.status,filled:x.filledQty
   })),[['symbol','Symbol'],['side','Side'],['qty','Shares'],['type','Type'],['filled','Filled'],['status','Status']]));
   const disabled=data.account.tradingBlocked||data.account.accountBlocked;
   $('cl-paper-submit').disabled=disabled;status.textContent=disabled?'Paper account has trading restrictions. Order entry disabled.':'Connected · Alpaca Paper Trading only · positions and orders verified.';
  }catch(e){status.textContent=e.message||'Paper account could not be verified.';$('cl-paper-submit').disabled=true}
 }
 async function submit(){
  if(sending)return;
  const symbol=$('cl-paper-symbol').value.trim().toUpperCase(),
   side=$('cl-paper-side').value,type=$('cl-paper-type').value,
   qty=Number($('cl-paper-qty').value),price=Number($('cl-paper-limit').value);
  const note=$('cl-paper-status');
  if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)||!Number.isInteger(qty)||qty<1||qty>1000||
   (type==='limit'&&(!Number.isFinite(price)||price<=0))){
   note.textContent='Enter a valid ticker, whole-share quantity (1–1,000), and limit price when applicable.';return;
  }
  const details=side.toUpperCase()+' '+qty+' '+symbol+' · '+type.toUpperCase()+
   (type==='limit'?' · $'+price.toFixed(2):'');
  if(!confirm('ALPACA PAPER TRADING — NOT HISTORICAL REPLAY\n\nSubmit this SIMULATED order to your own Alpaca Paper Trading account?\n\n'+details+
   '\n\nPaper orders may fill at different prices and times than historical chart candles.'))return;
  const btn=$('cl-paper-submit');sending=true;btn.disabled=true;
  const clientOrderId=crypto.randomUUID();
  note.textContent='Submitting the explicitly confirmed Alpaca PAPER order. Do not click again.';
  try{
   const response=await call('submit',{symbol,side,type,qty,limitPrice:type==='limit'?price:undefined,
    clientOrderId,confirm:'PAPER ONLY'});
   note.textContent=response.alreadySubmitted?'Existing paper order located. No duplicate was sent.':
    'Alpaca Paper acknowledged your simulated order. Check actual status/fill in Orders.';
   await refresh();
  }catch(e){note.textContent=(e.message||'Order status unknown.')+' Check Alpaca Paper account before submitting another order.'}
  finally{sending=false;btn.disabled=false}
 }
 function initialize(config={}){
  opts=config;if(mounted)return;
  const host=$('cl-paper-terminal');if(!host)return;mounted=true;
  host.innerHTML='<div class="cl-paper-shell"><p class="cl-paper-banner"><strong>PAPER ACCOUNT ONLY</strong> · Orders are simulated by Alpaca, not filled against historical replay candles. No live-money brokerage connection is enabled.</p>'+
   '<p id="cl-paper-status" role="status" aria-live="polite">Open this tab to load your own paper account.</p>'+
   '<div id="cl-paper-overview" class="cl-paper-overview"></div>'+
   '<div class="cl-paper-order-grid"><label>Symbol<input id="cl-paper-symbol" maxlength="12" placeholder="AAPL" autocomplete="off" value="AAPL"></label>'+
   '<label>Side<select id="cl-paper-side"><option value="buy">Buy</option><option value="sell">Sell</option></select></label>'+
   '<label>Order type<select id="cl-paper-type"><option value="market">Market</option><option value="limit">Limit</option></select></label>'+
   '<label>Whole shares<input id="cl-paper-qty" type="number" min="1" max="1000" step="1" value="1"></label>'+
   '<label id="cl-paper-limit-wrap" hidden>Limit price (USD)<input id="cl-paper-limit" type="number" min="0.01" step="0.01" placeholder="0.00"></label></div>'+
   '<div class="cl-paper-actions"><button id="cl-paper-submit" type="button" disabled>Review & Submit Paper Order</button>'+
   '<button id="cl-paper-refresh" type="button">Refresh Account</button></div>'+
   '<h3>Current paper positions</h3><div id="cl-paper-positions" class="cl-paper-scroll"></div>'+
   '<h3>Recent paper orders</h3><div id="cl-paper-orders" class="cl-paper-scroll"></div>'+
   '<p class="cl-paper-caution">Alpaca simulates market fills, liquidity, margin checks, and order status. A submitted paper order is not guaranteed to be filled. All account values and order status must come from Alpaca.</p></div>';
  $('cl-paper-type').onchange=()=>{$('cl-paper-limit-wrap').hidden=$('cl-paper-type').value!=='limit'};
  $('cl-paper-submit').onclick=submit;$('cl-paper-refresh').onclick=refresh;
  root.addEventListener('pagehide',()=>{mounted=false;opts={}}, {once:true});
 }
 root.CrownlightPaperTerminal={initialize,refresh};
})(window);
