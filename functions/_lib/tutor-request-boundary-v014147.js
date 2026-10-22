/* D07 v0.14.0.147: pure bounded Tutor input/security boundary.
 * Validate BEFORE consuming the member's optional source or paid request
 * quotas. Never rely on client-side consent or size controls.
 */
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function parseTutorRequest(request){
 const url=new URL(request.url),origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)throw fail('Cross-origin Tutor submission refused.',403);
 const site=request.headers.get('sec-fetch-site');
 if(site&&!['same-origin','none'].includes(site))
  throw fail('Cross-site Tutor submission refused.',403);
 if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))
  throw fail('Tutor requests require JSON content.',415);
 const size=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(size)||size<0||size>8000)throw fail('Request too large.',413);
 const raw=await request.text();
 if(new TextEncoder().encode(raw).length>8000)throw fail('Request too large.',413);
 let body;try{body=JSON.parse(raw)}catch{throw fail('Invalid JSON.')}
 if(!body||typeof body!=='object'||Array.isArray(body)||
    typeof body.question!=='string'||
    (body.mode!==undefined&&typeof body.mode!=='string')||
    (body.learnerAnswer!==undefined&&typeof body.learnerAnswer!=='string')||
    (body.allowModel!==undefined&&typeof body.allowModel!=='boolean')||
    (body.saveHistory!==undefined&&typeof body.saveHistory!=='boolean')||
    (body.conversationId!==undefined&&body.conversationId!==null&&
      (typeof body.conversationId!=='string'||!validId.test(body.conversationId)))||
    (body.requestId!==undefined&&(!validId.test(body.requestId)||typeof body.requestId!=='string')))
  throw fail('Invalid Tutor request fields.');
 const clean=x=>x.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
 const question=clean(body.question),mode=clean(body.mode||'explain'),
  learnerAnswer=clean(body.learnerAnswer||'');
 if(question.length<4||question.length>450||
  !['explain','question','review','practice'].includes(mode)||
  learnerAnswer.length>1800||mode==='review'&&!learnerAnswer)
  throw fail('Tutor question, mode or learner reflection is invalid.');
 return {question,mode,learnerAnswer,
  allowModel:body.allowModel===true,saveHistory:body.saveHistory===true,
  requestId:body.requestId||crypto.randomUUID(),
  conversationId:body.conversationId||null,
  // Legacy untrusted priorTurns are ignored by the route, NEVER reintroduced
  // into provider input, current source evidence or saved Tutor replies.
  priorTurnsSupplied:body.priorTurns!==undefined};
}
