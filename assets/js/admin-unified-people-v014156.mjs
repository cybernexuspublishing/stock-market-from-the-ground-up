/* D16 Stage B: bounded, permission-scoped people/audit read helpers.
 * Supports an existing read-only Admin shell. No write access or financial action.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text=v=>v==null?'Not recorded':String(v).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180);
export function safeMemberId(id){return UUID.test(String(id||''))?String(id):null}
export function boundedAdminPage(v){return Number.isSafeInteger(v)&&v>=1&&v<=10000?v:1}
export function listParams(mod,state={}){
 if(mod?.id==='members')return {page:boundedAdminPage(state.page),per_page:50,
  ...(typeof state.search==='string'&&state.search.trim()?{q:state.search.trim().slice(0,120)}:{})};
 if(mod?.id==='audit')return {page:boundedAdminPage(state.page),limit:50};
 return {};
}
export function pageControlsInfo(mod,reply={}){
 if(mod?.id!=='members'&&mod?.id!=='audit')return null;
 const page=boundedAdminPage(reply.page),next=reply.hasNext===true;
 const scope=mod.id==='members'?(reply.searchScope==='CURRENT_AUTH_PAGE_ONLY'
   ?'Search matches are from this Auth page only; they are not a global directory search.'
   :'Pages come from the authoritative Auth user directory.'): 'Audit entries are paged server-side; newest first.';
 return {page,hasPrev:page>1,hasNext:next,scope};
}
export function authorizedMemberDetailRows(reply={}){
 const profile=reply.profile&&typeof reply.profile==='object'?reply.profile:{};
 const flag=reply.flag&&typeof reply.flag==='object'?reply.flag:{};
 const user=reply.user&&typeof reply.user==='object'?reply.user:{};
 const roles=Array.isArray(reply.roles)?reply.roles.slice(0,15).map(x=>x?.role_code).filter(x=>typeof x==='string'):[];
 const activity=reply.activity&&typeof reply.activity==='object'?reply.activity:{};
 return [
  {title:'Username',detail:text(profile.username)},
  {title:'Email',detail:text(user.email)},
  {title:'Account kind',detail:text(profile.account_kind)},
  {title:'Access status',detail:text(flag.status||'No restriction recorded')},
  {title:'Roles',detail:roles.length?roles.map(text).join(', ').slice(0,180):'None recorded'},
  {title:'Created at',detail:text(user.created_at)},
  {title:'Last sign-in',detail:text(user.last_sign_in_at)},
  {title:'Journal records',detail:Number.isSafeInteger(activity.journalCount)?String(activity.journalCount):'Not available'},
  {title:'Lab attempts',detail:Number.isSafeInteger(activity.labAttemptCount)?String(activity.labAttemptCount):'Not available'}
 ];
}
export function rolePermissionSummary(reply={}){
 if(!Array.isArray(reply.roles))return [];
 const assignments=Array.isArray(reply.rolePermissions)?reply.rolePermissions:[];
 return reply.roles.slice(0,50).map(role=>({
  title:text(role.name||role.role_code),
  detail:text(role.role_code)+' · '+assignments.filter(x=>x.role_code===role.role_code).length+
   ' assigned permissions · '+(role.is_assignable===false?'Not directly assignable':'Assignable under existing permissions')
 }));
}
