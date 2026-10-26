/* Additive dashboard presentation. Consumes the existing authorized summary
 * event and delegates all workflow actions to the canonical Admin controller. */
import {recordCount,dashboardCharts} from './admin-dashboard-widgets-core.mjs';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const format=value=>value===null?'Unavailable':value.toLocaleString();
function action(label,target){const b=node('button',label,'admin-widget-action');b.type='button';b.dataset.ccMetric=target;return b}
function render(data){
 const parent=document.querySelector('.admin-panel[data-admin-panel="dashboard"]');
 if(!parent||document.getElementById('admin-app')?.hidden!==false)return;
 let root=document.getElementById('admin-dashboard-widgets');
 if(!root){root=node('section',undefined,'admin-dashboard-widgets');root.id='admin-dashboard-widgets';root.setAttribute('aria-label','Operational charts and work queue');document.getElementById('admin-summary').after(root)}
 root.replaceChildren();
 const stamp=node('div',undefined,'admin-widget-stamp');stamp.append(node('span',data.showcase?'SHOWCASE · SYNTHETIC DATA':'CURRENT RECORDED TOTALS'));
 const time=node('time');const parsed=new Date(data.observedAt||'');if(!Number.isNaN(parsed.getTime())){time.dateTime=parsed.toISOString();time.textContent='Updated '+parsed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}else time.textContent='Update time unavailable';stamp.append(time);root.append(stamp);
 // These shortcuts are enabled only when the authoritative dashboard response
 // confirms the required permission. Their click handlers remain in admin.js.
 const granted=new Set(Array.isArray(data.permissions)?data.permissions:[]);
 const quick=node('nav',undefined,'cc-dashboard-quick');
 quick.setAttribute('aria-label','Authorized Admin quick actions');
 const shortcuts=[
  ['Find members','users',['users.view']],
  ['Review Labs and assessments','training-review',['content.view','learning.manage']],
  ['Manage Store products','products',['catalog.view']],
  ['Moderate reports','community',['forum.view']],
  ['Review audit history','audit',['audit.view']],
  ['Inspect system','system',['system.view']]
 ];
 for(const [label,target,permissions] of shortcuts)
  if(permissions.some(p=>granted.has(p)))quick.append(action(label,target));
 if(quick.childElementCount){const h=node('h2','Quick Actions');root.append(h,quick)}
 const charts=node('div',undefined,'admin-widget-charts');
 for(const group of dashboardCharts(data)){
  const chart=node('article',undefined,'admin-widget-card');chart.append(node('h2',group.title),node('p',group.description,'admin-widget-description'));
  const graph=node('div',undefined,'admin-record-chart');graph.setAttribute('role','img');graph.setAttribute('aria-label',group.title+': '+group.rows.map(x=>x.label+' '+format(x.count)).join('; ')+'. Current counts; not a historical trend.');
  for(const item of group.rows){const row=node('div',undefined,'admin-record-bar');const heading=node('div',undefined,'admin-record-bar-label');heading.append(node('span',item.label),node('strong',format(item.count)));const track=node('div',undefined,'admin-record-bar-track');const fill=node('span');fill.style.width=item.width+'%';track.append(fill);row.append(heading,track);graph.append(row)}chart.append(graph);
  const footer=node('div',undefined,'admin-widget-actions');for(const row of group.rows)footer.append(action('Open '+row.label.toLowerCase()+' ↗',row.target));chart.append(footer);charts.append(chart);
 }
 // Individual queue records come only from the authenticated, permission-scoped
 // dashboard response. The snapshot timestamp is not an item creation date.
 const queue=node('section',undefined,'admin-widget-card cc-live-work-queue');
 queue.setAttribute('aria-label','Requires your attention');
 queue.append(node('h2','Requires Your Attention'));
 queue.append(node('p','Latest authorized records from existing operational tables. Select a record group to open its management workspace.','admin-widget-description'));
 const sources=Array.isArray(data.queue)?data.queue:[];
 if(!sources.length)queue.append(node('p',data.showcase?'Showcase account: live work items are not represented.':'No record-level sources are available for the current role or dashboard response.','admin-widget-description'));
 for(const source of sources){
  const section=node('section',undefined,'cc-work-source');
  const heading=node('h3',source.category||'Operational review');
  section.append(heading);
  if(source.available!==true){section.append(node('p','Source unavailable — status not verified.','cc-work-unavailable'));queue.append(section);continue}
  if(!Array.isArray(source.items)||!source.items.length){section.append(node('p','No open records returned in this category.','admin-widget-description'));queue.append(section);continue}
  const list=node('ul',undefined,'cc-work-records');
  for(const item of source.items){
   const li=node('li',undefined,'cc-work-record');
   const body=node('div',undefined,'cc-work-details');
   body.append(node('strong',item.label||'Administrative record'));
   const meta=node('div',undefined,'cc-work-meta');
   meta.append(node('span',(item.severity||'review')+' · '+(item.status||'Pending')));
   const parsedItem=new Date(item.createdAt||'');
   if(!Number.isNaN(parsedItem.getTime())){const t=node('time',parsedItem.toLocaleString());t.dateTime=parsedItem.toISOString();meta.append(t)}
   else meta.append(node('span','Date unavailable'));
   body.append(meta);li.append(body);
   const allowed=['training-review','community','users','audit','commerce','products','content'].includes(item.target);
   if(allowed)li.append(action('Review',item.target));
   list.append(li);
  }
  section.append(list);queue.append(section);
 }
 root.append(queue);
 const activity=node('section',undefined,'admin-widget-card cc-recent-activity');
 activity.append(node('h2','Administrative Activity'));
 if(!Array.isArray(data.recentActivity))activity.append(node('p','Audit events unavailable or restricted for this account.','admin-widget-description'));
 else if(!data.recentActivity.length)activity.append(node('p','No recorded recent administrative events.','admin-widget-description'));
 else{
  const entries=node('ol',undefined,'cc-activity-events');
  for(const item of data.recentActivity){
   const li=node('li');li.append(node('strong',item.action||'Administrative action'));
   const desc=node('span',(item.targetType||'Record')+(item.targetId?' · '+item.targetId:''));
   li.append(desc);
   const parsedActivity=new Date(item.at||'');
   if(!Number.isNaN(parsedActivity.getTime())){const t=node('time',parsedActivity.toLocaleString());t.dateTime=parsedActivity.toISOString();li.append(t)}
   entries.append(li);
  }
  activity.append(entries);
 }
 root.append(charts,activity);
 const gadgets=node('div',undefined,'admin-widget-gadgets');
 const moderation=node('article',undefined,'admin-widget-card admin-workload');const reports=recordCount(data.openReports);moderation.append(node('div','MODERATION QUEUE','admin-widget-kicker'),node('strong',format(reports),'admin-widget-number'),node('p',reports===null?'Report count is unavailable.':reports===0?'No open reports in the current summary.':'Open reports awaiting review.','admin-widget-description'),action('Review reports ↗','community'));gadgets.append(moderation);
 const audit=node('article',undefined,'admin-widget-card');audit.append(node('div','AUDIT TRAIL','admin-widget-kicker'),node('strong',format(recordCount(data.auditEntries)),'admin-widget-number'),node('p','Recorded audit entries. This total is not a recent-activity feed.','admin-widget-description'),action('Open audit history ↗','audit'));gadgets.append(audit);
 const access=node('article',undefined,'admin-widget-card');access.append(node('div','LEARNING ACCESS','admin-widget-kicker'),node('strong',format(recordCount(data.activeEntitlements)),'admin-widget-number'),node('p','Active or trialing entitlement records. A member can hold more than one record.','admin-widget-description'),action('Manage member access ↗','account-management'));gadgets.append(access);root.append(gadgets);
 const note=node('p','Bar lengths are relative to the largest count in each chart. Snapshot only. Trend history, conversion rates and verified revenue are not supplied by this dashboard API.','admin-widget-footnote');root.append(note);
}
window.addEventListener('groundup:admin-summary',event=>render(event.detail||{}));

if(window.GroundUpAdminSummarySnapshot)render(window.GroundUpAdminSummarySnapshot);
