/* v0.14.0.149 Provider router. All providers are OFF unless the existing
 * transactional global + member rate gate approves the request.
 * Cloudflare Workers AI requires a Workers FREE plan and a verified AI binding.
 * Never infer zero cost from the published free neuron allotment.
 */
export const CLOUDFLARE_TUTOR_MODELS=Object.freeze(['@cf/zai-org/glm-4.7-flash']);
const trim=x=>String(x??'').trim();
export function tutorProvider(env){
 const choice=trim(env.AI_TUTOR_PROVIDER||'openai').toLowerCase();
 if(choice==='cloudflare'){
  const model=trim(env.AI_TUTOR_MODEL);
  const ready=env.AI_COST_MODE==='free_only'&&env.AI_CLOUDFLARE_FREE_TIER_VERIFIED==='true'&&
    env.AI?.run instanceof Function&&CLOUDFLARE_TUTOR_MODELS.includes(model);
  return {supported:ready,provider:'cloudflare',model,reason:ready?'ready':'free_tier_not_verified'};
 }
 if(choice==='openai'){
  const model=trim(env.AI_TUTOR_MODEL);
  // Explicit model allowlist; an arbitrary environment typo may not select a costly model.
  const allow=trim(env.AI_TUTOR_APPROVED_MODELS).split(',').map(x=>x.trim()).filter(Boolean);
  const ready=env.AI_PAID_PROVIDER_OWNER_APPROVED==='true'&&allow.includes(model);
  return {supported:ready,provider:'openai',model,endpoint:'https://api.openai.com/v1/responses',
   reason:ready?'ready':'paid_model_not_owner_approved'};
 }
 return {supported:false,provider:'unsupported',reason:'unsupported_provider'};
}
export async function callTutorModel(env,{instructions,input,signal}){
 const p=tutorProvider(env);
 if(!p.supported)return {ok:false,reason:p.reason||'unsupported_provider'};
 if(typeof instructions!=='string'||typeof input!=='string'||instructions.length>4500||input.length>6500)
  return {ok:false,reason:'oversized_prompt'};
 if(signal?.aborted)return {ok:false,reason:'timeout'};
 try{
  if(p.provider==='cloudflare'){
   // This branch does not use API keys, paid gateways, client supplied model ids or URLs.
   const result=await env.AI.run(p.model,{
    messages:[{role:'system',content:instructions},{role:'user',content:input}],
    max_completion_tokens:350,stream:false
   });
   if(signal?.aborted)return {ok:false,reason:'timeout'};
   const text=typeof result?.response==='string'?result.response.trim():
    typeof result?.choices?.[0]?.message?.content==='string'?result.choices[0].message.content.trim():'';
   return {ok:!!text&&text.length<=2400,reason:text?'provider_ok':'provider_empty',text};
  }
  const key=trim(env.AI_TUTOR_API_KEY);if(!key)return {ok:false,reason:'provider_not_configured'};
  const r=await fetch(p.endpoint,{method:'POST',signal,
   headers:{authorization:'Bearer '+key,'content-type':'application/json'},
   body:JSON.stringify({model:p.model,instructions,input,max_output_tokens:350,store:false})});
  if(!r.ok)return {ok:false,reason:'provider_http_rejected'};
  const raw=await r.json();
  if(raw?.status&&raw.status!=='completed')return {ok:false,reason:'provider_incomplete'};
  if(raw?.incomplete_details||raw?.error)return {ok:false,reason:'provider_incomplete'};
  const chunks=Array.isArray(raw?.output)?raw.output:[];
  const text=chunks.flatMap(x=>Array.isArray(x.content)?x.content:[])
   .filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n').trim();
  return {ok:!!text&&text.length<=2400,reason:text?'provider_ok':'provider_empty',text};
 }catch(e){return {ok:false,reason:e?.name==='AbortError'?'timeout':'provider_exception'}}
}
