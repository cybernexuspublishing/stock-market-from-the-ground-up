/* Original nine-stage ungraded checkpoint using EXISTING site_lab_progress.
 * Never stores private grading, scores, predictions about unrevealed bars, or
 * backend entitlements; never overrides official lab_progress.
 */
(function(root){
 'use strict';
 const validId=/^[A-Za-z0-9_-]{3,90}$/;
 const bool=v=>v===true;
 const bounded=(v,max=1500)=>String(v??'').slice(0,max);
 const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=999?v:0;
 function normalize(input,mode){
  if(!input||typeof input!=='object'||Array.isArray(input)||
    !['guided','practice'].includes(mode)||input.mode!==mode||input.version!==1||
    !Number.isInteger(input.stage)||input.stage<0||input.stage>8)return null;
  const replyRows=Array.isArray(input.learnerReplies)?input.learnerReplies:[];
  const learnerReplies=replyRows.slice(0,9).filter(x=>
   Array.isArray(x)&&x.length===2&&Number.isInteger(x[0])&&x[0]>=0&&x[0]<=8&&
   Array.isArray(x[1])&&x[1].length<=5&&x[1].every(v=>typeof v==='string'))
   .map(([key,values])=>[key,values.map(v=>bounded(v,500))]);
  return{
   version:1,mode,stage:input.stage,
   observations:bounded(input.observations),prediction:bounded(input.prediction),
   predictionLocked:bool(input.predictionLocked),
   practice:bounded(input.practice),practiceCount:integer(input.practiceCount),
   practiceResolved:bool(input.practiceResolved),practiceAssisted:bool(input.practiceAssisted),
   transfer:bounded(input.transfer),transferCount:integer(input.transferCount),
   transferResolved:bool(input.transferResolved),selfReview:bool(input.selfReview),
   reflection:bounded(input.reflection),learnerReplies
  };
 }
 function create({sb,userId,labId,mode,alive}={}){
  if(!sb?.from||!sb?.rpc||!validId.test(String(labId||''))||
    !/^[0-9a-f-]{36}$/i.test(String(userId||''))||!['guided','practice'].includes(mode))
   return null;
  const valid=()=>typeof alive==='function'?alive()===true:true;
  let queue=Promise.resolve(),revision=0;
  return{
   async load(){
    if(!valid())return null;
    const {data,error}=await sb.from('site_lab_progress')
     .select('responses').eq('user_id',userId).eq('lab_id',labId).maybeSingle();
    if(!valid())return null;
    if(error)throw Error('Saved journey cannot be verified; start locally or retry.');
    const raw=data?.responses?.learning_journey_v33;
    // One authoritative row now keeps BOTH guided and practice checkpoints
    // beneath an atomic v2 revision. Still read the original v1 flat record
    // without altering or deleting any member's older study history.
    const v2=raw?.version===2;
    if(v2&&(!raw.modes||typeof raw.modes!=='object'||Array.isArray(raw.modes)))
     throw Error('Saved journey format is invalid; reload without overwriting it.');
    const scoped=v2?raw.modes[mode]:raw;
    const found=normalize(scoped,mode);
    // The CAS revision belongs to the shared record, NOT the selected mode.
    // Previously switching from guided to practice reset it to zero, causing
    // a stale-write failure or replacing the other mode's checkpoint.
    if(raw&&(!Number.isSafeInteger(raw.rev)||raw.rev<0))
     throw Error('Saved journey revision is invalid; no progress was overwritten.');
    revision=raw?.rev||0;
    return found;
   },
   save(raw){
    // Serialized writes preserve stage order even on high-latency connections.
    const checkpoint=normalize(raw,mode);
    if(!checkpoint)return Promise.reject(Error('Invalid ungraded progress record.'));
    queue=queue.catch(()=>{}).then(async()=>{
     if(!valid())throw Error('Member account changed; previous draft was not saved.');
     const {data,error}=await sb.rpc('gu_v33_save_lab_journey',{
      p_lab:labId,p_checkpoint:checkpoint,p_expected_revision:revision
     });
     if(!valid())throw Error('Account changed while saving; reopen the Lab.');
     if(error?.code==='40001')throw Error(
      'Another device or tab saved a newer draft. Reload this Lab before saving again; no grade changed.');
     if(error||data?.ok!==true||!Number.isSafeInteger(data?.saved?.rev)||
       data.saved.rev!==revision+1)
      throw Error('Your learning checkpoint was not confirmed. Retry saving; no grade was awarded.');
     revision=data.saved.rev;
     return data.saved;
    });
    return queue;
   }
  };
 }
 root.GroundUpLabJourneyCheckpointV33=Object.freeze({create,normalize});
})(globalThis);
