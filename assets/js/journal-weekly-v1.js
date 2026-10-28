/* Journal weekly educational self-review: no P&L, expectancy, premium analytic
 * inference, authenticated grading or member data sent to third parties. */
(function(){
'use strict';
const el=(tag,s)=>{const n=document.createElement(tag);n.textContent=s;return n};
const explain={
 'Chased extension':'Study entry location and patient confirmation.',
 'Misread VWAP / EMA relationship':'Revisit VWAP and EMA context in your Foundation lessons.',
 'Oversized position':'Practice share sizing from entry-stop risk.',
 'Entered before confirmation':'Practice waiting for the actual trigger.',
 'Failed to select NO TRADE':'Practice identifying no-trade conditions.',
 'Moved stop outside plan':'Practice respecting the original invalidation and risk boundary.',
 'Ignored spread / liquidity':'Study liquidity and execution uncertainty.'
};
function render(rows){
 const panel=document.getElementById('gu-journal-weekly');if(!panel)return;
 const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 const end=new Date(start.getTime()+7*86400000);
 const recent=(rows||[]).filter(r=>{
  const d=new Date(String(r.trade_date||'')+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d>=start&&d<end;
 });
 const passes=recent.filter(r=>r.status==='no_trade'||r.decision==='NO TRADE').length;
 const drafts=recent.filter(r=>r.status==='draft'||r.status==='planned'||r.status==='open').length;
 const tags=new Map();
 for(const r of recent){if(!Array.isArray(r.mistakes))continue;
  for(const tag of new Set(r.mistakes)){tags.set(tag,(tags.get(tag)||0)+1)}}
 const common=[...tags].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3);
 panel.replaceChildren();
 panel.append(el('h2','This week — decision process review'));
 const summary=el('p',`Records dated ${start.toISOString().slice(0,10)} to ${new Date(end.getTime()-86400000).toISOString().slice(0,10)} (UTC): ${recent.length} · Documented no-trade decisions: ${passes} · Records still incomplete: ${drafts}.`);
 panel.append(summary);
 if(common.length){
  const p=el('p','Most frequent self-reported review tags:');panel.append(p);
  const ul=document.createElement('ul');
  for(const [label,n] of common)ul.append(el('li',`${label} (${n} record${n===1?'':'s'})`));
  panel.append(ul);
  panel.append(el('p',explain[common[0][0]]||'Choose one recurring issue and practice it in a relevant reviewed lesson or Lab.'));
 }else panel.append(el('p','No mistake tags recorded for this week. Record observations and process lessons, including good NO TRADE decisions.'));
 const links=document.createElement('p');links.className='journal-small';
 const a=document.createElement('a');a.href='learn.html';a.textContent='Open guided lessons';
 const b=document.createElement('a');b.href='review-queue.html';b.textContent='Open spaced reviews';
 links.append(a,document.createTextNode(' · '),b);
 panel.append(links,el('p','This is a personal learning review, not paid performance analytics, an independent trade audit or an official competency grade.'));
}
function boot(){
 const anchor=document.getElementById('journal-free-usage');if(!anchor||document.getElementById('gu-journal-weekly'))return;
 const panel=document.createElement('section');panel.id='gu-journal-weekly';panel.className='journal-card journal-section gu-weekly';panel.setAttribute('aria-live','polite');
 panel.append(el('h2','This week — decision process review'));
 panel.append(el('p','Loading your own Journal activity…'));
 anchor.insertAdjacentElement('afterend',panel);
 window.addEventListener('gu-journal-rows-loaded',e=>render(e.detail?.rows||[]));
 window.getSupabaseClient().then(sb=>sb.auth.onAuthStateChange((_event,session)=>{
  if(!session?.user){panel.replaceChildren(el('p','Private weekly review hidden until you sign in.'));}
 })).catch(()=>{panel.replaceChildren(el('p','Private weekly review unavailable.'))});
 window.JournalTools?.taxonomy().then(tax=>{
  if(!Array.isArray(tax?.setups))return;
  const input=document.getElementById('new-setup');
  if(!input)return;
  const list=document.createElement('datalist');list.id='gu-journal-setups-v1';
  for(const s of tax.setups){const opt=document.createElement('option');opt.value=s;list.append(opt)}
  input.setAttribute('list',list.id);input.insertAdjacentElement('afterend',list);
 }).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
