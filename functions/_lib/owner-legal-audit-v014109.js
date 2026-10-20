/* v0.14.0.109 — Owner-only legal-publication audit (NO policy text exposed).
 * This is not a legal review and must not certify that policy terms are adequate.
 */
export const EXPECTED_LEGAL_CODES=Object.freeze([
 'TERMS','PRIVACY','SUBSCRIPTION','REFUNDS','DISCLAIMER',
 'COMMUNITY','ADVERTISING','COOKIES','ACCESSIBILITY','COPYRIGHT'
]);
const isJwt=v=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
export async function ownerLegalPublicationAudit(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)return {available:false,documents:[],
  status:'not_verified',note:'Private legal registry cannot be inspected.'};
 const headers={apikey:key,accept:'application/json'};
 if(isJwt(key))headers.authorization='Bearer '+key;
 try{
  const url=base+'/rest/v1/legal_documents?select=document_code,title,slug,status,body_markdown,version,effective_at&limit=100';
  const response=await fetch(url,{method:'GET',headers,cache:'no-store'});
  if(!response.ok)throw Error('registry unavailable');
  const records=await response.json();
  if(!Array.isArray(records)||records.length>=100)throw Error('truncated legal registry');
  const byCode=new Map(records.map(x=>[x.document_code,x]));
  const documents=EXPECTED_LEGAL_CODES.map(code=>{
   const row=byCode.get(code),length=typeof row?.body_markdown==='string'?row.body_markdown.trim().length:0;
   const published=row?.status==='published';
   return {code,found:!!row,published,bodyPresent:length>0,
    contentLength:length,version:row?.version?String(row.version).slice(0,30):null,
    status:published?'published_record':'not_published',
    editorialApproved:false,legalReviewed:false,
    needsManualReview:!published||length<200};
  });
  return {available:true,status:'registry_readable',documents,
   publishedCount:documents.filter(d=>d.published&&d.bodyPresent).length,
   allPublished:documents.every(d=>d.published&&d.bodyPresent),
   publicStaticSeoVerified:false,legalAdequacyVerified:false,
   note:'A published Supabase row is not proof the legal text is complete, correct for the business, rendered to search crawlers or reviewed by counsel. The static HTML shells still render policy bodies client-side.'};
 }catch{return {available:false,status:'not_verified',documents:[],publishedCount:null,
  allPublished:false,publicStaticSeoVerified:false,legalAdequacyVerified:false,
  note:'Owner could not read the live legal registry. Do not represent this as zero published policies or as legally ready.'}}
}
