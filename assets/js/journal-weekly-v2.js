/* Trading Journal 2.0: private process-only review, not paid financial analytics.
 * Data is sourced from the member-owned Journal list after RLS access.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const t=(tag,value,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e};
const lessons={
 'Chased extension':'Practice patient entries and no-chase conditions.',
 'Entered before confirmation':'Review the exact trigger and confirmation criteria.',
 'Misread VWAP / EMA relationship':'Review VWAP reclaim, rejection, EMA and market context.',
 'Oversized position':'Practice dollar-risk budgeting and planned position sizing.',
 'Ignored spread / liquidity':'Review spread, slippage and execution uncertainty.',
 'Moved stop outside plan':'Review invalidation and the original locked stop.',
 'Failed to select NO TRADE':'Practice documenting a defensible no-trade decision.',
 'Misread market structure':'Practice higher highs/lows and structural reversal recognition.'
};
function panel(){
 const anchor=$('journal-free-usage');if(!anchor)return null;
 let host=$('gu-v2-review');if(host)return host;
 host=t('section',undefined,'journal-card gu-v2-review');host.id='gu-v2-review';
 host.setAttribute('aria-label','Journal decision-process review');
 const top=t('div',undefined,'gu-v2-review-top'),heading=t('h2','Process Review · V2.0');
 const filters=t('div',undefined,'gu-v2-review-filters');
 const duration=t('select');duration.id='gu-v2-range';
 [['1','This UTC week'],['4','Last 4 UTC weeks'],['12','Last 12 UTC weeks']].forEach(([v,label])=>{
  const option=t('option',label);option.value=v;duration.append(option);
 });
 const mode=t('select');mode.id='gu-v2-kind';
 [['all','All record types'],['live','Live decisions'],['paper','Paper / simulator'],
 ['observation','Observations / no-trade'],['historical_lab','Historical Labs']].forEach(([v,label])=>{
  const option=t('option',label);option.value=v;mode.append(option);
 });
 const a=t('label','Period');a.append(duration),b=t('label','Record type');b.append(mode);
 filters.append(a,b);top.append(heading,filters);
 const body=t('div');body.id='gu-v2-review-body';body.setAttribute('aria-live','polite');
 const disclosure=t('p','Journal review counts are self-reported observations, not paid P&L analytics, broker-verified records, strategy evidence, or graded mastery. Record types are counted separately; a no-trade observation is not a loss.','gu-v2-review-notice');
 host.append(top,body,disclosure);
 anchor.after(host);return host;
}
let ownRows=[],signedUser=null;
function render(){
 const host=$('gu-v2-review'),output=$('gu-v2-review-body');if(!host||!output)return;
 if(!signedUser){output.replaceChildren(t('p','Sign in to view your private process review.'));return}
 const logic=window.JournalV2;if(!logic){output.replaceChildren(t('p','Process review temporarily unavailable.'));return}
 let result;
 try{result=logic.processSummary(ownRows,{weeks:Number($('gu-v2-range')?.value||1),
    type:$('gu-v2-kind')?.value||'all',asOf:new Date()});}
 catch(e){output.replaceChildren(t('p','Unable to calculate process review: '+e.message));return}
 output.replaceChildren();
 const grid=t('div',undefined,'gu-v2-stat-grid');
 for(const [label,value] of [['Records',result.total],['Completed records',result.completed],
  ['Unfinished records',result.drafts],['No-trade decisions',result.noTrade]]){
  const card=t('div',undefined,'gu-v2-stat');card.append(t('strong',String(value)),t('span',label));grid.append(card);
 }
 output.append(grid);
 const details=t('div',undefined,'journal-table-wrap'),table=t('table');
 const header=t('tr');
 for(const name of ['Record type','Records this period'])header.append(t('th',name));
 const thead=t('thead'),tbody=t('tbody');thead.append(header);
 const labels={live:'Live',paper:'Paper / simulator',observation:'Observation',historical_lab:'Historical lab'};
 for(const [key,value] of Object.entries(result.types)){const tr=t('tr');tr.append(t('td',labels[key]),t('td',String(value)));tbody.append(tr)}
 table.append(thead,tbody);details.append(table);output.append(details);
 const adherence=t('p',`Self-reported plan adherence: Yes ${result.adherence.yes} · Partly ${result.adherence.partial} · No ${result.adherence.no} · Recorded responses ${result.adherence.denominator}.`);
 output.append(adherence,t('p',`Self-rated process grades: ${result.gradedSelf} recorded; ${result.unknownProcess} ungraded/missing. Neither is an independently assessed competency.`,'journal-small'));
 if(result.commonMistakes.length){
  output.append(t('h3','Recurring self-reported mistake categories'));
  const ul=t('ul');
  for(const item of result.commonMistakes)ul.append(t('li',item.label+' — '+item.count+' record'+(item.count===1?'':'s')));
  output.append(ul,t('p',lessons[result.commonMistakes[0].label]||'Select one repeated mistake and practice an evidence-based correction.'));
 }else output.append(t('p','No mistake categories recorded in the selected period. That does not establish a mistake-free process.'));
 const actions=t('p',undefined,'journal-small'),learn=t('a','Review related lessons'),
  review=t('a','Open the 1D / 7D / 30D review queue');
 learn.href='learn.html';review.href='review-queue.html';
 actions.append(learn,document.createTextNode(' · '),review);output.append(actions);
}
function boot(){
 if(!panel())return;
 $('gu-v2-range')?.addEventListener('change',render);
 $('gu-v2-kind')?.addEventListener('change',render);
 window.addEventListener('gu-journal-rows-loaded',e=>{if(!signedUser)return;
  ownRows=Array.isArray(e.detail?.rows)?e.detail.rows:[];render()});
 window.getSupabaseClient().then(async sb=>{
  const {data:{user}}=await sb.auth.getUser();
  signedUser=user?.id||null;render();
  sb.auth.onAuthStateChange((_event,session)=>{
   if(session?.user?.id!==signedUser){
    ownRows=[];signedUser=null;render();
   }
  });
 }).catch(()=>{signedUser=null;ownRows=[];render()});
 window.JournalTools?.taxonomy().then(tax=>{
  const input=$('new-setup');if(!input||!Array.isArray(tax?.setups))return;
  const dl=t('datalist');dl.id='gu-v2-setup-choices';
  for(const value of tax.setups){const option=t('option');option.value=value;dl.append(option)}
  input.setAttribute('list',dl.id);input.after(dl);
 }).catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
