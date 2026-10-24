/** v0.14.0.170 Founding 600 benefit guards. SOURCE/STAGING ONLY.
 * Must receive server-verified identities and records; no payment, entitlement,
 * authentication, certificate or database side effects. Do not expose to clients.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tiers=new Set(['FOUNDING_30','FOUNDING_60']);
const t=x=>{const n=Date.parse(x);if(!Number.isFinite(n))throw Error('INVALID_TIMESTAMP');return n};
const member=x=>{if(!x||!UUID.test(x.userId)||x.accountKind!=='member'||x.showcase||x.restricted||!tiers.has(x.founderTier)||!Number.isInteger(x.founderNumber)||x.founderNumber<1||x.founderNumber>600)throw Error('INELIGIBLE_FOUNDER');return x};
export function certificateEligibility({founder,evidence,trackCode}={}){
 member(founder);
 if(!['FOUNDING_FOUNDATIONS','FOUNDING_EXTENDED'].includes(trackCode))throw Error('INVALID_TRACK');
 if(trackCode==='FOUNDING_EXTENDED'&&founder.founderTier!=='FOUNDING_60')throw Error('EXTENDED_REQUIRED');
 if(!evidence||evidence.userId!==founder.userId||evidence.trackCode!==trackCode||evidence.reviewed!==true||evidence.independentlyCompleted!==true||!evidence.verifiedEvidenceId)throw Error('VERIFIED_COMPLETION_REQUIRED');
 return {userId:founder.userId,trackCode,evidenceId:evidence.verifiedEvidenceId,professionalCredential:false};
}
export function earlyMaterialAccess({founder,resource,now}={}){
 member(founder);
 if(!resource||resource.state!=='reviewed'||resource.rightsCleared!==true||!resource.publishedAt)return false;
 if(!founder.subscriptionActive||t(founder.paidThrough)<=t(now)||t(resource.publishedAt)>t(now))return false;
 return resource.audience==='FOUNDING_ALL'||resource.audience==='FOUNDING_EXTENDED'&&founder.founderTier==='FOUNDING_60';
}
export function validateImprovementVote({founder,ballot,choice,priorVote,now}={}){
 member(founder);
 if(!founder.subscriptionActive||t(founder.paidThrough)<=t(now))throw Error('ACTIVE_MEMBERSHIP_REQUIRED');
 if(!ballot||ballot.status!=='open'||t(now)<t(ballot.opensAt)||t(now)>=t(ballot.closesAt))throw Error('BALLOT_CLOSED');
 if(!Array.isArray(ballot.options)||!ballot.options.includes(choice))throw Error('INVALID_CHOICE');
 if(priorVote)throw Error('ALREADY_VOTED');
 return {userId:founder.userId,ballotId:ballot.id,choice,weight:1,advisoryOnly:true};
}
export function visibleFoundingNotice({founder,notice,now}={}){
 member(founder);
 if(!notice||notice.published!==true||t(notice.startsAt)>t(now)||notice.endsAt&&t(notice.endsAt)<=t(now))return false;
 return notice.audience==='FOUNDER_ALL'||notice.audience==='FOUNDER_EXTENDED'&&founder.founderTier==='FOUNDING_60';
}
export function expirePremiumPreserveProgress({founder,progress}={}){
 member(founder);
 if(!Array.isArray(progress))throw Error('PROGRESS_REQUIRED');
 if(progress.some(p=>p.userId!==founder.userId))throw Error('CROSS_MEMBER_RECORD');
 return {founderNumber:founder.founderNumber,founderTier:founder.founderTier,subscriptionActive:false,premiumAccess:false,preservedProgressIds:progress.map(p=>p.id)};
}
export function qualifyingInterruption({founder,incident,alreadyCredited,now}={}){
 member(founder);
 if(!incident||incident.verified!==true||incident.qualifying!==true||!UUID.test(incident.id))throw Error('VERIFIED_INCIDENT_REQUIRED');
 if(alreadyCredited)throw Error('INCIDENT_ALREADY_CREDITED');
 if(!founder.subscriptionActive)throw Error('ACTIVE_MEMBERSHIP_REQUIRED');
 const start=t(incident.startedAt),end=t(incident.endedAt),current=t(now);
 if(end<=start||end>current||!Number.isSafeInteger(incident.extensionSeconds)||incident.extensionSeconds<=0||incident.extensionSeconds>2592000)throw Error('INVALID_EXTENSION');
 if(t(founder.paidThrough)<=start||t(founder.paidFrom)>=end)throw Error('MEMBER_NOT_AFFECTED');
 return {userId:founder.userId,incidentId:incident.id,extensionSeconds:incident.extensionSeconds,requiresEntitlementExtension:true};
}
