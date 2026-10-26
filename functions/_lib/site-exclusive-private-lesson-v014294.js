/* Site-exclusive beta teaching eligibility. Exactly the 83 canonical SITE IDs,
 * using private lab_instruction_v014 (book 6); never award a grade or infer
 * editorial approval from the Owner's beta-testing scope.
 */
import {isBetaUpcomingLab} from './lab-beta-scope-v014286.js';
export const SITE_BETA_BATCH='2026-10-26-SITE-018-100-AUTHORED';
export const SITE_BETA_STATUS='original_site_exclusive_guided_beta_unreviewed_v014294';
const officialUrl=/^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|nyse\.com)\//i;
export function authoredSiteExclusiveBetaLesson(row){
 const c=row?.content;
 if(!row||!isBetaUpcomingLab(row.lab_id)||!/^SITE-\d{3}$/.test(row.lab_id)||
    Number(row.book_number)!==6||row.source_status!==SITE_BETA_STATUS||
    !c||typeof c!=='object'||Array.isArray(c))return false;
 if(c.id!==row.lab_id||c.lessonBatch!==SITE_BETA_BATCH||
    c.exampleType!=='ORIGINAL_FICTIONAL_EDUCATIONAL'||
    c.publicationClaim!=='DRAFT_AUTHORED_UNGRADED_SUBJECT_TO_INDIVIDUAL_EDITORIAL_REVIEW'||
    c.historicalEvidence!=='NOT_VERIFIED_NO_ACTUAL_MARKET_BARS')return false;
 const required=['concept','objective','what','why','when','commonError',
  'limitation','workedExample'];
 if(required.some(x=>typeof c[x]!=='string'||c[x].trim().length<25))return false;
 if(!Array.isArray(c.steps)||c.steps.length!==9||c.steps.some((x,i)=>
  typeof x!=='string'||!x.startsWith(['Start','Learn','Experiment','Predict',
   'Practice','Assess','Review','Transfer','Results'][i]+' — ')||x.length<40))return false;
 if(!Array.isArray(c.sourceURLs)||c.sourceURLs.length===0||c.sourceURLs.length>3||
  c.sourceURLs.some(u=>typeof u!=='string'||!officialUrl.test(u)))return false;
 return true;
}
export function siteExclusivePublicSources(row){
 if(!authoredSiteExclusiveBetaLesson(row))return [];
 return row.content.sourceURLs.slice(0,3);
}
