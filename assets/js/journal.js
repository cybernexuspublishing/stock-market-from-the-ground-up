let JSTATE={sb:null,user:null,tax:null,rows:[],truncated:false};
function jm(text,type=''){const e=document.getElementById('new-journal-message');if(!e)return;e.textContent=text||'';e.className=`status-message ${type}`}
function freeQuotaMessage(err){const t=String(err?.message||'');if(t.includes('FREE_WEEKLY_JOURNAL_LIMIT_REACHED'))return 'Your free Journal allowance is used for this UTC week. It resets Monday 00:00 UTC. Eligible paid Journal access removes this free limit.';if(t.includes('FREE_WEEKLY_SIMULATOR_LIMIT_REACHED'))return 'Your weekly free browser simulator save allowance is used. It resets Monday 00:00 UTC; eligible paid Simulator access removes this free save limit.';return t;}
async function showFreeUsage(){const node=document.getElementById('journal-free-usage');if(!node||!JSTATE.user)return;const {data,error}=await JSTATE.sb.rpc('gu_v014121_my_free_week_usage');if(error||!data?.journalLimit){node.hidden=true;return;}const a=Number(data.journalUsed),b=Number(data.journalLimit),s=Number(data.simulatorSavesUsed),max=Number(data.simulatorSaveLimit),reset=new Date(data.resetsAtUtc);node.hidden=false;node.textContent=(data.journalUnlimited?'Journal: paid access exempt from the free quota.':`Free Trading Journal: ${a} of ${b} new records used this UTC week.`)+' '+(data.simulatorUnlimited?'Simulator: paid save allowance.':`Saved browser/CSV exercises: ${s} of ${max} used; counted within Journal records.`)+' Reset: '+(Number.isFinite(reset.getTime())?reset.toLocaleString():'start of next UTC week')+'.'+(!data.journalUnlimited&&a>=Math.ceil(b*0.8)?' Paid membership provides additional eligible Journal capacity.':'');}
function typeLabel(v){return ({live:'Live',paper:'Paper',observation:'Observation',historical_lab:'Replay / Historical Lab (review source)'})[v]||v||'—'}
function statusLabel(v){return String(v||'draft').replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function renderJournal(){const JT=window.JournalTools;const type=document.getElementById('journal-type-filter').value,status=document.getElementById('journal-status-filter').value,q=document.getElementById('journal-search').value.trim().toLowerCase();const rows=JSTATE.rows.filter(r=>(type==='all'||r.journal_type===type)&&(status==='all'||r.status===status)&&(!q||[r.ticker,r.setup,r.entry_reason,r.entry_reason_category,r.actual_exit_reason,r.actual_exit_reason_category].some(v=>String(v||'').toLowerCase().includes(q))));const body=document.getElementById('journal-rows');body.innerHTML=rows.map(r=>`<tr class="trade-row-click" data-id="${r.id}"><td>${JT.esc(r.trade_date||'')}</td><td><strong>$${JT.esc(r.ticker||'')}</strong></td><td><span class="journal-pill ${JT.esc(r.journal_type)}">${JT.esc(typeLabel(r.journal_type))}</span></td><td><span class="journal-pill ${JT.esc(r.status)}">${JT.esc(statusLabel(r.status))}</span></td><td>${JT.esc(r.setup||r.entry_reason_category||r.entry_reason||r.no_trade_reason||'—')}</td><td>${r.net_pnl==null?'—':JT.money(r.net_pnl)}</td><td>${r.r_multiple==null?'—':`${JT.dec(r.r_multiple,2)}R`}</td><td>${r.process_grade?`<span class="journal-pill ${r.process_grade==='GOOD'?'good':r.process_grade==='BAD'?'bad':''}">${JT.esc(r.process_grade)}</span>`:'—'}</td><td><a class="text-link" href="journal-entry.html?id=${r.id}">Open →</a></td></tr>`).join('');document.getElementById('journal-empty').hidden=rows.length>0;body.querySelectorAll('tr[data-id]').forEach(tr=>tr.addEventListener('dblclick',()=>location.href=`journal-entry.html?id=${tr.dataset.id}`))}
async function loadRows(){
 // V2: Supabase PostgREST has a response-row cap. Explicitly page and never
 // silently imply a partial CSV/learning review contains every record.
 const size=400,limit=3000,rows=[],seen=new Set();
 const ownerId=JSTATE.user?.id;
 if(!ownerId)throw new Error('Current authenticated member is required.');
 let truncated=false;
 for(let offset=0;offset<limit;offset+=size){
  const {data,error}=await JSTATE.sb.from('decision_journal').select('*')
   .eq('user_id',ownerId).order('trade_date',{ascending:false})
   .order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(offset,offset+size-1);
  if(error)throw error;
  if(JSTATE.user?.id!==ownerId)throw new Error('Account changed while loading private Journal records.');
  for(const row of data||[]){if(seen.has(row.id))continue;seen.add(row.id);rows.push(row)}
  if((data||[]).length<size)break;
  if(offset+size>=limit)truncated=true;
 }
 if(JSTATE.user?.id!==ownerId)throw new Error('Account changed while loading private Journal records.');
 JSTATE.rows=rows;JSTATE.truncated=truncated;
 renderJournal();
 let note=document.getElementById('gu-v2-list-limits');
 if(!note){
  note=document.createElement('p');note.id='gu-v2-list-limits';
  note.className='journal-small';note.setAttribute('role','status');
  document.querySelector('.journal-table-wrap')?.before(note);
 }
 if(note)note.textContent=truncated?
  'The latest 3,000 records are loaded; older records may exist. These filters and the process review may omit older records. Export is disabled until a complete dataset is available.':
  rows.length+' Journal records loaded. Filters and export cover all loaded records.';
 window.dispatchEvent(new CustomEvent('gu-journal-rows-loaded',{detail:{rows:JSTATE.rows,truncated:JSTATE.truncated}}));
}
async function createJournal(e){e.preventDefault();jm('Creating…');const row={user_id:JSTATE.user.id,journal_type:document.getElementById('new-type').value,ticker:document.getElementById('new-ticker').value.trim().toUpperCase(),trade_date:document.getElementById('new-date').value,timeframe:document.getElementById('new-timeframe').value.trim()||null,setup:(document.getElementById('new-setup').value==='__CUSTOM__'?document.getElementById('new-setup-custom').value.trim():document.getElementById('new-setup').value)||null,session_label:document.getElementById('new-session').value||null,status:'draft',decision:null};const {data,error}=await JSTATE.sb.from('decision_journal').insert(row).select('id').single();if(error){jm(freeQuotaMessage(error),'error');await showFreeUsage();return}const source=new URLSearchParams(location.search).get('source_plan');
 const safeSource=source&&/^[1-9][0-9]{0,15}$/.test(source)&&Number.isSafeInteger(Number(source));
 location.href=`journal-entry.html?id=${data.id}`+(safeSource?'&source_plan='+encodeURIComponent(source):'')}
async function exportJournal(){
 try{await loadRows();if(JSTATE.truncated){
  const note=document.getElementById('gu-v2-list-limits');
  if(note)note.textContent='CSV export blocked: more than 3,000 records may exist. A partial file must not be presented as a complete backup.';
  return;
 }
 const csv=window.JournalTools.toCSV(JSTATE.rows);
 if(!csv){const note=document.getElementById('gu-v2-list-limits');if(note)note.textContent='There are no records to export.';return}
 window.JournalTools.downloadCSV(csv,`ground-up-trading-journal-${new Date().toISOString().slice(0,10)}.csv`);
 }catch(err){const note=document.getElementById('gu-v2-list-limits');
  if(note)note.textContent='Journal export could not be completed: '+String(err?.message||'Unknown error');}
}
async function initJournal(){const gate=document.getElementById('journal-gate');try{JSTATE.sb=await window.getSupabaseClient();const {data:{user}}=await JSTATE.sb.auth.getUser();if(!user){gate.innerHTML='<div class="notice">Sign in to use the Trading Journal.</div>';return}JSTATE.user=user;
 JSTATE.sb.auth.onAuthStateChange((_event,session)=>{
  if(session?.user?.id===JSTATE.user?.id)return;
  // The Journal list contains private member notes, not just public symbols.
  // Immediately scrub rendered rows and free usage after a changed identity.
  JSTATE.user=null;JSTATE.rows=[];JSTATE.truncated=false;
  document.getElementById('journal-rows')?.replaceChildren();
  document.getElementById('journal-content').hidden=true;
  document.getElementById('new-journal-form')?.reset();
  for(const id of ['journal-free-usage','gu-v2-list-limits']){
   const el=document.getElementById(id);if(el)el.textContent='';
  }
  gate.textContent='Account session changed. Reload to access your own private Journal.';
  window.dispatchEvent(new CustomEvent('gu-journal-rows-loaded',{detail:{rows:[],truncated:false}}));
 });
 JSTATE.tax=await window.JournalTools.taxonomy();
 const setupSelect=document.getElementById('new-setup'),custom=document.getElementById('new-setup-custom'),
   customLabel=document.getElementById('new-setup-custom-label');
 for(const title of JSTATE.tax.setups||[]){
  const option=document.createElement('option');option.value=title;option.textContent=title;setupSelect.append(option);
 }
 const customOption=document.createElement('option');
 customOption.value='__CUSTOM__';customOption.textContent='Other — describe my setup';setupSelect.append(customOption);
 const syncSetup=()=>{const enabled=setupSelect.value==='__CUSTOM__';
  custom.hidden=customLabel.hidden=!enabled;custom.required=enabled;
 };
 setupSelect.addEventListener('change',syncSetup);syncSetup();
 const type=document.getElementById('new-type');type.innerHTML=JSTATE.tax.journalTypes.map(x=>`<option value="${x.value}">${x.label}</option>`).join('');const session=document.getElementById('new-session');JSTATE.tax.sessions.forEach(x=>session.insertAdjacentHTML('beforeend',`<option>${window.JournalTools.esc(x)}</option>`));document.getElementById('new-date').value=new Date().toISOString().slice(0,10);gate.innerHTML='';document.getElementById('journal-content').hidden=false;document.getElementById('new-journal-toggle').onclick=()=>document.getElementById('new-journal-panel').hidden=false;document.getElementById('cancel-new-journal').onclick=()=>document.getElementById('new-journal-panel').hidden=true;document.getElementById('new-journal-form').addEventListener('submit',createJournal);['journal-type-filter','journal-status-filter'].forEach(id=>document.getElementById(id).addEventListener('change',renderJournal));document.getElementById('journal-search').addEventListener('input',renderJournal);document.getElementById('export-journal').onclick=exportJournal;await loadRows();await showFreeUsage();window.dispatchEvent(new CustomEvent('gu-journal-ready',{detail:{userId:JSTATE.user.id}}))}catch(err){gate.innerHTML=`<div class="notice">${window.JournalTools?.esc(err.message)||err.message}</div>`}}
document.addEventListener('DOMContentLoaded',initJournal);
