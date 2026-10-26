import test from 'node:test';
import assert from 'node:assert/strict';
import {SOCIAL_PROVIDER_CAPABILITIES,SOCIAL_MAX_EXTERNAL_SPEND_CENTS,socialProvider,assertExternalSocialActionAllowed}
 from '../functions/_lib/social-provider-capabilities-v014279.mjs';

test('seven social platforms are registered without claiming an account connection',()=>{
 assert.equal(SOCIAL_PROVIDER_CAPABILITIES.length,7);
 assert.equal(SOCIAL_MAX_EXTERNAL_SPEND_CENTS,0);
 assert.equal(socialProvider('x').account,'@SMFGUAcademy');
 for(const p of SOCIAL_PROVIDER_CAPABILITIES){
  assert.equal(p.oauthConnected,false,p.id);
  for(const key of ['apiPublishing','apiAnalytics','automatedCommunityJoin','automatedReplies'])
   assert.equal(p[key],false,p.id+':'+key);
 }
});
test('authorization and spending guards fail closed for every external action',()=>{
 for(const p of SOCIAL_PROVIDER_CAPABILITIES)
  for(const action of ['apiPublishing','apiAnalytics','automatedCommunityJoin','automatedReplies']){
   assert.throws(()=>assertExternalSocialActionAllowed(p.id,action),/not authorized|available/);
   assert.throws(()=>assertExternalSocialActionAllowed(p.id,action,{authorizationVerified:true}),/not authorized|available/);
   assert.throws(()=>assertExternalSocialActionAllowed(p.id,action,{spendCents:1,authorizationVerified:true}),/Chargeable/);
  }
 assert.throws(()=>socialProvider('unlisted'),/Unknown social provider/);
});
