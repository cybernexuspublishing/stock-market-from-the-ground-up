/* Crownlight educational order lifecycle v1.
 * Explicit member-authored scenario events; never places broker orders,
 * uses quote feeds, infers fills, or persists private executions.
 */
(function(root){
 'use strict';
 const types=Object.freeze(['SUBMIT','ACCEPT','PARTIAL_FILL','FILL','CANCEL_REQUEST','CANCEL_ACK','REJECT','EXPIRE']);
 const money=x=>Number.isFinite(x)?x.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:4}):'—';
 const safeQty=x=>Number.isSafeInteger(x)&&x>0&&x<=1000000;
 const num=x=>x===null||x===undefined||String(x).trim()===''?NaN:Number(x);
 function replay(options){
  const requested=num(options?.quantity),direction=options?.direction||'LONG';
  if(!safeQty(requested)||!['LONG','SHORT'].includes(direction))
   return {ok:false,error:'Choose 1–1,000,000 whole shares and a LONG or SHORT educational scenario.'};
  const events=options?.events;
  if(!Array.isArray(events)||events.length>100)
   return {ok:false,error:'The scenario must contain no more than 100 explicit events.'};
  let state='DRAFT',filled=0,notional=0,lastTime=-Infinity,cancelRequested=false;
  const history=[];
  const reject=(message,at)=>({ok:false,error:'Event '+(at+1)+': '+message});
  for(let i=0;i<events.length;i++){
   const event=events[i];
   if(!event||!types.includes(event.type))return reject('Unknown lifecycle action.',i);
   if(typeof event.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(event.at)||
      !Number.isFinite(Date.parse(event.at)))
    return reject('Each event requires a valid ISO timestamp with timezone.',i);
   const stamp=Date.parse(event.at);
   if(stamp<lastTime)return reject('Event timestamps must not move backward.',i);
   if(stamp>Date.now()+5*60*1000)return reject('Future-dated lifecycle events are not allowed.',i);
   lastTime=stamp;
   const remain=()=>requested-filled;
   const open=['WORKING','PARTIALLY_FILLED'].includes(state);
   const qty=num(event.shares),price=num(event.price);
   if(event.type==='SUBMIT'){
    if(state!=='DRAFT')return reject('A scenario submits only once; reset before a new order.',i);
    state='SUBMITTED';
   }else if(event.type==='ACCEPT'){
    if(state!=='SUBMITTED')return reject('Only a submitted request may be acknowledged.',i);
    state='WORKING';
   }else if(event.type==='REJECT'){
    if(state!=='SUBMITTED')return reject('A rejection can apply only to a submitted, unaccepted request.',i);
    state='REJECTED';
   }else if(event.type==='PARTIAL_FILL'||event.type==='FILL'){
    if(!open&&state!=='PENDING_CANCEL')return reject('Fills require an acknowledged working request or a pending cancellation.',i);
    if(!safeQty(qty)||qty>remain())return reject('Fill quantity must be positive, integral, and no greater than remaining shares.',i);
    if(!Number.isFinite(price)||price<=0||price>1000000)return reject('Hypothetical fill price must be positive and bounded.',i);
    if(event.type==='PARTIAL_FILL'&&qty===remain())return reject('Use Complete remaining fill when all outstanding shares are filled.',i);
    if(event.type==='FILL'&&qty!==remain())return reject('Complete remaining fill must fill exactly all outstanding shares.',i);
    notional+=qty*price;filled+=qty;
    state=filled===requested?'FILLED':cancelRequested?'PENDING_CANCEL':'PARTIALLY_FILLED';
   }else if(event.type==='CANCEL_REQUEST'){
    if(!open)return reject('Cancellation can be requested only while an order is working or partially filled.',i);
    state='PENDING_CANCEL';cancelRequested=true;
   }else if(event.type==='CANCEL_ACK'){
    if(state!=='PENDING_CANCEL')return reject('A cancellation is not final until the pending request is acknowledged.',i);
    state='CANCELED';
   }else if(event.type==='EXPIRE'){
    if(!open&&state!=='PENDING_CANCEL')return reject('Only an open order can expire.',i);
    state='EXPIRED';
   }
   history.push({sequence:i+1,at:event.at,type:event.type,state,
    filled,remaining:remain(),avgFill:filled?notional/filled:null,
    eventShares:['PARTIAL_FILL','FILL'].includes(event.type)?qty:null,
    eventPrice:['PARTIAL_FILL','FILL'].includes(event.type)?price:null});
  }
  return {ok:true,requested,direction,state,filled,remaining:requested-filled,
   averageFill:filled?Math.round(notional/filled*1e6)/1e6:null,
   totalNotional:Math.round(notional*1e6)/1e6,cancelPending:state==='PENDING_CANCEL',
   terminal:['FILLED','REJECTED','CANCELED','EXPIRED'].includes(state),
   history,warning:'All events and fills are member-entered hypothetical scenarios. A cancel request may race with a fill; a stop or limit order can fail to fill. No broker order or actual P&L is created.'};
 }
 function mount({host,readPlan,alive=()=>true}={}){
  if(!host||typeof readPlan!=='function')return null;
  const make=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=String(value);return el};
  const container=make('section');container.className='tp-order-lifecycle';
  const title=make('h3','Order lifecycle and partial-fill practice');
  const description=make('p','Rehearse the difference between submitting an order, broker acknowledgment, a partial fill, a pending cancellation, and a final cancellation. Events are manual, hypothetical, and kept only on this screen.');
  description.className='small';
  const fields=make('div');fields.className='tp-order-inputs';
  const addField=(labelText,type,id)=>{
   const label=make('label',labelText),input=make('input');
   input.type=type;input.id='tp-order-'+id;input.required=true;
   if(type==='number'){input.min='0';input.step='any'}
   label.append(input);fields.append(label);return input;
  };
  const quantity=addField('Requested whole shares','number','quantity');
  const shares=addField('Shares in this hypothetical fill','number','fill-shares');
  const price=addField('Hypothetical fill price ($)','number','fill-price');
  const state=make('p');state.className='tp-alert';state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  const metrics=make('div');metrics.className='tp-stats';
  const actions=make('div');actions.className='tp-actions';
  const controls=[['SUBMIT','Submit'],['ACCEPT','Acknowledge'],['PARTIAL_FILL','Partial fill'],
   ['FILL','Complete remaining fill'],['CANCEL_REQUEST','Request cancellation'],
   ['CANCEL_ACK','Acknowledge cancellation'],['REJECT','Reject'],['EXPIRE','Expire']];
  const buttons={};
  for(const [action,label] of controls){
   const b=make('button',label);b.type='button';b.className='btn secondary';
   actions.append(b);buttons[action]=b;
  }
  const controls2=make('div');controls2.className='tp-actions';
  const seed=make('button','Use current plan size');seed.type='button';seed.className='btn secondary';
  const reset=make('button','Reset scenario');reset.type='button';reset.className='btn secondary';
  controls2.append(seed,reset);
  const grid=make('div');grid.className='tp-order-history';
  const details=make('p','No real orders, broker connections, market fills, guarantees, or Journal records are created. Rejection, expiration, and cancellation are distinct outcomes; a cancellation request by itself does not end fill exposure.');details.className='small';
  container.append(title,description,fields,controls2,actions,state,metrics,grid,details);
  let events=[],scenarioQty=null,direction='LONG';
  const getStatus=()=>{
   if(!scenarioQty)return {ok:false,error:'Select Use current plan size to begin.'};
   return replay({quantity:scenarioQty,direction,events});
  };
  function render(){
   const current=getStatus();metrics.replaceChildren();grid.replaceChildren();
   if(!current.ok){state.textContent=current.error;return}
   state.textContent='Status: '+current.state+' · '+current.filled+'/'+current.requested+
    ' shares hypothetically filled · '+current.remaining+' remain.';
   for(const [label,value] of [['Submitted shares',current.requested],
    ['Hypothetical filled shares',current.filled],['Unfilled shares',current.remaining],
    ['Modeled average fill',current.averageFill===null?'Not yet filled':money(current.averageFill)],
    ['Modeled notional',money(current.totalNotional)]]){
    const node=make('div');node.className='tp-stat';
    node.append(make('span',label),make('strong',value));metrics.append(node);
   }
   const table=make('table');table.className='journal-table';
   const head=make('thead'),tr=make('tr');
   for(const label of ['#','Time','Member-entered event','Status','Filled / remaining'])tr.append(make('th',label));
   head.append(tr);table.append(head);
   const body=make('tbody');
   for(const event of current.history){
    const row=make('tr');
    for(const value of [event.sequence,event.at,event.type,event.state,event.filled+' / '+event.remaining])
     row.append(make('td',value));
    body.append(row);
   }
   table.append(body);grid.append(table);
   const open=!current.terminal;
   for(const [action,b] of Object.entries(buttons)){
    b.disabled=!open||!alive()||!allowed(action,current.state);
   }
  }
  function allowed(type,stage){
   if(type==='SUBMIT')return stage==='DRAFT';
   if(type==='ACCEPT'||type==='REJECT')return stage==='SUBMITTED';
   if(type==='PARTIAL_FILL'||type==='FILL')return ['WORKING','PARTIALLY_FILLED','PENDING_CANCEL'].includes(stage);
   if(type==='CANCEL_REQUEST')return ['WORKING','PARTIALLY_FILLED'].includes(stage);
   if(type==='CANCEL_ACK')return stage==='PENDING_CANCEL';
   if(type==='EXPIRE')return ['WORKING','PARTIALLY_FILLED','PENDING_CANCEL'].includes(stage);
   return false;
  }
  seed.addEventListener('click',()=>{
   if(!alive())return;
   const r=readPlan();
   if(!r?.ok||!safeQty(r.size)){state.textContent='Complete a valid plan with at least one whole share before creating a scenario.';return}
   events=[];scenarioQty=r.size;direction=r.side;quantity.value=String(scenarioQty);
   shares.value=String(Math.max(1,Math.floor(scenarioQty/2)));
   price.value=String(r.entry);render();
  });
  reset.addEventListener('click',()=>{
   events=[];scenarioQty=null;quantity.value='';shares.value='';price.value='';render();
  });
  // Quantity edits cannot silently rewrite an order after the first submit.
  quantity.addEventListener('change',()=>{
   if(events.length){quantity.value=String(scenarioQty);state.textContent='Reset the scenario to modify submitted quantity.';return}
   const n=num(quantity.value);
   if(!safeQty(n)){state.textContent='Select a positive whole-share quantity up to 1,000,000.';return}
   scenarioQty=n;render();
  });
  for(const [action,b] of Object.entries(buttons))b.addEventListener('click',()=>{
   if(!alive()){state.textContent='Session changed; reopen your private Workbench.';return}
   const current=getStatus();if(!current.ok){state.textContent=current.error;return}
   if(!allowed(action,current.state)){state.textContent='Action not permitted from '+current.state+'.';return}
   const event={type:action,at:new Date().toISOString()};
   if(['PARTIAL_FILL','FILL'].includes(action)){
    event.shares=action==='FILL'?current.remaining:num(shares.value);
    event.price=num(price.value);
   }
   const candidate=replay({quantity:scenarioQty,direction,events:[...events,event]});
   if(!candidate.ok){state.textContent=candidate.error;return}
   events.push(event);render();
  });
  host.append(container);
  render();
  return Object.freeze({replay,reset:()=>{events=[];scenarioQty=null;render()}});
 }
 root.GroundUpTradePlanOrderLifecycleV1=Object.freeze({replay,mount,version:'1.0'});
})(window);
