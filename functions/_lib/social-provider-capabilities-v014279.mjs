/* Provider capability and spending guard for the free social management release.
 * This registry expresses what OUR platform has actually implemented, not what
 * external websites might permit. No provider session is acquired or inferred.
 */
export const SOCIAL_PROVIDER_CAPABILITIES=Object.freeze([
 Object.freeze({id:'x',name:'X',account:'@SMFGUAcademy',connection:'manual_only',
  manuallyPublishable:true,manualCommunityJoin:true,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'Follow individual Community rules; native manual joining and posting only.'}),
 Object.freeze({id:'facebook',name:'Facebook Pages',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:true,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'No Page permissions or Meta app authorization are configured.'}),
 Object.freeze({id:'instagram',name:'Instagram',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:false,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'No professional account connection or Meta review is configured.'}),
 Object.freeze({id:'linkedin',name:'LinkedIn',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:true,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'No organization admin authorization is configured.'}),
 Object.freeze({id:'youtube',name:'YouTube',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:false,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'No Google OAuth connection or YouTube publishing scope is configured.'}),
 Object.freeze({id:'reddit',name:'Reddit',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:true,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'Subreddit rules and platform automation restrictions apply.'}),
 Object.freeze({id:'discord',name:'Discord',account:null,connection:'not_connected',
  manuallyPublishable:true,manualCommunityJoin:true,oauthConnected:false,apiPublishing:false,
  apiAnalytics:false,automatedReplies:false,automatedCommunityJoin:false,
  policy:'No server-approved bot or webhook authorization is configured.'})
]);
export const SOCIAL_MAX_EXTERNAL_SPEND_CENTS=0;
export function socialProvider(id){
 const provider=SOCIAL_PROVIDER_CAPABILITIES.find(p=>p.id===id);
 if(!provider)throw Object.assign(new Error('Unknown social provider.'),{status:400});
 return provider;
}
export function assertExternalSocialActionAllowed(providerId,action,{spendCents=0,authorizationVerified=false}={}){
 const provider=socialProvider(providerId);
 if(!Number.isSafeInteger(spendCents)||spendCents<0||spendCents>SOCIAL_MAX_EXTERNAL_SPEND_CENTS)
  throw Object.assign(new Error('Chargeable social operations are disabled.'),{status:403});
 const allowed=new Set(['apiPublishing','apiAnalytics','automatedReplies','automatedCommunityJoin']);
 if(!allowed.has(action))throw Object.assign(new Error('Unsupported external action.'),{status:400});
 if(!authorizationVerified||provider.oauthConnected!==true||provider[action]!==true)
  throw Object.assign(new Error('This provider action is not authorized or available.'),{status:403});
 return true;
}
