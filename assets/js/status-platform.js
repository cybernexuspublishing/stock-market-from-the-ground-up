/* v0.14.0.18 — Never treat querystring state as verified payment or account authority. */
(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const host=document.getElementById('status-app');if(!host)return;
 const state=(new URLSearchParams(location.search).get('state')||'pending').toLowerCase();
 const accountKind=document.body.dataset.statusKind==='account';
 const checkout={
  processing:['Processing payment','Your payment may still be processing. Check Purchases & Billing for confirmed status; do not submit another payment solely because this page is open.','dashboard.html?tab=billing'],
  success:['Payment verification pending','A return URL is not proof of payment. Review your authenticated billing records and membership access to confirm completion.','dashboard.html?tab=billing'],
  failed:['Payment requires attention','Review your authenticated billing records or return to Store.','dashboard.html?tab=billing'],
  cancelled:['Checkout cancelled','Return to the Store if you want to choose another product.','store.html'],
  pending:['Payment pending','Payment and entitlement changes must be verified from the provider event and your authenticated account records.','dashboard.html?tab=billing'],
  subscription_created:['Membership status requires verification','Check Membership & Access. A browser return URL alone does not activate membership.','dashboard.html?tab=access'],
  subscription_changed:['Membership status requires verification','Check Membership & Access for the verified current membership and effective dates.','dashboard.html?tab=access'],
  subscription_cancelled:['Cancellation requires verification','Check your billing history to confirm your actual renewal and cancellation status.','dashboard.html?tab=billing'],
  refund:['Refund requires verification','Review your authenticated purchase history to confirm any refunded transaction.','dashboard.html?tab=billing']
 };
 const account={
  unverified:['Account status','Check your email for any required account verification. Account state must be confirmed from your authenticated session.','signin.html'],
  suspended:['Account status','Sign in for the latest account status or contact Support.','signin.html'],
  disabled:['Account status','Sign in for account details or contact Support.','signin.html'],
  deleted:['Account status','Contact Support if you need confirmation about account deletion.','help.html'],
  expired:['Membership status','Review Membership & Access for the authoritative expiration date.','dashboard.html?tab=access'],
  trial_expired:['Trial status','Review Membership & Access for the current trial state.','dashboard.html?tab=access'],
  past_due:['Billing status','Check Purchases & Billing to confirm the current provider billing state.','dashboard.html?tab=billing'],
  book_unavailable:['Book access','Review My Books or contact Support for account-specific access.','dashboard.html?tab=books']
 };
 const fallback=['Status cannot be verified here','This page cannot confirm a payment, membership, or account status. Use your authenticated Dashboard to review verified records.','dashboard.html'];
 const x=(accountKind?account:checkout)[state]||fallback;
 host.innerHTML=`<div class="eyebrow">${accountKind?'Account information':'Transaction information'}</div><h1>${esc(x[0])}</h1><p>${esc(x[1])}</p><div class="actions"><a class="btn" href="${esc(x[2])}">Review account</a><a class="btn secondary" href="help.html">Help &amp; Documentation</a></div>`;
})();
