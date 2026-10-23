/* D16 Stage A: a preview-only authenticated Admin request/controller boundary.
 * Nothing mounts automatically; existing Admin controllers remain authoritative.
 * The backend, not this client, validates every permission and role.
 */
import {ADMIN_MODULES,resolveAdminModule} from './admin-module-registry-v014156.mjs';
export class AdminShellCore{
 #session;#fetch;#controllers=new Set();#epoch=0;#identity=null;
 constructor({sessionProvider,fetchImpl,modules=ADMIN_MODULES}={}){
  if(typeof sessionProvider!=='function'||typeof fetchImpl!=='function')
   throw new TypeError('Explicit session and fetch adapters are required.');
  this.#session=sessionProvider;this.#fetch=fetchImpl;this.modules=modules;
 }
 switchIdentity(id){
  const next=String(id||'');
  if(this.#identity===next)return;
  this.#identity=next;this.#epoch++;
  for(const ctrl of this.#controllers)ctrl.abort();
  this.#controllers.clear();
 }
 dispose(){this.switchIdentity(null)}
 availableModules(permissionCodes){
  const set=new Set(Array.isArray(permissionCodes)?permissionCodes:[]);
  return this.modules.filter(m=>set.has(m.requiredPermission));
 }
 route(id,permissionCodes){
  const target=resolveAdminModule(id);
  return target&&this.availableModules(permissionCodes).some(m=>m.id===target.id)
   ?target.route:null;
 }
 async request(action,{method='GET',body,params={}}={}){
  const upper=String(method||'GET').toUpperCase();
  if(!['GET','POST','PATCH','DELETE'].includes(upper))throw new TypeError('Unsupported Admin method');
  if(!/^[a-z][a-z0-9_-]{0,79}$/i.test(String(action||'')))throw new TypeError('Invalid Admin operation');
  if((upper==='GET'&&body!==undefined))throw new TypeError('GET must not mutate');
  const epoch=this.#epoch;
  const token=await this.#session();
  if(epoch!==this.#epoch)throw new Error('STALE_ADMIN_SESSION');
  if(typeof token!=='string'||!token.trim())throw new Error('ADMIN_SIGN_IN_REQUIRED');
  const q=new URLSearchParams({action});
  for(const [name,value] of Object.entries(params||{})){
   if(!/^[a-z][a-z0-9_]{0,79}$/i.test(name)||value===undefined||value===null)continue;
   q.set(name,String(value));
  }
  const ctrl=new AbortController();this.#controllers.add(ctrl);
  try{
   const response=await this.#fetch('/api/admin?'+q.toString(),{
    method:upper,cache:'no-store',credentials:'same-origin',signal:ctrl.signal,
    headers:{authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json'})},
    body:body===undefined?undefined:JSON.stringify(body)
   });
   if(epoch!==this.#epoch)throw new Error('STALE_ADMIN_SESSION');
   const data=await response.json().catch(()=>null);
   if(epoch!==this.#epoch)throw new Error('STALE_ADMIN_SESSION');
   if(!response.ok||data?.ok===false||!data)throw new Error(String(data?.error||'ADMIN_REQUEST_FAILED').slice(0,300));
   return data;
  }finally{this.#controllers.delete(ctrl)}
 }
}
