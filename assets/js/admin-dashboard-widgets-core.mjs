/* Current-record visualizations only. No forecasts, revenue estimates or invented history. */
export function recordCount(value){return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null}
export function dashboardCharts(summary={}){return [
 {title:'Commerce records',description:'Recorded orders and subscription records. These are record counts, not revenue or active subscriptions.',rows:[['Orders','orders','commerce'],['Subscriptions','subscriptions','commerce']]},
 {title:'Learning & content',description:'Library, catalog and published content records. Counts describe different record types, not unique learners or completion rates.',rows:[['Library records','library','account-management'],['Published content','publishedContent','content'],['Catalog products','catalogProducts','products']]}
 ].map(group=>{const rows=group.rows.map(([label,key,target])=>({label,key,target,count:recordCount(summary[key])}));const maximum=Math.max(0,...rows.map(x=>x.count??0));return {...group,rows:rows.map(x=>({...x,width:x.count===null||maximum===0?0:x.count/maximum*100}))}})}
