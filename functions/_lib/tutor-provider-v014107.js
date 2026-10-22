/* v0.14.0.107: provider boundary. Explicit allowlist; add adapters ONLY
 * after privacy, attribution, billing and failure policy reviews.
 * OpenAI is currently the sole implemented adapter. No URL from browser.
 */
export function tutorProvider(env){
 const choice=String(env.AI_TUTOR_PROVIDER||'openai').trim().toLowerCase();
 if(choice!=='openai')return {supported:false,provider:'unsupported'};
 return {supported:true,provider:'openai',endpoint:'https://api.openai.com/v1/responses'};
}
export async function callTutorModel(env,{instructions,input,signal}){
 const provider=tutorProvider(env);
 if(!provider.supported)return {ok:false,reason:'unsupported_provider'};
 const key=String(env.AI_TUTOR_API_KEY||''),model=String(env.AI_TUTOR_MODEL||'');
 if(!key||!model)return {ok:false,reason:'provider_not_configured'};
 try{
  const r=await fetch(provider.endpoint,{method:'POST',signal,
   headers:{authorization:'Bearer '+key,'content-type':'application/json'},
   body:JSON.stringify({model,instructions,input,max_output_tokens:350,store:false})});
  if(!r.ok)return {ok:false,reason:'provider_http_rejected'};
  const raw=await r.json();
  if(raw?.status&&raw.status!=='completed')return {ok:false,reason:'provider_incomplete'};
  if(raw?.incomplete_details||raw?.error)return {ok:false,reason:'provider_incomplete'};
  const chunks=Array.isArray(raw?.output)?raw.output:[];
  const answer=chunks.flatMap(x=>Array.isArray(x.content)?x.content:[])
   .filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n').trim();
  return {ok:!!answer,reason:answer?'provider_ok':'provider_empty',text:answer};
 }catch(e){return {ok:false,reason:e?.name==='AbortError'?'timeout':'provider_exception'}}
}
