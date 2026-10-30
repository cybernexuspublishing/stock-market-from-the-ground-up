/* Progressive enhancement of existing Advanced Watchlist: official SEC sources.
 * No third-party chart content, user data storage, new entitlements or payment.
 */
(function(){
 'use strict';
 if(new URLSearchParams(location.search).get('tool')!=='WATCHLIST_WORKBENCH')return;
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 function mount(){
  const host=document.querySelector('#tool-workbench'),gate=document.querySelector('#tool-content');
  if(!host||!gate||gate.hidden||host.querySelector('#cl-sec-research'))return;
  const panel=make('section',null,'v11-workbench-panel');
  panel.id='cl-sec-research';panel.setAttribute('aria-label','Official SEC issuer research');
  const title=make('h2','Official SEC Filing & Company Research');
  const desc=make('p','Search official SEC filings and available company fundamentals. Sources are independent SEC records, not live quotes, trade alerts, verified float or permission to copy third-party charts.');
  const label=make('label','Research ticker (not a trade signal)');label.htmlFor='cl-sec-symbol';
  const input=make('input');input.id='cl-sec-symbol';input.placeholder='Example: MSFT';input.maxLength=12;input.autocomplete='off';
  const modeLabel=make('label','Research view');modeLabel.htmlFor='cl-sec-mode';
  const select=make('select');select.id='cl-sec-mode';
  for(const [value,title] of [['filings','Filing chronology'],['fundamentals','Filing chronology + financial statements']]){
   const option=make('option',title);option.value=value;select.append(option);
  }
  const button=make('button','Retrieve official SEC records','btn secondary');button.type='button';
  const status=make('p','Retrieval requires authorized SEC access configured on the server.','small');status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const result=make('div');
  panel.append(title,desc,label,input,modeLabel,select,button,status,result);host.append(panel);
  let sequence=0;
  button.onclick=async()=>{
   const symbol=input.value.trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)){status.textContent='Enter a valid ticker.';return}
   const local=++sequence;result.replaceChildren();status.textContent='Checking official SEC records…';button.disabled=true;
   let uid=null;
   try{
    const sb=await window.getSupabaseClient?.(),session=(await sb?.auth?.getSession?.())?.data?.session;
    if(!session?.user?.id||!session?.access_token)throw Error('Sign in before requesting private Workbench research.');
    uid=session.user.id;
    const response=await fetch('/api/sec-issuer-research-v1?symbol='+encodeURIComponent(symbol)+'&include='+select.value,{
     headers:{authorization:'Bearer '+session.access_token},cache:'no-store',credentials:'same-origin'});
    const data=await response.json().catch(()=>null),current=(await sb.auth.getSession()).data?.session;
    if(local!==sequence||current?.user?.id!==uid||gate.hidden){result.replaceChildren();status.textContent='Session changed; research discarded.';return}
    if(!response.ok||data?.ok!==true)throw Error(data?.error||'Official research unavailable.');
    if(data.identityStatus!=='MATCHED'){status.textContent='Ticker identity was not uniquely confirmed by SEC.';return}
    status.textContent='SEC identity confirmed for '+data.symbol+' · CIK '+data.cik+'. Retrieved '+data.filings.length+' recent relevant filing records. Source checked '+data.observedAt+'.';
    result.append(make('h3',data.company));
    const list=make('ul');
    for(const filing of data.filings){
     const item=make('li',filing.form+' · Filed '+filing.filedDate+' · Accepted '+(filing.acceptedAt||'Exact time unknown')+' · ');
     const link=make('a','Open original SEC filing');link.href=filing.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
     item.append(link);list.append(item);
    }
    result.append(make('h3','Recent filings'),list);
    if(Array.isArray(data.fundamentals)){
     result.append(make('h3','Reported financial data (not estimates)'));
     const table=make('table'),head=make('tr');
     for(const s of ['SEC metric','Most recently filed observation','Reporting period','SEC acceptance (not proven public release)']){
      head.append(make('th',s));
     }
     table.append(head);
     for(const metric of data.fundamentals){
      const v=metric.observations?.[0],row=make('tr');
      for(const x of [metric.metric,v?String(v.value)+' '+v.unit:'Not reported',v?.periodEnd||'Unknown',v?.acceptedAt||'Exact time unknown'])row.append(make('td',x));
      table.append(row);
     }
     result.append(table,make('p','SEC-reported facts may be revised and may differ by period or taxonomy. Filing acceptance is not proof of public release timing; no fact here is certified for historical intraday replay.','small'));
    }
   }catch(e){if(local===sequence){result.replaceChildren();status.textContent=e?.message||'Could not verify SEC records.'}}
   finally{if(local===sequence)button.disabled=false}
  };
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.querySelector('#tool-workbench'),gate=document.querySelector('#tool-content');
  if(!host||!gate)return;
  const observer=new MutationObserver(()=>mount());
  observer.observe(gate,{attributes:true,attributeFilter:['hidden']});
  observer.observe(host,{childList:true});
  mount();
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 });
})();
