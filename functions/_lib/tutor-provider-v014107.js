/* D09 v0.14.0.149: explicit, server-only provider adapter.
 * No paid provider automatically activated. No client-selected URL/model.
 * Cloudflare Workers AI is permitted only with a real AI binding and the
 * precisely reviewed model name. Dashboard free-plan/usage verification is
 * still an Owner-controlled production prerequisite, not a promise of $0.
 */
export const CLOUDFLARE_TUTOR_MODEL='@cf/meta/llama-3.1-8b-instruct-fp8';
const providerName=env=>String(env.AI_TUTOR_PROVIDER||'openai').trim().toLowerCase();
const modelName=env=>String(env.AI_TUTOR_MODEL||'').trim();
const approvedOpenAiModel=(env,model)=>{
 const policy=String(env.AI_TUTOR_MODEL_ALLOWLIST||'').trim();
 // Preserve the pre-D09 explicit server-only MODEL setting for existing Owner
 // installations; a supplied allowlist narrows rather than expands it.
 if(!policy)return !!model;
 const allowed=policy.split(',').map(x=>x.trim()).filter(Boolean);
 return !!model&&allowed.includes(model);
};
export function tutorProvider(env){
 const choice=providerName(env),model=modelName(env);
 if(choice==='cloudflare_workers_ai'){
  const binding=typeof env.AI?.run==='function';
  return {supported:binding&&model===CLOUDFLARE_TUTOR_MODEL,
   provider:'cloudflare_workers_ai',model,configured:binding&&model===CLOUDFLARE_TUTOR_MODEL};
 }
 if(choice==='openai'){
  const approved=approvedOpenAiModel(env,model);
  return {supported:approved,provider:'openai',model,configured:approved&&!!String(env.AI_TUTOR_API_KEY||''),
   endpoint:'https://api.openai.com/v1/responses'};
 }
 return {supported:false,provider:'unsupported',configured:false};
}
export async function callTutorModel(env,{instructions,input,signal}){
 const provider=tutorProvider(env);
 if(!provider.supported||!provider.configured)return {ok:false,reason:'provider_not_configured'};
 if(signal?.aborted)return {ok:false,reason:'timeout'};
 try{
  if(provider.provider==='cloudflare_workers_ai'){
   // The platform model is treated as a drafting assistant, NEVER as grading
   // authority. Only authored evidence enters the prompt; caller validates
   // citations and rejects actionable financial recommendations.
   const response=await env.AI.run(CLOUDFLARE_TUTOR_MODEL,{
    messages:[{role:'system',content:String(instructions).slice(0,3000)},
     {role:'user',content:String(input).slice(0,7000)}],
    max_tokens:350,temperature:0.2,stream:false
   });
   if(signal?.aborted)return {ok:false,reason:'timeout'};
   const answer=typeof response?.response==='string'?response.response.trim():'';
   return {ok:!!answer,reason:answer?'provider_ok':'provider_empty',text:answer};
  }
  const key=String(env.AI_TUTOR_API_KEY||'');
  const r=await fetch(provider.endpoint,{method:'POST',signal,
   headers:{authorization:'Bearer '+key,'content-type':'application/json'},
   body:JSON.stringify({model:provider.model,instructions,input,max_output_tokens:350,store:false})});
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
