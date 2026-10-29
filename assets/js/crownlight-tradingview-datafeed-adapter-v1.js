/* TradingView Advanced Charts Datafeed API adapter — integration readiness ONLY.
 * Does not include or load proprietary TradingView libraries.
 * TradingView requires an approved license and compatible PUBLIC implementation.
 * Never use it for a membership-gated Advanced Charts deployment without permission.
 * The adapter consumes only Crownlight's already-revealed educational candles.
 */
(function(root){
 'use strict';
 const SAFE=['1']; // 1-minute revealed replay; no synthetic aggregation/lookahead.
 function createDatafeed(){
  let bars=[],ticker='REPLAY',listeners=new Map();
  const copy=x=>({...x});
  const emit=(fn,...args)=>setTimeout(()=>fn(...args),0);
  const validate=input=>{
   const result=[];let previous=-1;
   for(const p of Array.isArray(input)?input:[]){
    const time=Number(p.timestamp);
    const open=Number(p.open),high=Number(p.high),low=Number(p.low),
     close=Number(p.close),volume=Number(p.volume||0);
    if(!Number.isSafeInteger(time)||time<=previous||![open,high,low,close,volume].every(Number.isFinite)||
       open<0||close<0||volume<0||high<Math.max(open,close)||low>Math.min(open,close))continue;
    result.push({time,open,high,low,close,volume});previous=time;
   }
   return result;
  };
  return {
   onReady(cb){emit(cb,{supports_search:false,supports_group_request:false,
    supported_resolutions:SAFE,supports_marks:false,supports_timescale_marks:false,
    supports_time:false,exchanges:[],symbols_types:[{name:'Educational replay',value:'replay'}]})},
   resolveSymbol(symbol,cb,err){
    if(typeof symbol!=='string'||symbol!==ticker){emit(err,'Unknown revealed replay symbol');return}
    emit(cb,{ticker,name:ticker,description:'Crownlight revealed fictional or authorized replay',
     type:'stock',session:'24x7',timezone:'Etc/UTC',exchange:'Crownlight',
     minmov:1,pricescale:10000,has_intraday:true,has_daily:false,
     supported_resolutions:SAFE,volume_precision:0,data_status:'streaming'})
   },
   getBars(symbol,resolution,period,cb,err){
    if(symbol?.ticker!==ticker||!SAFE.includes(String(resolution))){emit(err,'Unsupported symbol or interval');return}
    const from=Number(period?.from)*1000,to=Number(period?.to)*1000;
    if(!Number.isFinite(from)||!Number.isFinite(to)||from>=to){emit(cb,[],{noData:true});return}
    const selected=bars.filter(x=>x.time>=from&&x.time<to).map(copy);
    emit(cb,selected,{noData:selected.length===0});
   },
   subscribeBars(symbol,resolution,callback,id){
    if(symbol?.ticker===ticker&&SAFE.includes(String(resolution))&&typeof id==='string')
     listeners.set(id,{callback,last:bars.at(-1)?.time||0});
   },
   unsubscribeBars(id){listeners.delete(id)},
   updateRevealed(event){
    const source=String(event?.symbol||'REPLAY').replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,40)||'REPLAY';
    const previous=bars.at(-1)?.time||0;
    // On a symbol switch clear subscriptions rather than leaking another member's data.
    if(source!==ticker){listeners.clear();bars=[]}
    ticker=source;bars=validate(event?.bars);
    const newest=bars.at(-1);
    if(newest&&newest.time>=previous)for(const listener of listeners.values()){
     if(newest.time>=listener.last){
      listener.last=newest.time;emit(listener.callback,copy(newest))
     }
    }
   },
   reset(){bars=[];ticker='REPLAY';listeners.clear()},
   getSnapshot:()=>({symbol:ticker,barCount:bars.length,subscribers:listeners.size})
  };
 }
 const adapter=createDatafeed();
 root.addEventListener('crownlight:revealed-bars',event=>adapter.updateRevealed(event.detail));
 root.addEventListener('crownlight:member-changed',()=>adapter.reset());
 root.CrownlightTradingViewAdapter={createDatafeed,getStatus:()=>({
  integration:'prepared',libraryInstalled:false,licensed:false,
  publicOnly:true,attributionRequired:true
 }),datafeed:adapter};
})(window);
