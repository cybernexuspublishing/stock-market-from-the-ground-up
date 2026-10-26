/* Public canonical Lab release-scope metadata only.
 * Never infer actual lesson readiness or mastery from candidate placement.
 * Source of truth is the private-review gate and separately owned Lab progress.
 */
import {BETA_SCOPE_VERSION,BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../_lib/lab-beta-scope-v014286.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
export function onRequest({request}){
 if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'Method not allowed.'}),{status:405,headers:H});
 return new Response(JSON.stringify({ok:true,version:BETA_SCOPE_VERSION,
  selectedForPrebeta:BETA_CANDIDATE_IDS,upcoming:BETA_UPCOMING_IDS,
  readiness:'candidate_selection_only_not_editorial_or_assessment_approval',
  targetSelected:336,targetUpcoming:83}),{status:200,headers:H});
}
