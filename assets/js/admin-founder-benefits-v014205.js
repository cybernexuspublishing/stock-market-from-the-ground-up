/* v0.14.0.205 Owner certificate and verified-outage administration.
 * All decisions rechecked by authenticated Owner API and PostgreSQL.
 */
(()=>{'use strict';
const el=id=>document.getElementById(id),make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
let db;
async function api(body){
 const token=(await db.auth.getSession()).data?.session?.access_token;
 if(!token)throw Error('Owner authentication is required.');
 const options={method:body?'POST':'GET',headers:{authorization:'Bearer '+token}};
 if(body){options.headers['content-type']='application/json';options.body=JSON.stringify(body)}
 const response=await fetch('/api/admin-founder-commons-v014179',options);
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result?.ok!==true)throw Error(result?.error||'Owner operation could not be verified.');
 return result;
}
async function refresh(){
 const a=await api();
 const selection=el('f600-certificate-user');
 selection.replaceChildren(make('option','Choose an enrolled founder'));
 selection.firstChild.value='';
 for(const member of a.foundingMembers||[]){
  const opt=make('option','Founding #'+String(member.founder_number).padStart(4,'0')+' — '+member.earned_plan_code);
  opt.value=member.user_id;selection.append(opt);
 }
 const certs=el('f600-issued-certificates');certs.replaceChildren();
 for(const cert of a.founderCertificates||[]){
  if(cert.revoked_at)continue;
  const member=(a.foundingMembers||[]).find(m=>m.user_id===cert.user_id);
  const line=make('p','Founding #'+String(member?.founder_number||'?').padStart(4,'0')+' — '+cert.track+' — issued '+new Date(cert.issued_at).toLocaleDateString());
  certs.append(line);
 }
 if(!certs.childNodes.length)certs.append(make('p','No certificates issued yet.'));
 const incidents=el('f600-recorded-incidents');incidents.replaceChildren();
 for(const i of a.verifiedIncidents||[]){
  const line=make('p',i.incident_key+' — '+i.title+' — '+new Date(i.started_at).toLocaleString());
  incidents.append(line);
 }
 if(!incidents.childNodes.length)incidents.append(make('p','No verified incidents recorded.'));
}
async function start(){
 try{db=await window.getSupabaseClient();await refresh()}
 catch(e){el('f600-certificate-note').textContent='Owner benefit controls are unavailable: '+e.message;return}
 const certificate=el('f600-certificate-form');
 certificate.addEventListener('submit',async ev=>{
  ev.preventDefault();const note=el('f600-certificate-note'),btn=certificate.querySelector('[type=submit]');
  if(!el('f600-certificate-user').value)return;
  btn.disabled=true;note.textContent='Checking independently passed competency evidence…';
  try{const result=await api({action:'issue_certificate',userId:el('f600-certificate-user').value});
   note.textContent='Certificate issued with verified evidence. ID: '+result.certificateId;await refresh()}
  catch(e){note.textContent='No award issued: '+e.message}
  finally{btn.disabled=false}
 });
 const incident=el('f600-incident-form');
 incident.addEventListener('submit',async ev=>{
  ev.preventDefault();const note=el('f600-incident-note'),btn=incident.querySelector('[type=submit]'),data=new FormData(incident);
  const start=new Date(String(data.get('startedAt'))),end=new Date(String(data.get('endedAt')));
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start){note.textContent='Verify start and end times.';return}
  btn.disabled=true;note.textContent='Recording verified outage; no Stripe changes will be made…';
  try{const result=await api({action:'record_service_incident',
   incidentKey:data.get('incidentKey'),title:data.get('title'),serviceArea:data.get('serviceArea'),
   startedAt:start.toISOString(),endedAt:end.toISOString(),impactSummary:data.get('impactSummary')});
   note.textContent=result.creditedFounders+' eligible founder credit(s) queued. No billing period changed.';incident.reset();await refresh()}
  catch(e){note.textContent='No incident recorded: '+e.message}
  finally{btn.disabled=false}
 });
}
start();
})();