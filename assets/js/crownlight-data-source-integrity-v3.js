/* Chart Studio V3 data-source trust boundary.
 * Connected, personal provider history is NOT licensed historical assessment
 * data. Validate it before replacing a member's working replay or chart state.
 */
(function(root){'use strict';
const PROVIDERS=new Set(['TIINGO_BYO','ALPACA_BYO']);
const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const reasonable=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
function validateProvider(payload,{provider,ticker,now=Date.now()}={}){
 if(!PROVIDERS.has(provider)||payload?.ok!==true||payload.provider!==provider||
    payload.ticker!==ticker||!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker||''))
  throw Error('Connected provider identity or ticker could not be verified.');
 const detail=payload.integrity;
 if(detail?.strictlyChronological!==true||
  detail?.feedCompletenessVerified!==false||
  detail?.licensedForMemberWidePublication!==false||
  detail?.approvedForOfficialReplay!==false||
  (provider==='ALPACA_BYO'&&detail.feed!=='IEX_SINGLE_EXCHANGE')||
  (provider==='TIINGO_BYO'&&detail.feed!=='TIINGO_PERSONAL_ACCOUNT'))
  throw Error('Connected provider data source and licensing limitations are incomplete.');
 if(!Array.isArray(payload.bars)||payload.bars.length<2||payload.bars.length>20000||
    detail.observations!==payload.bars.length)
  throw Error('Connected data did not contain a valid bounded OHLCV history.');
 let previous=-Infinity;
 const candles=[];
 for(const b of payload.bars){
  if(!iso.test(String(b?.timestamp||'')))throw Error('Provider timestamp must carry an explicit timezone.');
  const ms=Date.parse(b.timestamp);
  const {open,high,low,close,volume}=b;
  if(!Number.isSafeInteger(ms)||ms<=previous||ms>now+300000||
      ![open,high,low,close,volume].every(reasonable)||open<=0||high<=0||low<=0||close<=0||
      low>Math.min(open,close)||high<Math.max(open,close)||high<low)
   throw Error('Provider history contains invalid, future, duplicate, or out-of-order candles.');
  previous=ms;
  candles.push({time:new Date(ms),open,high,low,close,volume,
   tradeCount:Number.isSafeInteger(b.tradeCount)&&b.tradeCount>=0?b.tradeCount:null,
   providerVwap:reasonable(b.providerVwap)?b.providerVwap:null});
 }
 if(detail.firstTimestamp!==payload.bars[0].timestamp||
    detail.lastTimestamp!==payload.bars.at(-1).timestamp)
  throw Error('Provider source manifest does not match the returned candles.');
 return {candles,feed:detail.feed,
  sourceNote:String(payload.sourceNote||'Private provider OHLCV not certified for redistribution.').slice(0,500),
  classification:'PERSONAL_PROVIDER_UNGRADED_ONLY',
  rights:{consolidated:false,memberRedistribution:false,officialReplay:false}};
}
const api=Object.freeze({validateProvider});
root.CrownlightSourceIntegrityV3=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
