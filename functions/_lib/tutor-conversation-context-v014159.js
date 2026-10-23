/* D09 follow-up retrieval: source questions only, never answer keys or private notes.
 * A conversation ID must already be authorized by the Tutor endpoint, AND the
 * second REST query independently scopes both member and conversation IDs.
 * Browser-supplied priorTurns are NEVER trusted or forwarded.
 */
import {conversationRest} from '../api/member-tutor-conversations.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERIFIED=new Set(['verified:original-competency-guide','verified:reviewed-glossary-logic','verified:grounded-model-draft']);
export function isContextualTutorFollowup(value){
 const text=String(value||'').trim();
 return text.length>=4&&text.length<=180&&(
  /\b(it|its|they|their|them|this|that|those|these|earlier|previous|above|same)\b/i.test(text)||
  /^(?:and\s+)?(?:what|how|why)\s+about\b/i.test(text)||
  /^(?:continue|elaborate|expand|explain more|tell me more|give another example)\b/i.test(text)
 );
}
export async function getVerifiedPriorTutorQuestion(env,userId,conversationId,{rest=conversationRest}={}){
 if(!UUID.test(String(userId||''))||!UUID.test(String(conversationId||'')))return null;
 if(typeof rest!=='function')return null;
 const path='gu_member_tutor_exchanges_v014102?select=question,generation'+
  '&user_id=eq.'+encodeURIComponent(userId)+
  '&conversation_id=eq.'+encodeURIComponent(conversationId)+
  '&order=created_at.desc,id.desc&limit=5';
 try{
  const result=await rest(env,path);
  if(!result?.ok||!Array.isArray(result.data)||result.data.length>5)return null;
  // Do not use legacy client-copied history or any assistant answer. Prior
  // questions are context clues, never authoritative educational evidence.
  const previous=result.data.find(row=>row&&VERIFIED.has(row.generation)&&
    typeof row.question==='string'&&row.question.trim().length>=4&&
    row.question.trim().length<=450);
  return previous?previous.question.trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,240):null;
 }catch{return null}
}
