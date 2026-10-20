/* v0.14.0.105: shared server-only forum mutation boundary. */
export function checkMutationOrigin(request){
 const origin=request.headers.get('origin');
 if(!origin)return;
 let parsed,site;try{parsed=new URL(origin);site=new URL(request.url)}catch{
  throw Object.assign(new Error('Invalid request origin.'),{status:403});
 }
 if(parsed.origin!==site.origin)throw Object.assign(new Error('Cross-origin forum modifications are not permitted.'),{status:403});
}
export async function boundedForumJson(request,maxBytes=16000){
 const len=Number(request.headers.get('content-length')||0);
 if(!Number.isFinite(len)||len<0||len>maxBytes)
  throw Object.assign(new Error('Forum request exceeds the size limit.'),{status:413});
 const raw=await request.text();
 // Count UTF-8 bytes, not JavaScript UTF-16 code units.
 if(new TextEncoder().encode(raw).byteLength>maxBytes)
  throw Object.assign(new Error('Forum request exceeds the size limit.'),{status:413});
 let body;try{body=JSON.parse(raw)}catch{
  throw Object.assign(new Error('Invalid forum JSON.'),{status:400});
 }
 if(!body||typeof body!=='object'||Array.isArray(body))
  throw Object.assign(new Error('Invalid forum request.'),{status:400});
 return body;
}
export const isForumId=x=>Number.isSafeInteger(x)&&x>0;
