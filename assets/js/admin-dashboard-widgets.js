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
 const charts=node('div',undefined,'admin-widget-charts');
 for(const group of dashboardCharts(data)){
  const chart=node('article',undefined,'admin-widget-card');chart.append(node('h2',group.title),node('p',group.description,'admin-widget-description'));
  const graph=node('div',undefined,'admin-record-chart');graph.setAttribute('role','img');graph.setAttribute('aria-label',group.title+': '+group.rows.map(x=>x.label+' '+format(x.count)).join('; ')+'. Current counts; not a historical trend.');
  for(const item of group.rows){const row=node('div',undefined,'admin-record-bar');const heading=node('div',undefined,'admin-record-bar-label');heading.append(node('span',item.label),node('strong',format(item.count)));const track=node('div',undefined,'admin-record-bar-track');const fill=node('span');fill.style.width=item.width+'%';track.append(fill);row.append(heading,track);graph.append(row)}chart.append(graph);
  const footer=node('div',undefined,'admin-widget-actions');for(const row of group.rows)footer.append(action('Open '+row.label.toLowerCase()+' ↗',row.target));chart.append(footer);charts.append(chart);
 }
 root.append(charts);
 const gadgets=node('div',undefined,'admin-widget-gadgets');
 const moderation=node('article',undefined,'admin-widget-card admin-workload');const reports=recordCount(data.openReports);moderation.append(node('div','MODERATION QUEUE','admin-widget-kicker'),node('strong',format(reports),'admin-widget-number'),node('p',reports===null?'Report count is unavailable.':reports===0?'No open reports in the current summary.':'Open reports awaiting review.','admin-widget-description'),action('Review reports ↗','community'));gadgets.append(moderation);
 const audit=node('article',undefined,'admin-widget-card');audit.append(node('div','AUDIT TRAIL','admin-widget-kicker'),node('strong',format(recordCount(data.auditEntries)),'admin-widget-number'),node('p','Recorded audit entries. This total is not a recent-activity feed.','admin-widget-description'),action('Open audit history ↗','audit'));gadgets.append(audit);
 const access=node('article',undefined,'admin-widget-card');access.append(node('div','LEARNING ACCESS','admin-widget-kicker'),node('strong',format(recordCount(data.activeEntitlements)),'admin-widget-number'),node('p','Active or trialing entitlement records. A member can hold more than one record.','admin-widget-description'),action('Manage member access ↗','account-management'));gadgets.append(access);root.append(gadgets);
 const note=node('p','Bar lengths are relative to the largest count in each chart. Snapshot only. Trend history, conversion rates and verified revenue are not supplied by this dashboard API.','admin-widget-footnote');root.append(note);
}
window.addEventListener('groundup:admin-summary',event=>render(event.detail||{}));

if(window.GroundUpAdminSummarySnapshot)render(window.GroundUpAdminSummarySnapshot);
