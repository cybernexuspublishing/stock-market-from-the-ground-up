/* D16 Stage A: inert explicit Admin module registry. Not connected to the
 * production sidebar until the existing module lifecycle has been mapped and
 * cross-role Playwright acceptance completed. Never grants authorization.
 */
export const ADMIN_GROUPS=Object.freeze([
 Object.freeze({id:'overview',label:'Overview',order:10}),
 Object.freeze({id:'people',label:'People',order:20}),
 Object.freeze({id:'learning',label:'Learning',order:30}),
 Object.freeze({id:'commerce',label:'Commerce',order:40}),
 Object.freeze({id:'community',label:'Community',order:50}),
 Object.freeze({id:'platform',label:'Platform',order:60})
]);
const core=[
 ['dashboard','Dashboard','overview','dashboard.view',10],
 ['users','Account Details & Support','people','users.view',10],
 ['roles','Roles & Permissions','people','roles.view',20],
 ['content','Content & Tutor','learning','content.view',10],
 ['products','Products','commerce','catalog.view',10],
 ['commerce','Commerce','commerce','commerce.view',20],
 ['community','Market Commons & Reports','community','forum.view',10],
 ['settings','Site Settings','platform','settings.view',10],
 ['audit','Audit Log','platform','audit.view',20],
 ['system','System','platform','system.view',30]
];
export const ADMIN_MODULES=Object.freeze(core.map(([id,label,group,permission,order])=>
 Object.freeze({id,label,group,order,route:'#'+id,requiredPermission:permission,
  source:'existing-admin-core',loader:'legacy',mount:'existing-panel',cleanup:'legacy-controller',
  enabledByDefault:true})));
const byId=new Map(ADMIN_MODULES.map(x=>[x.id,x]));
/* A missing/unknown ID is not authorized merely because the label resembles
 * an admin function. An existing server permission remains authoritative. */
export function resolveAdminModule(id){return byId.get(String(id||''))||null}
export function visibleAdminModules(permissions){
 const set=new Set(Array.isArray(permissions)?permissions:[]);
 return ADMIN_MODULES.filter(m=>set.has(m.requiredPermission));
}
export function validateAdminRegistry(){
 const groups=new Set(ADMIN_GROUPS.map(g=>g.id));
 if(ADMIN_GROUPS.length!==6||groups.size!==6)return false;
 return byId.size===ADMIN_MODULES.length&&ADMIN_MODULES.every(m=>
  groups.has(m.group)&&/^[-a-z]+$/.test(m.id)&&
  /^[-a-z]+\.view$/.test(m.requiredPermission)&&m.route==='#'+m.id);
}
