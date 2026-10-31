/* Server-only noncommercial QA authorization. No LIVE payment path. */
import {config} from './chart-cash-test-v1.js';
export async function verifyChartMixedQa(env,userId){
 if(env.CHART_STUDIO_TEST_CHECKOUT_ENABLED!=='true'||env.CHART_MIXED_TEST_ENABLED!=='true')return false;
 const c=config(env),headers={apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key})};
 const r=await fetch(c.base+'/auth/v1/admin/users/'+encodeURIComponent(userId),{headers,cache:'no-store'});
 if(!r.ok)return false;
 const response=await r.json(),u=response.user||response,m=u.app_metadata||{},now=Date.now();
 const normal=m.smfgu_qa_only===true&&m.noncommercial===true&&m.qa_chart_batch==='SMFGU-CHART-3-20261028';
 const james=userId==='f42f9301-18e6-43a3-8531-32d371fd22c1'&&m.chart_cash_qa_user==='James_Test'&&m.chart_cash_qa_only===true&&
  Number.isFinite(Date.parse(m.chart_cash_qa_expires_at||''))&&
  Date.parse(m.chart_cash_qa_expires_at)>now&&Date.parse(m.chart_cash_qa_expires_at)<=Date.parse('2026-11-02T00:00:00Z');
 return u.id===userId&&!!u.email_confirmed_at&&!u.deleted_at&&(normal||james);
}
