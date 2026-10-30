/* Crownlight Watchlist Intelligence V2 — additive premium workspace companion.
 * Wraps existing V1 mount: no modifications to advanced-tools.js, Free quota,
 * Tutor, price catalog or real money. All edits verified by existing API.
 */
(function(root){
 'use strict';
 const prev=root.GroundUpWatchlistIntelligenceV1,C=root.GroundUpWatchlistResearchCoreV2;
 if(!prev||!C)return;
 const mk=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=String(label);if(cls)e.className=cls;return e};
 const input=(label,max=180)=>{const wrap=mk('label',label,'cl-wi-label'),field=mk('input');field.type='text';field.maxLength=max;wrap.append(field);return {wrap,field}};
 const option=(select,value,label)=>{const item=mk('option',label??value);item.value=value;select.append(item)};
 const fmt=x=>'$'+Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
 const status=(node,s)=>{node.textContent=String(s)};
 async function mountV2({host,recs,alive=()=>true}){
  if(!host)return;
  // Fail closed before rendering any prior private saved research into the DOM.
  const initialClient=await root.getSupabaseClient?.();
  const initialSession=(await initialClient?.auth?.getSession?.())?.data?.session;
  if(!initialSession?.user?.id||!initialSession.access_token||!alive())return;
  let current=(Array.isArray(recs)?recs:[]).filter(x=>x?.record_type==='watchlist'),
    filterRecords=[],chart=null,seq=0,member=initialSession.user.id,busy=false;
  const rootBox=mk('section',undefined,'v11-workbench-panel cl-wi-v2');
  rootBox.setAttribute('aria-label','Watchlist Intelligence research lifecycle');
  rootBox.append(mk('h2','Crownlight Watchlist Intelligence · Research Workflows'),
   mk('p','Saved candidate folders, tags, eight-stage research workflow, annotated price references, saved scanner criteria and manual review reminders. This is not a live feed, an automated alert service, a broker order or a graded Lab.'));
  const head=mk('div',undefined,'cl-wi-layout');
  const search=input('Search ticker / research thesis',120),folderFilter=mk('select'),tagFilter=mk('select'),
   stageFilter=mk('select'),archiveFilter=mk('input');
  archiveFilter.type='checkbox';
  option(folderFilter,'','All folders');option(tagFilter,'','All tags');option(stageFilter,'','All stages');
  for(const s of C.STAGES)option(stageFilter,s,s);
  const filterLine=mk('div',undefined,'cl-wi-filters');
  const selectLabel=(text,select)=>{const lab=mk('label',text);lab.append(select);return lab};
  const archivedLabel=mk('label',' Include archived candidates');archivedLabel.prepend(archiveFilter);
  filterLine.append(search.wrap,selectLabel('Folder',folderFilter),selectLabel('Tag',tagFilter),
   selectLabel('Stage',stageFilter),archivedLabel);
  const summary=mk('p','', 'small'),notices=mk('p','', 'small'),candidateSelect=mk('select');
  notices.setAttribute('role','status');notices.setAttribute('aria-live','polite');
  head.append(filterLine,summary,candidateSelect,notices);
  const edit=mk('div',undefined,'cl-wi-editor');
  const folder=input('Folder',40),tags=input('Tags (comma-separated; maximum eight)',320),
   reviewNote=input('Checkpoint evidence / rationale (12+ characters for stage/archive changes)',480);
  const stage=mk('select'),archived=mk('input');archived.type='checkbox';
  for(const step of C.STAGES)option(stage,step,step);
  const archiveLabel=mk('label',' Archive this candidate');archiveLabel.prepend(archived);
  const pointTime=input('Research review time (ISO 8601 with UTC offset)',40);
  const actionRow=mk('div',undefined,'cl-wi-actions');
  const save=mk('button','Save research folder, tags and stage','btn secondary'),checkpoint=mk('button','Add dated research checkpoint','btn secondary'),
   exportBtn=mk('button','Export visible candidates as safe CSV','btn secondary');
  for(const button of [save,checkpoint,exportBtn])button.type='button';
  actionRow.append(save,checkpoint,exportBtn);
  const annotations=mk('div',undefined,'cl-wi-annotations');
  const graph=mk('div',undefined,'cl-wi-graph');graph.hidden=true;graph.style.cssText='width:100%;height:260px;min-height:260px';
  const annotationKind=mk('select');
  for(const k of C.CATS)option(annotationKind,k,k);
  const annotationPrice=input('Manually observed reference price (USD)',28),
   annotationAt=input('Timestamp with UTC offset',40),annotationNote=input('Price-reference evidence and limitations (12+ chars)',360),
   annotationFrame=input('Chart timeframe',24);
  annotationFrame.field.value='1D';
  const annotate=mk('button','Save manual chart annotation','btn secondary'),showChart=mk('button','Chart saved manual annotations using ECharts','btn secondary');
  annotate.type='button';showChart.type='button';
  const timeline=mk('div'),checkpointList=mk('ul'),annotationList=mk('ul');
  timeline.append(mk('h3','Research trail (last 50 member-entered events)'),checkpointList);
  annotations.append(mk('h3','Chart annotations — saved references, not historical price bars'),
   selectLabel('Reference type',annotationKind),annotationPrice.wrap,annotationAt.wrap,
   annotationFrame.wrap,annotationNote.wrap,annotate,showChart,graph,annotationList);
  const monitor=mk('section',undefined,'cl-wi-monitor');
  const reviewList=mk('ul'),ruleType=mk('select'),
   ruleLow=input('Manual price trigger / lower reference',28),
   ruleHigh=input('Upper reference for range rules',28),
   ruleReason=input('Pattern-monitor evidence / no-trade limitation',360),
   ruleAt=input('Rule observation time with UTC offset',40),
   ruleSave=mk('button','Save manual pattern-monitor rule','btn secondary'),
   observedPrice=input('Observed price from user-provided snapshot',28),
   observedAt=input('Observed time with UTC offset',40),
   observedSource=input('Observation source / data rights',180),
   ruleEvaluate=mk('button','Evaluate and record a manual research review','btn secondary'),
   ruleResults=mk('p');
  for(const k of C.MONITOR_TYPES)option(ruleType,k,k.replaceAll('_',' '));
  for(const button of [ruleSave,ruleEvaluate])button.type='button';
  ruleResults.setAttribute('role','status');
  monitor.append(mk('h3','In-page research review reminders'),reviewList,
   mk('h3','Manual pattern monitoring'),
   mk('p','Define a research review rule and apply it only to a dated, member-provided price observation. No automatic polling, push alerts, trading signals or broker integration.'),
   selectLabel('Pattern-monitor criterion',ruleType),ruleLow.wrap,ruleHigh.wrap,
   ruleAt.wrap,ruleReason.wrap,ruleSave,observedPrice.wrap,observedAt.wrap,
   observedSource.wrap,ruleEvaluate,ruleResults);
  const scanner=mk('section',undefined,'cl-wi-scanner'),savedSet=mk('select'),
   sourceNote=input('Authorized scanner snapshot / source-rights note',180),
   sourceAt=input('Snapshot observation time with timezone offset',40),
   scanFile=mk('input'),scanButton=mk('button','Evaluate saved scanner criteria','btn secondary'),scanList=mk('div');
  scanFile.type='file';scanFile.accept='.csv,text/csv';scanButton.type='button';
  option(savedSet,'','Choose an existing saved filter set');
  scanner.append(mk('h3','Advanced scanner · saved criteria and supplied snapshots'),
   mk('p','The scanner applies your saved criteria to a personally authorized CSV snapshot. It never downloads live quotes or claims independent market verification.'),
   selectLabel('Saved scanner/discovery filters',savedSet),sourceNote.wrap,sourceAt.wrap,scanFile,scanButton,scanList);
  const guidance=mk('section',undefined,'cl-wi-guidance'),guidanceText=mk('p');
  const journalPlan=input('Optional existing saved Trade-Plan snapshot ID',16),
   journalEntryId=input('Optional existing Journal record ID for server-verified research link',16),
   journalGo=mk('button','Verify plan and open authenticated Journal handoff','btn secondary'),
   journalLink=mk('button','Attach saved plan to owned Journal record','btn secondary'),
   tradePlanGo=mk('button','Open the existing Trade-Plan Builder for this candidate','btn secondary'),
   lab=mk('a','Open existing authorized Labs','btn secondary'),
   bootcamp=mk('a','Explore existing Boot Camp lessons','btn secondary');
  journalGo.type='button';journalLink.type='button';tradePlanGo.type='button';
  lab.href='labs.html';bootcamp.href='bootcamp-academy.html';
  guidance.append(mk('h3','Talia research questions and learning handoffs'),guidanceText,
   mk('p','The existing Advanced Trade-Plan Builder remains available above. Enter an existing saved plan ID to use the Journal’s authenticated, read-only transfer; no Journal record, brokerage activity, or mastery is created automatically.'),
   journalPlan.wrap,journalGo,journalEntryId.wrap,journalLink,tradePlanGo,lab,bootcamp);
  const body=mk('div',undefined,'cl-wi-body');
  edit.append(folder.wrap,tags.wrap,selectLabel('Eight-stage candidate review',stage),archiveLabel,
   pointTime.wrap,reviewNote.wrap,actionRow,timeline,annotations);
  body.append(edit,monitor,scanner,guidance);
  rootBox.append(head,body);
  host.append(rootBox);
  const getSelected=()=>current.find(x=>String(x.id)===candidateSelect.value);
  async function auth(){
   const sb=await root.getSupabaseClient?.(),s=(await sb?.auth.getSession())?.data?.session;
   if(!s?.user?.id||!s.access_token||!alive())throw Error('Verified member Workbench session unavailable.');
   if(member&&member!==s.user.id)throw Error('Account changed. Reload your private workspace.');
   member=s.user.id;return {sb,token:s.access_token,uid:member};
  }
  async function api(query='',method='GET',data){
   const seqAtStart=seq,{sb,token,uid}=await auth();
   const response=await fetch('/api/advanced-tool-workspace-v014110?tool=WATCHLIST_WORKBENCH'+query,{
    method,cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,
     ...(data?{'content-type':'application/json'}:{})},
    ...(data?{body:JSON.stringify(data)}:{})});
   const payload=await response.json().catch(()=>null);
   const latest=(await sb.auth.getSession()).data?.session;
   if(!alive()||latest?.user?.id!==uid||seqAtStart!==seq)throw Error('Private workspace session changed; responses discarded.');
   if(!response.ok||payload?.ok!==true)throw Error(payload?.error||'Private workspace request failed.');
   return payload;
  }
  const editPayload=async(r,payload)=>{
   if(!r?.updated_at)throw Error('Refresh the Watchlist before editing an older record without a revision.');
   return api('&id='+encodeURIComponent(r.id),'PATCH',{
    recordType:'watchlist',title:r.title,payload,expectedUpdatedAt:r.updated_at
   });
  };
  const safeTime=()=>new Date().toISOString().replace('.000Z','Z').replace(/\.\d{3}Z$/,'Z');
  async function refresh(){
   const rows=await api('&type=watchlist');
   current=(rows.records||[]).filter(x=>x?.record_type==='watchlist');
   renderFilters();render();
   return rows;
  }
  function renderFilters(){
   const prevFolder=folderFilter.value,prevTag=tagFilter.value;
   const folders=new Set(),allTags=new Set();
   for(const r of current){try{const x=C.safeRecord(r);folders.add(x.folder);for(const t of x.tags)allTags.add(t)}catch{}}
   folderFilter.replaceChildren();tagFilter.replaceChildren();
   option(folderFilter,'','All folders');option(tagFilter,'','All tags');
   for(const value of [...folders].sort())option(folderFilter,value,value);
   for(const value of [...allTags].sort())option(tagFilter,value,value);
   if([...folders].includes(prevFolder))folderFilter.value=prevFolder;
   if([...allTags].includes(prevTag))tagFilter.value=prevTag;
  }
  function render(){
   const visible=C.filters(current,{
    folder:folderFilter.value,tag:tagFilter.value,stage:stageFilter.value,
    includeArchived:archiveFilter.checked,query:search.field.value});
   const counts=C.stats(current),prior=candidateSelect.value;
   candidateSelect.replaceChildren();option(candidateSelect,'','Select saved candidate');
   for(const r of visible)option(candidateSelect,String(r.id),r.title+' · '+C.safeRecord(r).stage+
      (C.safeRecord(r).archived?' (archived)':''));
   if(visible.some(x=>String(x.id)===prior))candidateSelect.value=prior;
   else if(visible.length)candidateSelect.value=String(visible[0].id);
   summary.textContent=visible.length+' filtered of '+counts.total+' saved candidates ('+
      counts.active+' active, '+counts.archived+' archived). This excludes undocumented historical changes.';
   const alerts=C.reminders(current);
   reviewList.replaceChildren();
   for(const r of alerts){const li=mk('li',r.symbol+': '+r.alerts.join('; '));reviewList.append(li)}
   if(!alerts.length)reviewList.append(mk('li','No in-page review flags from current saved notes.'));
   renderSelected();
  }
  function renderSelected(){
   const rec=getSelected();edit.hidden=!rec;annotations.hidden=!rec;guidance.hidden=!rec;
   chart?.dispose?.();chart=null;graph.hidden=true;graph.replaceChildren();
   checkpointList.replaceChildren();annotationList.replaceChildren();
   if(!rec)return;
   const x=C.safeRecord(rec),p=x.payload;
   folder.field.value=x.folder;tags.field.value=x.tags.join(', ');stage.value=x.stage;
   archived.checked=x.archived;reviewNote.field.value='';pointTime.field.value=safeTime();
   annotationAt.field.value=safeTime();annotationPrice.field.value='';
   annotationNote.field.value='';
   ruleAt.field.value=safeTime();observedAt.field.value=safeTime();
   ruleReason.field.value='';ruleResults.textContent=(Array.isArray(p.monitoringRules)?p.monitoringRules.length:0)+
    ' manually saved research review rules. No automated notification service is active.';
   for(const event of [...x.history].reverse())
    checkpointList.append(mk('li',(event.at||'Unknown time')+' · '+(event.kind||'REVIEW')+' · '+(event.note||'No note')));
   if(!x.history.length)checkpointList.append(mk('li','No recorded research checkpoints yet. Older changes cannot be inferred.'));
   for(const note of [...x.annotations].reverse())
    annotationList.append(mk('li',(note.at||'')+' '+(note.kind||'OTHER')+' · '+fmt(note.price||0)+
     ' · '+(note.timeframe||'1D')+' — '+(note.note||'No original note')));
   if(!x.annotations.length)annotationList.append(mk('li','No saved manual chart annotations.'));
   const source=String(p.sourceNote||'').trim();
   guidanceText.textContent='Talia asks: What does the '+x.stage.toLowerCase()+
    ' stage require you to verify for '+x.title+'? '+(source?'How reliable and current is the recorded source? ':'What original source is still missing? ')+
    'What invalidates the thesis, and when is NO TRADE the better documented decision? '+
    'These are teaching prompts, not AI-verified evidence or a completed Lab.';
  }
  async function commit(change){
   if(busy)return;
   const rec=getSelected();if(!rec)return;
   busy=true;
   try{
    const payload=change==='metadata'?C.setMetadata(rec,{folder:folder.field.value,tags:tags.field.value,
     archived:archived.checked,stage:stage.value,at:pointTime.field.value,note:reviewNote.field.value}):
     change==='checkpoint'?C.checkpoint(rec,{note:reviewNote.field.value,at:pointTime.field.value,action:'RESEARCH_NOTE'}):
     C.annotation(rec,{kind:annotationKind.value,price:annotationPrice.field.value,at:annotationAt.field.value,
      timeframe:annotationFrame.field.value,note:annotationNote.field.value});
    await editPayload(rec,payload);await refresh();
    status(notices,'Private candidate updated with revision checks. User-entered evidence is not independently verified.');
   }catch(e){status(notices,e.message||'Could not save the private research record.');}
   finally{busy=false}
  }
  save.onclick=()=>commit('metadata');checkpoint.onclick=()=>commit('checkpoint');annotate.onclick=()=>commit('annotation');
  exportBtn.onclick=()=>{
   try{
    const visible=C.filters(current,{folder:folderFilter.value,tag:tagFilter.value,
     stage:stageFilter.value,includeArchived:archiveFilter.checked,query:search.field.value});
    if(!visible.length)throw Error('No saved research candidates match the current export filters.');
    const csv=C.exportCsv(visible),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
    const a=mk('a');a.href=url;a.download='crownlight-watchlist-research.csv';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status(notices,visible.length+' current member-owned candidates exported. Spreadsheet formula prefixes were escaped.');
   }catch(e){status(notices,e.message)}
  };
  showChart.onclick=async()=>{
   try{
    const data=C.safeRecord(getSelected()).annotations;
    if(!data.length)throw Error('Save manual reference annotations before opening this chart.');
    const E=await root.CrownlightECharts?.load?.();
    if(!E||!alive())throw Error('ECharts cannot load in the current session.');
    graph.hidden=false;
    if(!chart)chart=E.init(graph,'dark');
    chart.setOption({animation:false,backgroundColor:'transparent',grid:{left:65,right:32,top:32,bottom:68},
     textStyle:{color:'#dbe8ee'},
     xAxis:{type:'category',data:data.map((x,i)=>x.at.slice(0,16)+' #'+(i+1)),axisLabel:{rotate:40,color:'#d3e2ed'}},
     yAxis:{type:'value',scale:true,name:'Member-entered level (USD)',axisLabel:{color:'#d3e2ed'}},
     tooltip:{trigger:'item',formatter:param=>{
      const v=data[param.dataIndex];return (v?.kind||'Manual level')+' · '+fmt(v.price);
     }},
     series:[{type:'scatter',symbolSize:12,data:data.map((x,i)=>[i,x.price])}]});
    chart.resize();
    status(notices,'ECharts displays manually saved reference levels only—not historical candles, a price series or live quote.');
   }catch(e){status(notices,e.message)}
  };
  ruleSave.onclick=async()=>{
   if(busy)return;
   const rec=getSelected();if(!rec)return;
   busy=true;
   try{
    const payload=C.monitoringRule(rec,{type:ruleType.value,low:ruleLow.field.value,
     high:ruleHigh.field.value,at:ruleAt.field.value,note:ruleReason.field.value});
    await editPayload(rec,payload);await refresh();
    status(notices,'Dated manual research rule saved with an audit checkpoint; no automatic monitoring activated.');
   }catch(e){status(notices,e.message||'Manual rule save failed.')}finally{busy=false}
  };
  ruleEvaluate.onclick=async()=>{
   if(busy)return;
   const rec=getSelected();if(!rec)return;
   busy=true;
   try{
    const d=C.evaluateMonitoring(rec,{price:observedPrice.field.value,
     at:observedAt.field.value,sourceNote:observedSource.field.value});
    if(!d.results.length)throw Error('Save at least one manual monitoring rule first.');
    const flags=d.results.filter(x=>x.matched);
    const message=flags.length+' of '+d.results.length+
     ' member-defined criteria require manual evidence review; not a buy/sell signal.';
    const update=C.checkpoint(rec,{action:'MANUAL_PATTERN_REVIEW',at:d.at,
     note:'Manual snapshot review: '+message+' Source: '+d.sourceNote});
    await editPayload(rec,update);await refresh();
    ruleResults.textContent=message;
    status(notices,'Manual pattern review saved to the private research trail; no automatic alerts or orders.');
   }catch(e){status(notices,e.message||'Manual pattern review could not be verified.')}finally{busy=false}
  };
  tradePlanGo.onclick=()=>{
   const rec=getSelected();
   if(!rec)return;
   const button=[...document.querySelectorAll('#w-list button')].find(x=>
    x.getAttribute('aria-label')==='Open trade plan for '+rec.title);
   if(!button)return status(notices,'Existing Trade-Plan Builder link is unavailable. Use the saved candidate list above.');
   button.click();status(notices,'Opened the existing Trade-Plan Builder. No plan or trade was saved automatically.');
  };
  journalLink.onclick=async()=>{
   try{
    const journalId=journalEntryId.field.value.trim(),planId=journalPlan.field.value.trim();
    if(![journalId,planId].every(x=>/^[1-9][0-9]{0,15}$/.test(x)&&Number.isSafeInteger(Number(x))))
     throw Error('Enter existing positive integer Journal and saved plan record IDs.');
    const {sb,token,uid}=await auth();
    // Journal and source-plan ownership, ticker identity, event chronology,
    // locking rules and current premium access are verified server-side.
    const response=await fetch('/api/journal-research-links-v1',{
     method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{authorization:'Bearer '+token,'content-type':'application/json'},
     body:JSON.stringify({journalId:Number(journalId),planId:Number(planId)})});
    const d=await response.json().catch(()=>null);
    const after=(await sb.auth.getSession()).data?.session;
    if(after?.user?.id!==uid||!alive())throw Error('Member identity changed during Journal linking.');
    if(!response.ok||d?.ok!==true||d.linked!==true)
     throw Error(d?.error||'Server could not verify an owned, source-consistent Journal link.');
    status(notices,'Authenticated research link '+(d.alreadyLinked?'already exists.':'recorded.')+
      ' Existing Journal entry unchanged; no trade, grade or new quota usage was created.');
   }catch(e){status(notices,e.message)}
  };
  journalGo.onclick=async()=>{
   try{
    const v=journalPlan.field.value.trim();
    if(!/^[1-9][0-9]{0,15}$/.test(v)||!Number.isSafeInteger(Number(v)))
     throw Error('Enter an existing saved premium Trade-Plan snapshot ID.');
    const {sb,token,uid}=await auth();
    const response=await fetch('/api/journal-plan-prefill?planId='+encodeURIComponent(v),{
     headers:{authorization:'Bearer '+token},cache:'no-store'});
    const d=await response.json().catch(()=>null);
    const currentAuth=(await sb.auth.getSession()).data?.session;
    if(currentAuth?.user?.id!==uid||!alive())throw Error('Account changed during transfer.');
    if(!response.ok||d?.ok!==true||d.planId!==Number(v)||!d.journalDraft)
     throw Error(d?.error||'Your saved plan is not verified for Journal transfer.');
    if(d.journalDraft.ticker!==getSelected()?.title)throw Error('Saved plan ticker does not match this selected candidate.');
    root.location.assign('journal.html?source_plan='+encodeURIComponent(v));
   }catch(e){status(notices,e.message)}
  };
  for(const c of [search.field,folderFilter,tagFilter,stageFilter,archiveFilter])
   c.addEventListener(c===search.field?'input':'change',render);
  candidateSelect.addEventListener('change',renderSelected);
  // Use the existing offline-first scanner and existing authenticated private
  // filter_set records. Do not store/rebroadcast original source observations.
  scanButton.onclick=async()=>{
   try{
    const file=scanFile.files?.[0],note=sourceNote.field.value.trim(),asOf=sourceAt.field.value.trim();
    if(!file||file.size>2000000)throw Error('Choose an authorized CSV snapshot smaller than 2 MB.');
    if(note.length<8||note.length>180||!C.time(asOf))
     throw Error('Record a credible source/rights note and nonfuture timestamp with offset.');
    const chosen=filterRecords.find(x=>String(x.id)===savedSet.value);
    if(!chosen)throw Error('Choose one of your own saved scanner filter sets.');
    const scannerEngine=root.GroundUpScannerV014145;
    if(!scannerEngine)throw Error('The existing scanner engine is unavailable.');
    const rows=scannerEngine.csv(await file.text()),spec=scannerEngine.filters(chosen.payload?.filters||{});
    const out=scannerEngine.analyze(rows,spec);
    scanList.replaceChildren();
    const summary=mk('p',out.matched+' / '+out.inspected+' supplied snapshot rows matched. Source: '+
      note+' · '+asOf+'. User-provided and NOT independently verified.');scanList.append(summary);
    for(const item of out.rows.slice(0,35)){
     const li=mk('p',item.symbol+' · '+fmt(item.price)+' · volume '+item.volume);
     const add=mk('button','Research in candidate form','btn secondary');add.type='button';
     add.onclick=()=>{
      const ticker=document.getElementById('w-ticker'),at=document.getElementById('w-asof'),
       src=document.getElementById('w-source'),why=document.getElementById('w-why');
      if(!ticker||!at||!src||!why)return status(notices,'Candidate form is unavailable.');
      ticker.value=item.symbol;at.value=asOf;src.value=note.slice(0,180);
      why.value='User-supplied scanner snapshot matched saved research criteria; source and price remain unverified. Verify issuer, invalidation and NO TRADE conditions.';
      ticker.scrollIntoView({block:'center'});
      status(notices,'Candidate form prefilled for manual review; it was NOT saved or approved.');
     };
     li.append(' ',add);scanList.append(li);
    }
    if(out.rows.length>35)scanList.append(mk('p','First 35 results displayed; narrow your saved filters for further review.'));
   }catch(e){status(notices,e.message||'Unverified snapshot could not be scanned.')}
  };
  function clearPrivate(){
   ++seq;chart?.dispose?.();chart=null;current=[];filterRecords=[];
   rootBox.replaceChildren();rootBox.hidden=true;
  }
  initialClient.auth.onAuthStateChange?.((event,session)=>{
   if(event==='SIGNED_OUT'||session?.user?.id!==member)clearPrivate();
  });
  root.addEventListener('pagehide',clearPrivate);
  try{
   const filterRows=await api('&type=filter_set');
   filterRecords=(filterRows.records||[]).filter(x=>x.record_type==='filter_set');
   for(const rec of filterRecords)option(savedSet,String(rec.id),rec.title+' · '+(rec.payload?.asOf||'Unknown source time'));
  }catch(e){status(notices,'Saved scanner filters unavailable: '+e.message)}
  renderFilters();render();
 }
 const wrapped=Object.freeze({...prev,mount:function(args){
  const existing=prev.mount(args);void mountV2(args).catch(()=>{});return existing;
 },version:'2.0'});
 root.GroundUpWatchlistIntelligenceV1=wrapped;
 root.GroundUpWatchlistIntelligenceV2=Object.freeze({mount:mountV2});
})(window);
