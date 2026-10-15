/* v0.14.0.19 — readonly release-gate diagnostics for authorized Admin interface.
 * NEVER changes production data, grants permissions, executes SQL, or claims backend acceptance.
 */
(()=>{'use strict';
 if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
 let mounted=false;
 const create=(name,text,className)=>{const e=document.createElement(name);if(text)e.textContent=text;if(className)e.className=className;return e};
 function install(){
   if(mounted)return;
   const host=document.querySelector('.admin-panel[data-admin-panel="system"]');if(!host)return;
   mounted=true;
   const box=create('section',null,'admin-card gu-frontend-health');box.id='gu-frontend-health';
   const title=create('h2','Frontend-to-Backend Integration Checks');
   const explain=create('p','Read-only checks of current authentication, Market Commons visibility, administrative reporting policy, and owner control registry. Passing these checks does not certify full production operations, payments, or every role.');
   const button=create('button','Run integration checks','btn secondary');button.type='button';
   const status=create('p','No live checks have been executed.','status-message');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
   const list=create('ol');list.className='gu-integration-results';
   const foot=create('p','Backend migrations, role-negative tests, payment-provider confirmations, Lab grading, accessibility acceptance, and deployment parity still require separate verification.','small');
   box.append(title,explain,button,status,list,foot);host.append(box);
   function item(label,kind,detail){const li=create('li');const name=create('strong',label+' — '+kind);const text=create('span',detail);li.append(name,document.createTextNode(' '),text);list.append(li)}
   async function api(path,token){const r=await fetch(path,{cache:'no-store',headers:{authorization:'Bearer '+token,accept:'application/json'}});const x=await r.json().catch(()=>({}));return {status:r.status,ok:r.ok&&x.ok===true,body:x}}
   button.addEventListener('click',async()=>{
     button.disabled=true;list.replaceChildren();status.textContent='Running live read-only checks…';
     try{
       const sb=await window.getSupabaseClient(),res=await sb.auth.getSession();const session=res.data?.session;
       if(!session?.access_token)throw Error('Authenticated staff session unavailable.');
       item('Authenticated session','PASS','A Supabase session is present. This does not itself prove staff authority.');
       const tasks=[
         ['Market Commons forums',async()=>{
           const r=await sb.from('commons_forums').select('forum_code').eq('active',true).limit(1);
           return {status:r.error?'UNAVAILABLE':'PASS',message:r.error?.message||'Authorized forum query succeeded.'}
         }],
         ['Market Commons topics',async()=>{
           const r=await sb.from('commons_topics').select('id').eq('status','published').limit(1);
           return {status:r.error?'UNAVAILABLE':'PASS',message:r.error?.message||'Authorized topic query succeeded.'}
         }],
         ['Reporting policy',async()=>{
           const r=await api('/api/admin-report-policy',session.access_token);
           return {status:r.ok?'PASS':r.status===403?'NO_PERMISSION':'UNAVAILABLE',message:r.ok?('Server policy loaded; edit permission: '+(r.body.canEdit?'OWNER':'read-only')):(r.body.error||'HTTP '+r.status)}
         }],
         ['Admin control registry',async()=>{
           const r=await api('/api/admin-control-registry',session.access_token);
           return {status:r.ok?'PASS':r.status===403?'NO_PERMISSION':'UNAVAILABLE',message:r.ok?'Owner control registry responded.':(r.body.error||'HTTP '+r.status)}
         }]
       ];
       let pass=0;for(const [label,fn] of tasks){try{const r=await fn();if(r.status==='PASS')pass++;item(label,r.status,r.message)}catch(e){item(label,'UNAVAILABLE',e.message||'Check failed.')}}
       status.textContent=`${pass} of ${tasks.length} read-only integration checks passed. This is not full production acceptance.`;
     }catch(e){status.textContent=e.message||'Unable to perform checks.'}
     finally{button.disabled=false}
   });
 }
 let count=0;const timer=setInterval(()=>{install();if(mounted||++count>120)clearInterval(timer)},250);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
