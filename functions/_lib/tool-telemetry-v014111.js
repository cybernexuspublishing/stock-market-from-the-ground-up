/* v0.14.0.111: privacy-minimized operational signals.
 * ALLOWLIST ONLY — no user ID, IP, URL, tool name, price, prompt, stored work,
 * provider key, symbol, account email, payment data or source records.
 */
const EVENTS=new Set(['beta_access','beta_workspace','beta_calculation']);
const REASONS=new Set(['allowed','denied','created','listed','deleted',
 'invalid_request','not_authenticated','not_entitled','private_storage_unavailable','unavailable']);
export function safeToolMetric(event,reason){
 if(!EVENTS.has(event)||!REASONS.has(reason))return false;
 console.info(JSON.stringify({component:'beta_tool_operations',event,reason}));
 return true;
}
export function statusReason(status){
 if(status===401)return 'not_authenticated';
 if(status===403)return 'not_entitled';
 if([400,404,405,413].includes(status))return 'invalid_request';
 return 'unavailable';
}
