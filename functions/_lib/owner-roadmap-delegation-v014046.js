/* Cyber Nexus website project: Owner-delegated review policy v0.14.0.46.
 * Authorized by an explicit user instruction on 2026-10-17.
 * This file records a delegated technical acceptance assessment ONLY.
 * It does not confer authenticated OWNER privileges, amend billing or legal
 * authorizations, or overwrite any existing Supabase Owner decisions.
 */
export const delegatedReviewPolicy=Object.freeze({
  version:'0.14.0.46',
  reviewDate:'2026-10-17',
  reviewer:'AI assistant, acting as delegated project reviewer at the Owner\'s express request',
  decisionAuthority:'Website task tracking and documented implementation acceptance only',
  authoritySource:'Direct Owner instruction in project conversation, 2026-10-17',
  revocation:'Owner may supersede or revoke any delegated decision; manually saved Owner decisions always prevail',
  constraints:'No production checkout approval, entitlement grants, security bypass, legal certification, provider confirmation, or claims of untested live behavior'
});
export const delegatedStages=Object.freeze({
  deployed_verified:Object.freeze({
    status:'owner_complete',
    approval:'approved_delivered_control',
    explanation:'Delegated project acceptance of the specifically evidenced delivered control. This is NOT blanket certification of its full system or unresolved end-to-end tests.'
  }),
  source_implemented:Object.freeze({
    status:'implemented',
    approval:'approved_source_delivery_pending_QA',
    explanation:'Delegated approval of documented source implementation ONLY. Live integration, data accuracy, permissions and release acceptance remain pending; completion checkbox remains unchecked.'
  }),
  in_progress:Object.freeze({
    status:'in_progress',
    approval:'not_approved_active',
    explanation:'Active integration or testing; not approved complete.'
  }),
  blocked:Object.freeze({
    status:'blocked',
    approval:'not_approved_blocked',
    explanation:'Blocked on provider, database, licensing, legal, security or historical evidence; not approved complete.'
  }),
  backlog:Object.freeze({
    status:'deferred',
    approval:'not_approved_backlog',
    explanation:'Recorded future task; not approved complete.'
  }),
  needs_review:Object.freeze({
    status:'not_started',
    approval:'not_reviewed',
    explanation:'Insufficient evidence to approve completion.'
  })
});
export function delegatedProgressFor(id,review){
  if(!/^(CORE-\d{4}|EXEC-\d{2}|PROM-\d{2})$/.test(id)||!review)return null;
  const d=delegatedStages[review.stage]||delegatedStages.needs_review;
  const evidence=String(review.summary||'');
  return{
    status:d.status,
    note:'Delegated project review (2026-10-17): '+d.explanation+' Evidence/limitation: '+evidence.slice(0,1350),
    approval:d.approval,
    provenance:'assistant_delegated_source_review',
    reviewer:delegatedReviewPolicy.reviewer,
    reviewedOn:delegatedReviewPolicy.reviewDate,
    persisted:false
  };
}
