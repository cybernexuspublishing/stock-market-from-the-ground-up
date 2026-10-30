/* Crownlight Chart Studio V4 — noncommercial, read-only acceptance console.
 * Reuses existing authority: tier, workspace, Sparks and personal provider APIs.
 * NEVER grants tiers, redeems Sparks, submits paper orders, or starts a provider
 * history request until its own explicitly labeled user click.
 */
(function(root){
 'use strict';
 const URLS=Object.freeze({
  tier:'/api/chart-tier-access',workspace:'/api/chart-workspace',
  sparks:'/api/member-sparks-chart',connections:'/api/marketdata?action=list',
  bars:'/api/marketdata'
 });
 const PROVIDERS=Object.freeze({TIINGO_BYO:'Tiingo — personal account',ALPACA_BYO:'Alpaca — personal IEX'});
 const TIERS=Object.freeze(['STANDARD','ADVANCED','PROFESSIONAL']);
 const DATE=/^\d{4}-\d{2}-\d{2}$/;
 const TICKER=/^[A-Z][A-Z0-9.-]{0,11}$/;
 const boundedDate=(v)=>DATE.test(String(v||''))&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&
   new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v&&
   Date.parse(v+'T00:00:00Z')<=Date.now()&&
   Date.parse(v+'T00:00:00Z')>=Date.parse('2000-01-01T00:00:00Z');
 function tierSummary(value){
  if(value?.ok!==true||value.eligible!==true||!TIERS.includes(value.tier)||
    !Array.isArray(value.allowed)||!value.allowed.includes(value.tier))
    throw Error('Current Chart Studio tier is not independently verified.');
  const known=value.allowed.filter(x=>TIERS.includes(x));
  if(new Set(known).size!==known.length||known.some(x=>TIERS.indexOf(x)>TIERS.indexOf(value.tier)))
   throw Error('Server returned inconsistent chart access levels.');
  const expiry=Date.parse(value.temporaryAccess?.expiresAt||'');
  return {tier:value.tier,allowed:known,
   reason:String(value.reason||'Member entitlement').slice(0,200),
   temporary:!!value.temporaryAccess,
   expiresAt:Number.isFinite(expiry)?new Date(expiry).toISOString():null,
   activeTemporary:!value.temporaryAccess||Number.isFinite(expiry)&&expiry>Date.now()};
 }
 function workspaceSummary(value){
  if(value?.ok!==true||typeof value.workspace!=='object'||!value.workspace)
   throw Error('Saved workspace could not be independently verified.');
  const layout=value.workspace.layout,selected=value.workspace.selected;
  if(!['SIDE_BY_SIDE','STACKED','PRICE_FOCUS'].includes(layout)||!TIERS.includes(selected))
   throw Error('Server returned invalid Chart Studio workspace metadata.');
  return {layout,selected,sync:value.workspace.sync===true,
   revision:String(value.updatedAt||'Not saved').slice(0,60)};
 }
 function sparksSummary(value){
  if(value?.ok!==true||!Array.isArray(value.passes)||!Array.isArray(value.offers))
   throw Error('Temporary Sparks Chart Studio passes could not be verified.');
  const passes=value.passes.filter(p=>TIERS.includes(p.tier)&&p.tier!=='STANDARD'&&
   Number.isFinite(Date.parse(p.expires_at))&&Date.parse(p.expires_at)>Date.now())
   .map(p=>({tier:p.tier,expiresAt:p.expires_at}));
  return {activePasses:passes,offers:value.offers.filter(o=>TIERS.includes(o.tier)&&
   Number.isInteger(o.costSparks)&&o.costSparks>=0).length};
 }
 function sourcesSummary(value){
  if(value?.ok!==true||!Array.isArray(value.connections))
   throw Error('Private market-data connections could not be verified.');
  return value.connections.filter(x=>Object.hasOwn(PROVIDERS,x.provider_code)).map(x=>({
   provider:x.provider_code,connected:x.status==='connected',lastTestedAt:x.last_tested_at||null
  }));
 }
 const API=Object.freeze({tierSummary,workspaceSummary,sparksSummary,sourcesSummary,boundedDate});
 root.CrownlightStudioAcceptanceV4=API;
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
 if(typeof document==='undefined')return;
 const el=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e};
 const section=document.querySelector('#sim-content');
 if(!section)return;
 const panel=el('section');panel.id='cl-studio-acceptance-v4';
 panel.className='journal-card journal-section cl-studio-acceptance';
 panel.setAttribute('aria-label','Chart Studio member readiness and source verification');
 const h=el('h2','Crownlight Chart Studio — Verification');
 const disclaimer=el('p','Member-controlled checks for access, workspace, Sparks passes and personal data connections. No purchases, orders, live trading, or paid-provider requests occur during the basic readiness check. These are NOT Beta acceptance certification.');
 const controls=el('div'),refresh=el('button','Check Studio Setup');
 refresh.type='button';refresh.className='btn secondary';refresh.id='cl-studio-check-v4';
 const status=el('p','Select Check Studio Setup to verify current member configuration.');
 status.setAttribute('role','status');status.id='cl-studio-check-status-v4';
 const results=el('dl');results.id='cl-studio-check-results-v4';
 const label=(name,control)=>{const outer=el('label',name);outer.append(control);return outer};
 const sourceTitle=el('h3','Personal historical-data verification (optional)');
 const warning=el('p','This separate test uses the member’s connected Alpaca or Tiingo credentials to request a dated historical sample. Provider quotas or terms may apply. It does not replace the current chart, import bars, certify data rights, or purchase anything.');
 const sourceControls=el('div');sourceControls.className='cl-studio-sample-inputs';
 const provider=el('select');provider.id='cl-studio-provider-v4';
 for(const [code,name] of Object.entries(PROVIDERS)){const o=el('option',name);o.value=code;provider.append(o)}
 const ticker=el('input');ticker.id='cl-studio-ticker-v4';ticker.maxLength=12;
 ticker.placeholder='AAPL';ticker.value='AAPL';ticker.autocomplete='off';
 const day=el('input');day.id='cl-studio-date-v4';day.type='date';day.value='2024-05-07';
 const sample=el('button','Verify historical sample — no import');
 sample.type='button';sample.className='btn secondary';sample.id='cl-studio-sample-v4';
 const sourceResult=el('p','No historical provider request made.');
 sourceResult.setAttribute('role','status');sourceResult.id='cl-studio-sample-status-v4';
 controls.append(refresh);
 sourceControls.append(label('Personal provider',provider),label('Ticker',ticker),label('Trading date',day),sample);
 panel.append(h,disclaimer,controls,status,results,sourceTitle,warning,sourceControls,sourceResult);
 section.parentNode.insertBefore(panel,section);
 let memberId=null,active=true,epoch=0,client=null,inFlight=false,verifiedSources=[];
 function clear(){
  epoch++;memberId=null;verifiedSources=[];
  status.textContent='Private member session ended. Reload after signing in.';
  results.replaceChildren();sourceResult.textContent='';
  sourceControls.querySelectorAll('input').forEach(e=>{e.value=''});
  panel.replaceChildren();panel.hidden=true;active=false;
 }
 async function member(){
  if(!active)throw Error('Private Studio verification is no longer active.');
  if(!client)client=await root.getSupabaseClient();
  const s=(await client.auth.getSession()).data?.session;
  if(!s?.access_token||!s.user?.id)throw Error('Sign in to check your Studio access.');
  if(memberId&&memberId!==s.user.id){clear();throw Error('Account changed. Private Studio verification cleared.')}
  memberId=s.user.id;
  return {token:s.access_token,id:s.user.id};
 }
 async function get(path,who){
  const response=await fetch(path,{method:'GET',headers:{authorization:'Bearer '+who.token},
   cache:'no-store',credentials:'same-origin'});
  const data=await response.json().catch(()=>null);
  const current=(await client.auth.getSession()).data?.session;
  if(active&&current?.user?.id!==who.id)clear();
  if(!active||epoch!==who.epoch)throw Error('Member session changed; results discarded.');
  if(!response.ok||data?.ok!==true)throw Error(String(data?.error||'Member service unavailable').slice(0,200));
  return data;
 }
 const add=(name,detail)=>{
  const title=el('dt',name),description=el('dd',detail);
  results.append(title,description);
 };
 refresh.onclick=async()=>{
  if(inFlight)return;
  inFlight=true;refresh.disabled=true;
  const attempt=++epoch;
  results.replaceChildren();status.textContent='Reading current member permissions and private settings…';
  try{
   const who={...(await member()),epoch:attempt};
   const settled=await Promise.allSettled([
    get(URLS.tier,who),get(URLS.workspace,who),get(URLS.sparks,who),get(URLS.connections,who)
   ]);
   if(!active||attempt!==epoch)return;
   const report=[
    ['Chart Studio tier',settled[0],tierSummary],
    ['Private workspace',settled[1],workspaceSummary],
    ['Sparks temporary passes',settled[2],sparksSummary],
    ['Personal provider connections',settled[3],sourcesSummary]
   ];
   let ready=0;verifiedSources=[];
   for(const [name,result,parse] of report){
    if(result.status!=='fulfilled'){add(name,'Not verified: '+String(result.reason?.message||'Service unavailable'));continue}
    try{
     const value=parse(result.value);ready++;
     if(name==='Chart Studio tier')add(name,value.tier+'; '+value.reason+
       (value.temporary?'; expires '+(value.expiresAt||'unknown'):''));
     if(name==='Private workspace')add(name,value.layout+'; saved tier '+value.selected+
      '; synchronized: '+(value.sync?'yes':'no')+'; revision '+value.revision);
     if(name==='Sparks temporary passes')add(name,value.activePasses.length+' active; '+value.offers+
      ' catalog offers available (no redemption requested)');
     if(name==='Personal provider connections'){
      verifiedSources=value;
      add(name,value.length?value.map(x=>PROVIDERS[x.provider]+': '+(x.connected?'connected':'unverified')).join('; '):
       'No personal provider connection. Fictional and CSV practice remain available.');
     }
    }catch(e){add(name,'Not verified: '+e.message)}
   }
   status.textContent=ready+' of 4 independent read-only checks returned valid responses. '+
    (ready===4?'Studio configuration inspected; this is not authenticated Beta acceptance.':
     'Inspect unavailable services before declaring Studio readiness.');
  }catch(e){if(active)status.textContent=e.message||'Studio verification unavailable.'}
  finally{inFlight=false;refresh.disabled=false}
 };
 sample.onclick=async()=>{
  if(inFlight)return;
  inFlight=true;sample.disabled=true;
  const attempt=++epoch;
  sourceResult.textContent='Preparing personally authorized historical request…';
  try{
   const who={...(await member()),epoch:attempt};
   const sym=ticker.value.trim().toUpperCase(),date=day.value,source=provider.value;
   if(!TICKER.test(sym)||!boundedDate(date)||!Object.hasOwn(PROVIDERS,source))
    throw Error('Use a valid symbol, past trading date, and supported personal provider.');
   if(!verifiedSources.some(x=>x.provider===source&&x.connected))
    throw Error('Run Check Studio Setup and verify this personal provider connection first.');
   if(!root.CrownlightSourceIntegrityV3?.validateProvider)
    throw Error('Licensed data-source integrity verifier is unavailable.');
   const q=new URLSearchParams({action:'bars',provider:source,ticker:sym,start:date,end:date,freq:'1min'});
   const data=await get(URLS.bars+'?'+q,who);
   const validation=root.CrownlightSourceIntegrityV3.validateProvider(data,{provider:source,ticker:sym});
   if(!active||attempt!==epoch)return;
   sourceResult.textContent='Historical response validated: '+validation.candles.length+' chronological bars for '+sym+
    ' on '+date+' ('+validation.feed+'). Classification: '+validation.classification+
    '. No bars imported; not licensed for member-wide redistribution, graded replay or consolidated-market claims.';
  }catch(e){if(active)sourceResult.textContent='Historical sample not verified: '+String(e.message||e).slice(0,220)+
   '. Existing chart and provider connections were not changed.'}
  finally{inFlight=false;sample.disabled=false}
 };
 if(typeof root.addEventListener==='function'){
  root.addEventListener('crownlight:member-changed',clear);
  root.addEventListener('pagehide',clear,{once:true});
 }
 Promise.resolve(root.getSupabaseClient?.()).then(sb=>{
  if(!active||!sb?.auth)return;client=sb;
  sb.auth.onAuthStateChange?.((event,s)=>{
   if(event==='SIGNED_OUT'||memberId&&s?.user?.id!==memberId)clear();
  });
 }).catch(()=>{if(active)status.textContent='Sign in before verifying Studio configuration.'});
})(typeof window==='undefined'?globalThis:window);
