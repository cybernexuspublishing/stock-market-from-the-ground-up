/* Private founder records v0.14.0.205. Read only from RLS-scoped tables. */
(()=>{'use strict';
const el=x=>document.getElementById(x),make=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);if(cls)x.className=cls;return x};
const date=s=>{const n=Date.parse(s);return Number.isFinite(n)?new Date(n).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'Date unavailable'};
async function start(){
 const msg=el('f600-record-status');
 try{
  const db=await window.getSupabaseClient();
  const user=(await db.auth.getUser()).data?.user;
  if(!user){location.replace('signin.html?next=%2Ffounder-benefits.html');return}
  const identity=await db.rpc('gu_founder_legacy_my_status_v014187');
  if(identity.error||identity.data?.eligible!==true){msg.textContent='This account does not have a verified original founder identity.';return}
  const [cert,credits]=await Promise.all([
    db.from('gu_founder_certificates_v014192').select('id,track,evidence_digest,issued_at').eq('user_id',user.id).is('revoked_at',null).order('issued_at',{ascending:false}).limit(20),
    db.from('gu_founder_service_credits_v014203').select('incident_id,verified_minutes,status,applied_at,provider_reference,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
  ]);
  msg.textContent='Verified founding identity #'+String(identity.data.founderNumber).padStart(4,'0')+'. Records are private.';
  el('f600-record-content').hidden=false;
  const certHost=el('f600-certificates');certHost.replaceChildren();
  if(cert.error)certHost.append(make('p','Certificate records could not be loaded.'));
  else if(!(cert.data||[]).length)certHost.append(make('p','No certificate has been issued yet. Completion requires verified independent competency evidence and an Owner-approved record.'));
  else for(const c of cert.data){
    const box=make('section',undefined,'gu-f600-certificate');
    box.append(make('p','THE STOCK MARKET: FROM THE GROUND UP'));
    box.append(make('h3','Founding Foundations — Educational Completion'));
    box.append(make('p','Non-accredited certificate of demonstrated learning'));
    box.append(make('p','Founder #'+String(identity.data.founderNumber).padStart(4,'0')));
    box.append(make('p','Issued: '+date(c.issued_at)));
    box.append(make('p','Certificate ID: '+c.id));
    const codes=Object.keys(c.evidence_digest||{});if(codes.length)box.append(make('p','Evidence verified in: '+codes.join(', ')));
    box.append(make('p','This certificate does not certify investment performance, financial advice, or professional licensing.'));
    const print=make('button','Print my certificate','btn gu-f600-print-control');print.type='button';print.onclick=()=>window.print();box.append(print);
    certHost.append(box);
  }
  const host=el('f600-service-credits');host.replaceChildren();
  if(credits.error)host.append(make('p','Service credit records are temporarily unavailable.'));
  else if(!(credits.data||[]).length)host.append(make('p','No verified service-interruption credits are currently assigned to this founding identity.'));
  else for(const c of credits.data){
    const row=make('article',undefined,'gu-f600-issue');row.append(make('strong',c.verified_minutes+' minute'+(c.verified_minutes===1?'':'s')+' of verified time credit'));
    row.append(make('p','Status: '+String(c.status||'pending_application').replaceAll('_',' ')));
    row.append(make('p','Recorded: '+date(c.created_at)));
    if(c.applied_at)row.append(make('p','Applied: '+date(c.applied_at)));
    host.append(row);
  }
 }catch{msg.textContent='Your private benefit records could not be verified.'}
}
start();
})();