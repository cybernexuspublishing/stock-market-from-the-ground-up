/* Interactive Learning & Historical Labs: public product-scope teaching preview.
 * The existing Lab engine alone handles real attempts, protected grading and
 * authenticated progress. This preview uses original fictional data only.
 * Nothing here creates a purchase, grades mastery, or confers entitlement.
 */
(()=>{'use strict';
 const host=document.getElementById('interactive-learning-preview');
 if(!host)return;
 const $=id=>host.querySelector('[data-il-'+id+']');
 const status=$('status'),coverage=$('coverage'),answer=$('answer'),check=$('check'),
   explain=$('explain'),practice=$('practice'),reset=$('reset');
 const note=text=>{status.textContent=text};
 const allowedOptions=Object.freeze({
  market:'A market buy order prioritizes execution, not a maximum price; the actual fill may exceed $10.05.',
  limit:'A buy limit at $10.05 states a maximum acceptable buy price, but it may remain completely or partially unfilled.',
  stop:'A sell stop at $10.05 is a different instruction; when triggered it becomes a market sell order.',
  certain:'No displayed quote or selected order type can guarantee both an execution and a desired price.'
 });
 let explained=false,tries=0;
 const setFeedback=(text,correct=false)=>{
  const result=$('feedback');result.textContent=text;
  result.dataset.state=correct?'correct':'remediation';
 };
 function reveal(){
  explained=true;explain.hidden=false;practice.hidden=false;
  note('The fictional worked example is available. You may now make a practice decision.');
 }
 function evaluate(){
  if(!explained){setFeedback('Read the worked explanation before answering.');return}
  const selected=answer.querySelector('input[name="order-choice"]:checked');
  if(!selected){setFeedback('Select an order instruction before checking.');return}
  const choice=String(selected.value||'');
  if(!Object.hasOwn(allowedOptions,choice)){
   setFeedback('Choose one of the available instructions.');return
  }
  tries++;
  const isCorrect=choice==='limit';
  const correction=allowedOptions[choice];
  setFeedback((isCorrect?'Correct: ':'Review: ')+correction+
   (isCorrect?' The fictional ask at $10.12 does not prove your $10.05 limit order would fill.':
    ' Revisit the difference between price protection and execution certainty, then try again.'),isCorrect);
  // This is an ungraded public illustration. Never persist the result.
  $('attempt').textContent='Practice checks in this page: '+tries+'. No score or membership record is created.';
 }
 function restart(){
  answer.reset();tries=0;
  $('attempt').textContent='No answer checked. This is ungraded illustrative practice.';
  $('feedback').textContent='Choose an instruction after reviewing the worked example.';
  $('feedback').dataset.state='neutral';
 }
 const guard=(x,source)=>{
  if(!x||x.ok!==true||!Array.isArray(x[source]))throw Error('Unverified Lab release metadata');
  if(x[source].some(v=>typeof v!=='string'||!(/^[A-Za-z0-9_-]{3,90}$/).test(v)))throw Error('Invalid Lab identifiers');
  return x[source];
 };
 async function request(url){
  const control=new AbortController(),timer=setTimeout(()=>control.abort(),8500);
  try{
   const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:control.signal});
   if(!response.ok)throw Error('Release information unavailable');
   return await response.json();
  }finally{clearTimeout(timer)}
 }
 async function loadCoverage(){
  try{
   const [scope,release]=await Promise.all([
     request('/api/lab-beta-scope'),request('/api/lab-release-availability')
   ]);
   const selected=guard(scope,'selectedForPrebeta'),upcoming=guard(scope,'upcoming');
   if(selected.length!==336||upcoming.length!==83||
      new Set([...selected,...upcoming]).size!==419||
      scope.targetSelected!==336||scope.targetUpcoming!==83)
      throw Error('Canonical Lab scope mismatch');
   const candidates=new Set(selected),completed=guard(release,'publishedIds'),
    guided=guard(release,'guidedBetaIds');
   if([...completed,...guided].some(id=>!candidates.has(id))||
      guided.some(id=>completed.includes(id))){
    // SITE-Exclusive authored work may exist outside the selected 336.
    // Such items are excluded from this particular sellable product's
    // verified 336-candidate coverage, rather than opening Upcoming Labs.
    const reviewedSelected=completed.filter(id=>candidates.has(id));
    const guidedSelected=guided.filter(id=>candidates.has(id)&&!reviewedSelected.includes(id));
    const outside=[...completed,...guided].some(id=>!candidates.has(id));
    if(outside){
     coverage.textContent='The selected 336 include '+guidedSelected.length+
      ' ungraded guided-learning listings and '+reviewedSelected.length+
      ' reviewed-assessment listings. Other site-exclusive teaching is separate. An individual account entitlement and lesson review are checked inside the Lab.';
     return;
    }
    throw Error('Overlapping or mismatched release status');
   }
   coverage.textContent='Among the 336 selected canonical Lab identifiers, '+
    guided.length+' currently have ungraded guided-study listings and '+
    completed.length+' have reviewed-assessment listings. The other 83 canonical IDs are outside this product preview. Registry placement is not proof of saved progress, editorial acceptance, or a guaranteed paid feature.';
  }catch{
   coverage.textContent='The current Lab publication counts cannot be verified. '+
    'Explore the Lab Registry for individually available teaching; membership '+
    'and private lesson checks are performed by the Lab server. No number of '+
    'released or graded Labs is being assumed.';
  }
 }
 explain.addEventListener('click',reveal);
 check.addEventListener('click',evaluate);
 reset.addEventListener('click',restart);
 restart();
 void loadCoverage();
})();