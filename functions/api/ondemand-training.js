/* v0.13.5: entitlement-checked, book-aligned historical replay training.
   No third-party trading data or platform access is distributed. */
const send=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const T='ONDEMAND_TRAINING';
const curriculum=[
 {code:'CHART_STRUCTURE',title:'Chart Structure and Candle Reading',book:'Foundations I',focus:'Compare body, wick and volume information before a decision.',process:'Mark a decision-time boundary. Record what the candle proves and what remains uncertain.'},
 {code:'HH_HL',title:'Higher Highs and Higher Lows',book:'Foundations II',focus:'Separate confirmed swing structure from a single rising candle.',process:'Annotate highs/lows only using bars already visible at the pause point.'},
 {code:'VWAP_EMA',title:'VWAP, EMA9 and EMA20',book:'Foundations II',focus:'Evaluate location, trend and context; never use any indicator alone.',process:'Write entry trigger, invalidation and no-trade criteria before advancing.'},
 {code:'BREAKOUT',title:'Breakouts and Failed Breakouts',book:'Foundations III',focus:'Examine resistance, volume, retests and failed continuation.',process:'Save an ENTER / WATCH / NO TRADE decision and reasons before resuming.'},
 {code:'RISK',title:'Position Risk and Trade Review',book:'Day Trading',focus:'Compare theoretical entry, invalidation, size and R-based risk.',process:'Use simulated fills only; record assumptions, slippage and uncertainty.'},
 {code:'TAPE',title:'Tape Observation (Where Available)',book:'Reading the Tape',focus:'Distinguish executions, quotes and inferred order-flow context.',process:'If historical Time & Sales/Level II is unavailable, use a separate verified dataset; never invent it.'}
];
function config(env){let base=String(env.SUPABASE_URL||'').replace(/\/$/,''),pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;if(!base||!pub||!secret)throw Object.assign(new Error('Training backend is unavailable.'),{status:503});return{base,pub,secret}}
async function requestJson(url,options){const r=await fetch(url,{...options,cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Unable to verify access.'),{status:r.status===401?401:503});return r.json()}
async function main(env,path){const {base,secret}=config(env);return requestJson(base+'/rest/v1/'+path,{headers:{apikey:secret,...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)?{authorization:'Bearer '+secret}:{}),accept:'application/json'}})}
async function authorized(env,req){const {base,pub}=config(env),token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)throw Object.assign(new Error('Sign in to continue.'),{status:401});const user=await requestJson(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+token}}),id=user.id;if(!id)throw Object.assign(new Error('Invalid session.'),{status:401});const profile=(await main(env,`profiles?select=account_kind&id=eq.${encodeURIComponent(id)}&limit=1`))?.[0];if(profile?.account_kind==='showcase')return{kind:'showcase',id};if(profile?.account_kind==='test')return{kind:'test',id};if(profile?.account_kind!=='member')return{kind:'blocked',id};
const flags=(await main(env,`admin_user_flags?select=status&user_id=eq.${encodeURIComponent(id)}&limit=1`))[0];
if(['suspended','restricted'].includes(flags?.status))return{kind:'blocked',id};
const [roles,grants,subscriptions,passes,bookTrials]=await Promise.all([
 main(env,`admin_user_roles?select=role_code,expires_at&user_id=eq.${encodeURIComponent(id)}`),
 main(env,`user_plan_grants?select=plan_code,starts_at,ends_at,status&user_id=eq.${encodeURIComponent(id)}&status=in.(active,trialing)`),
 main(env,`site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.${encodeURIComponent(id)}&status=in.(active,trialing)`),
 main(env,`user_tool_passes?select=tool_code,status,starts_at,ends_at,current_period_end&user_id=eq.${encodeURIComponent(id)}&tool_code=eq.${T}&status=in.(active,trialing)`),
 main(env,`entitlements?select=product_key,status,starts_at,ends_at&user_id=eq.${encodeURIComponent(id)}&product_key=eq.full_learning_access&status=in.(active,trialing)`)
]);
const t=Date.now(),valid=d=>!d||Date.parse(d)>t,started=d=>!d||Date.parse(d)<=t,full=p=>['FULL_MONTHLY','FULL_ANNUAL','LIFETIME','ONDEMAND_MONTHLY','FOUNDING_MONTHLY','FOUNDING_ANNUAL'].includes(p);
const owner=roles.some(r=>r.role_code==='OWNER'&&valid(r.expires_at));
const grant=grants.some(g=>full(g.plan_code)&&started(g.starts_at)&&valid(g.ends_at));
const subscription=subscriptions.some(s=>full(s.plan_code)&&valid(s.current_period_end));
const tool=passes.some(p=>p.tool_code===T&&started(p.starts_at)&&valid(p.current_period_end||p.ends_at));
const trial=bookTrials.some(g=>g.product_key==='full_learning_access'&&started(g.starts_at)&&valid(g.ends_at));
return{kind:owner||grant||subscription||tool||trial?'authorized':'upgrade',id,via:owner?'owner':grant?'plan_grant':subscription?'subscription':tool?'flex_tool':trial?'book_trial':null};}
export async function onRequest({request,env}){try{
 if(request.method!=='GET')return send({ok:false,error:'Only GET is supported.'},405);
 const a=await authorized(env,request),isPreview=a.kind==='showcase'||a.kind==='test'||a.kind==='upgrade',isOwner=a.kind==='authorized';
 if(a.kind==='blocked')return send({ok:false,error:'This account cannot access production training.'},403);
 if(isPreview)return send({ok:true,access:a.kind,synthetic:a.kind==='showcase'||a.kind==='test',premium:false,modules:curriculum.map(x=>({code:x.code,title:x.title,book:x.book})),labs:[],notice:['showcase','test'].includes(a.kind)?'Synthetic-only demonstration. No production access or lab evidence.':'Select the individual training tool or a qualifying Full Membership. Payments are not enabled for this tool yet.'});
 const rows=await main(env,'platform_labs?select=lab_id,title,book_code,ticker,historical_date,timeframe,custom_href,public_sample,metadata&active=eq.true&registry_visible=eq.true&order=sort_order.asc&limit=500');
 // Never construct fictitious timestamp, ticker, tape or market-data content.
 const labs=(rows||[]).filter(x=>x.ticker&&x.historical_date).slice(0,500).map(x=>({id:x.lab_id,title:x.title||x.lab_id,bookCode:x.book_code,ticker:x.ticker,date:x.historical_date,timeframe:x.timeframe||null,href:x.custom_href||'/site-lab.html?lab='+encodeURIComponent(x.lab_id)}));
 return send({ok:true,access:'active',via:a.via,premium:true,synthetic:false,modules:curriculum,labs,note:'Use your own authorized thinkorswim OnDemand account. Historical availability and supported features vary; do not look at later candles before locking the decision.'});
}catch(e){return send({ok:false,error:e.status===503?'Training service unavailable.':e.message||'Training request failed.'},e.status||500)}}

export {authorized};
