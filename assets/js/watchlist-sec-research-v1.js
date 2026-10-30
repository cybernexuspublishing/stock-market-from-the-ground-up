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
  let fundamentalsChart=null,chartObserver=null;
  const cleanupChart=()=>{chartObserver?.disconnect();chartObserver=null;
   if(fundamentalsChart){fundamentalsChart.dispose();fundamentalsChart=null}};
  panel.append(title,desc,label,input,modeLabel,select,button,status,result);host.append(panel);
  let sequence=0;
  button.onclick=async()=>{
   const symbol=input.value.trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)){status.textContent='Enter a valid ticker.';return}
   const local=++sequence;cleanupChart();result.replaceChildren();status.textContent='Checking official SEC records…';button.disabled=true;
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
     const available=data.fundamentals.filter(m=>Array.isArray(m.observations)&&m.observations.some(p=>Number.isFinite(p.value)));
     if(available.length){
      const selectorLabel=make('label','Reported metric for visualization');
      const selector=make('select');selectorLabel.append(selector);
      for(let i=0;i<available.length;i++){
       const option=make('option',available[i].metric);option.value=String(i);selector.append(option);
      }
      const plotButton=make('button','Plot reported SEC observations','btn secondary');
      plotButton.type='button';
      const plot=make('div');plot.style.cssText='width:100%;height:330px;min-height:330px';
      plot.setAttribute('role','img');
      plot.setAttribute('aria-label','SEC XBRL observations by financial reporting period. The table remains the accessible numeric reference.');
      const plotStatus=make('p','This plot shows discrete reported values, not continuous price data or comparable quarterly growth rates.','small');
      plotStatus.setAttribute('role','status');plotStatus.setAttribute('aria-live','polite');
      result.append(selectorLabel,plotButton,plot,plotStatus);
      plotButton.onclick=async()=>{
       const sb=await window.getSupabaseClient?.();
       const current=(await sb?.auth?.getSession?.())?.data?.session;
       if(!current?.user?.id||current.user.id!==uid||gate.hidden||!result.contains(plot)){
        cleanupChart();plotStatus.textContent='Session changed. Reload your company research.';return;
       }
       const chosen=available[Number(selector.value)],points=(chosen?.observations||[])
        .filter(p=>Number.isFinite(p.value)&&p.periodEnd&&p.filingDate).slice().reverse();
       if(!points.length){plotStatus.textContent='No valid reported values to visualize.';return}
       try{
        const e=await window.CrownlightECharts?.load?.();
        const renewed=(await sb.auth.getSession()).data?.session;
        if(!e?.init||renewed?.user?.id!==uid||gate.hidden||!result.contains(plot)){
         cleanupChart();plotStatus.textContent='Chart loading or session verification unavailable; use the accessible table.';return;
        }
        cleanupChart();
        fundamentalsChart=e.init(plot,null,{renderer:'canvas'});
        fundamentalsChart.setOption({
         animation:false,
         tooltip:{trigger:'axis'},
         grid:{left:65,right:26,top:35,bottom:95},
         xAxis:{type:'category',data:points.map(p=>p.periodEnd+' / '+p.filingDate),
          name:'Period end / filing date',axisLabel:{rotate:35}},
         yAxis:{type:'value',name:chosen.unit||'',scale:true},
         series:[{name:chosen.metric,type:'bar',data:points.map(p=>p.value),barMaxWidth:34}]
        },true);
        if(typeof ResizeObserver!=='undefined'){
         chartObserver=new ResizeObserver(()=>fundamentalsChart?.resize());chartObserver.observe(plot);
        }
        plotStatus.textContent='Source: SEC XBRL reported observations. Each bar shows a filed value for its stated period; duration, restatements and accounting definitions can differ. Not suitable for calculating growth without aligning periods.';
       }catch{
        cleanupChart();plotStatus.textContent='Chart could not load. Exact reported values remain available in the table above.';
       }
      };
     }
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
